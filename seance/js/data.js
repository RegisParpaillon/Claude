// Catalogue : matériel, échauffements, exercices principaux et accessoires.

export const EQUIPMENT = [
  { id: 'barre', label: 'Barre olympique + disques' },
  { id: 'rack', label: 'Rack / cage à squat' },
  { id: 'banc', label: 'Banc (plat / inclinable)' },
  { id: 'halteres', label: 'Haltères' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'poulie', label: 'Poulie / vis-à-vis' },
  { id: 'machines', label: 'Machines (presse, leg curl…)' },
  { id: 'traction', label: 'Barre de traction' },
  { id: 'dips', label: 'Barres parallèles (dips)' },
  { id: 'elastique', label: 'Élastiques' },
];

export const PAIN_ZONES = [
  { id: 'epaule', label: 'Épaule' }, { id: 'coude', label: 'Coude / poignet' },
  { id: 'dos', label: 'Bas du dos' }, { id: 'genou', label: 'Genou' },
];

// Échauffement articulaire commun (rotations lentes, amplitude progressive)
const ARTICULAIRE = [
  { name: 'Cardio léger (vélo, rameur, corde ou montées de genoux)', dose: '3 à 5 min', sec: 240 },
  { name: 'Rotations de la nuque', dose: '5 par sens' },
  { name: 'Cercles d’épaules puis de bras', dose: '10 par sens' },
  { name: 'Rotations des poignets et des coudes', dose: '10 par sens' },
  { name: 'Cercles de hanches', dose: '10 par sens' },
  { name: 'Rotations des genoux (pieds joints)', dose: '10 par sens' },
  { name: 'Rotations des chevilles', dose: '10 par sens et par pied' },
];

const MOBILITE = {
  push: [
    { name: 'Dislocations d’épaules (bâton ou élastique)', dose: '2 × 10' },
    { name: 'Rotations externes à l’élastique (coude au corps)', dose: '2 × 15' },
    { name: 'Open book (rotation thoracique allongé sur le côté)', dose: '8 par côté' },
    { name: 'Pompes scapulaires (omoplates seules)', dose: '2 × 10' },
    { name: 'Étirement dynamique des pectoraux contre un mur', dose: '30 s par côté', sec: 60 },
  ],
  pull: [
    { name: 'Chat-vache (cat-camel) à quatre pattes', dose: '10 lents' },
    { name: 'Charnière de hanche avec bâton dans le dos', dose: '2 × 10' },
    { name: 'World’s greatest stretch (fente + rotation)', dose: '5 par côté' },
    { name: 'Pont fessier', dose: '2 × 15' },
    { name: 'Écartés à l’élastique (band pull-apart)', dose: '2 × 15' },
    { name: 'Suspension active à la barre (ou étirement des dorsaux)', dose: '2 × 20 s', sec: 20 },
  ],
  legs: [
    { name: 'Genou au mur (mobilité de cheville)', dose: '10 par côté' },
    { name: 'Mobilité de hanches 90/90', dose: '8 par côté' },
    { name: 'Squat profond tenu, coudes qui écartent les genoux', dose: '2 × 30 s', sec: 30 },
    { name: 'Fentes avant avec rotation du buste', dose: '5 par côté' },
    { name: 'Pont fessier', dose: '2 × 15' },
    { name: 'Squats au poids du corps, tempo lent', dose: '10' },
  ],
};

export function warmupFor(day) {
  return { articulaire: ARTICULAIRE, mobilite: MOBILITE[day] };
}

// type de charge : bar (barre, pas 2,5), db (haltère, kg par main, pas 2), db1 (un haltère, pas 2),
// kb (kettlebell, pas 4), machine/cable (pas 2,5), band (élastique), bw (poids du corps), sec (gainage tenu)
// ref + k : charge de départ = 1RM estimé de ref × k (ou poids du corps si ref = 'pdc')

