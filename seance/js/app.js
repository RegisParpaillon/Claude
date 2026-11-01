import { EQUIPMENT, PAIN_ZONES, ROTATION, DAY_TYPES, LIFT_NAMES, DEFAULT_RATIOS, WAVES } from './data.js';
import { FORM_QUESTIONS, readiness } from './forme.js';
import { generateMuscu, swapAccessory, applyMuscuProgress, roundLoad, unitOf, isLoaded, epley } from './muscu.js';
import { generateRun, applyRunProgress, paces, vdotFrom, fmtPace, fmtDur, kmh, predictTime, QUALITY, QUALITY_ORDER, START_LEVEL, LONG_START } from './run.js';
import * as Timer from './timer.js';
import * as Game from './game.js';
import * as Manga from './manga.js';
import { heroSvg } from './hero.js';
import { askClaude, toSession, getApiKey, setApiKey, testApiKey } from './ai.js';

// ---------- Données ----------
const KEY = 'seance-app-v1';
const LIFTS = ['bench', 'squat', 'deadlift', 'ohp'];
const DIST = [{ m: 5000, l: '5 km' }, { m: 10000, l: '10 km' }, { m: 21097, l: 'Semi-marathon' }, { m: 42195, l: 'Marathon' }];
const LEVELS = { debutant: 'Débutant', inter: 'Intermédiaire', avance: 'Avancé' };
const DEFAULT_VDOT = { debutant: 32, inter: 40, avance: 48 };

function blank() {
  return {
    profile: { setup: false, level: 'inter', bodyweight: 75, lifts: {}, wave: {}, fails: {}, acc: {},
      run: { vdot: 40, refDist: 5000, refTime: null, longMin: 60, longCount: 0, qualCount: 0, qLevel: {} },
      eq: ['barre', 'rack', 'banc', 'halteres', 'poulie', 'machines', 'traction'], lastForm: null },
    rot: 0, current: null, history: [], game: Game.blankGame(),
  };
}
let S = load();
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s?.profile) { s.game ||= Game.blankGame(); return s; } } catch { /* */ }
  return blank();
}
function save() { localStorage.setItem(KEY, JSON.stringify(S)); }
const P = () => S.profile;

