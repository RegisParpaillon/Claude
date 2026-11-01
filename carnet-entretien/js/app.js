import { PLANS, GENERIC, KIND_EMOJI } from './plans.js';
import { prepareFile, analyzeWithClaude, analyzeOffline, testApiKey, norm } from './scan.js';

const KEY = 'garage-v2';
const KEY_API = 'garage-apikey';
const DAY = 86400000;

/* =========================================================
   Stockage
   ========================================================= */

const clone = o => JSON.parse(JSON.stringify(o));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function vehicleFromPlan(plan, planKey) {
  return {
    id: uid(), planKey, name: plan.name, emoji: plan.emoji || KIND_EMOJI[plan.kind], kind: plan.kind,
    model: plan.model || '', plate: '', firstReg: '', km: null, kmLog: [],
    tires: clone(plan.tires), tasks: clone(plan.tasks),
  };
}

function defaultDb() {
  return { vehicles: ['v220', 'fxdr', 'vtt'].map(k => vehicleFromPlan(PLANS[k], k)), entries: [] };
}

let db = load();
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.vehicles) && Array.isArray(d.entries)) return d;
  } catch (e) {}
  const d = defaultDb();
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
  return d;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { toast('⚠️ Enregistrement impossible (mémoire pleine ?)'); }
}
const getApiKey = () => { try { return localStorage.getItem(KEY_API) || ''; } catch (e) { return ''; } };
const setApiKey = k => { try { k ? localStorage.setItem(KEY_API, k) : localStorage.removeItem(KEY_API); } catch (e) {} };