// Exercices principaux : variante barre, puis remplaçants selon le matériel.
export const MAIN = {
  bench: { name: 'Développé couché', variants: [
    { id: 'bench', name: 'Développé couché (barre)', req: ['barre', 'banc'], type: 'bar', tags: ['epaule'] },
    { id: 'db_bench', name: 'Développé couché haltères', req: ['halteres', 'banc'], type: 'db', k: .3, reps: [8, 12], tags: ['epaule'] },
    { id: 'machine_chest', name: 'Développé couché machine', req: ['machines'], type: 'machine', k: .65, reps: [8, 12] },
    { id: 'db_floor', name: 'Floor press haltères (au sol)', req: ['halteres'], type: 'db', k: .28, reps: [8, 12] },
    { id: 'pushups', name: 'Pompes (surélever les pieds pour durcir)', req: [], type: 'bw', reps: [8, 20] },
  ] },
  ohp: { name: 'Développé militaire', variants: [
    { id: 'ohp', name: 'Développé militaire (barre, debout)', req: ['barre'], type: 'bar', tags: ['epaule'] },
    { id: 'db_ohp', name: 'Développé épaules haltères', req: ['halteres'], type: 'db', k: .3, reps: [8, 12], tags: ['epaule'] },
    { id: 'kb_press', name: 'Développé épaule kettlebell (un bras)', req: ['kettlebell'], type: 'kb', k: .3, reps: [6, 10], tags: ['epaule'] },
    { id: 'machine_shoulder', name: 'Développé épaules machine', req: ['machines'], type: 'machine', k: .6, reps: [8, 12] },
    { id: 'pike', name: 'Pompes piquées (pike push-ups)', req: [], type: 'bw', reps: [6, 15], tags: ['epaule'] },
  ] },
  squat: { name: 'Squat', variants: [
    { id: 'squat', name: 'Squat (barre, arrière)', req: ['barre', 'rack'], type: 'bar', tags: ['genou', 'dos'] },
    { id: 'leg_press', name: 'Presse à cuisses', req: ['machines'], type: 'machine', k: 1.2, reps: [10, 15], tags: ['genou'] },
    { id: 'db_goblet', name: 'Goblet squat haltère', req: ['halteres'], type: 'db1', k: .3, reps: [10, 15], tags: ['genou'] },
    { id: 'kb_goblet', name: 'Goblet squat kettlebell', req: ['kettlebell'], type: 'kb', k: .3, reps: [10, 15], tags: ['genou'] },
    { id: 'bw_squat', name: 'Squat bulgare au poids du corps', req: [], type: 'bw', reps: [10, 20], tags: ['genou'] },
  ] },
  deadlift: { name: 'Soulevé de terre', variants: [
    { id: 'deadlift', name: 'Soulevé de terre (barre)', req: ['barre'], type: 'bar', tags: ['dos'] },
    { id: 'db_rdl', name: 'Soulevé de terre roumain haltères', req: ['halteres'], type: 'db', k: .22, reps: [8, 12], tags: ['dos'] },
    { id: 'kb_swing', name: 'Kettlebell swing', req: ['kettlebell'], type: 'kb', k: .2, reps: [15, 25], tags: ['dos'] },
    { id: 'hip_thrust_bw', name: 'Hip thrust unilatéral (poids du corps)', req: [], type: 'bw', reps: [10, 20] },
  ] },
};

