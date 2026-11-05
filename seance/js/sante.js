// Données Apple Santé (alimentées par Garmin Connect), transmises par un Raccourci iPhone.
// Le Raccourci copie un texte du type :
//   SEANCE-SANTE;poids=78,4;sommeil=7,2;fc=52;course=8,3/46
// (clés facultatives, séparateurs « ; » ou retours à la ligne, virgule ou point décimal).

const num = v => { const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
export const today = () => new Date().toISOString().slice(0, 10);

// Durée de sommeil en heures, quelle que soit l'unité envoyée (heures, minutes ou secondes)
function hours(v) {
  if (v == null) return null;
  if (v < 24) return v;
  if (v < 1440) return v / 60;
  return v / 3600;
}

// Sommeil sous toutes ses formes : 7,2 · 432 (min) · 25920 (s) · 7:12 · 7 h 12 min · 7 heures, 12 minutes
function sleepHours(v, single = false) {
  const t = String(v).toLowerCase();
  // h:mm:ss (3 parties) ou mm:ss (2 parties, format des Raccourcis pour les durées < 1 h)
  let m = t.match(/(\d+):(\d{1,2}):(\d{1,2})/);
  if (m) return +m[1] + +m[2] / 60 + +m[3] / 3600;
  m = t.match(/(\d+):(\d{1,2})/);
  if (m) return single ? +m[1] + +m[2] / 60 : +m[1] / 60 + +m[2] / 3600;
  m = t.match(/(\d+(?:[.,]\d+)?)\s*h(?:eure)?s?\D*(\d+)?/);
  if (m) return num(m[1]) + (m[2] ? +m[2] / 60 : 0);
  m = t.match(/(\d+)\s*min/);
  if (m && !/h/.test(t)) return +m[1] / 60;
  return hours(num(v));
}

// Liste de durées (une par phase de sommeil) : on additionne tout ce qui ressemble à une durée
function sumDurations(v) {
  const parts = String(v).split(/[\n,]+|\s{2,}/).map(x => x.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  let tot = 0, n = 0;
  for (const p of parts) {
    const h = sleepHours(p);
    if (h != null && h > 0) { tot += p.match(/^\d+(?:[.,]\d+)?$/) && h > 24 ? 0 : h; n++; }
  }
  return n ? tot : null;
}

export function parseSante(text) {
  let t = String(text || '');
  // une liste de durées sur plusieurs lignes après « sommeil= » : on la remplace par sa somme
  t = t.replace(/sommeil\s*[=:]\s*([\s\S]*?)(?=;\s*[a-z]+\s*[=:]|$)/i, (all, v) => {
    if (!/\n/.test(v.trim())) return all;
    const h = sumDurations(v);
    return h ? `sommeil=${h.toFixed(2)}` : all;
  });
  if (!/poids|sommeil|fc|course|seance-sante/i.test(t)) return null;
  const out = { courses: [] };
  for (const part of t.split(/[;\n&]+/)) {
    const m = part.match(/^\s*([a-zé_]+)\s*[=:]\s*(.+?)\s*$/i);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2];
    if (k === 'poids') out.poids = num(v);
    else if (k === 'sommeil') out.sommeil = sleepHours(v, true);
    else if (k === 'fc' || k === 'fcrepos') out.fc = num(v);
    else if (k === 'vfc') out.vfc = num(v);
    else if (k === 'course') {
      // date|km|min ou km/min (date du jour)
      const p = v.split(/[|/]/).map(x => x.trim());
      const date = /^\d{4}-\d{2}-\d{2}$/.test(p[0]) ? p.shift() : today();
      const km = num(p[0]), min = num(p[1]);
      if (km && min) out.courses.push({ date, km: km > 200 ? km / 1000 : km, min: min > 600 ? min / 60 : min });
    }
  }
  if (out.sommeil > 14) { out.sommeilDouble = Math.round(out.sommeil * 10) / 10; delete out.sommeil; }
  for (const k of ['poids', 'sommeil', 'fc', 'vfc']) if (out[k] == null || out[k] <= 0) delete out[k];
  if (out.poids && (out.poids < 30 || out.poids > 250)) delete out.poids;
  return Object.keys(out).filter(k => k !== 'sommeilDouble').length > 1 || out.courses.length ? out : null;
}

// Enregistre les valeurs du jour dans S.sante (une valeur par jour et par mesure)
export function storeSante(S, data) {
  const s = S.sante || (S.sante = { poids: [], sommeil: [], fc: [], vfc: [] });
  const d = today();
  for (const k of ['poids', 'sommeil', 'fc', 'vfc']) {
    if (data[k] == null) continue;
    s[k] = (s[k] || []).filter(x => x.d !== d);
    s[k].push({ d, v: Math.round(data[k] * 10) / 10 });
    s[k].sort((a, b) => a.d.localeCompare(b.d));
    s[k] = s[k].slice(-120);
  }
  s.last = Date.now();
}

export const latest = (S, k) => { const l = S.sante?.[k]; return l?.length ? l[l.length - 1] : null; };
export const todayVal = (S, k) => { const x = latest(S, k); return x && x.d === today() ? x.v : null; };

// Suggestion pour les curseurs de forme à partir des données du jour
export function formHints(S) {
  const h = {};
  const sl = todayVal(S, 'sommeil');
  if (sl != null) h.sommeil = sl >= 7.5 ? 5 : sl >= 7 ? 4 : sl >= 6 ? 3 : sl >= 5 ? 2 : 1;
  const fc = todayVal(S, 'fc');
  const hist = (S.sante?.fc || []).filter(x => x.d !== today()).slice(-14);
  if (fc != null && hist.length >= 3) {
    const avg = hist.reduce((a, x) => a + x.v, 0) / hist.length;
    h.fcEcart = Math.round(fc - avg);
    if (fc - avg >= 7) h.energie = 2; else if (fc - avg >= 4) h.energie = 3;
  }
  return h;
}

export const fmtH = v => `${Math.floor(v)} h ${String(Math.round((v % 1) * 60)).padStart(2, '0')}`;
