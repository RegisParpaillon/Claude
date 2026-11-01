// Minuteur : décompte de récupération (modifiable) et guidage pas à pas des séances de course.
// Basé sur une heure de fin : reste juste même si l'écran se verrouille ou si l'app passe en arrière-plan.

let ctx = null;
let T = null;           // { steps, i, endAt, paused, left, onEnd, ctxLabel }
let tick = null, lastBeep = null, onChange = () => {};
const KEY = 'seance-timer';

export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* pas de son */ }
}
function beep(freq = 880, dur = .15, vol = .3) {
  if (!ctx) return;
  try {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq; o.type = 'sine';
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
  } catch { /* ignore */ }
}
function endSignal() {
  beep(988, .25, .4); setTimeout(() => beep(1319, .45, .4), 260);
  if (navigator.vibrate) navigator.vibrate([300, 120, 300]);
}

const fmt = s => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const fmtClock = fmt;

export function setListener(fn) { onChange = fn; }
export function current() { return T; }
export function left() {
  if (!T) return 0;
  return T.paused ? T.left : (T.endAt - Date.now()) / 1000;
}

function save() { try { T ? localStorage.setItem(KEY, JSON.stringify({ ...T, onEnd: undefined })) : localStorage.removeItem(KEY); } catch { /* */ } }

export function start(steps, opts = {}) {
  unlockAudio();
  T = { steps, i: 0, endAt: Date.now() + steps[0].sec * 1000, paused: false, left: steps[0].sec, done: false,
    mode: opts.mode || 'rest', ref: opts.ref || null };
  lastBeep = null; save(); run(); render();
}
export function startRest(sec, label = 'Récupération', ref = null) {
  start([{ label, sec }], { mode: 'rest', ref });
}
export function restore() {
  try {
    const t = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (t && !t.done) { T = t; run(); render(); }
  } catch { /* */ }
}
function run() { clearInterval(tick); tick = setInterval(update, 250); }

function update() {
  if (!T || T.paused || T.done) return render();
  const l = left();
  const whole = Math.ceil(l);
  if (l <= 3.05 && l > 0 && lastBeep !== whole) { lastBeep = whole; beep(660, .12, .25); }
  if (l <= 0) {
    if (T.i < T.steps.length - 1) {
      T.i++; T.endAt = Date.now() + T.steps[T.i].sec * 1000; lastBeep = null; endSignal(); save();
    } else {
      T.done = true; endSignal(); save(); clearInterval(tick);
      if (navigator.vibrate) navigator.vibrate([400, 150, 400]);
      setTimeout(() => { if (T && T.done) stop(); }, 12000);
    }
  }
  render();
}

export function add(sec) {
  if (!T || T.done) return;
  if (T.paused) T.left = Math.max(1, T.left + sec);
  else T.endAt = Math.max(Date.now() + 1000, T.endAt + sec * 1000);
  save(); render();
}
export function setLeft(sec) {
  if (!T) return;
  T.done = false;
  if (T.paused) T.left = sec; else T.endAt = Date.now() + sec * 1000;
  T.steps[T.i].sec = sec; lastBeep = null; save(); run(); render();
}
export function togglePause() {
  if (!T || T.done) return;
  if (T.paused) { T.endAt = Date.now() + T.left * 1000; T.paused = false; }
  else { T.left = left(); T.paused = true; }
  save(); render();
}
export function skip() {
  if (!T) return;
  if (T.i < T.steps.length - 1) { T.i++; T.endAt = Date.now() + T.steps[T.i].sec * 1000; T.paused = false; lastBeep = null; save(); render(); }
  else stop();
}
export function back() {
  if (!T || T.i === 0) return;
  T.i--; T.endAt = Date.now() + T.steps[T.i].sec * 1000; T.paused = false; T.done = false; lastBeep = null; save(); run(); render();
}
export function stop() { T = null; clearInterval(tick); save(); render(); }

function render() {
  const el = document.getElementById('timer');
  if (!el) return;
  if (!T) { el.dataset.key = ''; el.classList.remove('show'); document.body.classList.remove('has-timer'); onChange(null); return; }
  const st = T.steps[T.i];
  const l = T.done ? 0 : left();
  const pct = T.done ? 100 : Math.min(100, 100 * (1 - l / st.sec));
  const next = T.steps[T.i + 1];
  el.className = `timer show ${T.done ? 'done' : ''} ${st.kind || ''}`;
  document.body.classList.add('has-timer');
  const key = `${T.i}|${T.done}|${T.paused}|${T.steps.length}|${st.label}|${st.sec}`;
  if (el.dataset.key === key) {
    // mise à jour légère : on ne remplace pas les boutons (sinon les appuis se perdent)
    el.querySelector('.t-bar i').style.width = pct + '%';
    el.querySelector('.t-time span').textContent = T.done ? '0:00' : fmt(l);
    return;
  }
  el.dataset.key = key;
  el.innerHTML = `
    <div class="t-bar"><i style="width:${pct}%"></i></div>
    <div class="t-top">
      <div class="t-label">${T.done ? (T.mode === 'rest' ? 'Repos terminé : à vous !' : 'Séance terminée 🎉') : st.label}
        ${T.steps.length > 1 ? `<span class="t-count">${T.i + 1}/${T.steps.length}</span>` : ''}</div>
      <button class="t-x" data-t="stop" aria-label="Fermer le minuteur">✕</button>
    </div>
    ${st.pace && !T.done ? `<div class="t-pace">Allure : <b>${st.pace}</b></div>` : ''}
    <button class="t-time" data-t="edit" aria-label="Modifier le temps"><span>${T.done ? '0:00' : fmt(l)}</span>${T.paused ? ' <small>pause</small>' : ''}</button>
    ${next && !T.done ? `<div class="t-next">Ensuite : ${next.label} · ${fmt(next.sec)}</div>` : ''}
    <div class="t-btns">
      ${T.steps.length > 1 ? '<button data-t="back" aria-label="Étape précédente">⏮</button>' : ''}
      <button data-t="minus">−15 s</button>
      <button data-t="pause" class="main">${T.paused ? '▶' : '⏸'}</button>
      <button data-t="plus">+15 s</button>
      <button data-t="skip" aria-label="Passer">⏭</button>
    </div>`;
  onChange(T);
}
