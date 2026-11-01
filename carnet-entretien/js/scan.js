// Lecture des factures : deux moteurs.
//  - Claude (si une clé API est renseignée) : lit photo ou PDF et comprend les travaux.
//  - Hors ligne : OCR Tesseract sur le téléphone + reconnaissance par mots-clés.

const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.128.0/+esm';
const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.esm.min.js';
const PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.min.mjs';
const PDFJS_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.min.mjs';
const MODEL = 'claude-opus-5-5';

export const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* ---------- Préparation du fichier ---------- */

const blobToDataUrl = b => new Promise((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b);
});

async function loadImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

// Réduit la photo (les photos iPhone font plusieurs Mo) et la convertit en JPEG.
async function shrink(source, w, h, max = 1800) {
  const k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(source, 0, 0, c.width, c.height);
  return blobToDataUrl(await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85)));
}

let pdfjs;
async function getPdfjs() {
  if (!pdfjs) {
    pdfjs = await import(PDFJS_URL);
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  }
  return pdfjs;
}

async function renderPdfFirstPage(data) {
  const lib = await getPdfjs();
  const pdf = await lib.getDocument({ data: data.slice(0) }).promise;
  const page = await pdf.getPage(1);
  const vp = page.getViewport({ scale: 2 });
  const c = document.createElement('canvas');
  c.width = vp.width; c.height = vp.height;
  await page.render({ canvas: c, canvasContext: c.getContext('2d'), viewport: vp }).promise;
  let text = '';
  for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
    const p = await pdf.getPage(i);
    const tc = await p.getTextContent();
    text += tc.items.map(it => it.str + (it.hasEOL ? '\n' : ' ')).join('') + '\n';
  }
  return { canvas: c, text };
}

// Renvoie { kind: 'image'|'pdf', image (dataURL JPEG pour l'aperçu/OCR), pdfBase64?, pdfText? }
export async function prepareFile(file) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (isPdf) {
    const buf = await file.arrayBuffer();
    const pdfBase64 = (await blobToDataUrl(new Blob([buf], { type: 'application/pdf' }))).split(',')[1];
    let image = null, pdfText = '';
    try {
      const r = await renderPdfFirstPage(buf);
      image = await shrink(r.canvas, r.canvas.width, r.canvas.height);
      pdfText = r.text;
    } catch (e) { console.warn('Aperçu PDF impossible', e); }
    return { kind: 'pdf', image, pdfBase64, pdfText };
  }
  const img = await loadImage(file);
  return { kind: 'image', image: await shrink(img, img.naturalWidth, img.naturalHeight) };
}

/* ---------- Analyse avec Claude ---------- */

const RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['vehicle_id', 'date', 'km', 'garage', 'total', 'task_ids', 'other_work', 'summary'],
  properties: {
    vehicle_id: { type: 'string', description: "id du véhicule concerné, ou chaîne vide si inconnu" },
    date: { type: 'string', description: 'date de la facture ou de l\'intervention, format AAAA-MM-JJ, ou chaîne vide' },
    km: { type: ['integer', 'null'], description: 'kilométrage relevé sur la facture' },
    garage: { type: 'string', description: 'nom du garage / prestataire' },
    total: { type: ['number', 'null'], description: 'montant total TTC payé en euros' },
    task_ids: { type: 'array', items: { type: 'string' }, description: 'ids des tâches du plan d\'entretien réalisées' },
    other_work: { type: 'array', items: { type: 'string' }, description: 'autres travaux ou pièces non couverts par le plan' },
    summary: { type: 'string', description: 'résumé en une phrase des travaux' },
  },
};

function vehiclesForPrompt(vehicles) {
  return vehicles.map(v => ({
    id: v.id, nom: v.name, modele: v.model || '', immatriculation: v.plate || '',
    taches: v.tasks.map(t => ({ id: t.id, nom: t.name })),
  }));
}

export async function analyzeWithClaude(apiKey, prepared, vehicles) {
  const { default: Anthropic } = await import(SDK_URL);
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const doc = prepared.kind === 'pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: prepared.pdfBase64 } }
    : { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: prepared.image.split(',')[1] } };
  const prompt = `Voici une facture d'entretien ou de réparation d'un véhicule. Extrais les informations demandées.

Véhicules de l'utilisateur et leur plan d'entretien (JSON) :
${JSON.stringify(vehiclesForPrompt(vehicles))}

Règles :
- vehicle_id : choisis le véhicule d'après l'immatriculation, la marque ou le modèle ; chaîne vide si rien ne correspond.
- task_ids : uniquement des ids présents dans les tâches du véhicule choisi. Une vidange d'huile moteur avec filtre correspond à la tâche de vidange moteur ; ne coche une tâche de boîte de vitesses, de carter primaire ou de liquide de frein que si la facture le mentionne explicitement. Un remplacement de pneus correspond à la tâche pneus (avant et/ou arrière selon la facture).
- other_work : les autres opérations ou pièces notables, en français, courtes.
- Montants en euros, total TTC final.`;

  const params = {
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: RESULT_SCHEMA } },
    messages: [{ role: 'user', content: [doc, { type: 'text', text: prompt }] }],
  };
  let msg;
  try {
    // Repli automatique sur un autre modèle si la requête est refusée par les filtres de sécurité.
    msg = await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  } catch (e) {
    if (e instanceof Anthropic.BadRequestError) msg = await client.messages.create(params);
    else throw e;
  }
  if (msg.stop_reason === 'refusal') throw new Error('Analyse refusée par le modèle.');
  if (msg.stop_reason === 'max_tokens') throw new Error('Réponse incomplète.');
  const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const r = JSON.parse(text);
  const v = vehicles.find(x => x.id === r.vehicle_id);
  return {
    vehicleId: v ? v.id : '',
    date: /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : '',
    km: Number.isFinite(r.km) ? r.km : null,
    garage: r.garage || '',
    cost: Number.isFinite(r.total) ? r.total : null,
    tasks: v ? r.task_ids.filter(id => v.tasks.some(t => t.id === id)) : [],
    other: r.other_work.join('\n'),
    summary: r.summary || '',
    engine: 'claude',
  };
}

