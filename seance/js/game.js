// Gamification : XP, niveaux, rangs, quêtes hebdomadaires et badges.

export const RANKS = [
  { lvl: 1, letter: 'E', name: 'Recrue', color: '#94a3b8', band: '#64748b', quote: 'Chaque légende commence par une première séance !' },
  { lvl: 5, letter: 'D', name: 'Disciple', color: '#22c55e', band: '#15803d', quote: 'Mon corps se souvient de chaque répétition.' },
  { lvl: 10, letter: 'C', name: 'Guerrier', color: '#3b82f6', band: '#1d4ed8', quote: 'La barre ne me fait plus peur !' },
  { lvl: 15, letter: 'B', name: 'Vétéran', color: '#a855f7', band: '#7e22ce', quote: 'La régularité, c’est ma technique secrète.' },
  { lvl: 20, letter: 'A', name: 'Champion', color: '#f97316', band: '#c2410c', quote: 'Je repousse mes limites chaque semaine !' },
  { lvl: 30, letter: 'S', name: 'Maître', color: '#ef4444', band: '#b91c1c', quote: 'L’effort est devenu ma seconde nature.' },
  { lvl: 40, letter: 'SS', name: 'Légende', color: '#facc15', band: '#a16207', quote: 'Rien ne peut arrêter cette aura !' },
];

