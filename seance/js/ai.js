// Demande en texte libre : Claude compose une séance complète au format de l'app.
import { LIFT_NAMES } from './data.js';
import { paces, fmtPace } from './run.js';

const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.128.0/+esm';
const MODEL = 'claude-opus-5-5';
const KEY = 'seance-apikey';

export const getApiKey = () => localStorage.getItem(KEY) || '';
export const setApiKey = k => (k ? localStorage.setItem(KEY, k) : localStorage.removeItem(KEY));

const str = { type: 'string' };
const nullable = t => ({ anyOf: [{ type: t }, { type: 'null' }] });
const obj = (props) => ({ type: 'object', additionalProperties: false, required: Object.keys(props), properties: props });
const WU = obj({ name: str, dose: str, sec: nullable('integer') });

const SCHEMA = obj({
  kind: { type: 'string', enum: ['muscu', 'run'] },
  title: str,
  intro: str,
  warmup: obj({ articulaire: { type: 'array', items: WU }, mobilite: { type: 'array', items: WU } }),
  exercises: { type: 'array', items: obj({
    name: str,
    role: { type: 'string', enum: ['main', 'second', 'acc'] },
    lift: { type: 'string', enum: ['bench', 'squat', 'deadlift', 'ohp', 'none'] },
    type: { type: 'string', enum: ['bar', 'db', 'db1', 'kb', 'machine', 'cable', 'band', 'bw', 'sec'] },
    rest: { type: 'integer' },
    info: str,
    sets: { type: 'array', items: obj({ reps: { type: 'integer' }, w: nullable('number'), warmup: { type: 'boolean' } }) },
  }) },
  steps: { type: 'array', items: obj({
    label: str, sec: { type: 'integer' }, pace: str,
    kind: { type: 'string', enum: ['ef', 'work', 'rec'] }, note: str,
  }) },
  desc: str,
  tips: { type: 'array', items: str },
});

function context(profile, history, form, pains, eq) {
  const p = paces(profile.run.vdot);
  return {
    niveau: profile.level,
    poids_de_corps_kg: profile.bodyweight,
    maxis_estimes_1RM_kg: Object.fromEntries(Object.entries(profile.lifts).map(([k, v]) => [LIFT_NAMES[k], v])),
    allures_par_km: {
      endurance_fondamentale: `${fmtPace(p.efFast)} à ${fmtPace(p.efSlow)}`, seuil: fmtPace(p.seuil),
      fractionne_long_3_5min: fmtPace(p.interval), vma: fmtPace(p.vma),
    },
    sortie_longue_actuelle_min: profile.run.longMin,
    materiel_habituel: eq,
    forme_du_jour: { ...form.vals, synthese: form.label, consigne: form.note },
    zones_douloureuses: pains,
    dernieres_seances: history.slice(0, 6).map(h => ({
      date: new Date(h.date).toISOString().slice(0, 10), seance: h.title, resume: h.summary, ressenti: h.feel,
    })),
  };
}

export async function askClaude({ request, profile, history, form, pains, eq }) {
  const apiKey = getApiKey();
  const { default: Anthropic } = await import(SDK_URL);
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const prompt = `Tu es coach de musculation et de course à pied. Compose UNE séance pour l'utilisateur, en français, d'après sa demande ci-dessous, en respectant son niveau, ses charges, ses allures, sa forme du jour et ses douleurs.

Profil et contexte (JSON) :
${JSON.stringify(context(profile, history, form, pains, eq))}

Demande de l'utilisateur :
"""${request}"""

Règles :
- kind = "muscu" pour du renforcement / de la musculation, "run" pour une séance de course.
- La forme du jour prime : si elle est moyenne ou basse, ou si une zone est douloureuse, allège (charges, volume, intensité) ou adapte, et explique-le en une ou deux phrases dans intro. Ne propose jamais de travailler une zone douloureuse en charge.
- intro : 1 à 3 phrases, ton motivant et concret.
- Muscu : warmup.articulaire (4 à 7 exercices de rotations articulaires) puis warmup.mobilite (4 à 6 exercices de mobilité spécifiques aux muscles travaillés) ; sec = durée en secondes uniquement pour les exercices tenus ou chronométrés, sinon null. exercises : séries d'échauffement (warmup=true) avant un mouvement lourd à la barre, puis séries de travail. w = charge en kg (par haltère pour type "db"), arrondie à 2,5 kg pour la barre (barre vide 20 kg), 2 kg pour les haltères, 4 kg pour les kettlebells ; w = null pour poids du corps, élastique ou gainage. Pour type "sec", reps = secondes de maintien. rest = récupération en secondes après chaque série de l'exercice. lift = le mouvement de base correspondant (bench, squat, deadlift, ohp) sinon "none". info = consigne courte (technique, tempo ou intensité). N'utilise que le matériel cité dans la demande, sinon le matériel habituel. steps = [].
- Run : steps décrit tout le déroulé chronométré (échauffement, chaque répétition et chaque récupération séparément, retour au calme), avec sec en secondes, pace = allure cible (« 5:30 /km », « trot », « marche »), kind = ef / work / rec. Utilise les allures du profil. desc = résumé du corps de séance en une ligne. warmup = listes vides, exercises = [].
- tips : 2 à 4 conseils courts.
- title : court, sans emoji.`;

  const params = {
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: prompt }],
  };
  let msg;
  try {
    // Repli automatique sur un autre modèle si la requête est refusée par les filtres de sécurité.
    msg = await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  } catch (e) {
    if (e instanceof Anthropic.BadRequestError) msg = await client.messages.create(params);
    else throw e;
  }
  if (msg.stop_reason === 'refusal') throw new Error('Demande refusée par le modèle.');
  if (msg.stop_reason === 'max_tokens') throw new Error('Réponse incomplète, réessayez avec une demande plus courte.');
  return JSON.parse(msg.content.filter(b => b.type === 'text').map(b => b.text).join(''));
}

export async function testApiKey(apiKey) {
  const { default: Anthropic } = await import(SDK_URL);
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  await client.models.retrieve(MODEL);
}

// Conversion de la réponse en séance de l'app
export function toSession(r, profile, { form, pains, eq }) {
  const base = { ai: true, title: `✨ ${r.title}`, form, intro: r.intro, tips: r.tips || [] };
  if (r.kind === 'run' && r.steps.length) {
    const steps = r.steps.filter(s => s.sec > 0).map(s => ({ label: s.label, sec: s.sec, pace: s.pace, kind: s.kind, note: s.note }));
    return { ...base, kind: 'run', type: 'libre', steps, desc: r.desc, notes: [],
      totalSec: steps.reduce((a, s) => a + s.sec, 0), paces: paces(profile.run.vdot, form.pace), km: null };
  }
  return { ...base, kind: 'muscu', rot: -1, day: null, eq, pains, progress: false,
    duration: null, wuDone: {},
    warmup: { articulaire: r.warmup.articulaire.map(w => ({ ...w, sec: w.sec || undefined })), mobilite: r.warmup.mobilite.map(w => ({ ...w, sec: w.sec || undefined })) },
    exercises: r.exercises.map((e, i) => ({
      id: `ai_${i}`, role: e.role, lift: e.lift === 'none' ? null : e.lift, name: e.name, type: e.type, rest: e.rest,
      info: e.info, swappable: false,
      sets: e.sets.map(s => ({ reps: s.reps, w: s.w, rest: s.warmup ? Math.min(90, e.rest) : e.rest, warmup: s.warmup })),
    })) };
}