// Accessoires par emplacement : la première option possible avec le matériel est retenue,
// le bouton « Remplacer » passe à l'option suivante.
export const SLOTS = {
  push: [
    { slot: 'Pectoraux inclinés', opts: [
      { id: 'incl_db', name: 'Développé incliné haltères', req: ['halteres', 'banc'], type: 'db', ref: 'bench', k: .25, reps: [8, 12], sets: 3, rest: 90, tags: ['epaule'] },
      { id: 'incl_bar', name: 'Développé incliné barre', req: ['barre', 'banc'], type: 'bar', ref: 'bench', k: .55, reps: [8, 10], sets: 3, rest: 120, tags: ['epaule'] },
      { id: 'incl_machine', name: 'Développé incliné machine', req: ['machines'], type: 'machine', ref: 'bench', k: .5, reps: [10, 12], sets: 3, rest: 90 },
      { id: 'decl_pushup', name: 'Pompes pieds surélevés', req: [], type: 'bw', reps: [8, 20], sets: 3, rest: 75 },
    ] },
    { slot: 'Triceps composé', opts: [
      { id: 'dips', name: 'Dips', req: ['dips'], type: 'bw', reps: [6, 12], sets: 3, rest: 120, tags: ['epaule', 'coude'] },
      { id: 'cgbp', name: 'Développé couché prise serrée', req: ['barre', 'banc'], type: 'bar', ref: 'bench', k: .6, reps: [6, 10], sets: 3, rest: 120, tags: ['coude'] },
      { id: 'bench_dips', name: 'Dips sur banc', req: ['banc'], type: 'bw', reps: [10, 20], sets: 3, rest: 75, tags: ['epaule'] },
      { id: 'diamond', name: 'Pompes diamant', req: [], type: 'bw', reps: [6, 15], sets: 3, rest: 75, tags: ['coude'] },
    ] },
    { slot: 'Épaules latérales', opts: [
      { id: 'lat_db', name: 'Élévations latérales haltères', req: ['halteres'], type: 'db', ref: 'ohp', k: .14, reps: [12, 15], sets: 3, rest: 60 },
      { id: 'lat_cable', name: 'Élévations latérales poulie', req: ['poulie'], type: 'cable', ref: 'ohp', k: .1, reps: [12, 15], sets: 3, rest: 60 },
      { id: 'lat_band', name: 'Élévations latérales élastique', req: ['elastique'], type: 'band', reps: [15, 20], sets: 3, rest: 60 },
      { id: 'lat_kb', name: 'Élévations latérales kettlebell', req: ['kettlebell'], type: 'kb', ref: 'ohp', k: .14, reps: [12, 15], sets: 3, rest: 60 },
    ] },
    { slot: 'Triceps isolation', opts: [
      { id: 'pushdown', name: 'Extension triceps poulie (corde)', req: ['poulie'], type: 'cable', ref: 'bench', k: .25, reps: [10, 15], sets: 3, rest: 60 },
      { id: 'oh_ext_db', name: 'Extension triceps haltère au-dessus de la tête', req: ['halteres'], type: 'db1', ref: 'bench', k: .18, reps: [10, 15], sets: 3, rest: 60, tags: ['coude'] },
      { id: 'skull', name: 'Barre au front', req: ['barre', 'banc'], type: 'bar', ref: 'bench', k: .3, reps: [8, 12], sets: 3, rest: 75, tags: ['coude'] },
      { id: 'band_push', name: 'Extension triceps élastique', req: ['elastique'], type: 'band', reps: [15, 20], sets: 3, rest: 60 },
    ] },
    { slot: 'Pectoraux isolation', opts: [
      { id: 'fly_cable', name: 'Écarté poulie vis-à-vis', req: ['poulie'], type: 'cable', ref: 'bench', k: .12, reps: [12, 15], sets: 3, rest: 60 },
      { id: 'pec_deck', name: 'Pec deck (butterfly)', req: ['machines'], type: 'machine', ref: 'bench', k: .4, reps: [12, 15], sets: 3, rest: 60 },
      { id: 'fly_db', name: 'Écarté couché haltères', req: ['halteres', 'banc'], type: 'db', ref: 'bench', k: .12, reps: [12, 15], sets: 3, rest: 60, tags: ['epaule'] },
      { id: 'wide_pushup', name: 'Pompes prise large, tempo lent', req: [], type: 'bw', reps: [10, 20], sets: 3, rest: 60 },
    ] },
  ],
  pull: [
    { slot: 'Tirage vertical', opts: [
      { id: 'pullup', name: 'Tractions (lest si > 12 reps)', req: ['traction'], type: 'bw', reps: [5, 12], sets: 4, rest: 120 },
      { id: 'lat_pull', name: 'Tirage vertical poulie', req: ['poulie'], type: 'cable', ref: 'pdc', k: .6, reps: [8, 12], sets: 4, rest: 90 },
      { id: 'band_pullup', name: 'Tractions assistées élastique', req: ['traction', 'elastique'], type: 'band', reps: [6, 12], sets: 4, rest: 90 },
      { id: 'inv_row_table', name: 'Rowing inversé sous une table solide', req: [], type: 'bw', reps: [8, 15], sets: 4, rest: 90 },
    ] },
    { slot: 'Rowing', opts: [
      { id: 'row_bar', name: 'Rowing barre buste penché', req: ['barre'], type: 'bar', ref: 'bench', k: .65, reps: [8, 10], sets: 3, rest: 120, tags: ['dos'] },
      { id: 'row_db', name: 'Rowing haltère un bras (appui banc)', req: ['halteres'], type: 'db1', ref: 'bench', k: .3, reps: [8, 12], sets: 3, rest: 90 },
      { id: 'row_cable', name: 'Rowing poulie basse', req: ['poulie'], type: 'cable', ref: 'bench', k: .55, reps: [10, 12], sets: 3, rest: 90 },
      { id: 'row_kb', name: 'Rowing kettlebell un bras', req: ['kettlebell'], type: 'kb', ref: 'bench', k: .3, reps: [8, 12], sets: 3, rest: 90 },
      { id: 'row_band', name: 'Rowing élastique', req: ['elastique'], type: 'band', reps: [15, 20], sets: 3, rest: 60 },
      { id: 'inv_row', name: 'Rowing inversé', req: ['rack', 'barre'], type: 'bw', reps: [8, 15], sets: 3, rest: 90 },
    ] },
    { slot: 'Arrière d’épaules', opts: [
      { id: 'facepull', name: 'Face pull poulie', req: ['poulie'], type: 'cable', ref: 'bench', k: .2, reps: [12, 15], sets: 3, rest: 60 },
      { id: 'facepull_band', name: 'Face pull élastique', req: ['elastique'], type: 'band', reps: [15, 20], sets: 3, rest: 60 },
      { id: 'rear_db', name: 'Oiseau haltères (buste penché)', req: ['halteres'], type: 'db', ref: 'ohp', k: .1, reps: [12, 15], sets: 3, rest: 60 },
      { id: 'ytw', name: 'Y-T-W allongé au sol', req: [], type: 'bw', reps: [8, 12], sets: 3, rest: 45 },
    ] },
    { slot: 'Biceps', opts: [
      { id: 'curl_bar', name: 'Curl barre', req: ['barre'], type: 'bar', ref: 'bench', k: .3, reps: [8, 12], sets: 3, rest: 60, tags: ['coude'] },
      { id: 'curl_db', name: 'Curl haltères alterné', req: ['halteres'], type: 'db', ref: 'bench', k: .13, reps: [10, 12], sets: 3, rest: 60 },
      { id: 'curl_cable', name: 'Curl poulie', req: ['poulie'], type: 'cable', ref: 'bench', k: .25, reps: [10, 15], sets: 3, rest: 60 },
      { id: 'curl_kb', name: 'Curl kettlebell', req: ['kettlebell'], type: 'kb', ref: 'bench', k: .15, reps: [10, 12], sets: 3, rest: 60 },
      { id: 'curl_band', name: 'Curl élastique', req: ['elastique'], type: 'band', reps: [15, 20], sets: 3, rest: 60 },
      { id: 'chin_iso', name: 'Chin-up (supination), descente lente', req: ['traction'], type: 'bw', reps: [3, 8], sets: 3, rest: 90 },
    ] },
    { slot: 'Gainage', opts: [
      { id: 'hang_leg', name: 'Relevés de jambes suspendu', req: ['traction'], type: 'bw', reps: [8, 15], sets: 3, rest: 60, tags: ['dos'] },
      { id: 'cable_crunch', name: 'Crunch à la poulie haute', req: ['poulie'], type: 'cable', ref: 'pdc', k: .4, reps: [12, 15], sets: 3, rest: 60 },
      { id: 'plank', name: 'Gainage planche', req: [], type: 'sec', reps: [30, 60], sets: 3, rest: 45 },
    ] },
  ],
  legs: [
    { slot: 'Unilatéral', opts: [
      { id: 'bss_db', name: 'Fentes bulgares haltères', req: ['halteres'], type: 'db', ref: 'squat', k: .12, reps: [8, 12], sets: 3, rest: 90, tags: ['genou'] },
      { id: 'bss_kb', name: 'Fentes bulgares kettlebell', req: ['kettlebell'], type: 'kb', ref: 'squat', k: .15, reps: [8, 12], sets: 3, rest: 90, tags: ['genou'] },
      { id: 'lunge_bar', name: 'Fentes marchées barre', req: ['barre', 'rack'], type: 'bar', ref: 'squat', k: .35, reps: [8, 12], sets: 3, rest: 90, tags: ['genou'] },
      { id: 'step_up', name: 'Montées sur banc / chaise', req: [], type: 'bw', reps: [10, 15], sets: 3, rest: 75 },
    ] },
    { slot: 'Ischios / charnière', opts: [
      { id: 'rdl_bar', name: 'Soulevé de terre roumain barre', req: ['barre'], type: 'bar', ref: 'deadlift', k: .45, reps: [8, 10], sets: 3, rest: 120, tags: ['dos'] },
      { id: 'leg_curl', name: 'Leg curl machine', req: ['machines'], type: 'machine', ref: 'squat', k: .3, reps: [10, 15], sets: 3, rest: 75 },
      { id: 'rdl_db', name: 'Soulevé de terre roumain haltères', req: ['halteres'], type: 'db', ref: 'deadlift', k: .2, reps: [10, 12], sets: 3, rest: 90, tags: ['dos'] },
      { id: 'kb_swing_acc', name: 'Kettlebell swing', req: ['kettlebell'], type: 'kb', ref: 'deadlift', k: .18, reps: [15, 20], sets: 3, rest: 75, tags: ['dos'] },
      { id: 'ham_bridge', name: 'Pont ischios talons sur chaise', req: [], type: 'bw', reps: [10, 15], sets: 3, rest: 60 },
    ] },
    { slot: 'Quadriceps', opts: [
      { id: 'press_acc', name: 'Presse à cuisses', req: ['machines'], type: 'machine', ref: 'squat', k: 1.1, reps: [10, 15], sets: 3, rest: 90, tags: ['genou'] },
      { id: 'goblet_acc', name: 'Goblet squat tempo (3 s en descente)', req: ['halteres'], type: 'db1', ref: 'squat', k: .25, reps: [10, 12], sets: 3, rest: 75, tags: ['genou'] },
      { id: 'goblet_kb_acc', name: 'Goblet squat kettlebell tempo', req: ['kettlebell'], type: 'kb', ref: 'squat', k: .25, reps: [10, 12], sets: 3, rest: 75, tags: ['genou'] },
      { id: 'wall_sit', name: 'Chaise contre le mur', req: [], type: 'sec', reps: [30, 60], sets: 3, rest: 60, tags: ['genou'] },
    ] },
    { slot: 'Mollets', opts: [
      { id: 'calf_machine', name: 'Mollets debout machine', req: ['machines'], type: 'machine', ref: 'squat', k: .6, reps: [12, 15], sets: 3, rest: 60 },
      { id: 'calf_db', name: 'Mollets unilatéral avec haltère', req: ['halteres'], type: 'db1', ref: 'squat', k: .15, reps: [12, 15], sets: 3, rest: 60 },
      { id: 'calf_bw', name: 'Mollets sur une marche', req: [], type: 'bw', reps: [15, 25], sets: 3, rest: 45 },
    ] },
    { slot: 'Gainage', opts: [
      { id: 'pallof', name: 'Pallof press (poulie)', req: ['poulie'], type: 'cable', ref: 'pdc', k: .15, reps: [10, 12], sets: 3, rest: 45 },
      { id: 'pallof_band', name: 'Pallof press élastique', req: ['elastique'], type: 'band', reps: [10, 12], sets: 3, rest: 45 },
      { id: 'side_plank', name: 'Gainage latéral (par côté)', req: [], type: 'sec', reps: [20, 45], sets: 3, rest: 30 },
      { id: 'dead_bug', name: 'Dead bug', req: [], type: 'bw', reps: [8, 12], sets: 3, rest: 45 },
    ] },
  ],
};