// ---------- Utilitaires ----------
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kg = w => String(+(+w).toFixed(2)).replace('.', ',');
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }
function parseTime(str) {
  const parts = String(str || '').trim().split(/[:h'’"m\s]+/).filter(Boolean).map(Number);
  if (!parts.length || parts.some(n => !Number.isFinite(n))) return null;
  let s = 0; for (const p of parts) s = s * 60 + p;
  if (parts.length === 1) s *= 60; // un seul nombre = minutes
  return s > 0 ? s : null;
}
const hms = sec => { sec = Math.round(sec); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(s).padStart(2, '0')}`; };

// ---------- Feuille modale ----------
let sheetSave = null;
function openSheet(title, body, onSave, saveLabel = 'OK') {
  $('#sheet').innerHTML = `<div class="sheet-head"><button data-sheet="cancel">Annuler</button><b>${title}</b>
    ${onSave ? `<button class="save" data-sheet="save">${saveLabel}</button>` : '<span style="min-width:60px"></span>'}</div>${body}`;
  sheetSave = onSave;
  $('#sheet').classList.add('open'); $('#sheetBg').classList.add('open');
}
function closeSheet() { $('#sheet').classList.remove('open'); $('#sheetBg').classList.remove('open'); sheetSave = null; }
$('#sheetBg').addEventListener('click', closeSheet);
$('#sheet').addEventListener('click', e => {
  const b = e.target.closest('[data-sheet]'); if (!b) return;
  if (b.dataset.sheet === 'cancel') closeSheet();
  else if (sheetSave) { const f = $('#sheet form'); if (sheetSave(f) !== false) closeSheet(); }
});
$('#sheet').addEventListener('submit', e => { e.preventDefault(); if (sheetSave && sheetSave(e.target) !== false) closeSheet(); });

// ---------- Navigation ----------
const go = h => { location.hash = h; };
window.addEventListener('hashchange', render);
function header(title, back) {
  $('#hdr').innerHTML = back
    ? `<button class="back" data-go="${back}">‹ Retour</button><h1 class="small">${title}</h1>`
    : `<h1>${title}</h1>`;
}
const TABS = [['', '🏠', 'Séances'], ['jeu', '🏆', 'Progression'], ['historique', '🗓️', 'Historique'], ['profil', '👤', 'Profil']];
function tabs(active) {
  const nav = $('#tabs');
  if (active == null) { nav.classList.remove('show'); document.body.classList.remove('has-tabs'); return; }
  nav.classList.add('show'); document.body.classList.add('has-tabs');
  nav.innerHTML = TABS.map(([k, i, l]) => `<button class="${k === active ? 'on' : ''}" data-go="#/${k}"><span>${i}</span>${l}</button>`).join('');
}
function busy(msg) {
  const b = $('#busy');
  if (msg === false) return b.classList.remove('show');
  b.querySelector('span').textContent = msg; b.classList.add('show');
}

function render() {
  const h = location.hash.replace(/^#\/?/, '');
  if (!P().setup && h !== 'profil') return go('#/profil');
  window.scrollTo(0, 0);
  const [r, arg] = h.split('/');
  const tab = r === 'h' ? 'historique' : r;
  tabs(['', 'jeu', 'historique', 'profil'].includes(tab) && P().setup ? tab : null);
  if (r === 'profil') return viewProfile();
  if (r === 'jeu') return viewGame();
  if (r === 'libre') return viewFreeForm();
  if (r === 'muscu') return viewMuscuForm();
  if (r === 'run') return viewRunForm();
  if (r === 'seance') return S.current ? viewSession() : go('#/');
  if (r === 'historique') return viewHistory();
  if (r === 'h') return viewHistoryItem(arg);
  return viewHome();
}

// ---------- Accueil ----------
function nextQuality() { return QUALITY_ORDER[(P().run.qualCount || 0) % QUALITY_ORDER.length]; }
function viewHome() {
  header('Ma séance');
  const p = P(), r = ROTATION[S.rot % ROTATION.length];
  const pc = paces(p.run.vdot);
  const weekAgo = Date.now() - 7 * 864e5;
  const week = S.history.filter(x => x.date > weekAgo);
  const q = nextQuality();
  $('#app').innerHTML = `
    ${S.current ? `<button class="card resume tap" data-go="#/seance"><span>▶</span><div><b>Séance en cours</b><div class="sub">${esc(S.current.title)}</div></div><span class="chev">›</span></button>` : ''}
    <div class="choices">
      <button class="choice tap" data-go="#/muscu"><span class="ce">🏋️</span><b>Muscu</b><span class="sub">Prochaine : ${r.label}</span></button>
      <button class="choice tap" data-go="#/run"><span class="ce">🏃</span><b>Running</b><span class="sub">Prochain fractionné : ${QUALITY[q].short}</span></button>
    </div>
    <button class="card free tap" data-go="#/libre"><span class="ce">✨</span><div><b>Demande libre</b><div class="sub">« 40 min haut du corps avec haltères, genou fragile »</div></div><span class="chev">›</span></button>
    ${miniLevel()}
    <h2>Cette semaine</h2>
    <div class="stats">
      <div class="stat"><b>${week.filter(x => x.kind === 'muscu').length}</b><span>séance(s) muscu</span></div>
      <div class="stat"><b>${week.filter(x => x.kind === 'run').length}</b><span>sortie(s) running · ${week.filter(x => x.kind === 'run').reduce((a, x) => a + (x.km || 0), 0).toFixed(1).replace('.', ',')} km</span></div>
    </div>
    <h2>Mes maxis estimés (1RM)</h2>
    <div class="card">${LIFTS.map(l => `<div class="row"><div class="body"><div class="title">${LIFT_NAMES[l]}</div>
      <div class="sub">Semaine ${(p.wave[l] || 0) % 3 + 1}/3 de la vague</div></div><div class="right"><b class="big">${kg(p.lifts[l])} kg</b></div></div>`).join('')}</div>
    <h2>Mes allures</h2>
    <div class="card">
      ${paceRow('Endurance fondamentale (EF)', `${fmtPace(pc.efFast)} – ${fmtPace(pc.efSlow)}`, 'Footing, sortie longue')}
      ${paceRow('Seuil', fmtPace(pc.seuil), `${kmh(pc.seuil)} km/h`)}
      ${paceRow('Fractionné long', fmtPace(pc.interval), `${kmh(pc.interval)} km/h`)}
      ${paceRow('VMA (30/30)', fmtPace(pc.vma), `${kmh(pc.vma)} km/h`)}
      <div class="row"><div class="body sub">Sortie longue actuelle : <b>${p.run.longMin} min</b> · indice VDOT ${p.run.vdot.toFixed(1).replace('.', ',')}</div></div>
    </div>
    <h2>Dernières séances</h2>
    ${histList(S.history.slice(0, 5))}
    ${installHint()}`;
}
const paceRow = (t, v, s) => `<div class="row"><div class="body"><div class="title">${t}</div><div class="sub">${s}</div></div><div class="right"><b class="big">${v}</b><div class="sub">/km</div></div></div>`;
function installHint() {
  const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  if (standalone || localStorage.getItem('seance-nohint')) return '';
  return `<div class="install">📲 Sur iPhone : <b>Partager</b> → <b>Sur l’écran d’accueil</b> pour l’installer comme une app (marche hors ligne).<button data-act="nohint" aria-label="Masquer">✕</button></div>`;
}
function histList(items) {
  if (!items.length) return '<div class="card empty small">Aucune séance pour l’instant.</div>';
  return `<div class="card">${items.map(x => `<button class="row" data-go="#/h/${x.id}"><span class="emoji">${x.kind === 'muscu' ? '🏋️' : '🏃'}</span>
    <div class="body"><div class="title">${esc(x.title.replace(/^\S+\s/, ''))}</div><div class="sub">${fmtDate(x.date)} · ${esc(x.summary || '')}</div></div><span class="chev">›</span></button>`).join('')}</div>`;
}

// ---------- Formulaire : forme du jour ----------
function formFields(kind) {
  const last = P().lastForm || {};
  return `<h2>Ma forme du jour</h2><div class="card pad">${FORM_QUESTIONS.map(q => `
    <div class="slider"><div class="sl-top"><b>${q.label}</b><output id="o_${q.id}"></output></div>
    <input type="range" name="${q.id}" min="1" max="5" step="1" value="${last[q.id] ?? 3}" data-out="${q.id}">
    <div class="sl-ends"><span>${q.lo}</span><span>${q.hi}</span></div></div>`).join('')}
    <div class="form-verdict" id="verdict"></div></div>
    <h2>Douleur ou gêne ?</h2><div class="chips">${PAIN_ZONES.map(z => `<label class="chip"><input type="checkbox" name="pain" value="${z.id}"><span>${z.label}</span></label>`).join('')}</div>
    <p class="hint">${kind === 'muscu' ? 'Les exercices qui sollicitent une zone cochée sont remplacés ou allégés.' : 'En cas de douleur, privilégiez un footing très facile ou le repos.'}</p>`;
}
const LABELS5 = ['', '1 · très mauvais', '2 · mauvais', '3 · moyen', '4 · bon', '5 · excellent'];
function bindForm() {
  const f = $('#app form');
  const upd = () => {
    const vals = {};
    for (const q of FORM_QUESTIONS) { vals[q.id] = +f[q.id].value; $(`#o_${q.id}`).textContent = LABELS5[vals[q.id]]; }
    const r = readiness(vals);
    $('#verdict').innerHTML = `<b>${r.emoji} ${r.label}</b> · ${r.note}`;
    $('#verdict').className = `form-verdict lvl${r.level}`;
  };
  f.addEventListener('input', upd); upd();
}
function readForm(f) {
  const vals = {}; for (const q of FORM_QUESTIONS) vals[q.id] = +f[q.id].value;
  P().lastForm = vals;
  return { vals, form: readiness(vals), pains: [...f.querySelectorAll('[name=pain]:checked')].map(i => i.value) };
}
function confirmReplace() {
  return !S.current || confirm('Une séance est déjà en cours. La remplacer par une nouvelle ?');
}

// ---------- Demande : muscu ----------
function viewMuscuForm() {
  header('Séance muscu', '#/');
  const next = ROTATION[S.rot % ROTATION.length];
  const eq = P().eq;
  $('#app').innerHTML = `<form>
    ${formFields('muscu')}
    <h2>Séance</h2>
    <div class="card">${DAY_TYPES.map(d => `<label class="check radio row"><input type="radio" name="day" value="${d.rot}" ${d.key === next.key ? 'checked' : ''}><span>${d.label}${d.key === next.key ? ' <span class="pill ok">suivante</span>' : ''}</span></label>`).join('')}</div>
    <h2>Temps disponible</h2>
    <div class="seg">${[45, 60, 75, 90].map(m => `<label><input type="radio" name="dur" value="${m}" ${m === (P().lastDur || 60) ? 'checked' : ''}><span>${m} min</span></label>`).join('')}</div>
    <h2>Matériel à disposition</h2>
    <div class="card checks">${EQUIPMENT.map(e => `<label class="check"><input type="checkbox" name="eq" value="${e.id}" ${eq.includes(e.id) ? 'checked' : ''}><span>${e.label}</span></label>`).join('')}</div>
    <p class="hint">Le poids du corps est toujours disponible. Sans barre, les mouvements de base sont remplacés par des variantes.</p>
    <button class="btn primary big" type="submit">Générer ma séance</button>
  </form>`;
  bindForm();
  $('#app form').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    if (!confirmReplace()) return;
    const { form, pains } = readForm(f);
    const eqSel = [...f.querySelectorAll('[name=eq]:checked')].map(i => i.value);
    let rot = +f.day.value;
    // garde la position dans la rotation si l'utilisateur choisit le même type que « suivant »
    if (ROTATION[rot].key === next.key) rot = S.rot % ROTATION.length;
    const duration = +f.dur.value;
    P().eq = eqSel; P().lastDur = duration;
    S.current = { id: uid(), startedAt: Date.now(), ...generateMuscu(P(), { rot, eq: eqSel, form, pains, duration }) };
    S.current.wuDone = {};
    save(); go('#/seance');
  });
}

