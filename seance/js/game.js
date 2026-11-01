// Gamification : XP, niveaux, rangs, quêtes hebdomadaires et badges.

export const RANKS = [
  { lvl: 1, letter: 'E', name: 'Débutant', color: '#94a3b8', band: '#64748b', quote: 'Chaque légende commence par une première séance !' },
  { lvl: 20, letter: 'D', name: 'En progression', color: '#22c55e', band: '#15803d', quote: 'Mon corps se souvient de chaque répétition.' },
  { lvl: 40, letter: 'C', name: 'Plus fort', color: '#3b82f6', band: '#1d4ed8', quote: 'La barre ne me fait plus peur !' },
  { lvl: 60, letter: 'B', name: 'Très performant', color: '#a855f7', band: '#7e22ce', quote: 'La régularité, c’est ma technique secrète.' },
  { lvl: 80, letter: 'A', name: 'Athlète confirmé', color: '#f97316', band: '#c2410c', quote: 'Je repousse mes limites chaque semaine !' },
  { lvl: 90, letter: 'S', name: 'Elite', color: '#ef4444', band: '#b91c1c', quote: 'L’effort est devenu ma seconde nature.' },
  { lvl: 95, letter: 'SS', name: 'Légende', color: '#facc15', band: '#a16207', quote: 'On parle de moi dans toutes les salles.' },
  { lvl: 98, letter: 'SSS', name: 'Surhumain', color: '#22d3ee', band: '#0e7490', quote: 'Mes limites ? Je ne les trouve plus.' },
  { lvl: 100, letter: 'MAX', name: 'Parfait', color: '#60a5fa', band: '#1e40af', quote: 'PAS DE LIMITE !' },
];

// XP total nécessaire pour atteindre le niveau n (niveau maximal : 100)
export const MAX_LEVEL = 100;
export const xpFor = n => 20 * n * (n - 1);
export function levelOf(xp) {
  let n = 1; while (n < MAX_LEVEL && xpFor(n + 1) <= xp) n++;
  if (n >= MAX_LEVEL) return { level: MAX_LEVEL, cur: 1, need: 1, max: true };
  return { level: n, cur: xp - xpFor(n), need: xpFor(n + 1) - xpFor(n), max: false };
}
export function rankOf(level) {
  let r = 0; RANKS.forEach((x, i) => { if (level >= x.lvl) r = i; });
  return { ...RANKS[r], index: r, next: RANKS[r + 1] || null };
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
    { id: 'muscu', label: `${q.muscu} séances de muscu`, goal: q.muscu, xp: 150, icon: '🏋️', count: es => es.filter(e => e.kind === 'muscu').length },
    { id: 'run', label: `${q.run} sortie${q.run > 1 ? 's' : ''} running`, goal: q.run, xp: 150, icon: '🏃', count: es => es.filter(e => e.kind === 'run').length },
    { id: 'frac', label: '1 séance de fractionné', goal: 1, xp: 100, icon: '⚡', count: es => es.filter(e => e.session.type === 'fractionne').length },
    { id: 'long', label: '1 sortie longue en EF', goal: 1, xp: 100, icon: '🛤️', count: es => es.filter(e => e.session.type === 'long').length },
    { id: 'wu', label: 'Échauffement complet sur 2 séances muscu', goal: 2, xp: 80, icon: '🤸', count: es => es.filter(e => e.wuComplete).length },
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
  { id: 'km50', icon: '👟', name: 'Semelles usées', desc: '50 km courus au total', test: c => c.km >= 50 },
  { id: 'km200', icon: '🗺️', name: 'Globe-trotteur', desc: '200 km courus au total', test: c => c.km >= 200 },
  { id: 'long90', icon: '⏳', name: 'Endurant', desc: 'Sortie longue de 90 min ou plus', test: c => c.long90 },
  { id: 'perfect', icon: '⭐', name: 'Semaine parfaite', desc: 'Remplir toutes les quêtes d’une semaine', test: c => c.perfect >= 1 },
  { id: 'streak4', icon: '🔥', name: 'Inarrêtable', desc: '4 semaines actives d’affilée (2 séances ou plus)', test: c => c.streak >= 4 },
  { id: 'ai', icon: '✨', name: 'Sur mesure', desc: 'Faire une séance demandée en texte libre', test: c => c.ai },
  { id: 'tough', icon: '🛡️', name: 'Mental d’acier', desc: 'Terminer une séance malgré une forme basse', test: c => c.tough },
];

export function blankGame() { return { quests: {}, badges: {}, bonus: 0 }; }

export function activeStreak(history, now = Date.now()) {
  const per = {};
  for (const h of history) { const k = weekKey(h.date); per[k] = (per[k] || 0) + 1; }
  let n = 0; const d = new Date(weekKey(now));
  // la semaine en cours compte si elle est déjà active, sinon on part de la précédente
  if (!(per[d.toISOString().slice(0, 10)] >= 2)) d.setDate(d.getDate() - 7);
  while (per[d.toISOString().slice(0, 10)] >= 2) { n++; d.setDate(d.getDate() - 7); }
  return n;
}

export function totalXp(S) { return S.history.reduce((a, h) => a + (h.xp || 0), 0) + (S.game?.bonus || 0); }

// À appeler après l'ajout d'une séance : quêtes et badges nouvellement obtenus.
export function evaluate(S, profileLevel) {
  const g = S.game || (S.game = blankGame());
  const out = { quests: [], badges: [], perfect: false, bonus: 0 };
  const wk = weekKey(Date.now());
  const es = S.history.filter(h => weekKey(h.date) === wk);
  const done = g.quests[wk] || (g.quests[wk] = []);
  const quests = weeklyQuests(profileLevel);
  for (const q of quests) {
    if (!done.includes(q.id) && q.count(es) >= q.goal) { done.push(q.id); out.quests.push(q); out.bonus += q.xp; }
  }
  if (!done.includes('perfect') && quests.every(q => done.includes(q.id))) { done.push('perfect'); out.perfect = true; out.bonus += PERFECT_XP; }
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
    if (!g.badges[b.id] && b.test(c)) { g.badges[b.id] = Date.now(); out.badges.push(b); out.bonus += 100; }
  }
  g.bonus += out.bonus;
  return out;
}
