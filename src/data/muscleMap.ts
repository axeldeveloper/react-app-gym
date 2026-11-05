import type { Exercicio } from './treinos'
import type { PlanRoutine } from './planDb'

export const MAP_MUSCLES = [
  'trapezius',
  'deltoids',
  'chest',
  'upper-back',
  'serratus',
  'biceps',
  'triceps',
  'forearm',
  'abs',
  'obliques',
  'lower-back',
  'gluteal',
  'quadriceps',
  'hamstring',
  'adductors',
  'hip-flexors',
  'calves',
  'tibialis',
] as const

export type MapMuscle = (typeof MAP_MUSCLES)[number]
export type MuscleLoad = Partial<Record<MapMuscle, number>>

export const MAP_MUSCLE_NAMES: Record<MapMuscle, string> = {
  trapezius: 'Trapézio',
  deltoids: 'Deltoides',
  chest: 'Peitorais',
  'upper-back': 'Dorsais e parte superior das costas',
  serratus: 'Serrátil anterior',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearm: 'Antebraços',
  abs: 'Abdômen',
  obliques: 'Oblíquos',
  'lower-back': 'Lombar',
  gluteal: 'Glúteos',
  quadriceps: 'Quadríceps',
  hamstring: 'Isquiotibiais',
  adductors: 'Adutores',
  'hip-flexors': 'Flexores do quadril',
  calves: 'Panturrilhas',
  tibialis: 'Tibial anterior',
}

const MUSCLE_ALIASES: Record<string, MapMuscle> = {
  abs: 'abs',
  abdominals: 'abs',
  abductors: 'gluteal',
  adductors: 'adductors',
  back: 'upper-back',
  biceps: 'biceps',
  brachialis: 'biceps',
  calves: 'calves',
  chest: 'chest',
  core: 'abs',
  delts: 'deltoids',
  deltoids: 'deltoids',
  forearm: 'forearm',
  forearms: 'forearm',
  glutes: 'gluteal',
  hamstrings: 'hamstring',
  'hip flexors': 'hip-flexors',
  lats: 'upper-back',
  'latissimus dorsi': 'upper-back',
  'lower abs': 'abs',
  'lower back': 'lower-back',
  'levator scapulae': 'trapezius',
  obliques: 'obliques',
  pectorals: 'chest',
  quads: 'quadriceps',
  quadriceps: 'quadriceps',
  'rear deltoids': 'deltoids',
  rhomboids: 'upper-back',
  'rotator cuff': 'deltoids',
  'serratus anterior': 'serratus',
  shoulders: 'deltoids',
  shins: 'tibialis',
  soleus: 'calves',
  spine: 'lower-back',
  traps: 'trapezius',
  trapezius: 'trapezius',
  triceps: 'triceps',
  'upper back': 'upper-back',
  'upper chest': 'chest',
  wrists: 'forearm',
}

const BODYPART_WEIGHTS: Record<string, Partial<Record<MapMuscle, number>>> = {
  back: { 'upper-back': 0.75, 'lower-back': 0.25 },
  cardio: {},
  chest: { chest: 1 },
  'full body': {
    chest: 0.2,
    'upper-back': 0.2,
    gluteal: 0.2,
    quadriceps: 0.2,
    hamstring: 0.1,
    abs: 0.1,
  },
  'lower arms': { forearm: 1 },
  'lower legs': { calves: 0.8, tibialis: 0.2 },
  neck: { trapezius: 1 },
  shoulders: { deltoids: 1 },
  'upper arms': { biceps: 0.5, triceps: 0.5 },
  'upper legs': { quadriceps: 0.4, hamstring: 0.35, gluteal: 0.25 },
  waist: { abs: 0.7, obliques: 0.3 },
}

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('en').trim()
}

function pesoDoMusculo(exercicio: Exercicio) {
  const weights = new Map<MapMuscle, number>()
  const primary = MUSCLE_ALIASES[normalizar(exercicio.alvoOriginal || exercicio.alvo)]
  if (primary) weights.set(primary, 1)

  const secondaryMuscles = exercicio.musculosSecundariosOriginais.length
    ? exercicio.musculosSecundariosOriginais
    : exercicio.musculosSecundarios
  secondaryMuscles.forEach((name) => {
    const secondary = MUSCLE_ALIASES[normalizar(name)]
    if (secondary) weights.set(secondary, Math.max(weights.get(secondary) ?? 0, 0.4))
  })

  if (!weights.size) {
    Object.entries(BODYPART_WEIGHTS[normalizar(exercicio.parteCorporal)] ?? {}).forEach(
      ([muscle, weight]) => weights.set(muscle as MapMuscle, weight ?? 0),
    )
  }

  return MAP_MUSCLES.filter((muscle) => weights.has(muscle)).map((muscle) => {
    return [muscle, weights.get(muscle) ?? 0] as const
  })
}

export function muscleLoadsForRoutine(
  routine: PlanRoutine,
  exercises: ReadonlyMap<string, Exercicio>,
): MuscleLoad {
  const load: MuscleLoad = {}
  routine.exercises.forEach((item) => {
    const exercise = exercises.get(item.exerciseId)
    if (!exercise || item.sets <= 0) return
    pesoDoMusculo(exercise).forEach(([muscle, weight]) => {
      load[muscle] = (load[muscle] ?? 0) + item.sets * weight
    })
  })
  return load
}

export function musclesInRoutine(load: MuscleLoad) {
  return MAP_MUSCLES.filter((muscle) => (load[muscle] ?? 0) > 0).map((muscle) => ({
    id: muscle,
    name: MAP_MUSCLE_NAMES[muscle],
  }))
}