// ---------- Demande : running ----------
function viewRunForm() {
  header('Séance running', '#/');
  const q = nextQuality();
  $('#app').innerHTML = `<form>
    ${formFields('run')}
    <h2>Type de séance</h2>
    <div class="seg three">
      <label><input type="radio" name="type" value="fractionne" checked><span>Fractionné</span></label>
      <label><input type="radio" name="type" value="long"><span>Sortie longue EF</span></label>
      <label><input type="radio" name="type" value="footing"><span>Footing</span></label>
    </div>
    <div id="subBox"><label>Fractionné</label>
      <select name="sub"><option value="">Automatique (suivant : ${QUALITY[q].label})</option>
      ${QUALITY_ORDER.map(k => `<option value="${k}">${QUALITY[k].label}</option>`).join('')}</select></div>
    <label>Durée maximale (minutes, facultatif)</label>
    <input name="max" inputmode="numeric" placeholder="Sans limite">
    <button class="btn primary big" type="submit">Générer ma séance</button>
  </form>`;
  bindForm();
  const f = $('#app form');
  const toggle = () => { $('#subBox').style.display = f.type.value === 'fractionne' ? '' : 'none'; };
  f.addEventListener('change', toggle); toggle();
  f.addEventListener('submit', e => {
    e.preventDefault();
    if (!confirmReplace()) return;
    const { form } = readForm(f);
    S.current = { id: uid(), startedAt: Date.now(), ...generateRun(P(), { type: f.type.value, sub: f.sub.value, form, maxMin: num(f.max.value) }) };
    save(); go('#/seance');
  });
}

// ---------- Séance ----------
function viewSession() {
  const s = S.current;
  header(esc(s.title.replace(/^\S+\s/, '')), '#/');
  const fb = `<div class="form-verdict lvl${s.form.level}"><b>${s.form.emoji} Forme : ${s.form.label}</b> · ${s.form.note}</div>`;
  $('#app').innerHTML = s.kind === 'muscu' ? muscuHtml(s, fb) : runHtml(s, fb);
}

function muscuHtml(s, fb) {
  const wu = (list, pre) => list.map((w, i) => {
    const k = pre + i, done = s.wuDone?.[k];
    return `<div class="row ${done ? 'is-done' : ''}"><button class="tick ${done ? 'on' : ''}" data-act="wu" data-k="${k}" aria-label="Fait">✓</button>
      <div class="body"><div class="title">${w.name}</div><div class="sub">${w.dose}</div></div>
      ${w.sec ? `<button class="mini" data-act="wutimer" data-sec="${w.sec}" data-label="${esc(w.name)}">⏱ ${fmtDur(w.sec)}</button>` : ''}</div>`;
  }).join('');
  const total = s.exercises.reduce((a, e) => a + e.sets.filter(x => !x.warmup).length, 0);
  const done = s.exercises.reduce((a, e) => a + e.sets.filter(x => !x.warmup && x.done).length, 0);
  return `${fb}
    ${s.intro ? `<div class="banner ai">✨ ${esc(s.intro)}</div>` : ''}
    <p class="muted">${s.duration ? `${s.duration} min · ` : ''}${s.exercises.length} exercices · ${done}/${total} séries faites</p>
    <h2>1 · Échauffement articulaire</h2><div class="card">${wu(s.warmup.articulaire, 'a')}</div>
    <h2>2 · Mobilité spécifique</h2><div class="card">${wu(s.warmup.mobilite, 'm')}</div>
    <h2>3 · Séance</h2>
    ${s.exercises.map((e, i) => exHtml(e, i)).join('')}
    <button class="btn primary big" data-act="finish">Terminer la séance</button>
    <button class="btn danger" data-act="abandon">Abandonner la séance</button>`;
}

function setText(e, st) {
  const reps = st.got ?? st.reps;
  const r = e.type === 'sec' ? `${reps} s` : `${reps}${st.amrap && !st.done ? '+' : ''} reps`;
  if (isLoaded(e.type) && st.w != null) return `${r} × <b>${kg(st.w)}</b> ${unitOf(e.type)}`;
  if (e.type === 'band') return `${r} · élastique`;
  return `${r} · poids du corps`;
}
function exHtml(e, i) {
  let n = 0;
  const sets = e.sets.map((st, j) => {
    const label = st.warmup ? 'Échauf.' : `Série ${++n}`;
    return `<div class="set ${st.done ? 'is-done' : ''} ${st.warmup ? 'wu' : ''}">
      <span class="set-n">${label}</span>
      <button class="set-txt" data-act="editset" data-e="${i}" data-s="${j}">${setText(e, st)}${st.amrap ? ' <span class="pill soon">max</span>' : ''}</button>
      <span class="set-rest">⏱ ${fmtDur(st.rest)}</span>
      ${e.type === 'sec' && !st.done ? `<button class="mini" data-act="hold" data-sec="${st.reps}">▶</button>` : ''}
      <button class="tick ${st.done ? 'on' : ''}" data-act="set" data-e="${i}" data-s="${j}" aria-label="Série faite">✓</button></div>`;
  }).join('');
  return `<div class="card ex">
    <div class="ex-head"><div class="body"><div class="ex-slot">${e.role === 'main' ? 'Principal' : e.role === 'second' ? 'Secondaire' : esc(e.slotName || 'Accessoire')}</div>
      <div class="ex-name">${esc(e.name)}</div><div class="sub">${esc(e.info)}</div>
      ${e.warn ? `<div class="warn">⚠️ ${esc(e.warn)}</div>` : ''}</div>
      ${e.swappable ? `<button class="mini" data-act="swap" data-e="${i}" aria-label="Remplacer l’exercice">🔄</button>` : ''}</div>
    <button class="rest-edit" data-act="rest" data-e="${i}">⏱ Récupération : <b>${fmtDur(e.rest)}</b> · modifier</button>
    ${sets}</div>`;
}

