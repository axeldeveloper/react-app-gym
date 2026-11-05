import { catalogueDb, type HomeDayRecord, type HomeProfileRecord, type WeightMeasurement } from './catalogueDb'

const PROFILE_ID = 'local'

export async function readHomeProfile(): Promise<HomeProfileRecord> {
  return (
    (await catalogueDb.homeProfiles.get(PROFILE_ID)) ?? {
      id: PROFILE_ID,
      name: 'Atleta',
      heightCm: null,
    }
  )
}

export function saveHomeProfile(profile: HomeProfileRecord) {
  return catalogueDb.homeProfiles.put(profile)
}

export async function readHomeDays(startDate: string, endDate: string) {
  return catalogueDb.homeDays
    .where('date')
    .between(startDate, endDate, true, true)
    .toArray()
}

export async function readHomeDay(date: string): Promise<HomeDayRecord> {
  return (
    (await catalogueDb.homeDays.get(date)) ?? {
      date,
      routineIds: [],
      completed: {},
    }
  )
}

export function saveHomeDay(day: HomeDayRecord) {
  return catalogueDb.homeDays.put(day)
}

export function setHomeExerciseCompletion(
  date: string,
  completionKey: string,
  completed: boolean,
) {
  return catalogueDb.transaction('rw', catalogueDb.homeDays, async () => {
    const day = await readHomeDay(date)
    const completions = { ...day.completed }
    if (completed) completions[completionKey] = true
    else delete completions[completionKey]
    await catalogueDb.homeDays.put({ ...day, completed: completions })
  })
}

export async function readLatestBodyWeight() {
  return catalogueDb.bodyWeights.orderBy('date').last()
}

export function saveBodyWeight(
  profile: HomeProfileRecord,
  measurement: WeightMeasurement,
) {
  return catalogueDb.transaction(
    'rw',
    catalogueDb.homeProfiles,
    catalogueDb.bodyWeights,
    async () => {
      await catalogueDb.homeProfiles.put(profile)
      await catalogueDb.bodyWeights.put(measurement)
    },
  )
}