// Photos de factures : IndexedDB (trop lourdes pour localStorage).
const idb = (() => {
  let p;
  const open = () => p || (p = new Promise((res, rej) => {
    const r = indexedDB.open('garage-factures', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('f');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => {
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction('f', mode), s = t.objectStore('f');
      const r = fn(s);
      t.oncomplete = () => res(r && r.result);
      t.onerror = () => rej(t.error);
    });
  };
  return {
    get: k => tx('readonly', s => s.get(k)),
    set: (k, v) => tx('readwrite', s => s.put(v, k)),
    del: k => tx('readwrite', s => s.delete(k)),
    all: () => tx('readonly', s => s.getAllKeys()).then(async keys => {
      const out = {};
      for (const k of keys) out[k] = await tx('readonly', s => s.get(k));
      return out;
    }),
    clear: () => tx('readwrite', s => s.clear()),
  };
})();

/* =========================================================
   Utilitaires
   ========================================================= */

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const toDate = s => new Date(s + 'T12:00:00');
const isoOf = d => d.toISOString().slice(0, 10);
const daysUntil = s => Math.round((toDate(s) - toDate(today())) / DAY);
const fmtDate = s => s ? toDate(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const fmtMonth = d => d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
const fmtEur = n => (Number(n) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const fmtKm = n => Math.round(Number(n) || 0).toLocaleString('fr-FR') + ' km';
const num = v => {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const fmtInterval = t => {
  const p = [];
  if (t.km) p.push(fmtKm(t.km));
  if (t.months) p.push(t.months < 1 ? `${Math.round(t.months * 30)} jours` : t.months % 12 === 0 ? `${t.months / 12} an${t.months > 12 ? 's' : ''}` : `${t.months} mois`);
  return p.join(' ou ') || 'Sans échéance';
};
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
}
const vehicleById = id => db.vehicles.find(v => v.id === id);
const entriesOf = vid => db.entries.filter(e => e.vehicleId === vid)
  .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.km || 0) - (a.km || 0));

/* =========================================================
   Kilométrage et échéances
   ========================================================= */

function recordKm(v, km, date = today()) {
  if (km == null) return;
  v.kmLog = (v.kmLog || []).filter(r => r.date !== date || r.km > km);
  v.kmLog.push({ date, km });
  v.kmLog.sort((a, b) => a.date.localeCompare(b.date));
  const latest = v.kmLog.reduce((m, r) => (r.km > m ? r.km : m), v.km ?? 0);
  v.km = latest;
}

// Kilomètres parcourus par jour, estimés sur les relevés (au moins 2 semaines d'écart).
function kmPerDay(v) {
  const log = (v.kmLog || []).filter(r => r.km != null);
  if (log.length < 2) return null;
  const a = log[0], b = log[log.length - 1];
  const days = (toDate(b.date) - toDate(a.date)) / DAY;
  if (days < 30 || b.km <= a.km) return null;
  return (b.km - a.km) / days;
}

function lastDone(v, taskId) {
  return entriesOf(v.id).find(e => (e.tasks || []).includes(taskId)) || null;
}

function taskStatus(v, t) {
  const last = lastDone(v, t.id);
  if (!last) return { state: 'unknown', rank: 3, text: 'Jamais renseigné', last: null };
  let dueKm = null, leftKm = null, dueDate = null, leftDays = null;
  if (t.km && last.km != null) {
    dueKm = last.km + t.km;
    if (v.km != null) leftKm = dueKm - v.km;
  }
  if (t.months) {
    dueDate = isoOf(new Date(toDate(last.date).getTime() + Math.round(t.months * 30.44) * DAY));
    leftDays = daysUntil(dueDate);
  }
  const soonDays = Math.min(30, Math.max(2, (t.months || 0) * 30.44 * 0.2));
  const soonKm = Math.max(50, (t.km || 0) * 0.1);
  let state = 'ok';
  if ((leftKm != null && leftKm <= 0) || (leftDays != null && leftDays < 0)) state = 'late';
  else if ((leftKm != null && leftKm <= soonKm) || (leftDays != null && leftDays <= soonDays)) state = 'soon';

  const parts = [];
  if (leftKm != null) {
    if (leftKm <= 0) parts.push(`dépassé de ${fmtKm(-leftKm)}`);
    else {
      let s = `dans ${fmtKm(leftKm)}`;
      const rate = kmPerDay(v);
      // Date estimée seulement si elle arrive avant l'échéance en temps.
      if (rate && (leftDays == null || leftKm / rate < leftDays)) s += ` (≈ ${fmtMonth(new Date(Date.now() + leftKm / rate * DAY))})`;
      parts.push(s);
    }
  } else if (dueKm != null) parts.push(`à ${fmtKm(dueKm)}`);
  if (leftDays != null) {
    parts.push(leftDays < 0 ? `en retard de ${-leftDays} j` : leftDays === 0 ? "aujourd'hui" :
      leftDays <= 60 ? `dans ${leftDays} j` : `le ${fmtDate(dueDate)}`);
  }
  if (!parts.length) parts.push(t.km && last.km == null ? 'km de la dernière fois inconnu' : 'pas d\'échéance');
  const rank = state === 'late' ? 0 : state === 'soon' ? 1 : 2;
  // Tri : le plus proche d'abord (en jours équivalents).
  const rate = kmPerDay(v) || 30;
  const eta = Math.min(leftDays ?? Infinity, leftKm != null ? leftKm / rate : Infinity);
  return { state, rank, eta, text: parts.join(' · '), last, dueKm, dueDate };
}

const pill = s => s === 'late' ? '<span class="pill late">En retard</span>'
  : s === 'soon' ? '<span class="pill soon">Bientôt</span>'
  : s === 'unknown' ? '<span class="pill unk">À renseigner</span>'
  : '<span class="pill ok">OK</span>';

function allDue() {
  const out = [];
  for (const v of db.vehicles) for (const t of v.tasks) {
    const s = taskStatus(v, t);
    if (s.state === 'late' || s.state === 'soon') out.push({ v, t, s });
  }
  return out.sort((a, b) => a.s.rank - b.s.rank || a.s.eta - b.s.eta);
}

/* =========================================================
   Navigation et écrans
   ========================================================= */

let view = { name: 'home' };
function go(v) { view = v; render(); window.scrollTo(0, 0); }

function render() {
  if (view.name === 'vehicle' && !vehicleById(view.id)) view = { name: 'home' };
  ({ home: renderHome, vehicle: () => renderVehicle(view.id), settings: renderSettings })[view.name]();
}

function header(html) { $('#hdr').innerHTML = html; }

function renderHome() {
  header(`<h1>Mon garage</h1><button class="icon-btn" id="setBtn" aria-label="Réglages">⚙️</button>`);
  $('#setBtn').onclick = () => go({ name: 'settings' });
  $('#fab').style.display = '';
  $('#fab').onclick = () => openActions();

  let h = installBanner();
  h += `<div class="scan-cta"><button class="btn primary big" id="scanBtn">📷 Scanner une facture</button>
    <button class="btn" id="manualBtn">✍️ Saisir un entretien</button></div>`;

  const due = allDue();
  h += `<h2>À faire</h2>`;
  if (!due.length) h += `<div class="card"><div class="empty small">Rien d'urgent 👍</div></div>`;
  else h += `<div class="card">` + due.map(({ v, t, s }) => `
    <button class="row" data-task="${v.id}|${t.id}">
      <div class="emoji">${v.emoji}</div>
      <div class="body"><div class="title">${esc(t.name)}</div>
      <div class="sub">${esc(v.name)} · ${esc(s.text)}</div></div>${pill(s.state)}</button>`).join('') + `</div>`;

  h += `<h2>Mes véhicules</h2><div class="card">` + db.vehicles.map(v => {
    const st = v.tasks.map(t => taskStatus(v, t));
    const late = st.filter(s => s.state === 'late').length, soon = st.filter(s => s.state === 'soon').length;
    const unk = st.filter(s => s.state === 'unknown').length;
    const badge = late ? `<span class="pill late">${late} en retard</span>` : soon ? `<span class="pill soon">${soon} bientôt</span>`
      : unk === st.length ? '<span class="pill unk">À configurer</span>' : '<span class="pill ok">À jour</span>';
    return `<button class="row" data-vehicle="${v.id}">
      <div class="emoji big">${v.emoji}</div>
      <div class="body"><div class="title">${esc(v.name)}</div>
      <div class="sub">${v.km != null ? fmtKm(v.km) : 'Kilométrage à renseigner'}${unk && unk < st.length ? ` · ${unk} à renseigner` : ''}</div></div>
      ${badge}<span class="chev">›</span></button>`;
  }).join('') + `</div><button class="btn" id="addVehicle">＋ Ajouter un véhicule</button>`;

  $('#app').innerHTML = h;
  bindCommon();
  $('#scanBtn').onclick = () => startScan();
  $('#manualBtn').onclick = () => openEntryForm({});
  $('#addVehicle').onclick = () => openAddVehicle();
}

function renderVehicle(id) {
  const v = vehicleById(id);
  header(`<button class="back" id="back">‹ Garage</button><h1></h1>
    <button class="icon-btn" id="editV" aria-label="Modifier le véhicule">✏️</button>`);
  $('#back').onclick = () => go({ name: 'home' });
  $('#editV').onclick = () => openVehicleForm(v);
  $('#fab').style.display = '';
  $('#fab').onclick = () => openActions(v.id);

  const es = entriesOf(id);
  const year = String(new Date().getFullYear());
  const spentYear = es.filter(e => (e.date || '').startsWith(year)).reduce((s, e) => s + (Number(e.cost) || 0), 0);
  const total = es.reduce((s, e) => s + (Number(e.cost) || 0), 0);

  let h = `<div class="vhead"><div class="vemoji">${v.emoji}</div><div>
    <div class="vname">${esc(v.name)}</div>
    <div class="sub">${esc([v.model, v.plate].filter(Boolean).join(' · ')) || '&nbsp;'}</div></div></div>`;
  h += `<div class="stats">
    <button class="stat tap" id="kmBtn"><b>${v.km != null ? fmtKm(v.km) : '—'}</b><span>Kilométrage · mettre à jour</span></button>
    <div class="stat"><b>${fmtEur(spentYear)}</b><span>Dépensé en ${year}</span></div></div>`;

  h += `<div class="actions2"><button class="btn primary" id="vScan">📷 Scanner une facture</button>
    <button class="btn" id="vManual">✍️ Saisir</button></div>`;

  // Pression des pneus.
  const tires = v.tires || {};
  h += `<h2>Pression des pneus</h2><button class="card tires tap" id="tiresBtn">
    <div><span>Avant</span><b>${tires.front ? esc(tires.front) + ' bar' : '—'}</b></div>
    <div><span>Arrière</span><b>${tires.rear ? esc(tires.rear) + ' bar' : '—'}</b></div>
    ${tires.note ? `<p>${esc(tires.note)}</p>` : ''}</button>`;

  // Plan d'entretien.
  const rows = v.tasks.map(t => ({ t, s: taskStatus(v, t) }))
    .sort((a, b) => a.s.rank - b.s.rank || (a.s.eta ?? 0) - (b.s.eta ?? 0) || (b.t.important ? 1 : 0) - (a.t.important ? 1 : 0));
  h += `<h2>Plan d'entretien</h2><div class="card">` + rows.map(({ t, s }) => `
    <div class="row">
      <button class="body plain" data-task="${v.id}|${t.id}">
        <div class="title">${esc(t.name)}</div>
        <div class="sub">${s.state === 'unknown' ? 'Tous les ' + esc(fmtInterval(t)) + ' · touchez pour renseigner' : esc(s.text)}</div>
      </button>
      ${t.quick ? `<button class="done-btn" data-quick="${v.id}|${t.id}" aria-label="Fait aujourd'hui">✓</button>` : pill(s.state)}
    </div>`).join('') + `</div><button class="btn" id="addTask">＋ Ajouter un point d'entretien</button>`;

  // Historique.
  h += `<h2>Historique${es.length ? ' · ' + fmtEur(total) : ''}</h2>`;
  if (!es.length) h += `<div class="card"><div class="empty small">Aucune intervention enregistrée.</div></div>`;
  else h += `<div class="card">` + es.map(e => {
    const names = (e.tasks || []).map(tid => v.tasks.find(t => t.id === tid)?.name).filter(Boolean);
    const title = names.length ? names.join(', ') : (e.other || '').split('\n')[0] || 'Intervention';
    return `<button class="row" data-entry="${e.id}"><div class="body">
      <div class="title wrap">${e.invoice ? '🧾 ' : ''}${esc(title)}</div>
      <div class="sub">${fmtDate(e.date)}${e.km != null ? ' · ' + fmtKm(e.km) : ''}${e.garage ? ' · ' + esc(e.garage) : ''}</div>
      </div><div class="right">${e.cost ? fmtEur(e.cost) : ''}</div></button>`;
  }).join('') + `</div>`;

  $('#app').innerHTML = h;
  bindCommon();
  $('#kmBtn').onclick = () => openKmForm(v);
  $('#tiresBtn').onclick = () => openTiresForm(v);
  $('#vScan').onclick = () => startScan(v.id);
  $('#vManual').onclick = () => openEntryForm({ vehicleId: v.id });
  $('#addTask').onclick = () => openTaskForm(v, null);
  $('#app').querySelectorAll('[data-quick]').forEach(b => b.onclick = () => {
    const [vid, tid] = b.dataset.quick.split('|');
    const veh = vehicleById(vid);
    db.entries.push({ id: uid(), vehicleId: vid, date: today(), km: veh.km, tasks: [tid], garage: '', cost: null, other: '', notes: '' });
    save(); render(); toast('✓ Noté pour aujourd\'hui');
  });
}

function bindCommon() {
  $('#app').querySelectorAll('[data-vehicle]').forEach(b => b.onclick = () => go({ name: 'vehicle', id: b.dataset.vehicle }));
  $('#app').querySelectorAll('[data-task]').forEach(b => b.onclick = () => {
    const [vid, tid] = b.dataset.task.split('|');
    const v = vehicleById(vid);
    openTaskSheet(v, v.tasks.find(t => t.id === tid));
  });
  $('#app').querySelectorAll('[data-entry]').forEach(b => b.onclick = () => openEntryForm(db.entries.find(e => e.id === b.dataset.entry)));
  const ci = $('#closeInstall');
  if (ci) ci.onclick = () => { try { localStorage.setItem('hideInstall', '1'); } catch (e) {} render(); };
}

function installBanner() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  let hidden = false; try { hidden = localStorage.getItem('hideInstall') === '1'; } catch (e) {}
  if (!ios || standalone || hidden) return '';
  return `<div class="install"><button id="closeInstall" aria-label="Fermer">✕</button>
    <b>Installer sur l'iPhone :</b> touchez <b>Partager</b> ⬆️ puis <b>« Sur l'écran d'accueil »</b>.</div>`;
}

function renderSettings() {
  header(`<button class="back" id="back">‹ Garage</button><h1></h1>`);
  $('#back').onclick = () => go({ name: 'home' });
  $('#fab').style.display = 'none';
  const key = getApiKey();
  $('#app').innerHTML = `
    <h1 class="page-title">Réglages</h1>
    <h2>Lecture des factures</h2>
    <div class="card pad">
      <p class="muted">${key ? '✅ Lecture intelligente activée (Claude).' : 'Mode actuel : <b>lecture sur le téléphone</b> (gratuit, hors ligne, mais moins précis).'}
      Pour une reconnaissance fiable des travaux, ajoutez une clé API Claude (créée sur
      <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>,
      quelques centimes par facture). La clé reste sur ce téléphone et n'est pas incluse dans les sauvegardes.</p>
      <label for="apiKey">Clé API Claude</label>
      <input id="apiKey" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(key)}">
      <div class="actions2"><button class="btn primary" id="saveKey">Enregistrer</button>
      <button class="btn" id="delKey">Retirer</button></div>
    </div>
    <h2>Sauvegarde</h2>
    <div class="card pad">
      <p class="muted">Les données restent uniquement sur ce téléphone. Exportez régulièrement une sauvegarde
      (Fichiers, iCloud Drive, mail…).</p>
      <button class="btn primary" id="exp">Exporter (avec photos de factures)</button>
      <button class="btn" id="expLight">Exporter sans les photos</button>
      <button class="btn" id="imp">Importer une sauvegarde</button>
    </div>
    <h2>Données</h2>
    <div class="card pad"><p class="muted">${db.vehicles.length} véhicule(s), ${db.entries.length} intervention(s).</p>
      <button class="btn danger" id="wipe">Tout effacer et recommencer</button></div>
    <p class="muted center">Les intervalles proposés sont indicatifs : vérifiez-les avec le carnet constructeur
    et ajustez-les dans chaque véhicule.</p>`;
  $('#saveKey').onclick = async () => {
    const k = $('#apiKey').value.trim();
    if (!k) return toast('Collez votre clé');
    busy('Vérification de la clé…');
    try { await testApiKey(k); setApiKey(k); toast('✅ Clé valide et enregistrée'); render(); }
    catch (e) { toast('❌ Clé refusée ou pas de connexion'); console.error(e); }
    finally { busy(false); }
  };
  $('#delKey').onclick = () => { setApiKey(''); render(); toast('Clé retirée'); };
  $('#exp').onclick = () => exportData(true);
  $('#expLight').onclick = () => exportData(false);
  $('#imp').onclick = () => $('#importFile').click();
  $('#wipe').onclick = async () => {
    if (!confirm('Effacer tous les véhicules, interventions et factures ? Action définitive.')) return;
    db = defaultDb(); save(); await idb.clear().catch(() => {}); go({ name: 'home' }); toast('Données réinitialisées');
  };
}

/* =========================================================
   Feuilles modales
   ========================================================= */

function openSheet(title, inner, onSave, saveLabel = 'OK') {
  $('#sheet').innerHTML = `<div class="sheet-head"><button type="button" id="sCancel">Annuler</button>
    <b>${esc(title)}</b>${onSave ? `<button type="button" class="save" id="sSave">${esc(saveLabel)}</button>` : '<span style="width:60px"></span>'}</div>
    <form autocomplete="off" novalidate>${inner}<button type="submit" hidden></button></form>`;
  $('#sheetBg').classList.add('open');
  requestAnimationFrame(() => $('#sheet').classList.add('open'));
  $('#sheet').scrollTop = 0;
  $('#sCancel').onclick = closeSheet;
  $('#sheetBg').onclick = closeSheet;
  const form = $('#sheet form');
  const submit = async ev => { ev && ev.preventDefault(); if (!onSave) return; if (await onSave(form) !== false) closeSheet(); };
  if (onSave) $('#sSave').onclick = submit;
  form.onsubmit = submit;
  return form;
}
function closeSheet() {
  $('#sheet').classList.remove('open'); $('#sheetBg').classList.remove('open');
  if (document.activeElement) document.activeElement.blur();
}

function busy(msg) {
  const b = $('#busy');
  if (msg === false) { b.classList.remove('show'); return; }
  b.querySelector('span').textContent = msg; b.classList.add('show');
}

function openActions(vehicleId) {
  openSheet('Ajouter', `
    <button type="button" class="btn primary big" id="aScan">📷 Scanner une facture</button>
    <p class="hint">Photo, image de la photothèque ou PDF : les travaux sont reconnus et pré-remplis.</p>
    <button type="button" class="btn" id="aManual">✍️ Saisir un entretien</button>
    <button type="button" class="btn" id="aKm">🔢 Mettre à jour un kilométrage</button>`, null);
  $('#aScan').onclick = () => { closeSheet(); startScan(vehicleId); };
  $('#aManual').onclick = () => { closeSheet(); setTimeout(() => openEntryForm({ vehicleId }), 280); };
  $('#aKm').onclick = () => { closeSheet(); setTimeout(() => openKmForm(vehicleById(vehicleId) || db.vehicles[0]), 280); };
}

/* ---------- Formulaire d'intervention ---------- */

function openEntryForm(e, opts = {}) {
  if (!db.vehicles.length) return toast('Ajoutez d\'abord un véhicule');
  const isNew = !e.id;
  e = { date: today(), tasks: [], ...e };
  if (!vehicleById(e.vehicleId)) e.vehicleId = (view.name === 'vehicle' && view.id) || db.vehicles[0].id;
  let invoice = opts.invoice || null; // dataURL de la nouvelle photo
  let removeInvoice = false;

  const vOpts = db.vehicles.map(v => `<option value="${v.id}" ${v.id === e.vehicleId ? 'selected' : ''}>${v.emoji} ${esc(v.name)}</option>`).join('');
  const banner = opts.scan ? `<div class="banner ${opts.scan.engine}">
      ${opts.scan.engine === 'claude' ? '✨ Facture lue par Claude.' : '📱 Facture lue sur le téléphone : vérifiez bien.'}
      ${opts.scan.summary ? `<br><i>${esc(opts.scan.summary)}</i>` : ''}
      ${!opts.scan.vehicleId ? '<br><b>Véhicule non reconnu : choisissez-le.</b>' : ''}</div>` : '';

  const form = openSheet(isNew ? (opts.scan ? 'Facture scannée' : 'Nouvel entretien') : 'Intervention', `
    ${banner}
    <label for="fV">Véhicule</label><select id="fV" name="vehicleId">${vOpts}</select>
    <div class="grid2">
      <div><label for="fDate">Date</label><input id="fDate" type="date" name="date" value="${esc(e.date)}"></div>
      <div><label for="fKm">Kilométrage</label><input id="fKm" name="km" inputmode="numeric" value="${e.km ?? ''}"></div>
    </div>
    <label>Travaux réalisés</label>
    <div class="card checks" id="fTasks"></div>
    <label for="fOther">Autres travaux / pièces</label>
    <textarea id="fOther" name="other" placeholder="Une ligne par opération">${esc(e.other || '')}</textarea>
    <div class="grid2">
      <div><label for="fGarage">Garage</label><input id="fGarage" name="garage" value="${esc(e.garage || '')}"></div>
      <div><label for="fCost">Montant TTC (€)</label><input id="fCost" name="cost" inputmode="decimal" value="${e.cost ?? ''}"></div>
    </div>
    <label for="fNotes">Notes</label><textarea id="fNotes" name="notes">${esc(e.notes || '')}</textarea>
    <label>Facture</label>
    <div id="fInv" class="inv"></div>
    ${isNew ? '' : '<button type="button" class="btn danger" id="delEntry">Supprimer cette intervention</button>'}
  `, async f => {
    const v = vehicleById(f.vehicleId.value);
    const tasks = [...f.querySelectorAll('input[name="task"]:checked')].map(c => c.value);
    const other = f.other.value.trim();
    if (!tasks.length && !other) { toast('Cochez au moins un travail ou décrivez-le'); return false; }
    const data = {
      vehicleId: v.id, date: f.date.value || today(), km: num(f.km.value), tasks, other,
      garage: f.garage.value.trim(), cost: num(f.cost.value), notes: f.notes.value.trim(),
    };
    let entry;
    if (isNew) { entry = { id: uid(), ...data }; db.entries.push(entry); }
    else { entry = db.entries.find(x => x.id === e.id); Object.assign(entry, data); }
    try {
      if (invoice) { await idb.set(entry.id, invoice); entry.invoice = true; }
      else if (removeInvoice) { await idb.del(entry.id); entry.invoice = false; }
    } catch (err) { toast('⚠️ Photo de facture non enregistrée'); }
    if (data.km != null) recordKm(v, data.km, data.date);
    save();
    if (view.name === 'vehicle' && view.id !== v.id) view = { name: 'vehicle', id: v.id };
    render(); toast('Enregistré');
  });

  const drawTasks = () => {
    const v = vehicleById(form.vehicleId.value);
    const sorted = [...v.tasks].sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0));
    $('#fTasks').innerHTML = sorted.map(t => `<label class="check">
      <input type="checkbox" name="task" value="${t.id}" ${e.tasks.includes(t.id) ? 'checked' : ''}>
      <span>${esc(t.name)}</span></label>`).join('');
    if (isNew && !opts.scan && !form.km.value && v.km != null) form.km.placeholder = String(v.km);
  };
  form.vehicleId.onchange = () => { e.tasks = [...form.querySelectorAll('input[name="task"]:checked')].map(c => c.value); drawTasks(); };
  drawTasks();

  const drawInv = async () => {
    let src = invoice;
    if (!src && e.invoice && !removeInvoice) src = await idb.get(e.id).catch(() => null);
    $('#fInv').innerHTML = src
      ? `<img src="${src}" alt="Facture" id="invImg"><div class="actions2">
         <button type="button" class="btn" id="invView">Agrandir</button><button type="button" class="btn danger" id="invDel">Retirer</button></div>`
      : `<button type="button" class="btn" id="invAdd">📎 Joindre une photo</button>`;
    if (src) {
      $('#invView').onclick = () => { const w = window.open(); if (w) w.document.write(`<img src="${src}" style="width:100%">`); };
      $('#invDel').onclick = () => { invoice = null; removeInvoice = true; drawInv(); };
    } else {
      $('#invAdd').onclick = () => pickFile(async file => {
        busy('Préparation…');
        try { const p = await prepareFile(file); invoice = p.image; removeInvoice = false; drawInv(); }
        catch (err) { toast('Fichier illisible'); }
        finally { busy(false); }
      });
    }
  };
  drawInv();

  const del = $('#delEntry');
  if (del) del.onclick = async () => {
    if (!confirm('Supprimer cette intervention ?')) return;
    db.entries = db.entries.filter(x => x.id !== e.id);
    await idb.del(e.id).catch(() => {});
    save(); closeSheet(); render(); toast('Supprimé');
  };
}