function runHtml(s, fb) {
  const p = s.paces;
  const groups = [];
  for (const st of s.steps) {
    const last = groups[groups.length - 1];
    if (last && st.kind !== 'ef' && last.kind === 'block') last.items.push(st);
    else if (st.kind === 'ef') groups.push({ kind: 'ef', st });
    else groups.push({ kind: 'block', items: [st] });
  }
  const effort = s.type === 'libre' ? (s.steps.find(x => x.kind === 'work') || s.steps[0])?.pace || ''
    : s.type === 'fractionne' ? fmtPace(s.sub === 'seuil' ? p.seuil : s.sub === 'courte' ? p.vma : p.interval) : `${fmtPace(p.efFast)}–${fmtPace(p.efSlow)}`;
  return `${fb}
    ${s.intro ? `<div class="banner ai">✨ ${esc(s.intro)}</div>` : ''}
    ${s.notes.map(n => `<div class="banner">${esc(n)}</div>`).join('')}
    <div class="stats big-stats">
      <div class="stat"><b>${fmtDur(s.totalSec)}</b><span>durée cible</span></div>
      <div class="stat"><b>${esc(effort.replace(' /km', ''))}</b><span>allure ${s.type === 'long' || s.type === 'footing' ? 'EF' : 'des efforts'} /km${s.km ? ` · ≈ ${s.km.toFixed(1).replace('.', ',')} km` : ''}</span></div>
    </div>
    ${s.desc ? `<div class="card pad desc"><b>Corps de séance</b><br>${esc(s.desc)}</div>` : ''}
    <h2>Déroulé</h2>
    <div class="card">${groups.map(g => g.kind === 'ef'
      ? `<div class="row"><span class="emoji">🟢</span><div class="body"><div class="title">${g.st.label}</div><div class="sub">${g.st.note || ''}</div></div><div class="right"><b>${fmtDur(g.st.sec)}</b><div class="sub">${g.st.pace}</div></div></div>`
      : `<div class="row"><span class="emoji">🔴</span><div class="body"><div class="title">${esc(s.desc || 'Fractionné')}</div><div class="sub">${g.items[0].note || ''}</div></div><div class="right"><b>${fmtDur(g.items.reduce((a, x) => a + x.sec, 0))}</b></div></div>`).join('')}</div>
    <button class="btn primary big" data-act="guide">▶ Lancer le guidage chronométré</button>
    <p class="hint">Le minuteur enchaîne les étapes avec un bip. Pour un effort en distance (ex. 1000 m), touchez ⏭ quand vous passez la distance.</p>
    <h2>Conseils</h2><div class="card pad"><ul class="tips">${s.tips.map(t => `<li>${t}</li>`).join('')}</ul></div>
    <h2>Mes zones</h2>
    <div class="card">
      ${paceRow('Endurance fondamentale', `${fmtPace(p.efFast)} – ${fmtPace(p.efSlow)}`, `${kmh(p.efSlow)} – ${kmh(p.efFast)} km/h`)}
      ${paceRow('Seuil', fmtPace(p.seuil), `${kmh(p.seuil)} km/h`)}
      ${paceRow('Fractionné long', fmtPace(p.interval), `${kmh(p.interval)} km/h`)}
      ${paceRow('VMA', fmtPace(p.vma), `${kmh(p.vma)} km/h`)}
    </div>
    <button class="btn primary big" data-act="finish">Terminer la séance</button>
    <button class="btn danger" data-act="abandon">Abandonner la séance</button>`;
}

// ---------- Actions de séance ----------
function restSheet(cur, onSet, extra = '') {
  const presets = [30, 45, 60, 90, 120, 150, 180, 240, 300];
  openSheet('Temps de récupération', `<form>
    <div class="presets">${presets.map(p => `<button type="button" class="preset ${p === cur ? 'on' : ''}" data-p="${p}">${fmtDur(p)}</button>`).join('')}</div>
    <label>Durée personnalisée (min:s)</label>
    <input name="t" value="${Timer.fmtClock(cur)}" inputmode="numeric">
    ${extra}
    <button class="btn primary" type="submit">Valider</button></form>`, f => {
    const t = parseTime(f.t.value.includes(':') ? f.t.value : `0:${f.t.value}`);
    if (!t) { toast('Durée invalide'); return false; }
    onSet(t, f);
  });
  $('#sheet .presets').addEventListener('click', e => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    const f = $('#sheet form'); f.t.value = Timer.fmtClock(+b.dataset.p);
    f.querySelectorAll('.preset').forEach(x => x.classList.toggle('on', x === b));
  });
}

function editSet(ei, si) {
  const e = S.current.exercises[ei], st = e.sets[si];
  const loaded = isLoaded(e.type);
  openSheet(st.warmup ? 'Série d’échauffement' : 'Série', `<form>
    <p class="muted">${esc(e.name)}${st.amrap ? ' · dernière série : faites le maximum de répétitions propres' : ''}</p>
    <div class="${loaded ? 'grid2' : ''}">
      <div><label>${e.type === 'sec' ? 'Secondes réalisées' : 'Répétitions réalisées'}</label><input name="got" inputmode="numeric" value="${st.got ?? st.reps}"></div>
      ${loaded ? `<div><label>Charge (${unitOf(e.type)})</label><input name="w" inputmode="decimal" value="${kg(st.w)}"></div>` : ''}
    </div>
    ${loaded && !st.warmup ? '<label class="check inline"><input type="checkbox" name="all" checked><span>Appliquer la charge aux séries suivantes</span></label>' : ''}
    <label class="check inline"><input type="checkbox" name="done" checked><span>Série faite</span></label>
    <button class="btn primary" type="submit">Enregistrer</button></form>`, f => {
    const got = num(f.got.value); if (got == null) { toast('Nombre invalide'); return false; }
    st.got = got;
    if (loaded) {
      const w = num(f.w.value);
      if (w != null) { st.w = w; if (f.all?.checked) e.sets.forEach((x, k) => { if (k > si && !x.warmup && !x.done) x.w = w; }); }
    }
    const was = st.done; st.done = f.done.checked;
    save(); viewSession();
    if (st.done && !was) afterSet(ei, si);
  });
}

function afterSet(ei, si) {
  const ex = S.current.exercises;
  const isLast = ei === ex.length - 1 && ex[ei].sets.slice(si + 1).every(x => x.done);
  if (isLast) { toast('Dernière série faite 💪 Pensez à terminer la séance.'); return; }
  const st = ex[ei].sets[si];
  const nextEx = ex[ei].sets.slice(si + 1).some(x => !x.done) ? ex[ei] : ex[ei + 1];
  Timer.startRest(st.rest, `Récupération · ensuite : ${nextEx ? nextEx.name : ''}`);
}

$('#app').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  Timer.unlockAudio();
  const s = S.current, a = b.dataset.act;
  if (a === 'nohint') { localStorage.setItem('seance-nohint', '1'); b.parentElement.remove(); return; }
  if (a === 'wu') { s.wuDone[b.dataset.k] = !s.wuDone[b.dataset.k]; save(); viewSessionKeep(); return; }
  if (a === 'wutimer' || a === 'hold') { Timer.start([{ label: b.dataset.label || 'Gainage', sec: +b.dataset.sec }], { mode: 'hold' }); return; }
  if (a === 'set') {
    const ei = +b.dataset.e, si = +b.dataset.s, st = s.exercises[ei].sets[si];
    if (st.done) { st.done = false; delete st.got; save(); viewSessionKeep(); return; }
    if (st.amrap) return editSet(ei, si);
    st.done = true; st.got = st.got ?? st.reps; save(); viewSessionKeep(); afterSet(ei, si); return;
  }
  if (a === 'editset') return editSet(+b.dataset.e, +b.dataset.s);
  if (a === 'rest') {
    const ex = s.exercises[+b.dataset.e];
    return restSheet(ex.rest, t => {
      ex.rest = t; ex.sets.forEach(x => { if (!x.warmup) x.rest = t; });
      save(); viewSessionKeep(); toast(`Récupération : ${fmtDur(t)} pour cet exercice`);
    });
  }
  if (a === 'swap') {
    if (!swapAccessory(P(), s, +b.dataset.e)) toast('Pas d’autre variante avec ce matériel');
    save(); viewSessionKeep(); return;
  }
  if (a === 'guide') {
    Timer.start(s.steps.map(x => ({ label: x.label, sec: x.sec, pace: x.pace, kind: x.kind })), { mode: 'run' });
    requestWake(); return;
  }
  if (a === 'finish') return finish();
  if (a === 'abandon') {
    if (confirm('Abandonner cette séance ? Elle ne sera pas enregistrée.')) { S.current = null; Timer.stop(); save(); go('#/'); }
  }
});
function viewSessionKeep() { const y = window.scrollY; viewSession(); window.scrollTo(0, y); }

