import { paces, fmtPace, kmh } from './run.js';
// Gamification : XP, niveaux, rangs, quêtes hebdomadaires et badges.

// Un palier tous les 5 niveaux (images dans data/paliers). tier : intensité des effets visuels (0 à 6).
export const RANKS = [
  { lvl: 1, letter: '1', name: "Débutant", color: '#94a3b8', band: '#94a3b8', tier: 0, quote: "Chaque légende commence par une première séance !" },
  { lvl: 5, letter: '5', name: "Apprentissage", color: '#84cc16', band: '#84cc16', tier: 0, quote: "Les bases sont posées, la machine se lance." },
  { lvl: 10, letter: '10', name: "En forme", color: '#22c55e', band: '#22c55e', tier: 1, quote: "Je me sens déjà différent." },
  { lvl: 15, letter: '15', name: "Progression", color: '#10b981', band: '#10b981', tier: 1, quote: "Séance après séance, ça paie." },
  { lvl: 20, letter: '20', name: "En progression", color: '#14b8a6', band: '#14b8a6', tier: 1, quote: "Mon corps se souvient de chaque répétition." },
  { lvl: 25, letter: '25', name: "Plus fort", color: '#06b6d4', band: '#06b6d4', tier: 2, quote: "La barre ne me fait plus peur !" },
  { lvl: 30, letter: '30', name: "Solidité", color: '#0ea5e9', band: '#0ea5e9', tier: 2, quote: "Rien ne m’ébranle." },
  { lvl: 35, letter: '35', name: "Performance", color: '#3b82f6', band: '#3b82f6', tier: 2, quote: "Je performe à chaque séance." },
  { lvl: 40, letter: '40', name: "Puissance", color: '#6366f1', band: '#6366f1', tier: 2, quote: "Je sens la puissance monter." },
  { lvl: 45, letter: '45', name: "Dépassement", color: '#8b5cf6', band: '#8b5cf6', tier: 3, quote: "Je dépasse mes limites d’hier." },
  { lvl: 50, letter: '50', name: "Excellence", color: '#a855f7', band: '#a855f7', tier: 3, quote: "L’excellence devient une habitude." },
  { lvl: 55, letter: '55', name: "Optimisation", color: '#d946ef', band: '#d946ef', tier: 3, quote: "Chaque détail compte." },
  { lvl: 60, letter: '60', name: "Haute performance", color: '#ec4899', band: '#ec4899', tier: 4, quote: "Haute performance, mode activé." },
  { lvl: 65, letter: '65', name: "Légende en approche", color: '#f43f5e', band: '#f43f5e', tier: 4, quote: "La légende approche…" },
  { lvl: 70, letter: '70', name: "Surhumain", color: '#ef4444', band: '#ef4444', tier: 4, quote: "Mes limites ? Je ne les trouve plus." },
  { lvl: 75, letter: '75', name: "Inarrêtable", color: '#f97316', band: '#f97316', tier: 4, quote: "Plus rien ne m’arrête !" },
  { lvl: 80, letter: '80', name: "Athlète ultime", color: '#f59e0b', band: '#f59e0b', tier: 5, quote: "Athlète ultime, rien de moins." },
  { lvl: 85, letter: '85', name: "Maître", color: '#eab308', band: '#eab308', tier: 5, quote: "Je maîtrise mon art." },
  { lvl: 90, letter: '90', name: "Elite", color: '#facc15', band: '#facc15', tier: 5, quote: "L’élite, c’est ici." },
  { lvl: 95, letter: '95', name: "Légende", color: '#22d3ee', band: '#22d3ee', tier: 6, quote: "On parle de moi dans toutes les salles." },
  { lvl: 100, letter: '100', name: "Parfait", color: '#60a5fa', band: '#60a5fa', tier: 6, quote: "PAS DE LIMITE !" },
];