/* ---------- Point d'entretien : détail, édition ---------- */

function openTaskSheet(v, t) {
  const s = taskStatus(v, t);
  const hist = entriesOf(v.id).filter(e => (e.tasks || []).includes(t.id));
  openSheet(t.name, `
    <div class="card pad">
      <div class="statusline">${pill(s.state)} <span>${esc(s.state === 'unknown' ? 'Indiquez la dernière fois que c\'a été fait pour calculer la prochaine échéance.' : s.text)}</span></div>
      <p class="muted">Intervalle : ${esc(fmtInterval(t))}${s.dueDate || s.dueKm ? `<br>Prochaine fois : ${[s.dueKm ? 'à ' + fmtKm(s.dueKm) : '', s.dueDate ? 'avant le ' + fmtDate(s.dueDate) : ''].filter(Boolean).join(' ou ')}` : ''}</p>
      ${t.note ? `<p class="muted">ℹ️ ${esc(t.note)}</p>` : ''}
    </div>
    <button type="button" class="btn primary" id="tDone">✓ Fait aujourd'hui</button>
    <button type="button" class="btn" id="tPast">📅 Fait à une autre date…</button>
    <h2>Historique</h2>
    ${hist.length ? `<div class="card">` + hist.map(e => `<button type="button" class="row" data-entry="${e.id}"><div class="body">
      <div class="title">${fmtDate(e.date)}</div><div class="sub">${e.km != null ? fmtKm(e.km) : 'km inconnu'}${e.garage ? ' · ' + esc(e.garage) : ''}</div></div>
      <div class="right">${e.cost ? fmtEur(e.cost) : ''}</div></button>`).join('') + `</div>` : '<p class="muted">Jamais enregistré.</p>'}
    <button type="button" class="btn" id="tEdit">⚙️ Modifier l'intervalle</button>`, null);
  $('#tDone').onclick = () => {
    db.entries.push({ id: uid(), vehicleId: v.id, date: today(), km: v.km, tasks: [t.id], garage: '', cost: null, other: '', notes: '' });
    save(); closeSheet(); render(); toast('✓ Enregistré');
  };
  $('#tPast').onclick = () => { closeSheet(); setTimeout(() => openEntryForm({ vehicleId: v.id, tasks: [t.id], km: null }), 280); };
  $('#tEdit').onclick = () => { closeSheet(); setTimeout(() => openTaskForm(v, t), 280); };
  $('#sheet').querySelectorAll('[data-entry]').forEach(b => b.onclick = () => {
    closeSheet(); setTimeout(() => openEntryForm(db.entries.find(e => e.id === b.dataset.entry)), 280);
  });
}