// Programme de base : 6 séances en rotation
export const ROTATION = [
  { key: 'pushA', day: 'push', label: 'Push A', main: 'bench', second: 'ohp', emoji: '🫸' },
  { key: 'pull', day: 'pull', label: 'Pull', main: 'deadlift', second: null, emoji: '🫷' },
  { key: 'legs', day: 'legs', label: 'Legs', main: 'squat', second: null, emoji: '🦵' },
  { key: 'pushB', day: 'push', label: 'Push B', main: 'ohp', second: 'bench', emoji: '🫸' },
  { key: 'pull', day: 'pull', label: 'Pull', main: 'deadlift', second: null, emoji: '🫷' },
  { key: 'legs', day: 'legs', label: 'Legs', main: 'squat', second: null, emoji: '🦵' },
];
export const DAY_TYPES = [
  { key: 'pushA', label: 'Push A – développé couché', rot: 0 },
  { key: 'pushB', label: 'Push B – développé militaire', rot: 3 },
  { key: 'pull', label: 'Pull – soulevé de terre', rot: 1 },
  { key: 'legs', label: 'Legs – squat', rot: 2 },
];

// Vague de 3 semaines sur les 4 mouvements de base (% du 1RM estimé)
export const WAVES = {
  debutant: [{ sets: 3, reps: 8, pct: .70, rest: 150 }, { sets: 3, reps: 6, pct: .75, rest: 180 }, { sets: 3, reps: 5, pct: .80, rest: 180 }],
  inter: [{ sets: 4, reps: 8, pct: .70, rest: 150 }, { sets: 4, reps: 6, pct: .75, rest: 180 }, { sets: 4, reps: 4, pct: .825, rest: 180, amrap: true }],
  avance: [{ sets: 5, reps: 6, pct: .72, rest: 180 }, { sets: 5, reps: 4, pct: .80, rest: 180 }, { sets: 5, reps: 3, pct: .85, rest: 210, amrap: true }],
};

export const LIFT_NAMES = { bench: 'Développé couché', squat: 'Squat', deadlift: 'Soulevé de terre', ohp: 'Développé militaire' };

// Ratios « 1RM / poids de corps » pour estimer un niveau si l'utilisateur ne connaît pas ses charges
export const DEFAULT_RATIOS = {
  debutant: { bench: .6, squat: .8, deadlift: 1, ohp: .4 },
  inter: { bench: 1, squat: 1.3, deadlift: 1.6, ohp: .6 },
  avance: { bench: 1.3, squat: 1.7, deadlift: 2.1, ohp: .8 },
};
