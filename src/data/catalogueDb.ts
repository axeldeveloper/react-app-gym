import Dexie, { type Table } from 'dexie'
import {
  criarExercicio,
  criarGrupo,
  PARTES_CORPORAIS,
  type ExerciseRecord,
  type Exercicio,
  type Grupo,
} from './treinos'
import type { PlanRoutine } from './planDb'

export type HomeProfileRecord = {
  id: 'local'
  name: string
  heightCm: number | null
  avatar?: Blob
  avatarType?: string
}

export type HomeDayRecord = {
  date: string
  routineIds: string[]
  completed: Record<string, boolean>
}

export type WeightMeasurement = {
  date: string
  weightKg: number
}

type CatalogueVersion = {
  key: string
  value: string
}

type CatalogueManifest = {
  version: string
  count: number
}

class ExerciseDatabase extends Dexie {
  exercises!: Table<ExerciseRecord, string>
  metadata!: Table<CatalogueVersion, string>
  routines!: Table<PlanRoutine, string>
  homeDays!: Table<HomeDayRecord, string>
  homeProfiles!: Table<HomeProfileRecord, string>
  bodyWeights!: Table<WeightMeasurement, string>

  constructor() {
    super('ExerciseCatalog')
    this.version(2).stores({
      exercises: 'id, name, namePtBr, bodyPart, target, category, equipment, custom',
      metadata: '&key',
    })
    this.version(3).stores({
      exercises: 'id, name, namePtBr, bodyPart, target, category, equipment, custom',
      metadata: '&key',
      routines: '&id, position',
    })
    this.version(4).stores({
      exercises: 'id, name, namePtBr, bodyPart, target, category, equipment, custom',
      metadata: '&key',
      routines: '&id, position',
      homeDays: '&date',
      homeProfiles: '&id',
      bodyWeights: '&date',
    })
  }
}

export const catalogueDb = new ExerciseDatabase()

let initialization: Promise<Grupo[]> | undefined

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Falha ao carregar ${path}: HTTP ${response.status}`)
  }
  return response.json() as Promise<T>
}

async function loadCatalogue(): Promise<Grupo[]> {
  const manifest = await fetchJson<CatalogueManifest>('/data/catalogue-version.json')
  if (
    typeof manifest.version !== 'string' ||
    !manifest.version ||
    !Number.isInteger(manifest.count) ||
    manifest.count < 1
  ) {
    throw new Error('O manifesto do catálogo é inválido.')
  }

  const savedVersion = await catalogueDb.metadata.get('catalogue-version')
  const savedCount = await catalogueDb.metadata.get('catalogue-count')
  if (
    savedVersion?.value !== manifest.version ||
    Number(savedCount?.value) !== manifest.count
  ) {
    const records = await fetchJson<ExerciseRecord[]>('/data/exercises.json')
    if (!Array.isArray(records) || records.length !== manifest.count) {
      throw new Error('O arquivo de exercícios não corresponde à versão do catálogo.')
    }

    await catalogueDb.transaction(
      'rw',
      catalogueDb.exercises,
      catalogueDb.metadata,
      async () => {
        const customExercises = await catalogueDb.exercises.where('custom').equals(1).toArray()
        await catalogueDb.exercises.clear()
        await catalogueDb.exercises.bulkPut(records)
        if (customExercises.length) {
          await catalogueDb.exercises.bulkPut(customExercises)
        }
        await catalogueDb.metadata.put({
          key: 'catalogue-version',
          value: manifest.version,
        })
        await catalogueDb.metadata.put({
          key: 'catalogue-count',
          value: String(manifest.count),
        })
      },
    )
  }

  const grupos = await Promise.all(
    Object.keys(PARTES_CORPORAIS).map(async (parteCorporal) => {
      const ids = await catalogueDb.exercises
        .where('bodyPart')
        .equals(parteCorporal)
        .primaryKeys()
      return criarGrupo(parteCorporal, ids.map(String))
    }),
  )

  return grupos.filter((grupo) => grupo.total > 0)
}

export function initializeCatalogue() {
  if (!initialization) {
    initialization = loadCatalogue().catch((error: unknown) => {
      initialization = undefined
      throw error
    })
  }
  return initialization
}

export async function readExercisesByBodyPart(bodyPart: string): Promise<Exercicio[]> {
  const records = await catalogueDb.exercises.where('bodyPart').equals(bodyPart).toArray()
  return records
    .filter((record) => typeof record.name === 'string' && record.name !== 'undefined')
    .map(criarExercicio)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

export async function readAllExercises(): Promise<Exercicio[]> {
  const records = await catalogueDb.exercises.toArray()
  return records
    .filter(
      (record) =>
        typeof record.name === 'string' &&
        record.name !== 'undefined' &&
        typeof record.bodyPart === 'string' &&
        record.bodyPart.length > 0,
    )
    .map(criarExercicio)
}

export async function saveCustomExercise(
  exercise: Omit<ExerciseRecord, 'id' | 'custom'>,
): Promise<Exercicio> {
  const record: ExerciseRecord = {
    ...exercise,
    id: `custom-${crypto.randomUUID()}`,
    custom: 1,
  }
  await catalogueDb.exercises.add(record)
  return criarExercicio(record)
}