function openTaskForm(v, t) {
  const isNew = !t;
  t = t || { name: '', km: null, months: 12, note: '' };
  openSheet(isNew ? 'Nouveau point' : 'Modifier', `
    <label for="tName">Nom</label><input id="tName" name="name" value="${esc(t.name)}" placeholder="ex. Vidange de pont">
    <div class="grid2">
      <div><label for="tKm">Tous les (km)</label><input id="tKm" name="km" inputmode="numeric" value="${t.km ?? ''}" placeholder="—"></div>
      <div><label for="tMonths">Ou tous les (mois)</label><input id="tMonths" name="months" inputmode="decimal" value="${t.months ?? ''}" placeholder="—"></div>
    </div>
    <p class="hint">Laissez vide le critère qui ne s'applique pas. 0,5 mois = 15 jours.</p>
    <label for="tNote">Note</label><textarea id="tNote" name="note">${esc(t.note || '')}</textarea>
    <label class="check inline"><input type="checkbox" name="important" ${t.important ? 'checked' : ''}><span>Entretien important</span></label>
    <label class="check inline"><input type="checkbox" name="quick" ${t.quick ? 'checked' : ''}><span>Bouton ✓ rapide (contrôle fréquent)</span></label>
    ${isNew ? '' : '<button type="button" class="btn danger" id="tDel">Supprimer ce point du plan</button>'}
  `, f => {
    const name = f.name.value.trim();
    if (!name) { toast('Indiquez un nom'); return false; }
    const data = { name, km: num(f.km.value) || null, months: num(f.months.value) || null, note: f.note.value.trim(),
      important: f.important.checked, quick: f.quick.checked };
    if (isNew) v.tasks.push({ id: uid(), ...data, kw: [norm(name)] });
    else Object.assign(t, data);
    save(); render(); toast('Enregistré');
  });
  const d = $('#tDel');
  if (d) d.onclick = () => {
    if (!confirm(`Retirer « ${t.name} » du plan ? (l'historique est conservé)`)) return;
    v.tasks = v.tasks.filter(x => x !== t); save(); closeSheet(); render();
  };
}

