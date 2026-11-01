// Transformation d'une photo en case de manga, entièrement sur le téléphone :
// traits à l'encre (différence de gaussiennes), trames de points, aplats noirs et lignes de vitesse.

const PHOTO_KEY = 'seance-photo';
const OPTS_KEY = 'seance-photo-opts';
export const W = 480, H = 600;                       // format portrait 4:5
const DEFAULT_OPTS = { lines: 0.5, shade: 0.5, zoom: 1, dx: 0, dy: 0, raw: false };

let img = null;            // photo source décodée
let cache = {};            // rendu par rang

export const hasPhoto = () => !!img;
export const getOpts = () => ({ ...DEFAULT_OPTS, ...JSON.parse(localStorage.getItem(OPTS_KEY) || '{}') });

function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
export async function init() {
  const src = localStorage.getItem(PHOTO_KEY);
  if (src) { try { img = await loadImage(src); } catch { img = null; } }
}

// Photo choisie → JPEG réduit (≤ 900 px), stocké sur le téléphone
export async function fileToPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const i = await loadImage(url);
    const s = Math.min(1, 900 / Math.max(i.naturalWidth, i.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(i.naturalWidth * s); c.height = Math.round(i.naturalHeight * s);
    c.getContext('2d').drawImage(i, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.88);
  } finally { URL.revokeObjectURL(url); }
}
export async function savePhoto(dataUrl, opts) {
  localStorage.setItem(PHOTO_KEY, dataUrl);
  localStorage.setItem(OPTS_KEY, JSON.stringify(opts));
  img = await loadImage(dataUrl); cache = {};
}
export function removePhoto() { localStorage.removeItem(PHOTO_KEY); localStorage.removeItem(OPTS_KEY); img = null; cache = {}; }

// Recadrage : remplit W×H, zoom ≥ 1, décalage dx/dy en fraction de la marge disponible (−1…1)
export function drawCrop(ctx, source, o) {
  const iw = source.naturalWidth || source.width, ih = source.naturalHeight || source.height;
  const base = Math.max(W / iw, H / ih) * o.zoom;
  const sw = W / base, sh = H / base;
  const sx = (iw - sw) / 2 * (1 + o.dx), sy = (ih - sh) / 2 * (1 + o.dy);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(source, Math.max(0, Math.min(iw - sw, sx)), Math.max(0, Math.min(ih - sh, sy)), sw, sh, 0, 0, W, H);
}

function blur(src, w, h, sigma) {
  const r = Math.max(1, Math.ceil(sigma * 3)), k = new Float32Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma)); sum += k[i + r]; }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let a = 0;
      for (let i = -r; i <= r; i++) { const xx = x + i < 0 ? 0 : x + i >= w ? w - 1 : x + i; a += src[row + xx] * k[i + r]; }
      tmp[row + x] = a;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let a = 0;
      for (let i = -r; i <= r; i++) { const yy = y + i < 0 ? 0 : y + i >= h ? h - 1 : y + i; a += tmp[yy * w + x] * k[i + r]; }
      out[y * w + x] = a;
    }
  }
  return out;
}
function percentile(arr, p) {
  const step = Math.max(1, Math.floor(arr.length / 20000)), s = [];
  for (let i = 0; i < arr.length; i += step) s.push(arr[i]);
  s.sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

// Filtre manga sur un canvas W×H déjà rempli avec la photo recadrée
export function mangaFilter(ctx, o) {
  const id = ctx.getImageData(0, 0, W, H), d = id.data, n = W * H;
  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = (0.299 * d[4 * i] + 0.587 * d[4 * i + 1] + 0.114 * d[4 * i + 2]) / 255;
  const lo = percentile(L, 0.02), hi = percentile(L, 0.98);
  for (let i = 0; i < n; i++) L[i] = Math.min(1, Math.max(0, (L[i] - lo) / Math.max(0.05, hi - lo)));
  const S = blur(L, W, H, 1.2);                      // lissage léger pour les traits
  const T = blur(L, W, H, 3.2);                      // lissage fort : grands aplats de tons
  const f1 = blur(S, W, H, 1.0), f2 = blur(S, W, H, 1.6);   // traits fins
  const c1 = blur(S, W, H, 2.2), c2 = blur(S, W, H, 3.5);   // contours principaux
  const sh = o.shade;                                 // 0 = clair, 1 = sombre
  const tBlack = percentile(T, 0.03 + 0.09 * sh), tDense = percentile(T, 0.09 + 0.14 * sh), tLight = percentile(T, 0.2 + 0.2 * sh);
  const k = 1 - o.lines;                              // 0 = beaucoup de traits
  // seuils adaptatifs : une proportion stable de pixels devient trait
  const DF = new Float32Array(n), DC = new Float32Array(n);
  for (let i = 0; i < n; i++) { DF[i] = f2[i] - f1[i]; DC[i] = c2[i] - c1[i]; }
  const tf = Math.max(0.004, percentile(DF, 0.86 + 0.08 * k)), tc = Math.max(0.006, percentile(DC, 0.90 + 0.06 * k));
  const P = 6, R = Math.SQRT1_2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, v = T[i];
      const u = (x + y) * R / P, w = (x - y) * R / P;
      const fu = u - Math.floor(u) - 0.5, fw = w - Math.floor(w) - 0.5;
      const dist = Math.sqrt(fu * fu + fw * fw);
      let tone;
      if (v < tBlack) tone = smooth(tBlack - 0.03, tBlack, v) * (1 - smooth(0.36, 0.44, dist)) + (1 - smooth(tBlack - 0.03, tBlack, v)) * 0;
      else if (v < tDense) tone = smooth(0.36, 0.44, dist);           // trame dense
      else if (v < tLight) tone = smooth(0.22, 0.29, dist);           // trame légère
      else tone = 1;
      const inkF = 1 - smooth(tf, tf * 1.6, DF[i]);            // 0 = trait noir (côté sombre du bord)
      const inkC = 1 - smooth(tc, tc * 1.5, DC[i]);
      const val = Math.round(255 * Math.min(tone, inkF, inkC));
      d[4 * i] = d[4 * i + 1] = d[4 * i + 2] = val;
    }
  }
  ctx.putImageData(id, 0, 0);
}