// Progression running : 21 paliers (images dans data/running)
export const RUN_RANKS = [
  { lvl: 1, letter: '1', name: "Débutant", color: '#94a3b8', band: '#94a3b8', tier: 0, quote: "Premières foulées, le plus dur est fait !" },
  { lvl: 5, letter: '5', name: "Apprentissage", color: '#a3e635', band: '#a3e635', tier: 0, quote: "Je trouve mon rythme." },
  { lvl: 10, letter: '10', name: "Progression", color: '#4ade80', band: '#4ade80', tier: 1, quote: "Chaque sortie compte." },
  { lvl: 15, letter: '15', name: "Endurance", color: '#34d399', band: '#34d399', tier: 1, quote: "Le souffle suit, les kilomètres aussi." },
  { lvl: 20, letter: '20', name: "Régularité", color: '#2dd4bf', band: '#2dd4bf', tier: 1, quote: "La régularité, c’est mon moteur." },
  { lvl: 25, letter: '25', name: "Plus fort", color: '#22d3ee', band: '#22d3ee', tier: 2, quote: "Les jambes répondent." },
  { lvl: 30, letter: '30', name: "Aérobie", color: '#38bdf8', band: '#38bdf8', tier: 2, quote: "Mon cœur tourne au bon régime." },
  { lvl: 35, letter: '35', name: "Résistance", color: '#60a5fa', band: '#60a5fa', tier: 2, quote: "Je tiens la distance." },
  { lvl: 40, letter: '40', name: "Performance", color: '#3b82f6', band: '#3b82f6', tier: 2, quote: "Le chrono descend." },
  { lvl: 45, letter: '45', name: "Compétiteur", color: '#2563eb', band: '#2563eb', tier: 3, quote: "Prêt pour le dossard." },
  { lvl: 50, letter: '50', name: "Élite", color: '#1d4ed8', band: '#1d4ed8', tier: 3, quote: "Je cours avec les meilleurs." },
  { lvl: 55, letter: '55', name: "Spécialisation", color: '#4f46e5', band: '#4f46e5', tier: 3, quote: "Chaque séance a son objectif." },
  { lvl: 60, letter: '60', name: "Endurance longue", color: '#7c3aed', band: '#7c3aed', tier: 4, quote: "Les heures de course ne me font plus peur." },
  { lvl: 65, letter: '65', name: "Vitesse", color: '#9333ea', band: '#9333ea', tier: 4, quote: "Ça va vite, très vite." },
  { lvl: 70, letter: '70', name: "Ultra-endurance", color: '#c026d3', band: '#c026d3', tier: 4, quote: "L’ultra m’appelle." },
  { lvl: 75, letter: '75', name: "Résilience", color: '#db2777', band: '#db2777', tier: 4, quote: "Rien ne me fait lâcher." },
  { lvl: 80, letter: '80', name: "Explosivité", color: '#e11d48', band: '#e11d48', tier: 5, quote: "Des relances explosives." },
  { lvl: 85, letter: '85', name: "Spécialiste trail", color: '#ea580c', band: '#ea580c', tier: 5, quote: "Les sentiers sont mon terrain." },
  { lvl: 90, letter: '90', name: "Ultra-traileur", color: '#d97706', band: '#d97706', tier: 5, quote: "Les montagnes ne me font plus peur." },
  { lvl: 95, letter: '95', name: "Légende", color: '#dc2626', band: '#dc2626', tier: 6, quote: "Une légende des sentiers." },
  { lvl: 100, letter: '100', name: "Surhumain", color: '#f59e0b', band: '#f59e0b', tier: 6, quote: "Au-delà de toutes les limites." },
];

// Deux pistes de progression : muscu et running (XP séparées, même courbe).
export const TRACKS = {
  muscu: { label: 'Muscu', icon: '🏋️', ranks: RANKS, xpFor: n => 20 * n * (n - 1), dir: 'paliers' },
  run: { label: 'Running', icon: '🏃', ranks: RUN_RANKS, xpFor: n => 20 * n * (n - 1), dir: 'running' },
};