/* ---------- Véhicule ---------- */

function openKmForm(v) {
  if (!v) return;
  openSheet('Kilométrage', `
    <label for="kV">Véhicule</label><select id="kV" name="vehicleId">${db.vehicles.map(x => `<option value="${x.id}" ${x.id === v.id ? 'selected' : ''}>${x.emoji} ${esc(x.name)}</option>`).join('')}</select>
    <label for="kKm">Compteur actuel (km)</label><input id="kKm" name="km" inputmode="numeric" placeholder="${v.km ?? ''}">
    <p class="hint">Mettez-le à jour de temps en temps : l'appli estime alors la date des prochains entretiens.</p>`, f => {
    const veh = vehicleById(f.vehicleId.value);
    const km = num(f.km.value);
    if (km == null) { toast('Indiquez un kilométrage'); return false; }
    if (veh.km != null && km < veh.km && !confirm(`Le compteur était à ${fmtKm(veh.km)}. Corriger à ${fmtKm(km)} ?`)) return false;
    if (veh.km != null && km < veh.km) { veh.kmLog = (veh.kmLog || []).filter(r => r.km <= km); veh.km = null; }
    recordKm(veh, km); save(); render(); toast('Kilométrage mis à jour');
  });
  setTimeout(() => $('#kKm') && $('#kKm').focus(), 350);
}