// Effets de case : lignes de concentration, cadre et étincelles selon le rang
export function panelFx(ctx, rank) {
  const cx = W / 2, cy = H * 0.42, n = 70 + rank.index * 18;
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  ctx.save();
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rnd() * 0.05;
    const inner = 0.80 + rnd() * 0.25;                // rayon intérieur relatif (ellipse)
    const rx = W * 0.5 * inner, ry = H * 0.5 * inner;
    const x0 = cx + Math.cos(a) * rx, y0 = cy + Math.sin(a) * ry;
    const x1 = cx + Math.cos(a) * W, y1 = cy + Math.sin(a) * H;
    const wdt = 0.006 + rnd() * 0.012;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(cx + Math.cos(a - wdt) * W, cy + Math.sin(a - wdt) * H);
    ctx.lineTo(cx + Math.cos(a + wdt) * W, cy + Math.sin(a + wdt) * H);
    ctx.closePath();
    ctx.fillStyle = rank.index >= 2 && k % 3 === 0 ? rank.color : '#000';
    ctx.globalAlpha = 0.85;
    ctx.fill();
    void x1; void y1;
  }
  ctx.globalAlpha = 1;
  if (rank.index >= 4) {
    for (let k = 0; k < 6 + rank.index; k++) {
      const x = rnd() * W, y = rnd() * H * 0.9;
      if (Math.hypot((x - cx) / W, (y - cy) / H) < 0.33) continue;
      const s = 6 + rnd() * 10;
      ctx.beginPath();
      ctx.moveTo(x, y - s); ctx.lineTo(x + s * .25, y - s * .25); ctx.lineTo(x + s, y); ctx.lineTo(x + s * .25, y + s * .25);
      ctx.lineTo(x, y + s); ctx.lineTo(x - s * .25, y + s * .25); ctx.lineTo(x - s, y); ctx.lineTo(x - s * .25, y - s * .25); ctx.closePath();
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.fill(); ctx.stroke();
    }
  }
  ctx.lineWidth = 10; ctx.strokeStyle = '#000'; ctx.strokeRect(5, 5, W - 10, H - 10);
  ctx.lineWidth = 4; ctx.strokeStyle = rank.color; ctx.strokeRect(12, 12, W - 24, H - 24);
  ctx.restore();
}

export function renderTo(canvas, source, o, rank) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  drawCrop(ctx, source, o);
  if (o.raw) {   // illustration importée : seulement le cadre du rang
    ctx.lineWidth = 10; ctx.strokeStyle = '#000'; ctx.strokeRect(5, 5, W - 10, H - 10);
    ctx.lineWidth = 4; ctx.strokeStyle = rank.color; ctx.strokeRect(12, 12, W - 24, H - 24);
    return;
  }
  mangaFilter(ctx, o);
  panelFx(ctx, rank);
}

