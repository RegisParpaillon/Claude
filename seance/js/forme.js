// Forme du jour : 4 critères notés de 1 (mauvais) à 5 (excellent).
export const FORM_QUESTIONS = [
  { id: 'sommeil', label: 'Sommeil', lo: 'Très mauvais', hi: 'Excellent' },
  { id: 'energie', label: 'Énergie', lo: 'À plat', hi: 'Au top' },
  { id: 'courbatures', label: 'Courbatures', lo: 'Très fortes', hi: 'Aucune' },
  { id: 'stress', label: 'Stress / moral', lo: 'Très stressé', hi: 'Détendu' },
];

export function readiness(f) {
  const vals = FORM_QUESTIONS.map(q => Number(f?.[q.id] ?? 3));
  const s = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (s >= 4) return { score: s, level: 4, label: 'En forme', emoji: '💪', load: 1, setDelta: 0, accDrop: 0, pace: 0,
    note: 'Bonne forme : séance complète, charges du programme.' };
  if (s >= 3) return { score: s, level: 3, label: 'Correcte', emoji: '🙂', load: 1, setDelta: 0, accDrop: 0, pace: 0,
    note: 'Forme correcte : séance normale.' };
  if (s >= 2.3) return { score: s, level: 2, label: 'Moyenne', emoji: '😐', load: .92, setDelta: -1, accDrop: 1, pace: 5,
    note: 'Forme moyenne : charges −8 %, une série et un exercice de moins. La progression du programme est mise en pause.' };
  if (s >= 1.6) return { score: s, level: 1, label: 'Fatigué', emoji: '😴', load: .85, setDelta: -1, accDrop: 2, pace: 10,
    note: 'Fatigue nette : séance allégée (−15 %), technique propre, pas d’échec musculaire.' };
  return { score: s, level: 0, label: 'Épuisé', emoji: '🛑', load: .8, setDelta: -2, accDrop: 3, pace: 15,
    note: 'Très fatigué : le repos ou une séance de mobilité serait plus utile aujourd’hui. Si vous y allez, restez très léger.' };
}
