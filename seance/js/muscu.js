import { MAIN, SLOTS, ROTATION, WAVES, warmupFor, LIFT_NAMES } from './data.js';

const STEP = { bar: 2.5, db: 2, db1: 2, kb: 4, machine: 2.5, cable: 2.5 };
export const BAR = 20;

export function roundLoad(w, type) {
  const s = STEP[type];
  if (!s) return null;
  if (type === 'bar') return Math.max(BAR, Math.round(w / s) * s);
  return Math.max(s, Math.round(w / s) * s);
}
export function unitOf(type) {
  return { db: 'kg / haltère', db1: 'kg', kb: 'kg', bar: 'kg', machine: 'kg', cable: 'kg' }[type] || '';
}
export const isLoaded = type => !!STEP[type];
const hasAll = (req, eq) => req.every(r => eq.includes(r));
const painful = (ex, pains) => (ex.tags || []).some(t => pains.includes(t));

export function epley(w, reps) { return reps <= 1 ? w : w * (1 + reps / 30); }

function refMax(profile, ref) {
  if (ref === 'pdc') return profile.bodyweight || 75;
  return profile.lifts[ref] || 50;
}

// Choix de la variante d'un mouvement principal selon le matériel
function pickMainVariant(lift, eq, pains) {
  const vs = MAIN[lift].variants.filter(v => hasAll(v.req, eq));
  return vs.find(v => !painful(v, pains)) || vs[0];
}

function mainBlock(profile, lift, role, eq, form, pains) {
  const v = pickMainVariant(lift, eq, pains);
  const hurt = painful(v, pains);
  const extraLoad = hurt ? .9 : 1;
  if (v.type === 'bar') {
    const wave = WAVES[profile.level] || WAVES.inter;
    let scheme;
    if (role === 'main') scheme = { ...wave[(profile.wave[lift] || 0) % 3] };
    else scheme = { sets: 3, reps: 10, pct: .6, rest: 120 };
    const sets = Math.max(2, scheme.sets + form.setDelta);
    const w = roundLoad(profile.lifts[lift] * scheme.pct * form.load * extraLoad, 'bar');
    const ex = {
      id: v.id, lift, role, name: v.name, type: 'bar', rest: scheme.rest, swappable: false,
      info: role === 'main'
        ? `Mouvement principal · semaine ${(profile.wave[lift] || 0) % 3 + 1}/3 de la vague · ${Math.round(scheme.pct * 100)} % du max estimé (${profile.lifts[lift]} kg)`
        : `Mouvement secondaire · ${Math.round(scheme.pct * 100)} % du max estimé`,
      sets: [],
    };
    for (const ws of warmupSets(w)) ex.sets.push({ ...ws, warmup: true, rest: 75 });
    for (let i = 0; i < sets; i++) {
      ex.sets.push({ reps: scheme.reps, w, rest: scheme.rest, amrap: role === 'main' && scheme.amrap && i === sets - 1 && form.level >= 3 });
    }
    if (hurt) ex.warn = 'Zone douloureuse sollicitée : charge réduite de 10 %. Arrêtez si la douleur augmente.';
    return ex;
  }
  // variante sans barre : traitée comme un accessoire en double progression
  const acc = { ...v, ref: lift, sets: 4, rest: 120 };
  const ex = accessoryBlock(profile, acc, form, `Remplace le ${LIFT_NAMES[lift].toLowerCase()} (pas de matériel adapté)`);
  ex.lift = lift; ex.role = role; ex.swappable = false;
  if (hurt) ex.warn = 'Zone douloureuse sollicitée : allez-y prudemment.';
  return ex;
}

export function warmupSets(w) {
  if (w <= BAR + 5) return [{ reps: 10, w: BAR }];
  const out = [{ reps: 10, w: BAR }];
  for (const [p, r] of [[.5, 5], [.7, 3], [.85, 1]]) {
    const x = roundLoad(w * p, 'bar');
    if (x > out[out.length - 1].w && x < w) out.push({ reps: r, w: x });
  }
  return out;
}

export function accessoryBlock(profile, opt, form, info) {
  const mem = profile.acc[opt.id];
  let w = null;
  if (isLoaded(opt.type)) {
    w = mem?.w ?? roundLoad(refMax(profile, opt.ref) * opt.k, opt.type);
    if (form.load < 1) w = roundLoad(w * form.load, opt.type);
  }
  const reps = mem?.reps ?? opt.reps[0];
  const sets = Math.max(2, opt.sets + form.setDelta);
  return {
    id: opt.id, role: 'acc', name: opt.name, type: opt.type, rest: opt.rest, range: opt.reps, swappable: true,
    info: info || `${opt.sets} séries de ${opt.reps[0]} à ${opt.reps[1]} ${opt.type === 'sec' ? 's' : 'reps'} · quand toutes les séries atteignent ${opt.reps[1]}, la charge augmente`,
    sets: Array.from({ length: sets }, () => ({ reps, w, rest: opt.rest })),
  };
}

export function slotOptions(day, slotIdx, eq, pains) {
  return SLOTS[day][slotIdx].opts.filter(o => hasAll(o.req, eq) && !painful(o, pains));
}

const ACC_BY_DURATION = { 45: 2, 60: 3, 75: 4, 90: 5 };