function finish() {
  const s = S.current;
  const feels = s.kind === 'run'
    ? [[1, 'Très facile'], [2, 'Bien, maîtrisé'], [3, 'Dur'], [4, 'Trop dur']]
    : [[1, 'Facile'], [2, 'Bien'], [3, 'Dur'], [4, 'Très dur']];
  openSheet('Fin de séance', `<form>
    <label>Ressenti global</label>
    <div class="seg">${feels.map(([v, l]) => `<label><input type="radio" name="feel" value="${v}" ${v === 2 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
    ${s.kind === 'run' ? `<div class="grid2"><div><label>Distance réalisée (km)</label><input name="km" inputmode="decimal" placeholder="${s.km ? s.km.toFixed(1).replace('.', ',') : ''}"></div>
      <div><label>Durée réalisée (min)</label><input name="min" inputmode="numeric" placeholder="${Math.round(s.totalSec / 60)}"></div></div>` : ''}
    <label>Notes</label><textarea name="notes" placeholder="Sensations, douleurs, matériel…"></textarea>
    <button class="btn primary" type="submit">Enregistrer la séance</button></form>`, f => {
    const feel = +f.feel.value;
    let msgs, summary, km = null, min = null, vol = 0;
    if (s.kind === 'muscu') {
      if (feel === 4) s.progress = false; // séance vécue comme très dure : on ne monte pas
      msgs = s.ai ? ['Séance sur mesure : le programme de base n’est pas modifié.'] : applyMuscuProgress(P(), s);
      const n = s.exercises.reduce((a, e) => a + e.sets.filter(x => !x.warmup && x.done).length, 0);
      vol = s.exercises.reduce((a, e) => a + e.sets.filter(x => !x.warmup && x.done && x.w).reduce((b, x) => b + x.w * (x.got ?? x.reps) * (e.type === 'db' ? 2 : 1), 0), 0);
      summary = `${n} séries · ${Math.round(vol).toLocaleString('fr-FR')} kg soulevés`;
      // la rotation avance seulement si on a fait la séance prévue
      if (s.rot === S.rot % ROTATION.length) S.rot = (S.rot + 1) % ROTATION.length;
    } else {
      msgs = applyRunProgress(P(), s, feel);
      km = num(f.km.value) ?? s.km ?? null;
      min = num(f.min.value) ?? Math.round(s.totalSec / 60);
      summary = `${min} min${km ? ` · ${kg(km.toFixed(1))} km` : ''}`;
    }
    const wu = s.warmup ? [...s.warmup.articulaire, ...s.warmup.mobilite].length : 0;
    const entry = { id: s.id, date: Date.now(), kind: s.kind, title: s.title, summary, km, min, vol: Math.round(vol),
      feel: feels.find(x => x[0] === feel)[1], notes: f.notes.value.trim(), msgs, session: s,
      wuComplete: s.kind === 'muscu' && wu > 0 && Object.values(s.wuDone || {}).filter(Boolean).length >= wu,
      flags: [...(msgs.some(m => m.includes('vague terminée')) ? ['wave'] : []), ...(msgs.some(m => m.includes('série max')) ? ['pr'] : [])] };
    entry.xp = Game.entryXp(entry);
    const before = Game.levelOf(Game.totalXp(S)).level;
    S.history.unshift(entry); S.current = null; Timer.stop();
    const ev = Game.evaluate(S, P().level);
    save();
    go(`#/h/${entry.id}`);
    celebrate(entry.xp, ev, before);
  }, 'Enregistrer');
}

// ---------- Gamification ----------
function avatar(rankIndex, cls = '') {
  const url = Manga.avatarUrl({ ...Game.RANKS[rankIndex], index: rankIndex });
  return url ? `<img class="avatar photo ${cls}" src="${url}" alt="Mon avatar manga">` : heroSvg({ ...Game.RANKS[rankIndex], index: rankIndex }, { cls });
}
function miniLevel() {
  const xp = Game.totalXp(S), L = Game.levelOf(xp), R = Game.rankOf(L.level);
  return `<button class="card lvl-mini tap" data-go="#/jeu"><div class="lvl-face">${avatar(R.index)}</div>
    <div class="body"><b>Niveau ${L.level} · ${R.name}</b><div class="xpbar"><i style="width:${Math.round(100 * L.cur / L.need)}%;background:${R.color}"></i></div>
    <div class="sub">${L.cur} / ${L.need} XP</div></div><span class="chev">›</span></button>`;
}
function viewGame() {
  header('Progression');
  const xp = Game.totalXp(S), L = Game.levelOf(xp), R = Game.rankOf(L.level);
  const wk = Game.weekKey(Date.now());
  const es = S.history.filter(h => Game.weekKey(h.date) === wk);
  const done = S.game.quests[wk] || [];
  const quests = Game.weeklyQuests(P().level);
  const streak = Game.activeStreak(S.history);
  const end = new Date(wk); end.setDate(end.getDate() + 7);
  const daysLeft = Math.max(1, Math.ceil((end - Date.now()) / 864e5));
  $('#app').innerHTML = `
    <div class="panel" style="--rc:${R.color}">
      <div class="panel-art ${Manga.hasPhoto() ? 'is-photo' : ''}">${avatar(R.index, 'big')}
        <div class="bubble">${esc(R.quote)}</div>
        <div class="rank-badge">${R.letter}</div></div>
      <div class="panel-info">
        <div class="lvl-num">NIV. <b>${L.level}</b></div>
        <div class="rank-name">Rang ${R.letter} · ${R.name}</div>
        <div class="xpbar big"><i style="width:${Math.round(100 * L.cur / L.need)}%"></i></div>
        <div class="sub">${L.cur} / ${L.need} XP vers le niveau ${L.level + 1} · ${xp.toLocaleString('fr-FR')} XP au total</div>
        ${R.next ? `<div class="sub">Prochain rang : <b>${R.next.letter} · ${R.next.name}</b> au niveau ${R.next.lvl}</div>` : '<div class="sub">Rang maximal atteint 👑</div>'}
      </div>
    </div>
    <button class="btn photo-btn" data-act3="photo">📸 ${Manga.hasPhoto() ? 'Modifier mon avatar' : 'Utiliser ma photo ou une illustration'}</button>
    <div class="stats">
      <div class="stat"><b>🔥 ${streak}</b><span>semaine${streak > 1 ? 's' : ''} active${streak > 1 ? 's' : ''} d’affilée</span></div>
      <div class="stat"><b>${Object.keys(S.game.badges).length} / ${Game.BADGES.length}</b><span>badges</span></div>
    </div>
    <h2>Quêtes de la semaine · encore ${daysLeft} j</h2>
    <div class="card">${quests.map(q => {
      const n = Math.min(q.goal, q.count(es)), ok = done.includes(q.id);
      return `<div class="row quest ${ok ? 'ok' : ''}"><span class="emoji">${ok ? '✅' : q.icon}</span><div class="body"><div class="title">${q.label}</div>
        <div class="xpbar"><i style="width:${Math.round(100 * n / q.goal)}%"></i></div></div><div class="right"><b>${n}/${q.goal}</b><div class="sub">+${q.xp} XP</div></div></div>`;
    }).join('')}
      <div class="row quest ${done.includes('perfect') ? 'ok' : ''}"><span class="emoji">${done.includes('perfect') ? '✅' : '⭐'}</span><div class="body"><div class="title">Semaine parfaite</div><div class="sub">Toutes les quêtes remplies</div></div><div class="right"><div class="sub">+${Game.PERFECT_XP} XP</div></div></div>
    </div>
    <h2>Badges</h2>
    <div class="badges">${Game.BADGES.map(b => { const t = S.game.badges[b.id];
      return `<div class="badge ${t ? 'got' : ''}"><span>${t ? b.icon : '🔒'}</span><b>${b.name}</b><small>${b.desc}</small></div>`; }).join('')}</div>
    <h2>Les rangs</h2>
    <div class="card">${Game.RANKS.map((x, i) => `<div class="row ${i > R.index ? 'locked' : ''}"><span class="rank-chip" style="background:${x.color}">${x.letter}</span>
      <div class="body"><div class="title">${x.name}</div><div class="sub">À partir du niveau ${x.lvl}</div></div>${i === R.index ? '<span class="pill ok">actuel</span>' : ''}</div>`).join('')}</div>
    <p class="hint">XP : séance terminée (+60), chaque série de travail (+5), échauffement complet (+25), minutes de course (+1,5/min), séance de qualité (+25), quêtes et badges en bonus.</p>`;
}