// XP total nécessaire pour atteindre le niveau n
export const xpFor = n => 50 * n * (n - 1);
export function levelOf(xp) {
  let n = 1; while (xpFor(n + 1) <= xp) n++;
  return { level: n, cur: xp - xpFor(n), need: xpFor(n + 1) - xpFor(n) };
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

// ---------- Avatar style manga (dessin original, évolue avec le rang) ----------
export function avatarSvg(rankIndex, opts = {}) {
  const r = RANKS[rankIndex];
  const m = 1 + rankIndex * 0.06;            // carrure
  const auraScale = 0.75 + rankIndex * 0.07;
  const id = 'a' + Math.random().toString(36).slice(2, 7);
  const rays = Array.from({ length: 24 }, (_, i) => {
    const a1 = (i / 24) * Math.PI * 2, a2 = a1 + Math.PI / 48;
    const p = (a, d) => `${(100 + Math.cos(a) * d).toFixed(1)},${(115 + Math.sin(a) * d).toFixed(1)}`;
    return `<polygon points="100,115 ${p(a1, 220)} ${p(a2, 220)}" />`;
  }).join('');
  const X = (dx) => (100 + dx * m).toFixed(1);
  const arm = side => {
    const s = side;
    const sh = [X(s * 36), 140], el = [X(s * 70), 128], fi = [X(s * 64), 90];
    return `
      <path d="M${sh[0]},${sh[1]} L${el[0]},${el[1]}" stroke="#1f2937" stroke-width="${(22 * m).toFixed(1)}" stroke-linecap="round"/>
      <path d="M${sh[0]},${sh[1]} L${el[0]},${el[1]}" stroke="#ffd9b8" stroke-width="${(18 * m).toFixed(1)}" stroke-linecap="round"/>
      <ellipse cx="${X(s * 54)}" cy="${(127 - 3 * m).toFixed(1)}" rx="${(11 * m).toFixed(1)}" ry="${(9 * m).toFixed(1)}" fill="#ffd9b8" stroke="#1f2937" stroke-width="2"/>
      <path d="M${el[0]},${el[1]} L${fi[0]},${fi[1]}" stroke="#1f2937" stroke-width="${(18 * m).toFixed(1)}" stroke-linecap="round"/>
      <path d="M${el[0]},${el[1]} L${fi[0]},${fi[1]}" stroke="#ffd9b8" stroke-width="${(14 * m).toFixed(1)}" stroke-linecap="round"/>
      <circle cx="${fi[0]}" cy="${fi[1] - 4}" r="${(10 * m).toFixed(1)}" fill="#ffd9b8" stroke="#1f2937" stroke-width="2.5"/>
      <path d="M${(+fi[0] - 6 * s).toFixed(1)},${fi[1] - 8} l${(8 * s).toFixed(1)},0 M${(+fi[0] - 6 * s).toFixed(1)},${fi[1] - 3} l${(8 * s).toFixed(1)},0" stroke="#1f2937" stroke-width="1.6"/>`;
  };
  const sparkles = rankIndex >= 4 ? [[30, 40], [172, 60], [24, 150], [178, 160], [150, 20]].map(([x, y], i) =>
    `<path d="M${x},${y - 8} L${x + 2.5},${y - 2.5} L${x + 8},${y} L${x + 2.5},${y + 2.5} L${x},${y + 8} L${x - 2.5},${y + 2.5} L${x - 8},${y} L${x - 2.5},${y - 2.5}Z" fill="#fff" class="spark" style="animation-delay:${i * .3}s"/>`).join('') : '';
  return `<svg viewBox="0 0 200 220" class="avatar ${opts.cls || ''}" role="img" aria-label="Avatar rang ${r.letter}">
  <defs>
    <radialGradient id="${id}bg" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${r.color}" stop-opacity=".45"/></radialGradient>
    <linearGradient id="${id}au" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${r.color}"/><stop offset="1" stop-color="${r.color}" stop-opacity=".1"/></linearGradient>
  </defs>
  <rect width="200" height="220" fill="url(#${id}bg)"/>
  <g fill="${r.color}" opacity=".18" class="rays">${rays}</g>
  <g transform="translate(100 215) scale(${auraScale.toFixed(2)}) translate(-100 -215)" class="aura">
    <path d="M100,218 C38,214 12,160 30,104 C30,124 44,130 50,114 C42,74 58,44 80,20 C78,42 90,48 95,30 C100,10 116,4 118,24 C124,40 130,30 134,12 C154,40 164,74 152,114 C160,128 172,122 170,100 C188,156 162,214 100,218Z" fill="url(#${id}au)" opacity=".85"/>
    ${rankIndex >= 3 ? `<path d="M100,214 C58,210 40,170 52,126 C56,140 66,140 68,128 C64,96 76,70 92,52 C92,70 100,72 104,58 C110,72 116,70 118,56 C132,76 138,100 132,128 C138,138 148,136 150,124 C160,170 140,210 100,214Z" fill="#fff" opacity=".35"/>` : ''}
  </g>
  ${sparkles}
  <!-- corps -->
  <path d="M${X(-36)},134 Q100,124 ${X(36)},134 L${X(28)},222 L${X(-28)},222Z" fill="#1f2937"/>
  <path d="M${X(-30)},138 Q100,130 ${X(30)},138 L${X(24)},222 L${X(-24)},222Z" fill="${r.band}"/>
  <path d="M86,132 Q100,152 114,132" fill="#ffd9b8" stroke="#1f2937" stroke-width="2"/>
  <text x="100" y="${rankIndex >= 6 ? 186 : 188}" text-anchor="middle" font-size="${rankIndex >= 6 ? 20 : 24}" font-weight="900" font-style="italic" fill="#fff" stroke="#1f2937" stroke-width="1.2" font-family="Impact, Arial Black, sans-serif">${r.letter}</text>
  ${arm(-1)}${arm(1)}
  <!-- cou et tête -->
  <rect x="91" y="108" width="18" height="24" fill="#ffd9b8" stroke="#1f2937" stroke-width="2"/>
  <path d="M62,64 Q60,106 100,120 Q140,106 138,64 Q138,30 100,30 Q62,30 62,64Z" fill="#ffd9b8" stroke="#1f2937" stroke-width="2.5"/>
  <ellipse cx="60" cy="78" rx="5" ry="9" fill="#ffd9b8" stroke="#1f2937" stroke-width="2"/>
  <ellipse cx="140" cy="78" rx="5" ry="9" fill="#ffd9b8" stroke="#1f2937" stroke-width="2"/>
  <!-- cheveux en pics -->
  <polygon points="58,74 46,44 64,50 56,20 80,38 86,6 102,30 118,4 124,32 146,16 140,46 158,40 144,74 136,56 126,62 118,50 108,60 98,50 88,60 78,50 70,62 64,56" fill="#111827" stroke="#111827" stroke-width="2" stroke-linejoin="round"/>
  <!-- bandeau -->
  <path d="M60,58 Q100,48 140,56 L140,66 Q100,58 60,68Z" fill="${r.band}" stroke="#1f2937" stroke-width="2"/>
  <path d="M139,60 Q160,58 176,74 Q160,70 150,72 Q164,82 168,96 Q152,80 139,66Z" fill="${r.band}" stroke="#1f2937" stroke-width="2" class="tails"/>
  <circle cx="100" cy="58" r="5" fill="#fff" stroke="#1f2937" stroke-width="1.5"/>
  <!-- sourcils déterminés -->
  <path d="M72,70 L93,76" stroke="#111827" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M128,70 L107,76" stroke="#111827" stroke-width="4.5" stroke-linecap="round"/>
  <!-- yeux -->
  <g>
    <path d="M73,85 Q83,76 94,84 Q84,94 73,85Z" fill="#fff" stroke="#111827" stroke-width="2"/>
    <ellipse cx="85" cy="85" rx="5" ry="6.5" fill="${r.band}"/><ellipse cx="85" cy="86" rx="2.6" ry="3.6" fill="#111827"/>
    <circle cx="83" cy="82.5" r="1.8" fill="#fff"/>
    <path d="M71,84 Q83,73 96,82" stroke="#111827" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M127,85 Q117,76 106,84 Q116,94 127,85Z" fill="#fff" stroke="#111827" stroke-width="2"/>
    <ellipse cx="115" cy="85" rx="5" ry="6.5" fill="${r.band}"/><ellipse cx="115" cy="86" rx="2.6" ry="3.6" fill="#111827"/>
    <circle cx="113" cy="82.5" r="1.8" fill="#fff"/>
    <path d="M129,84 Q117,73 104,82" stroke="#111827" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
  <path d="M99,92 L97,99 L101,99" stroke="#c08560" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M88,104 Q100,112 112,104 Q100,108 88,104Z" fill="#fff" stroke="#111827" stroke-width="2" stroke-linejoin="round"/>
  <path d="M76,96 l6,-2 M78,99 l6,-2" stroke="#f87171" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M124,96 l-6,-2 M122,99 l-6,-2" stroke="#f87171" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;
}