function openTiresForm(v) {
  const t = v.tires || {};
  openSheet('Pression des pneus', `
    <div class="grid2">
      <div><label for="pF">Avant (bar)</label><input id="pF" name="front" inputmode="decimal" value="${esc(t.front || '')}"></div>
      <div><label for="pR">Arrière (bar)</label><input id="pR" name="rear" inputmode="decimal" value="${esc(t.rear || '')}"></div>
    </div>
    <label for="pN">Note</label><textarea id="pN" name="note">${esc(t.note || '')}</textarea>`, f => {
    v.tires = { front: f.front.value.trim(), rear: f.rear.value.trim(), note: f.note.value.trim() };
    save(); render();
  });
}

function openVehicleForm(v) {
  openSheet('Véhicule', `
    <div class="grid-emoji">
      <div><label for="vE">Icône</label><input id="vE" name="emoji" value="${esc(v.emoji)}" maxlength="4"></div>
      <div><label for="vN">Nom</label><input id="vN" name="name" value="${esc(v.name)}"></div>
    </div>
    <label for="vM">Modèle</label><input id="vM" name="model" value="${esc(v.model || '')}">
    <div class="grid2">
      <div><label for="vP">Immatriculation</label><input id="vP" name="plate" value="${esc(v.plate || '')}" autocapitalize="characters"></div>
      <div><label for="vR">1re immatriculation</label><input id="vR" name="firstReg" type="date" value="${esc(v.firstReg || '')}"></div>
    </div>
    <p class="hint">L'immatriculation permet de reconnaître le véhicule sur les factures.</p>
    ${v.planKey && PLANS[v.planKey] ? '<button type="button" class="btn" id="vReset">Rétablir le plan d\'entretien par défaut</button>' : ''}
    <button type="button" class="btn danger" id="vDel">Supprimer ce véhicule</button>`, f => {
    const name = f.name.value.trim();
    if (!name) { toast('Indiquez un nom'); return false; }
    Object.assign(v, { name, emoji: f.emoji.value.trim() || KIND_EMOJI[v.kind], model: f.model.value.trim(),
      plate: f.plate.value.trim().toUpperCase(), firstReg: f.firstReg.value });
    save(); render(); toast('Enregistré');
  });
  const r = $('#vReset');
  if (r) r.onclick = () => {
    if (!confirm('Remplacer le plan actuel par le plan par défaut ? (l\'historique est conservé)')) return;
    v.tasks = clone(PLANS[v.planKey].tasks); save(); closeSheet(); render(); toast('Plan rétabli');
  };
  $('#vDel').onclick = async () => {
    if (!confirm(`Supprimer « ${v.name} » et tout son historique ?`)) return;
    for (const e of db.entries.filter(x => x.vehicleId === v.id && x.invoice)) await idb.del(e.id).catch(() => {});
    db.vehicles = db.vehicles.filter(x => x !== v);
    db.entries = db.entries.filter(x => x.vehicleId !== v.id);
    save(); closeSheet(); go({ name: 'home' }); toast('Supprimé');
  };
}