// Avatar prêt à afficher (mis en cache par rang)
export function avatarUrl(rank) {
  if (!img) return null;
  if (!cache[rank.index]) {
    const c = document.createElement('canvas');
    renderTo(c, img, getOpts(), rank);
    cache[rank.index] = c.toDataURL('image/jpeg', 0.85);
  }
  return cache[rank.index];
}

// ---------- Planche d'évolution : une image contenant 9 cases (5 en haut, 4 en bas) ----------
// Les cases sont découpées sur le téléphone et gardées en privé (une image par palier).
const STAGES_KEY = 'seance-stages';
let stages = null;
try { stages = JSON.parse(localStorage.getItem(STAGES_KEY) || 'null'); } catch { stages = null; }
// Images intégrées au site : data/paliers/paliers.json (une image par palier, choisie selon le niveau)
let builtin = null;
export async function loadBuiltinStages() {
  try {
    const r = await fetch('data/paliers/paliers.json', { cache: 'no-cache' });
    if (!r.ok) return;
    const j = await r.json();
    const list = (j.paliers || []).sort((a, b) => a.niveau - b.niveau).map(p => `data/paliers/${p.image}`);
    if (list.length === 9) builtin = list;
  } catch { /* hors ligne au premier lancement : on garde l'avatar dessiné */ }
}
const localStages = () => (Array.isArray(stages) && stages.length === 9 ? stages : null);
export const hasLocalStages = () => !!localStages();
export const hasStages = () => !!(localStages() || builtin);
export const stageUrl = i => { const l = localStages() || builtin; return l ? l[Math.min(8, Math.max(0, i))] : null; };
export function removeStages() { localStorage.removeItem(STAGES_KEY); stages = null; }

// Cherche la ligne de séparation sombre la plus proche de la position attendue
function findSep(lum, expected, span) {
  let best = expected, bestV = Infinity;
  for (let x = Math.max(1, expected - span); x <= Math.min(lum.length - 2, expected + span); x++) {
    const v = lum[x - 1] + lum[x] + lum[x + 1];
    if (v < bestV) { bestV = v; best = x; }
  }
  return best;
}
function profile(data, w, y0, y1, axis) {
  // axis 'x' : luminosité moyenne de chaque colonne entre y0 et y1
  const out = new Float32Array(w);
  for (let y = y0; y < y1; y += 2) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; out[x] += data[i] + data[i + 1] + data[i + 2];
  }
  void axis;
  return out;
}

export async function importSheet(file) {
  const url = URL.createObjectURL(file);
  let i;
  try { i = await loadImage(url); } finally { URL.revokeObjectURL(url); }
  const w = i.naturalWidth, h = i.naturalHeight;
  if (Math.abs(w / h - 1) > 0.15) throw new Error('format');
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(i, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;
  // ligne horizontale entre les deux rangées (attendue vers 51 %)
  const rows = new Float32Array(h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x += 2) { const k = (y * w + x) * 4; rows[y] += data[k] + data[k + 1] + data[k + 2]; }
  const ySep = findSep(rows, Math.round(h * 0.51), Math.round(h * 0.04));
  const top = profile(data, w, Math.round(h * 0.08), Math.round(h * 0.45));
  const bot = profile(data, w, Math.round(h * 0.58), Math.round(h * 0.95));
  const span = Math.round(w * 0.03);
  const tx = [0, ...[0.2, 0.4, 0.6, 0.8].map(f => findSep(top, Math.round(w * f), span)), w];
  const bx = [0, ...[0.206, 0.426, 0.639].map(f => findSep(bot, Math.round(w * f), span)), w];
  const m = Math.round(w * 0.006);           // marge pour enlever les traits de séparation
  const cut = (x0, x1, y0, y1) => {
    const o = document.createElement('canvas');
    const cw = x1 - x0 - 2 * m, ch = y1 - y0 - 2 * m;
    const s = Math.min(1, 520 / ch);
    o.width = Math.round(cw * s); o.height = Math.round(ch * s);
    o.getContext('2d').drawImage(c, x0 + m, y0 + m, cw, ch, 0, 0, o.width, o.height);
    return o.toDataURL('image/jpeg', 0.88);
  };
  const out = [];
  for (let k = 0; k < 5; k++) out.push(cut(tx[k], tx[k + 1], 0, ySep));
  for (let k = 0; k < 4; k++) out.push(cut(bx[k], bx[k + 1], ySep, h));
  return out;
}
export function saveStages(list) {
  localStorage.setItem(STAGES_KEY, JSON.stringify(list));
  stages = list;
}