export async function testApiKey(apiKey) {
  const { default: Anthropic } = await import(SDK_URL);
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  await client.models.retrieve(MODEL);
}

/* ---------- Analyse hors ligne (OCR + mots-clés) ---------- */

let worker;
async function ocr(image, onProgress) {
  const T = await import(TESSERACT_URL);
  const createWorker = T.createWorker || T.default.createWorker;
  if (!worker) {
    worker = await createWorker('fra', 1, {
      logger: m => m.status === 'recognizing text' && onProgress && onProgress(Math.round(m.progress * 100)),
    });
  }
  const { data } = await worker.recognize(image);
  return data.text;
}

const toNumber = s => Number(String(s).replace(/[\s  ]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));

export function parseInvoiceText(raw, vehicles) {
  const text = norm(raw);
  const flat = text.replace(/[\s\-.]/g, '');

  // Véhicule : immatriculation, puis marque/modèle.
  let vehicle = vehicles.find(v => v.plate && flat.includes(norm(v.plate).replace(/[\s\-.]/g, '')));
  if (!vehicle) {
    const hints = {
      voiture: ['mercedes', 'v220', 'v 220', 'classe v', 'vito', 'w447'],
      moto: ['harley', 'fxdr', 'softail', 'h-d', 'milwaukee'],
      velo: ['decathlon', 'rockrider', 'vtt', 'velo', 'cycle', 'vae'],
    };
    let best = 0;
    for (const v of vehicles) {
      const words = [...(hints[v.kind] || []), ...norm(v.name + ' ' + (v.model || '')).split(/\s+/).filter(w => w.length > 3)];
      const score = words.filter(w => text.includes(w)).length;
      if (score > best) { best = score; vehicle = v; }
    }
  }

  // Date : première date jj/mm/aaaa trouvée.
  let date = '';
  const dm = text.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4}|\d{2})\b/);
  if (dm) {
    let [, d, m, y] = dm;
    if (y.length === 2) y = '20' + y;
    if (+m >= 1 && +m <= 12 && +d >= 1 && +d <= 31) date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Kilométrage.
  let km = null;
  const km1 = text.match(/kilometr\w*\s*[:\-]?\s*(\d[\d\s. ]{1,9}\d)/);
  const km2 = text.match(/(\d[\d\s. ]{1,9}\d)\s*km\b/);
  for (const m of [km1, km2]) {
    if (m) { const n = toNumber(m[1]); if (n >= 10 && n < 2000000) { km = Math.round(n); break; } }
  }

  // Total TTC : on prend la dernière ligne "total" / "net à payer".
  let cost = null;
  const re = /(total\s*ttc|net\s*a\s*payer|total\s*a\s*payer|montant\s*ttc|total)[^\d\n]{0,25}(\d[\d\s .]*[.,]\d{2})/g;
  let m;
  while ((m = re.exec(text))) {
    const n = toNumber(m[2]);
    if (n > 0 && (cost == null || /ttc|payer/.test(m[1]) || n >= cost)) cost = n;
  }

  // Garage : première ligne lisible.
  const garage = (raw.split('\n').map(l => l.trim()).find(l => /[a-zA-Z]{3,}/.test(l) && l.length >= 4 && l.length <= 50) || '');

  // Tâches reconnues par mots-clés.
  const tasks = vehicle ? vehicle.tasks.filter(t => (t.kw || []).some(k => text.includes(k))).map(t => t.id) : [];
  // Pneus moto : si "pneu" sans précision avant/arrière, ne rien supposer de plus.
  return { vehicleId: vehicle ? vehicle.id : '', date, km, garage, cost, tasks, other: '', summary: '', engine: 'ocr' };
}

export async function analyzeOffline(prepared, vehicles, onProgress) {
  let text = prepared.pdfText || '';
  if (text.replace(/\s/g, '').length < 40) {
    if (!prepared.image) throw new Error('Impossible de lire ce fichier.');
    text = await ocr(prepared.image, onProgress);
  }
  const r = parseInvoiceText(text, vehicles);
  r.rawText = text;
  return r;
}
