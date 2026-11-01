// Allures de course à partir d'un chrono de référence (formules de Jack Daniels, « VDOT »).

const vo2At = v => -4.6 + 0.182258 * v + 0.000104 * v * v;           // v en m/min
const pctMax = t => 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t); // t en min

export function vdotFrom(distM, sec) {
  const t = sec / 60;
  return vo2At(distM / t) / pctMax(t);
}
function speedFor(vo2) {
  const a = 0.000104, b = 0.182258, c = -4.6 - vo2;
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}
// allure en s/km pour une fraction de VDOT
export function paceAt(vdot, frac) { return 60000 / speedFor(vdot * frac); }

export function predictTime(vdot, distM) {
  let lo = 60, hi = 60 * 600;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (vdotFrom(distM, mid) > vdot) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export function paces(vdot, adj = 0) {
  return {
    efSlow: paceAt(vdot, .62) + adj, efFast: paceAt(vdot, .70) + adj,
    marathon: paceAt(vdot, .80) + adj,
    seuil: paceAt(vdot, .88) + adj,
    vma: paceAt(vdot, 1.0) + adj,        // ≈ vitesse maximale aérobie
    interval: paceAt(vdot, .975) + adj,  // fractionné long (3 à 5 min)
  };
}

export const fmtPace = s => { s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const fmtDur = sec => {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h} h ${String(m).padStart(2, '0')}`;
  return s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`;
};
export const kmh = s => (3600 / s).toFixed(1).replace('.', ',');

// Progressions des séances de qualité (index = niveau de la séance)
export const QUALITY = {
  vma_longue: { label: 'Fractionné long (VMA)', short: 'VMA longue', steps: [
    { reps: 6, dist: 400, rec: 90 }, { reps: 8, dist: 400, rec: 90 }, { reps: 5, dist: 600, rec: 120 },
    { reps: 6, dist: 600, rec: 120 }, { reps: 4, dist: 1000, rec: 120 }, { reps: 5, dist: 1000, rec: 120 },
    { reps: 6, dist: 1000, rec: 120 }, { reps: 5, dist: 1200, rec: 150 }, { reps: 6, dist: 1200, rec: 150 },
    { reps: 7, dist: 1200, rec: 150 },
  ] },
  courte: { label: 'Fractionné court 30/30', short: '30/30', steps: [
    { blocks: 1, reps: 8 }, { blocks: 2, reps: 6 }, { blocks: 2, reps: 8 }, { blocks: 2, reps: 10 },
    { blocks: 3, reps: 8 }, { blocks: 3, reps: 10 }, { blocks: 3, reps: 12 },
  ] },
  seuil: { label: 'Fractionné au seuil', short: 'Seuil', steps: [
    { reps: 3, min: 5, rec: 60 }, { reps: 3, min: 6, rec: 60 }, { reps: 4, min: 6, rec: 60 }, { reps: 3, min: 8, rec: 90 },
    { reps: 4, min: 8, rec: 90 }, { reps: 2, min: 12, rec: 120 }, { reps: 3, min: 10, rec: 120 }, { reps: 2, min: 15, rec: 120 },
    { reps: 3, min: 12, rec: 120 },
  ] },
};
export const QUALITY_ORDER = ['vma_longue', 'seuil', 'courte'];
export const START_LEVEL = { debutant: { vma_longue: 0, courte: 0, seuil: 0 }, inter: { vma_longue: 3, courte: 2, seuil: 2 }, avance: { vma_longue: 5, courte: 4, seuil: 4 } };
export const LONG_START = { debutant: 45, inter: 60, avance: 80 };
export const LONG_MAX = { debutant: 80, inter: 110, avance: 140 };
const FOOTING = { debutant: 30, inter: 40, avance: 50 };

const step = (label, sec, pace, kind, note) => ({ label, sec: Math.round(sec), pace, kind, note });

export function generateRun(profile, { type, sub, form, maxMin }) {
  const run = profile.run;
  const p = paces(run.vdot, form.pace);
  const ef = `${fmtPace(p.efFast)} – ${fmtPace(p.efSlow)} /km`;
  const lvl = profile.level;
  let notes = [];
  // Adaptation à la forme
  if (form.level <= 1 && type === 'fractionne') {
    type = 'footing';
    notes.push('Forme basse : le fractionné est remplacé par un footing en endurance fondamentale. On le fera la prochaine fois.');
  }
  if (type === 'long') {
    const n = run.longCount || 0;
    let min = run.longMin;
    let title = 'Sortie longue en endurance fondamentale';
    if (n > 0 && (n + 1) % 4 === 0) { min = Math.round(min * .8 / 5) * 5; notes.push('Semaine allégée (1 sur 4) : sortie raccourcie pour assimiler.'); }
    if (form.level === 2) { min = Math.round(min * .85 / 5) * 5; notes.push('Forme moyenne : durée réduite de 15 %.'); }
    if (form.level <= 1) { min = Math.round(min * .7 / 5) * 5; notes.push('Fatigue : sortie raccourcie de 30 %, allure très facile.'); }
    if (maxMin && min > maxMin) { min = maxMin; notes.push(`Durée limitée à ${maxMin} min comme demandé.`); }
    const steps = [step('Endurance fondamentale', min * 60, ef, 'ef', 'Aisance respiratoire : vous devez pouvoir parler.')];
    const km = (min * 60) / ((p.efFast + p.efSlow) / 2);
    return { kind: 'run', type: 'long', title: `🏃 ${title}`, steps, totalSec: min * 60, km, paces: p, form, notes,
      tips: ['Partez volontairement lentement les 10 premières minutes.', 'Buvez toutes les 20 min au-delà d’une heure.', 'Allure EF = 65 à 75 % de la FC max environ.'] };
  }
  if (type === 'footing') {
    let min = FOOTING[lvl] || 40;
    if (form.level <= 1) min = Math.round(min * .75 / 5) * 5;
    if (maxMin && min > maxMin) min = maxMin;
    const steps = [step('Footing endurance fondamentale', min * 60, ef, 'ef', 'Très facile, récupération active.')];
    return { kind: 'run', type: 'footing', title: '🏃 Footing de récupération', steps, totalSec: min * 60,
      km: (min * 60) / ((p.efFast + p.efSlow) / 2), paces: p, form, notes, tips: ['Restez en aisance totale, c’est une séance de récupération.'] };
  }
  // Fractionné
  const q = sub && QUALITY[sub] ? sub : QUALITY_ORDER[(run.qualCount || 0) % QUALITY_ORDER.length];
  const prog = QUALITY[q];
  const li = Math.min(run.qLevel[q] ?? 0, prog.steps.length - 1);
  const st = { ...prog.steps[li] };
  if (form.level === 2) {
    if (st.blocks) st.reps = Math.max(4, st.reps - 2); else st.reps = Math.max(2, st.reps - 1);
    notes.push('Forme moyenne : une répétition de moins et allures légèrement plus douces.');
  }
  const wu = lvl === 'debutant' ? 15 : 20;
  const steps = [step('Échauffement en EF', wu * 60, ef, 'ef', 'Finir par 3 lignes droites de 80 m en accélérant progressivement.')];
  let desc;
  if (q === 'vma_longue') {
    const sec = st.dist / 1000 * p.interval;
    desc = `${st.reps} × ${st.dist} m à ${fmtPace(p.interval)} /km (≈ ${fmtDur(sec)} chacun), récup ${fmtDur(st.rec)} trot`;
    for (let i = 1; i <= st.reps; i++) {
      steps.push(step(`${st.dist} m rapide (${i}/${st.reps})`, sec, `${fmtPace(p.interval)} /km`, 'work', `Temps cible : ${fmtDur(sec)}`));
      if (i < st.reps) steps.push(step('Récupération trottinée', st.rec, 'très lent', 'rec'));
    }
  } else if (q === 'seuil') {
    desc = `${st.reps} × ${st.min} min au seuil à ${fmtPace(p.seuil)} /km, récup ${fmtDur(st.rec)} trot`;
    for (let i = 1; i <= st.reps; i++) {
      steps.push(step(`Seuil ${st.min} min (${i}/${st.reps})`, st.min * 60, `${fmtPace(p.seuil)} /km`, 'work', 'Effort « confortablement difficile » : quelques mots possibles.'));
      if (i < st.reps) steps.push(step('Récupération trottinée', st.rec, 'très lent', 'rec'));
    }
  } else {
    desc = `${st.blocks} série${st.blocks > 1 ? 's' : ''} de ${st.reps} × 30 s vite / 30 s trot, à ${fmtPace(p.vma)} /km, 3 min entre les séries`;
    for (let b = 1; b <= st.blocks; b++) {
      for (let i = 1; i <= st.reps; i++) {
        steps.push(step(`30 s vite (${i}/${st.reps}${st.blocks > 1 ? ` · série ${b}` : ''})`, 30, `${fmtPace(p.vma)} /km`, 'work', `≈ ${Math.round(30000 / p.vma)} m`));
        steps.push(step('30 s trot', 30, 'trot', 'rec'));
      }
      if (b < st.blocks) steps.push(step('Récupération entre séries', 180, 'marche / trot', 'rec'));
    }
  }
  steps.push(step('Retour au calme en EF', 10 * 60, ef, 'ef', 'Puis quelques étirements doux.'));
  const totalSec = steps.reduce((a, s) => a + s.sec, 0);
  return { kind: 'run', type: 'fractionne', sub: q, qLevel: li, title: `⚡ ${prog.label}`, desc, steps, totalSec, paces: p, form, notes,
    tips: ['Ne partez pas trop vite sur la première répétition : la régularité prime.', 'Si vous n’arrivez plus à tenir l’allure, arrêtez la série : la séance est faite.'] };
}

// Progression après la séance selon le ressenti (1 très facile … 4 trop dur)
export function applyRunProgress(profile, session, feel) {
  const run = profile.run; const msgs = [];
  if (session.type === 'long') {
    run.longCount = (run.longCount || 0) + 1;
    if (feel <= 2 && session.form.level >= 2) {
      const before = run.longMin;
      run.longMin = Math.min(LONG_MAX[profile.level] || 120, run.longMin + 5);
      if (run.longMin > before) msgs.push(`Sortie longue : prochaine fois ${run.longMin} min (+5).`);
    } else if (feel === 4) msgs.push('Sortie longue difficile : durée conservée la prochaine fois.');
  } else if (session.type === 'fractionne') {
    run.qualCount = (run.qualCount || 0) + 1;
    const q = session.sub; const max = QUALITY[q].steps.length - 1;
    if (feel <= 2 && session.form.level >= 3) {
      run.qLevel[q] = Math.min(max, (run.qLevel[q] ?? 0) + 1);
      msgs.push(`${QUALITY[q].short} : séance suivante un cran plus longue.`);
      if (feel === 1) { run.vdot = +(run.vdot + .3).toFixed(2); msgs.push('Très facile : allures légèrement accélérées.'); }
    } else if (feel === 4) {
      run.qLevel[q] = Math.max(0, (run.qLevel[q] ?? 0) - 1);
      run.vdot = +(run.vdot - .3).toFixed(2);
      msgs.push(`${QUALITY[q].short} : trop dur, on recule d’un cran et on ralentit un peu les allures.`);
    } else msgs.push(`${QUALITY[q].short} : on garde la même séance la prochaine fois.`);
  }
  return msgs;
}