// XP total nécessaire pour atteindre le niveau n (niveau maximal : 100)
export const MAX_LEVEL = 100;
export const xpFor = (n, track = 'muscu') => TRACKS[track].xpFor(n);
export function levelOf(xp, track = 'muscu') {
  const f = TRACKS[track].xpFor;
  let n = 1; while (n < MAX_LEVEL && f(n + 1) <= xp) n++;
  if (n >= MAX_LEVEL) return { level: MAX_LEVEL, cur: 1, need: 1, max: true };
  return { level: n, cur: xp - f(n), need: f(n + 1) - f(n), max: false };
}
export function rankOf(level, track = 'muscu') {
  const ranks = TRACKS[track].ranks;
  let r = 0; ranks.forEach((x, i) => { if (level >= x.lvl) r = i; });
  return { ...ranks[r], index: r, next: ranks[r + 1] || null, track };
}

// Semaine (lundi) d'une date
export function weekKey(ts) {
  const d = new Date(ts); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function entryXp(e) {
  const s = e.session;
  let xp;
  if (e.kind === 'muscu') {
    const sets = s.exercises.reduce((a, x) => a + x.sets.filter(t => !t.warmup && t.done).length, 0);
    xp = 60 + sets * 5 + (e.wuComplete ? 25 : 0);
  } else {
    xp = 60 + Math.round((e.min || s.totalSec / 60) * 1.5) + (s.type === 'fractionne' || s.type === 'long' ? 25 : 0);
  }
  return Math.min(xp, 300);
}

const Q = {
  debutant: { muscu: 2, run: 1 }, inter: { muscu: 3, run: 2 }, avance: { muscu: 4, run: 3 },
};
export function weeklyQuests(level) {
  const q = Q[level] || Q.inter;
  return [
    { id: 'muscu', track: 'muscu', label: `${q.muscu} séances de muscu`, goal: q.muscu, xp: 150, icon: '🏋️', count: es => es.filter(e => e.kind === 'muscu').length },
    { id: 'run', track: 'run', label: `${q.run} sortie${q.run > 1 ? 's' : ''} running`, goal: q.run, xp: 150, icon: '🏃', count: es => es.filter(e => e.kind === 'run').length },
    { id: 'frac', track: 'run', label: '1 séance de fractionné', goal: 1, xp: 100, icon: '⚡', count: es => es.filter(e => e.session.type === 'fractionne').length },
    { id: 'long', track: 'run', label: '1 sortie longue en EF', goal: 1, xp: 100, icon: '🛤️', count: es => es.filter(e => e.session.type === 'long').length },
    { id: 'wu', track: 'muscu', label: 'Échauffement complet sur 2 séances muscu', goal: 2, xp: 80, icon: '🤸', count: es => es.filter(e => e.wuComplete).length },
  ];
}
export const PERFECT_XP = 250;

export const BADGES = [
  { id: 'first', icon: '🌱', name: 'Premier pas', desc: 'Terminer une première séance', test: c => c.n >= 1 },
  { id: 's10', icon: '🔟', name: 'Assidu', desc: '10 séances terminées', test: c => c.n >= 10 },
  { id: 's50', icon: '🏅', name: 'Acharné', desc: '50 séances terminées', test: c => c.n >= 50 },
  { id: 's100', icon: '💯', name: 'Centurion', desc: '100 séances terminées', test: c => c.n >= 100 },
  { id: 'wave', icon: '🌊', name: 'Vague domptée', desc: 'Réussir une vague de 3 semaines sur un mouvement de base', test: c => c.flags.has('wave') },
  { id: 'pr', icon: '💥', name: 'Record !', desc: 'Faire monter un max grâce à une série max', test: c => c.flags.has('pr') },
  { id: 'ton', icon: '🏗️', name: 'Déménageur', desc: '10 000 kg soulevés en une séance', test: c => c.maxVol >= 10000 },
  { id: 'km50', track: 'run', icon: '👟', name: 'Semelles usées', desc: '50 km courus au total', test: c => c.km >= 50 },
  { id: 'km200', track: 'run', icon: '🗺️', name: 'Globe-trotteur', desc: '200 km courus au total', test: c => c.km >= 200 },
  { id: 'long90', track: 'run', icon: '⏳', name: 'Endurant', desc: 'Sortie longue de 90 min ou plus', test: c => c.long90 },
  { id: 'perfect', icon: '⭐', name: 'Semaine parfaite', desc: 'Remplir toutes les quêtes d’une semaine', test: c => c.perfect >= 1 },
  { id: 'streak4', icon: '🔥', name: 'Inarrêtable', desc: '4 semaines actives d’affilée (2 séances ou plus)', test: c => c.streak >= 4 },
  { id: 'ai', icon: '✨', name: 'Sur mesure', desc: 'Faire une séance demandée en texte libre', test: c => c.ai },
  { id: 'tough', icon: '🛡️', name: 'Mental d’acier', desc: 'Terminer une séance malgré une forme basse', test: c => c.tough },
];

export function blankGame() { return { quests: {}, badges: {}, bonus: 0, bonusRun: 0 }; }

export function activeStreak(history, now = Date.now()) {
  const per = {};
  for (const h of history) { const k = weekKey(h.date); per[k] = (per[k] || 0) + 1; }
  let n = 0; const d = new Date(weekKey(now));
  // la semaine en cours compte si elle est déjà active, sinon on part de la précédente
  if (!(per[d.toISOString().slice(0, 10)] >= 2)) d.setDate(d.getDate() - 7);
  while (per[d.toISOString().slice(0, 10)] >= 2) { n++; d.setDate(d.getDate() - 7); }
  return n;
}

export function totalXp(S, track = 'muscu') {
  const kind = track === 'run' ? 'run' : 'muscu';
  return S.history.filter(h => h.kind === kind).reduce((a, h) => a + (h.xp || 0), 0) + ((track === 'run' ? S.game?.bonusRun : S.game?.bonus) || 0);
}

// À appeler après l'ajout d'une séance : quêtes et badges nouvellement obtenus.
export function evaluate(S, profileLevel) {
  const g = S.game || (S.game = blankGame());
  const out = { quests: [], badges: [], perfect: false, bonus: 0, by: { muscu: 0, run: 0 } };
  // bonus rangé dans la piste concernée ; à défaut, celle de la séance qui vient d'être faite
  const cur = S.history[0]?.kind === 'run' ? 'run' : 'muscu';
  const add = (track, xp) => { out.by[track || cur] += xp; out.bonus += xp; };
  const wk = weekKey(Date.now());
  const es = S.history.filter(h => weekKey(h.date) === wk);
  const done = g.quests[wk] || (g.quests[wk] = []);
  const quests = weeklyQuests(profileLevel);
  for (const q of quests) {
    if (!done.includes(q.id) && q.count(es) >= q.goal) { done.push(q.id); out.quests.push(q); add(q.track, q.xp); }
  }
  if (!done.includes('perfect') && quests.every(q => done.includes(q.id))) { done.push('perfect'); out.perfect = true; add('muscu', PERFECT_XP); add('run', PERFECT_XP); }
  const c = {
    n: S.history.length,
    flags: new Set(S.history.flatMap(h => h.flags || [])),
    maxVol: Math.max(0, ...S.history.map(h => h.vol || 0)),
    km: S.history.reduce((a, h) => a + (h.km || 0), 0),
    long90: S.history.some(h => h.session.type === 'long' && (h.min || 0) >= 90),
    perfect: Object.values(g.quests).filter(l => l.includes('perfect')).length,
    streak: activeStreak(S.history),
    ai: S.history.some(h => h.session.ai),
    tough: S.history.some(h => h.session.form.level <= 1),
  };
  for (const b of BADGES) {
    if (!g.badges[b.id] && b.test(c)) { g.badges[b.id] = Date.now(); out.badges.push(b); add(b.track, 100); }
  }
  g.bonus = (g.bonus || 0) + out.by.muscu;
  g.bonusRun = (g.bonusRun || 0) + out.by.run;
  return out;
}

// ---------- Statistiques du personnage (0 à 100), calculées à partir des vraies données ----------
const clamp = v => Math.max(1, Math.min(100, Math.round(v)));
const STD = { bench: 1.75, squat: 2.4, deadlift: 2.9, ohp: 1.15 };   // ratio max / poids de corps « élite »

export function computeStats(S) {
  const p = S.profile, bw = p.bodyweight || 75, now = Date.now();
  const lifts = Object.keys(STD);
  const force = clamp(100 * lifts.reduce((a, l) => a + Math.pow(Math.min(1.2, (p.lifts[l] || 0) / bw / STD[l]), 1.5), 0) / lifts.length);
  const vdotScore = (p.run.vdot - 25) / 45 * 100;
  const endurance = clamp(0.8 * vdotScore + 0.2 * Math.min(100, (p.run.longMin || 0) / 150 * 100));
  const recent = S.history.filter(h => h.kind === 'muscu' && now - h.date < 28 * 864e5);
  const sets = recent.reduce((a, h) => a + h.session.exercises.reduce((b, e) => b + e.sets.filter(t => !t.warmup && t.done).length, 0), 0);
  const nMuscu = S.history.filter(h => h.kind === 'muscu').length;
  const muscle = clamp(0.6 * Math.min(100, sets / 2) + 0.4 * Math.min(100, nMuscu / 1.5));
  const weeks = [];
  for (let k = 0; k < 8; k++) { const d = new Date(weekKey(now)); d.setDate(d.getDate() - 7 * k); weeks.push(d.toISOString().slice(0, 10)); }
  const nq = weeklyQuests(p.level).length;
  const questRate = weeks.reduce((a, w) => a + Math.min(nq, (S.game?.quests?.[w] || []).filter(x => x !== 'perfect').length), 0) / (nq * 8);
  const tough = S.history.filter(h => h.session.form.level <= 2).length;
  const mental = clamp(0.4 * Math.min(100, activeStreak(S.history) / 12 * 100) + 0.4 * questRate * 100 + 0.2 * Math.min(100, tough * 10));
  return { force, endurance, muscle, mental };
}
// Stats running réelles (affichées sur l'image du palier running)
export function computeRunStats(S) {
  const p = paces(S.profile.run.vdot);
  const runs = S.history.filter(h => h.kind === 'run');
  const maxMin = Math.max(0, ...runs.map(h => h.min || 0));
  const fmtMin = m => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ' ' + String(Math.round(m % 60)).padStart(2, '0') : ''}` : `${Math.round(m)} min`);
  return {
    allure: `${fmtPace(p.efFast)}/km`, vma: `${kmh(p.vma)} km/h`, sortie: maxMin ? fmtMin(maxMin) : '—',
    km: runs.reduce((a, h) => a + (h.km || 0), 0),
  };
}
export const RUN_STAT_INFO = {
  allure: { label: 'Allure EF', icon: '🟢', how: 'Votre allure d’endurance fondamentale, calculée depuis votre chrono et vos séances.' },
  vma: { label: 'VMA', icon: '⚡', how: 'Vitesse maximale aérobie estimée.' },
  sortie: { label: 'Sortie max', icon: '⏱️', how: 'La plus longue sortie enregistrée.' },
};

export const STAT_INFO = {
  force: { label: 'Force', icon: '💪', how: 'Vos maxis (1RM) rapportés à votre poids de corps.' },
  endurance: { label: 'Endurance', icon: '🫁', how: 'Votre indice de course (allures) et la durée de votre sortie longue.' },
  muscle: { label: 'Muscle', icon: '🏋️', how: 'Séries de travail des 4 dernières semaines et nombre total de séances muscu.' },
  mental: { label: 'Mental', icon: '🧠', how: 'Semaines actives d’affilée, quêtes remplies sur 8 semaines, séances faites malgré la fatigue.' },
};