function openAddVehicle() {
  const missing = Object.entries(PLANS).filter(([k]) => !db.vehicles.some(v => v.planKey === k));
  openSheet('Ajouter un véhicule', `
    ${missing.map(([k, p]) => `<button type="button" class="btn" data-plan="${k}">${p.emoji} ${esc(p.name)}</button>`).join('')}
    <h2>Autre véhicule</h2>
    ${Object.entries(GENERIC).map(([k, p]) => `<button type="button" class="btn" data-generic="${k}">${KIND_EMOJI[k]} ${esc(p.name)}</button>`).join('')}`, null);
  $('#sheet').querySelectorAll('[data-plan],[data-generic]').forEach(b => b.onclick = () => {
    const v = b.dataset.plan ? vehicleFromPlan(PLANS[b.dataset.plan], b.dataset.plan) : vehicleFromPlan(GENERIC[b.dataset.generic], null);
    db.vehicles.push(v); save(); closeSheet();
    go({ name: 'vehicle', id: v.id });
    setTimeout(() => openVehicleForm(v), 300);
  });
}

/* =========================================================
   Scan de facture
   ========================================================= */

let pickCb = null;
function pickFile(cb) { pickCb = cb; $('#scanFile').value = ''; $('#scanFile').click(); }
$('#scanFile').onchange = ev => { const f = ev.target.files[0]; if (f && pickCb) pickCb(f); };