$('#app').addEventListener('click', e => { if (e.target.closest('[data-act3=photo]')) photoEditor(); });

function photoEditor() {
  const R = Game.rankOf(Game.levelOf(Game.totalXp(S)).level);
  let src = Manga.hasPhoto() ? localStorage.getItem('seance-photo') : null;
  let srcImg = null;
  const o = Manga.getOpts();
  openSheet('Avatar manga', `<form>
    <p class="muted">Prenez un selfie ou choisissez une photo : elle est transformée en case de manga directement sur le téléphone (rien n’est envoyé). Vous pouvez aussi importer une illustration déjà dessinée (par exemple créée avec une IA d’images) et la garder telle quelle.</p>
    <div class="grid2"><button type="button" class="btn primary" data-ph="pick">📷 Photo / selfie</button>
      ${src ? '<button type="button" class="btn danger" data-ph="del">Supprimer</button>' : '<span></span>'}</div>
    <div class="ph-wrap" ${src ? '' : 'hidden'}><canvas id="phCanvas" class="ph-canvas"></canvas>
      <p class="hint">Glissez l’image pour la recadrer.</p>
      <label class="check inline"><input type="checkbox" name="raw" ${o.raw ? 'checked' : ''}><span>Illustration : garder l’image telle quelle (sans filtre manga)</span></label>
      <label>Zoom</label><input type="range" name="zoom" min="1" max="3" step="0.05" value="${o.zoom}">
      <label>Traits</label><input type="range" name="lines" min="0" max="1" step="0.05" value="${o.lines}">
      <label>Ombres et trames</label><input type="range" name="shade" min="0" max="1" step="0.05" value="${o.shade}">
      <button class="btn primary big" type="submit">Utiliser cet avatar</button></div>
    <input type="file" accept="image/*" id="phFile" hidden></form>`, f => {
    if (!src) { toast('Choisissez d’abord une photo'); return false; }
    Manga.savePhoto(src, o).then(() => { toast('Avatar manga enregistré 🔥'); viewGame(); });
  }, 'OK');
  const f = $('#sheet form'), cv = $('#phCanvas');
  let timer = null;
  const full = () => { if (srcImg) Manga.renderTo(cv, srcImg, o, R); };
  const later = () => { clearTimeout(timer); timer = setTimeout(full, 120); };
  const load = async url => { src = url; srcImg = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; }); f.querySelector('.ph-wrap').hidden = false; full(); };
  if (src) load(src);
  f.addEventListener('input', e => {
    if (e.target.name === 'raw') { o.raw = e.target.checked; return later(); }
    if (o[e.target.name] != null) { o[e.target.name] = +e.target.value; later(); }
  });
  f.addEventListener('click', e => {
    const b = e.target.closest('[data-ph]'); if (!b) return;
    if (b.dataset.ph === 'pick') $('#phFile').click();
    if (b.dataset.ph === 'del' && confirm('Supprimer l’image et revenir à l’athlète dessiné ?')) { Manga.removePhoto(); closeSheet(); viewGame(); }
  });
  $('#phFile').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    busy('Préparation de la photo…');
    try { Object.assign(o, { zoom: 1, dx: 0, dy: 0 }); f.zoom.value = 1; await load(await Manga.fileToPhoto(file)); }
    catch { toast('Photo illisible'); } finally { busy(false); }
  });
  // recadrage au doigt
  let drag = null;
  cv.addEventListener('pointerdown', e => { if (!srcImg) return; drag = { x: e.clientX, y: e.clientY, dx: o.dx, dy: o.dy }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    const w = cv.getBoundingClientRect().width;
    o.dx = Math.max(-1, Math.min(1, drag.dx - (e.clientX - drag.x) / w * 2));
    o.dy = Math.max(-1, Math.min(1, drag.dy - (e.clientY - drag.y) / w * 2));
    Manga.drawCrop(cv.getContext('2d'), srcImg, o);
  });
  const end = () => { if (drag) { drag = null; full(); } };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
}

function celebrate(xp, ev, before) {
  const total = Game.totalXp(S), L = Game.levelOf(total), R = Game.rankOf(L.level);
  const up = L.level > before, rankUp = Game.rankOf(before).index < R.index;
  const el = $('#celebrate');
  el.innerHTML = `<div class="cel-box" style="--rc:${R.color}">
    <div class="cel-rays"></div>
    <div class="cel-title">${rankUp ? 'NOUVEAU RANG !' : up ? 'LEVEL UP !' : 'BIEN JOUÉ !'}</div>
    <div class="cel-art">${avatar(R.index, 'big')}</div>
    ${up ? `<div class="cel-lvl">Niveau ${before} → <b>${L.level}</b>${rankUp ? `<br>Rang ${R.letter} · ${R.name}` : ''}</div>` : `<div class="cel-lvl">Niveau ${L.level} · encore ${L.need - L.cur} XP</div>`}
    <div class="cel-xp">+${xp + ev.bonus} XP</div>
    <ul class="cel-list">
      <li>Séance terminée : +${xp} XP</li>
      ${ev.quests.map(q => `<li>${q.icon} Quête réussie : ${q.label} (+${q.xp})</li>`).join('')}
      ${ev.perfect ? `<li>⭐ Semaine parfaite ! (+${Game.PERFECT_XP})</li>` : ''}
      ${ev.badges.map(b => `<li>${b.icon} Badge « ${b.name} » (+100)</li>`).join('')}
    </ul>
    <button class="btn primary" data-cel="ok">Continuer</button></div>`;
  el.classList.add('show');
  if (navigator.vibrate) navigator.vibrate(up ? [80, 60, 80, 60, 200] : 80);
}
$('#celebrate').addEventListener('click', e => { if (e.target.closest('[data-cel]') || e.target.id === 'celebrate') $('#celebrate').classList.remove('show'); });

