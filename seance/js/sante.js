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

// Phases détaillées, une par ligne : « Core | Connect | 23:00 » (type | source | durée, dans n'importe quel ordre).
// On écarte « Au lit » et « Éveillé », puis on garde une seule source (Garmin si présente, sinon la plus fournie).
const SKIP = /in ?bed|au lit|awake|éveil|eveil|réveil/i;
// Dates ISO 8601 (2026-11-05T23:14:00+01:00) ou « 05/11/2026 23:14 »
const MOIS = { janv: 0, jan: 0, janvier: 0, fevr: 1, févr: 1, fev: 1, fév: 1, février: 1, fevrier: 1, mars: 2, mar: 2, avr: 3, avril: 3, mai: 4, juin: 5, juil: 6, juillet: 6,
  aout: 7, août: 7, sept: 8, sep: 8, septembre: 8, oct: 9, octobre: 9, nov: 10, novembre: 10, dec: 11, déc: 11, décembre: 11, decembre: 11,
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11, feb: 1, apr: 3, jun: 5, jul: 6, aug: 7 };
function parseDate(x) {
  x = String(x).trim();
  if (/^\d{4}-\d{2}-\d{2}[T ]\d/.test(x)) { const d = Date.parse(x.replace(' ', 'T')); return Number.isFinite(d) ? d : null; }
  // « 6 nov. 2026 à 00:50 », « 6 novembre 2026 at 0:50 »
  let m = x.match(/(\d{1,2})\s+([a-zéèûô]+)\.?\s+(\d{4})\D+(\d{1,2})[:h](\d{2})/i);
  if (m && MOIS[m[2].toLowerCase()] != null) return new Date(+m[3], MOIS[m[2].toLowerCase()], +m[1], +m[4], +m[5]).getTime();
  // « Nov 6, 2026 at 12:50 AM »
  m = x.match(/([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})\D+(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (m && MOIS[m[1].toLowerCase()] != null) { let hh = +m[4]; if (m[6]) hh = hh % 12 + (/pm/i.test(m[6]) ? 12 : 0); return new Date(+m[3], MOIS[m[1].toLowerCase()], +m[2], hh, +m[5]).getTime(); }
  m = x.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\D+(\d{1,2})[:h](\d{2})/);
  if (m) return new Date(+(m[3].length === 2 ? '20' + m[3] : m[3]), +m[2] - 1, +m[1], +m[4], +m[5]).getTime();
  return null;
}
// Plages de sommeil (type | début | fin) : union des plages, sans « Au lit » ni réveils
function unionHours(rows) {
  const iv = [];
  for (const r of rows) {
    const ds = r.map(parseDate).filter(x => x != null);
    if (ds.length < 2) continue;
    const type = r.find(x => parseDate(x) == null) || '';
    if (SKIP.test(type)) continue;
    const a = Math.min(ds[0], ds[1]), b = Math.max(ds[0], ds[1]);
    if (b > a) iv.push([a, b]);
  }
  if (!iv.length) return null;
  iv.sort((x, y) => x[0] - y[0]);
  let tot = 0, [cs, ce] = iv[0];
  for (const [a, b] of iv.slice(1)) { if (a <= ce) ce = Math.max(ce, b); else { tot += ce - cs; cs = a; ce = b; } }
  tot += ce - cs;
  return tot / 3600000;
}

export function sumPhases(block) {
  const rows = String(block).split(/\n+/).map(l => l.split('|').map(x => x.trim())).filter(r => r.length >= 2);
  if (!rows.length) return null;
  if (rows.some(r => r.filter(x => parseDate(x) != null).length >= 2)) {
    const h = unionHours(rows);
    return h ? { h, source: 'plages', sources: [] } : null;
  }
  const items = rows.map(r => {
    const dur = r.find(x => /\d/.test(x) && /:|h|min|^\d+([.,]\d+)?$/.test(x));
    const others = r.filter(x => x !== dur);
    const type = others.find(x => /core|deep|rem|awake|asleep|in ?bed|lit|éveil|eveil|profond|léger|leger|paradox|sommeil|endormi/i.test(x)) || others[0] || '';
    const source = others.find(x => x !== type && x) || '?';
    return { type, source, h: dur ? sleepHours(dur) : 0 };
  }).filter(i => i.h > 0 && !SKIP.test(i.type));
  if (!items.length) return null;
  const bySource = {};
  for (const i of items) bySource[i.source] = (bySource[i.source] || 0) + i.h;
  const srcs = Object.keys(bySource);
  const garmin = srcs.find(x => /connect|garmin|forerunner|fenix|venu|vivo|instinct|epix/i.test(x));
  const keep = garmin || srcs.sort((a, b) => bySource[b] - bySource[a])[0];
  return { h: bySource[keep], source: keep, sources: srcs };
}

export function parseSante(text) {
  let t = String(text || '');
  let phases = null, unreadable = null;
  t = t.replace(/sommeil\s*[=:]\s*([\s\S]*?)(?=;\s*[a-z]+\s*[=:]|$)/i, (all, v) => {
    if (!v.includes('|')) return all;
    phases = sumPhases(v);
    if (!phases) unreadable = v.trim().split(/\n/)[0].slice(0, 80);
    return phases ? `sommeil=${phases.h.toFixed(2)}` : 'sommeil=';
  });
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
  if (phases && phases.source !== 'plages') out.sommeilSource = phases.source;
  if (unreadable) out.sommeilIllisible = unreadable;
  if (out.sommeil > 14) { out.sommeilDouble = Math.round(out.sommeil * 10) / 10; delete out.sommeil; }
  for (const k of ['poids', 'sommeil', 'fc', 'vfc']) if (out[k] == null || out[k] <= 0) delete out[k];
  if (out.poids && (out.poids < 30 || out.poids > 250)) delete out.poids;
  return Object.keys(out).filter(k => !['sommeilDouble', 'sommeilSource', 'sommeilIllisible'].includes(k)).length > 1 || out.courses.length ? out : null;
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