export function generateMuscu(profile, { rot, eq, form, pains, duration }) {
  const r = ROTATION[rot];
  const exercises = [mainBlock(profile, r.main, 'main', eq, form, pains)];
  if (r.second && duration >= 60) exercises.push(mainBlock(profile, r.second, 'second', eq, form, pains));
  let nAcc = (ACC_BY_DURATION[duration] ?? 3) - form.accDrop;
  if (!r.second && duration >= 60) nAcc += 1; // Pull et Legs : un accessoire de plus à la place du secondaire
  nAcc = Math.max(1, Math.min(nAcc, SLOTS[r.day].length));
  let added = 0;
  for (let i = 0; i < SLOTS[r.day].length && added < nAcc; i++) {
    const opts = slotOptions(r.day, i, eq, pains);
    if (!opts.length) continue;
    const ex = accessoryBlock(profile, opts[0], form);
    ex.slot = i; ex.slotName = SLOTS[r.day][i].slot;
    exercises.push(ex); added++;
  }
  return {
    kind: 'muscu', rot, key: r.key, title: `${r.emoji} ${r.label}`, day: r.day, duration, eq, pains,
    form, warmup: warmupFor(r.day), exercises, progress: form.load >= 1,
  };
}

export function swapAccessory(profile, session, idx) {
  const ex = session.exercises[idx];
  const opts = slotOptions(session.day, ex.slot, session.eq, session.pains);
  if (opts.length < 2) return false;
  const cur = opts.findIndex(o => o.id === ex.id);
  const next = opts[(cur + 1) % opts.length];
  const nx = accessoryBlock(profile, next, session.form);
  nx.slot = ex.slot; nx.slotName = ex.slotName;
  session.exercises[idx] = nx;
  return true;
}

// Progression après la séance. Renvoie la liste des changements (texte).
export function applyMuscuProgress(profile, session) {
  const msgs = [];
  for (const ex of session.exercises) {
    const work = ex.sets.filter(s => !s.warmup);
    const done = work.filter(s => s.done);
    if (!done.length) continue;
    if (ex.role === 'main' && ex.type === 'bar') {
      if (!session.progress) { msgs.push(`${ex.name} : forme réduite, programme inchangé.`); continue; }
      const lift = ex.lift;
      const ok = work.every(s => s.done && (s.got ?? s.reps) >= s.reps);
      const inc = (lift === 'bench' || lift === 'ohp') ? 2.5 : 5;
      if (ok) {
        profile.fails[lift] = 0;
        const last = work[work.length - 1];
        if (last.amrap && (last.got ?? 0) > last.reps) {
          const est = epley(last.w, last.got);
          if (est > profile.lifts[lift] + inc) {
            const nv = roundLoad(Math.min(est, profile.lifts[lift] + 2 * inc), 'bar');
            msgs.push(`${LIFT_NAMES[lift]} : belle série max (${last.got} reps), max estimé ${profile.lifts[lift]} → ${nv} kg.`);
            profile.lifts[lift] = nv;
          }
        }
        profile.wave[lift] = (profile.wave[lift] || 0) + 1;
        if (profile.wave[lift] % 3 === 0) {
          profile.lifts[lift] += inc;
          msgs.push(`${LIFT_NAMES[lift]} : vague terminée ✅ max estimé +${inc} kg → ${profile.lifts[lift]} kg.`);
        } else msgs.push(`${LIFT_NAMES[lift]} : séance réussie, semaine suivante de la vague.`);
      } else {
        profile.fails[lift] = (profile.fails[lift] || 0) + 1;
        if (profile.fails[lift] >= 2) {
          profile.lifts[lift] = roundLoad(profile.lifts[lift] * .95, 'bar');
          profile.wave[lift] = 0; profile.fails[lift] = 0;
          msgs.push(`${LIFT_NAMES[lift]} : 2 échecs de suite, on recule de 5 % (${profile.lifts[lift]} kg) pour repartir.`);
        } else msgs.push(`${LIFT_NAMES[lift]} : répétitions manquées, on refait la même séance la prochaine fois.`);
      }
      continue;
    }
    if (ex.role === 'second') continue; // le secondaire suit le max du mouvement
    // Double progression des accessoires
    const w = done[done.length - 1].w;
    const reps = Math.min(...done.map(s => s.got ?? s.reps));
    const [lo, hi] = ex.range || [8, 12];
    const mem = { w, reps: Math.max(lo, reps) };
    if (done.length >= work.length && reps >= hi) {
      if (isLoaded(ex.type)) {
        mem.w = roundLoad(w + (STEP[ex.type] || 2.5) * (ex.type === 'machine' ? 2 : 1), ex.type);
        mem.reps = lo;
        msgs.push(`${ex.name} : haut de fourchette atteint, ${w} → ${mem.w} kg.`);
      } else {
        mem.reps = Math.min(hi, reps + 1);
        if (reps >= hi) msgs.push(`${ex.name} : maximum atteint, ajoutez du lest ou passez à une variante plus dure.`);
      }
    } else if (done.length >= work.length && reps < hi) {
      mem.reps = Math.min(hi, reps + 1);
    }
    if (session.progress || !profile.acc[ex.id]) profile.acc[ex.id] = mem;
  }
  return msgs;
}