// ---------- Demande libre (Claude) ----------
const EXAMPLES = [
  '45 min haut du corps avec seulement des haltères de 10 et 20 kg',
  'Séance jambes sans squat, j’ai une gêne au genou gauche',
  'Fractionné court sur piste, j’ai 40 minutes',
  'Footing de 30 min avec quelques accélérations',
  'Full body rapide en 30 min à l’hôtel, poids du corps uniquement',
];
function viewFreeForm() {
  header('Demande libre', '#/');
  const key = getApiKey();
  $('#app').innerHTML = !key ? `<div class="card pad">
      <p>✨ La demande libre utilise <b>Claude</b> pour composer une séance sur mesure à partir de votre texte, en tenant compte de votre niveau, de vos charges, de vos allures et de votre forme.</p>
      <p class="muted">Il faut une clé API Claude (créée sur <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>, quelques centimes par séance). Elle reste sur ce téléphone.</p>
      <button class="btn primary" data-go="#/profil">Ajouter ma clé dans le profil</button></div>`
    : `<form>
    <label>Que voulez-vous faire aujourd’hui ?</label>
    <textarea name="req" rows="4" placeholder="${esc(EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)])}" required></textarea>
    <div class="chips ex-chips">${EXAMPLES.map(x => `<button type="button" class="chip-btn">${esc(x)}</button>`).join('')}</div>
    ${formFields('muscu')}
    <button class="btn primary big" type="submit">✨ Composer ma séance</button>
    <p class="hint">Matériel par défaut : celui coché lors de votre dernière séance muscu, sauf si vous en citez un autre.</p>
  </form>`;
  if (!key) return;
  bindForm();
  const f = $('#app form');
  f.querySelector('.ex-chips').addEventListener('click', e => { const b = e.target.closest('.chip-btn'); if (b) { f.req.value = b.textContent; f.req.focus(); } });
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const request = f.req.value.trim();
    if (!request) return toast('Décrivez la séance souhaitée');
    if (!confirmReplace()) return;
    const { vals, form, pains } = readForm(f);
    busy('Claude compose votre séance…');
    try {
      const r = await askClaude({ request, profile: P(), history: S.history, form: { ...form, vals }, pains, eq: P().eq });
      S.current = { id: uid(), startedAt: Date.now(), request, ...toSession(r, P(), { form, pains, eq: P().eq }) };
      save(); go('#/seance');
    } catch (err) {
      console.error(err);
      toast(err?.status === 401 ? '❌ Clé API refusée' : `❌ ${err?.message?.slice(0, 80) || 'Pas de connexion'}`);
    } finally { busy(false); }
  });
}

