import { db, type Entry, type Exercise, type Food, type Routine, type SetEntry, type Settings, type Workout } from '../db'

interface BackupData {
  version: 1
  exportedAt: string
  foods: Food[]
  entries: Entry[]
  settings: Settings[]
  exercises: Exercise[]
  routines: Routine[]
  workouts: Workout[]
  sets: SetEntry[]
}

export async function exportarBackup(): Promise<BackupData> {
  const [foods, entries, settings, exercises, routines, workouts, sets] = await Promise.all([
    db.foods.toArray(),
    db.entries.toArray(),
    db.settings.toArray(),
    db.exercises.toArray(),
    db.routines.toArray(),
    db.workouts.toArray(),
    db.sets.toArray(),
  ])
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    foods,
    entries,
    settings,
    exercises,
    routines,
    workouts,
    sets,
  }
}

export function descargarBackup(data: BackupData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const fecha = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `appfit-backup-${fecha}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function esBackupValido(data: unknown): data is BackupData {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return (
    d.version === 1 &&
    Array.isArray(d.foods) &&
    Array.isArray(d.entries) &&
    Array.isArray(d.settings) &&
    Array.isArray(d.exercises) &&
    Array.isArray(d.routines) &&
    Array.isArray(d.workouts) &&
    Array.isArray(d.sets)
  )
}

/** Sustituye todos los datos locales por los del backup (borra lo existente antes). */
export async function importarBackup(json: string): Promise<void> {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  if (!esBackupValido(data)) {
    throw new Error('El archivo no tiene el formato de backup de AppFit.')
  }

  await db.transaction('rw', [db.foods, db.entries, db.settings, db.exercises, db.routines, db.workouts, db.sets], async () => {
    await Promise.all([
      db.foods.clear(),
      db.entries.clear(),
      db.settings.clear(),
      db.exercises.clear(),
      db.routines.clear(),
      db.workouts.clear(),
      db.sets.clear(),
    ])
    await Promise.all([
      db.foods.bulkAdd(data.foods),
      db.entries.bulkAdd(data.entries),
      db.settings.bulkAdd(data.settings),
      db.exercises.bulkAdd(data.exercises),
      db.routines.bulkAdd(data.routines),
      db.workouts.bulkAdd(data.workouts),
      db.sets.bulkAdd(data.sets),
    ])
  })
}

export async function borrarTodosLosDatos(): Promise<void> {
  await db.transaction('rw', [db.foods, db.entries, db.settings, db.exercises, db.routines, db.workouts, db.sets], async () => {
    await Promise.all([
      db.foods.clear(),
      db.entries.clear(),
      db.settings.clear(),
      db.exercises.clear(),
      db.routines.clear(),
      db.workouts.clear(),
      db.sets.clear(),
    ])
  })
}