function startScan(vehicleId) {
  pickFile(async file => {
    busy('Lecture de la facture…');
    try {
      const prepared = await prepareFile(file);
      const key = getApiKey();
      let r;
      if (key && navigator.onLine !== false) {
        busy('Analyse de la facture par Claude…');
        try { r = await analyzeWithClaude(key, prepared, db.vehicles); }
        catch (err) { console.error(err); toast('Claude indisponible, lecture sur le téléphone…'); }
      }
      if (!r) {
        busy('Lecture du texte (peut prendre 20-30 s)…');
        r = await analyzeOffline(prepared, db.vehicles, p => busy(`Lecture du texte… ${p} %`));
      }
      busy(false);
      const vid = r.vehicleId || vehicleId || (view.name === 'vehicle' ? view.id : db.vehicles[0]?.id);
      openEntryForm({ vehicleId: vid, date: r.date || today(), km: r.km, garage: r.garage, cost: r.cost,
        tasks: r.tasks, other: r.other }, { invoice: prepared.image, scan: r });
    } catch (err) {
      console.error(err); busy(false);
      toast('Impossible de lire ce fichier');
    }
  });
}

/* =========================================================
   Sauvegarde / restauration
   ========================================================= */

async function exportData(withPhotos) {
  busy('Préparation de la sauvegarde…');
  try {
    const invoices = withPhotos ? await idb.all().catch(() => ({})) : {};
    const json = JSON.stringify({ app: 'carnet-entretien-garage', version: 2, exportedAt: new Date().toISOString(), ...db, invoices });
    const name = `garage-sauvegarde-${today()}.json`;
    const file = new File([json], name, { type: 'application/json' });
    busy(false);
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return; }
      catch (err) { if (err.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  } finally { busy(false); }
}

$('#importFile').onchange = async ev => {
  const f = ev.target.files[0]; ev.target.value = '';
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!Array.isArray(d.vehicles) || !Array.isArray(d.entries)) throw new Error('format');
    if (!confirm(`Remplacer les données actuelles par cette sauvegarde (${d.vehicles.length} véhicule(s), ${d.entries.length} intervention(s)) ?`)) return;
    db = { vehicles: d.vehicles, entries: d.entries };
    save();
    await idb.clear().catch(() => {});
    for (const [k, v] of Object.entries(d.invoices || {})) await idb.set(k, v).catch(() => {});
    db.entries.forEach(e => { if (e.invoice && !(d.invoices || {})[e.id]) e.invoice = false; });
    save(); go({ name: 'home' }); toast('Sauvegarde importée');
  } catch (e) { toast('Fichier de sauvegarde invalide'); }
};

/* =========================================================
   Démarrage
   ========================================================= */

render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