// ---------- Historique ----------
function viewHistory() {
  header('Historique');
  $('#app').innerHTML = histList(S.history);
}
function viewHistoryItem(id) {
  const x = S.history.find(h => h.id === id);
  if (!x) return go('#/historique');
  header(esc(x.title.replace(/^\S+\s/, '')), '#/historique');
  const s = x.session;
  let body = '';
  if (x.kind === 'muscu') {
    body = s.exercises.map(e => {
      const sets = e.sets.filter(st => !st.warmup && st.done);
      if (!sets.length) return '';
      return `<div class="row"><div class="body"><div class="title">${esc(e.name)}</div><div class="sub">${sets.map(st => setText(e, st).replace(/<[^>]+>/g, '')).join(' · ')}</div></div></div>`;
    }).join('') || '<div class="empty small">Aucune série cochée.</div>';
  } else {
    body = `<div class="row"><div class="body"><div class="title">${esc(s.desc || s.steps[0].label)}</div><div class="sub">Durée cible ${fmtDur(s.totalSec)} · EF ${fmtPace(s.paces.efFast)}–${fmtPace(s.paces.efSlow)} /km</div></div></div>`;
  }
  $('#app').innerHTML = `
    <p class="muted">${new Date(x.date).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}</p>
    <div class="stats"><div class="stat"><b>${s.form.emoji} ${s.form.label}</b><span>forme avant la séance</span></div>
      <div class="stat"><b>${esc(x.feel)}</b><span>ressenti${x.xp ? ` · +${x.xp} XP` : ''}</span></div></div>
    ${x.session.request ? `<div class="banner ai">✨ Demande : « ${esc(x.session.request)} »</div>` : ''}
    <h2>Résumé</h2><div class="card">${body}</div>
    ${x.msgs?.length ? `<h2>Progression</h2><div class="card pad"><ul class="tips">${x.msgs.map(m => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}
    ${x.notes ? `<h2>Notes</h2><div class="card pad">${esc(x.notes)}</div>` : ''}
    <button class="btn" data-go="#/">Accueil</button>
    <button class="btn danger" data-del="${x.id}">Supprimer de l’historique</button>`;
}

// ---------- Profil ----------
function viewProfile() {
  const p = P(), first = !p.setup;
  header(first ? 'Bienvenue 👋' : 'Mon profil');
  const r = p.run;
  $('#app').innerHTML = `<form id="pf">
    ${first ? '<p class="muted">Quelques infos pour adapter les séances à votre niveau. Tout reste modifiable ensuite.</p>' : ''}
    <h2>Niveau</h2>
    <div class="seg three">${Object.entries(LEVELS).map(([k, l]) => `<label><input type="radio" name="level" value="${k}" ${p.level === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
    <p class="hint">Débutant : moins d’un an de pratique régulière. Avancé : plus de 3 ans et charges solides.</p>
    <label>Poids de corps (kg)</label><input name="bw" inputmode="decimal" value="${kg(p.bodyweight)}">
    <h2>Muscu : charges maximales (1RM)</h2>
    <div class="card pad">
      <p class="hint" style="margin-top:0">Indiquez votre max sur 1 répétition. Si vous ne le connaissez pas, utilisez le calcul à partir d’une série (charge × répétitions), ou laissez vide : il sera estimé d’après votre niveau et votre poids.</p>
      ${LIFTS.map(l => `<div class="lift"><label>${LIFT_NAMES[l]}</label>
        <div class="lift-row"><input name="max_${l}" inputmode="decimal" placeholder="1RM kg" value="${p.setup && p.lifts[l] ? kg(p.lifts[l]) : ''}">
        <span class="or">ou</span><input name="w_${l}" inputmode="decimal" placeholder="kg"><span class="or">×</span><input name="r_${l}" inputmode="numeric" placeholder="reps"></div></div>`).join('')}
    </div>
    <h2>Running : chrono de référence</h2>
    <div class="card pad">
      <p class="hint" style="margin-top:0">Votre meilleur temps récent (moins de 3 mois) sur une distance. Il sert à calculer vos allures. Laissez vide si vous n’en avez pas.</p>
      <div class="grid2"><div><label>Distance</label><select name="dist">${DIST.map(d => `<option value="${d.m}" ${d.m === r.refDist ? 'selected' : ''}>${d.l}</option>`).join('')}</select></div>
      <div><label>Temps (h:mm:ss ou mm:ss)</label><input name="time" value="${r.refTime ? hms(r.refTime) : ''}" placeholder="ex. 25:30"></div></div>
      <div id="pacePrev" class="hint"></div>
      ${p.setup ? `<label>Durée actuelle de la sortie longue (min)</label><input name="long" inputmode="numeric" value="${r.longMin}">` : ''}
    </div>
    <button class="btn primary big" type="submit">${first ? 'C’est parti' : 'Enregistrer'}</button>
    ${first ? '' : `
      <h2>Programme</h2>
      <div class="card pad"><p class="hint" style="margin-top:0">Muscu : vagues de 3 semaines sur les mouvements de base (${(WAVES[p.level] || WAVES.inter).map(w => `${w.sets}×${w.reps} à ${Math.round(w.pct * 100)} %`).join(', puis ')}), +2,5 kg (haut du corps) ou +5 kg (bas du corps) à chaque vague réussie. Accessoires en double progression.</p>
      <button class="btn" type="button" data-act2="resetprog">Remettre les vagues et le fractionné au début</button></div>
      <h2>Demande libre (Claude)</h2>
      <div class="card pad"><p class="hint" style="margin-top:0">${getApiKey() ? '✅ Clé enregistrée : la demande libre est active.' : 'Ajoutez une clé API Claude pour décrire vos séances en texte libre.'}
        Clé créée sur <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a> (quelques centimes par séance). Elle reste sur ce téléphone et n’est pas incluse dans les sauvegardes.</p>
        <input id="apiKey" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(getApiKey())}">
        <div class="actions2"><button class="btn primary" type="button" data-act2="savekey">Enregistrer la clé</button><button class="btn" type="button" data-act2="delkey">Retirer</button></div></div>
      <h2>Sauvegarde</h2>
      <button class="btn" type="button" data-act2="export">Exporter mes données</button>
      <button class="btn" type="button" data-act2="import">Importer une sauvegarde</button>
      <button class="btn danger" type="button" data-act2="reset">Tout effacer</button>`}
  </form>`;
  const f = $('#pf');
  const prev = () => {
    const t = parseTime(f.time.value);
    const box = $('#pacePrev');
    if (!t) { box.textContent = ''; return; }
    const v = vdotFrom(+f.dist.value, t);
    if (!(v > 15 && v < 90)) { box.textContent = 'Temps peu plausible pour cette distance.'; return; }
    const pc = paces(v);
    box.innerHTML = `Indice VDOT ${v.toFixed(1).replace('.', ',')} · EF ${fmtPace(pc.efFast)}–${fmtPace(pc.efSlow)} /km · seuil ${fmtPace(pc.seuil)} · VMA ${fmtPace(pc.vma)} (${kmh(pc.vma)} km/h) · 10 km estimé ${hms(predictTime(v, 10000))}`;
  };
  f.addEventListener('input', prev); prev();
  f.addEventListener('click', e => {
    const b = e.target.closest('[data-act2]'); if (!b) return;
    const a = b.dataset.act2;
    if (a === 'export') return exportData();
    if (a === 'savekey') {
      const k = $('#apiKey').value.trim(); if (!k) return toast('Collez votre clé');
      busy('Vérification de la clé…');
      testApiKey(k).then(() => { setApiKey(k); toast('✅ Clé valide et enregistrée'); viewProfile(); })
        .catch(err => { console.error(err); toast('❌ Clé refusée ou pas de connexion'); })
        .finally(() => busy(false));
      return;
    }
    if (a === 'delkey') { setApiKey(''); toast('Clé retirée'); return viewProfile(); }
    if (a === 'import') return $('#importFile').click();
    if (a === 'reset' && confirm('Effacer profil, historique et progression ?')) { localStorage.removeItem(KEY); S = blank(); go('#/profil'); render(); }
    if (a === 'resetprog' && confirm('Repartir en semaine 1 et au premier niveau de fractionné ?')) {
      p.wave = {}; p.fails = {}; p.run.qLevel = { ...START_LEVEL[p.level] }; save(); toast('Programme remis au début');
    }
  });
  f.addEventListener('submit', e => {
    e.preventDefault();
    const level = f.level.value, bw = num(f.bw.value) || 75;
    const levelChanged = level !== p.level;
    p.level = level; p.bodyweight = bw;
    for (const l of LIFTS) {
      let m = num(f[`max_${l}`].value);
      const w = num(f[`w_${l}`].value), rp = num(f[`r_${l}`].value);
      if (w && rp) m = epley(w, Math.min(rp, 12));
      if (!m) m = p.setup && p.lifts[l] ? p.lifts[l] : bw * DEFAULT_RATIOS[level][l];
      p.lifts[l] = roundLoad(m, 'bar');
    }
    const t = parseTime(f.time.value);
    if (t) { const v = vdotFrom(+f.dist.value, t); if (v > 15 && v < 90) { p.run.vdot = +v.toFixed(2); p.run.refDist = +f.dist.value; p.run.refTime = t; } }
    else if (!p.setup) p.run.vdot = DEFAULT_VDOT[level];
    if (!p.setup || levelChanged) {
      p.run.qLevel = { ...START_LEVEL[level] };
      if (!p.setup) p.run.longMin = LONG_START[level];
    }
    if (f.long) p.run.longMin = num(f.long.value) || p.run.longMin;
    const wasFirst = !p.setup;
    p.setup = true; save();
    toast(wasFirst ? 'Profil créé 💪' : 'Profil enregistré');
    go('#/');
  });
}

function exportData() {
  const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
  const name = `seances-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) { navigator.share({ files: [file], title: 'Sauvegarde séances' }).catch(() => {}); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
$('#importFile').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    if (!d?.profile || !Array.isArray(d.history)) throw new Error();
    if (!confirm('Remplacer les données actuelles par cette sauvegarde ?')) return;
    S = d; save(); toast('Sauvegarde importée'); go('#/'); render();
  } catch { toast('Fichier de sauvegarde invalide'); }
});

// ---------- Global ----------
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go); return; }
  const d = e.target.closest('[data-del]');
  if (d && confirm('Supprimer cette séance de l’historique ? (la progression déjà appliquée est conservée)')) {
    S.history = S.history.filter(x => x.id !== d.dataset.del); save(); go('#/historique');
  }
});
document.addEventListener('pointerdown', Timer.unlockAudio, { once: true });

$('#timer').addEventListener('click', e => {
  const b = e.target.closest('[data-t]'); if (!b) return;
  const a = b.dataset.t;
  if (a === 'stop') Timer.stop();
  else if (a === 'minus') Timer.add(-15);
  else if (a === 'plus') Timer.add(15);
  else if (a === 'pause') Timer.togglePause();
  else if (a === 'skip') Timer.skip();
  else if (a === 'back') Timer.back();
  else if (a === 'edit') restSheet(Math.max(1, Math.round(Timer.left())), t => Timer.setLeft(t));
});

// Garder l'écran allumé pendant une séance (si le navigateur le permet)
let wake = null;
async function requestWake() {
  try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch { /* */ }
}
Timer.setListener(t => { if (t) requestWake(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && (S.current || Timer.current())) requestWake(); });

Timer.restore();
Manga.init().finally(render);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
