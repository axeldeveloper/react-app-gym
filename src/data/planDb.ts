import { catalogueDb } from './catalogueDb'

export type PlanRoutineExercise = {
  exerciseId: string
  sets: number
  reps: number
}

export type ProgressionType = 'none' | 'linear' | 'greyskull-lp' | 'double' | 'triple'

export type PlanRoutine = {
  id: string
  name: string
  focus: string
  position: number
  progression: ProgressionType
  deload: boolean
  exercises: PlanRoutineExercise[]
}

type InitialExercise = { name: string; sets: number; reps: number }
type InitialRoutine = Omit<PlanRoutine, 'position' | 'exercises'> & {
  exercises: InitialExercise[]
}

const INITIAL_ROUTINES: InitialRoutine[] = [
  {
    id: 'push-day',
    name: 'Push Day',
    focus: 'Empurrar',
    progression: 'linear',
    deload: false,
    exercises: [
      { name: 'barbell bench press', sets: 4, reps: 8 },
      { name: 'barbell incline bench press', sets: 3, reps: 10 },
      { name: 'dumbbell standing overhead press', sets: 3, reps: 10 },
      { name: 'dumbbell lateral raise', sets: 3, reps: 12 },
      { name: 'cable triceps pushdown (v-bar)', sets: 3, reps: 12 },
      { name: 'dumbbell bench press', sets: 3, reps: 10 },
    ],
  },
  {
    id: 'pull-day',
    name: 'Pull Day',
    focus: 'Puxar',
    progression: 'linear',
    deload: false,
    exercises: [
      { name: 'barbell bent over row', sets: 4, reps: 8 },
      { name: 'cable rope seated row', sets: 3, reps: 10 },
      { name: 'barbell curl', sets: 3, reps: 10 },
      { name: 'dumbbell hammer curl', sets: 3, reps: 10 },
      { name: 'cable lat pulldown full range of motion', sets: 3, reps: 12 },
    ],
  },
]

let initialization: Promise<void> | undefined

function normalizarNome(name: string) {
  return name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('en')
}

async function seedPlanRoutines(): Promise<void> {
  if ((await catalogueDb.routines.count()) === 0) {
    const records = await catalogueDb.exercises.toArray()
    const idsByName = new Map<string, string>()
    records.forEach((record) => {
      if (record.name) idsByName.set(normalizarNome(record.name), record.id)
    })
    const missing: string[] = []
    const initial = INITIAL_ROUTINES.map((routine, position) => ({
      ...routine,
      position,
      exercises: routine.exercises.flatMap((exercise: InitialExercise) => {
        const exerciseId = idsByName.get(normalizarNome(exercise.name))
        if (!exerciseId) {
          missing.push(exercise.name)
          return []
        }
        return [{ exerciseId, sets: exercise.sets, reps: exercise.reps }]
      }),
    }))

    if (missing.length) {
      throw new Error(`Exercícios iniciais não encontrados no IndexedDB: ${missing.join(', ')}`)
    }

    await catalogueDb.routines.bulkAdd(initial)
  }

}

export async function initializePlanRoutines() {
  if (!initialization) {
    initialization = seedPlanRoutines().catch((error: unknown) => {
      initialization = undefined
      throw error
    })
  }
  await initialization
  return catalogueDb.routines.orderBy('position').toArray()
}

export function savePlanRoutine(routine: PlanRoutine) {
  return catalogueDb.routines.put(routine)
}

export function addExerciseToPlanRoutine(routineId: string, exerciseId: string) {
  return catalogueDb.transaction(
    'rw',
    catalogueDb.exercises,
    catalogueDb.routines,
    async () => {
      const [routine, exercise] = await Promise.all([
        catalogueDb.routines.get(routineId),
        catalogueDb.exercises.get(exerciseId),
      ])
      if (!routine) throw new Error('A rotina não foi encontrada no IndexedDB.')
      if (!exercise) throw new Error('O exercício não foi encontrado no IndexedDB.')
      if (routine.exercises.some((item) => item.exerciseId === exerciseId)) return routine

      const updated = {
        ...routine,
        exercises: [...routine.exercises, { exerciseId, sets: 3, reps: 10 }],
      }
      await catalogueDb.routines.put(updated)
      return updated
    },
  )
}

export function savePlanRoutines(routines: PlanRoutine[]) {
  return catalogueDb.transaction('rw', catalogueDb.routines, async () => {
    if (routines.length) await catalogueDb.routines.bulkPut(routines)
  })
}

export function deletePlanRoutine(id: string, reordered: PlanRoutine[]) {
  return catalogueDb.transaction('rw', catalogueDb.routines, async () => {
    await catalogueDb.routines.delete(id)
    if (reordered.length) await catalogueDb.routines.bulkPut(reordered)
  })
}
