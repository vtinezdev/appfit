import { db, TABLAS_USUARIO } from '../db/db'
import { conDefaults } from '../db/settings'
import type { Entry, Exercise, Food, Meal, Routine, SetEntry, Settings, Workout } from '../db/types'

/**
 * Formato del backup JSON. Reglas para cambiarlo:
 * - El catálogo de alimentos (`TABLAS_CATALOGO`) NUNCA entra: es re-descargable y puede ser grande. Solo se
 *   exportan, importan y borran las `TABLAS_USUARIO`; una tabla de datos del usuario nueva va en esa lista.
 * - Añadir una tabla nueva de usuario: va en TABLAS_OPCIONALES (si falta en un backup, se importa vacía). No sube la versión.
 * - Campos opcionales nuevos en los registros (p. ej. `catalogId` en entries) no cambian la versión.
 * - Cambiar la forma de los registros: sube BACKUP_VERSION y se añade el paso correspondiente en `migrarBackup`.
 *   Lo mismo si un `upgrade()` de Dexie transforma registros, porque importar se salta los upgrades.
 */
export const BACKUP_VERSION = 2

const TABLAS_OBLIGATORIAS = ['foods', 'entries', 'settings', 'exercises', 'routines', 'workouts', 'sets'] as const
const TABLAS_OPCIONALES = ['meals'] as const

export interface BackupV2 {
  version: 2
  exportedAt: string
  /** Versión del esquema de Dexie al exportar (informativo). */
  dbVersion: number
  incluyeApiKey: boolean
  foods: Food[]
  entries: Entry[]
  settings: Settings[]
  exercises: Exercise[]
  routines: Routine[]
  workouts: Workout[]
  sets: SetEntry[]
  /** Opcional: los backups anteriores a la fase 1 de Nutrición v2 no la traen. */
  meals?: Meal[]
}

/** Las tablas de datos del usuario (todas menos el catálogo). */
const usuarioTablas = () => TABLAS_USUARIO.map((t) => db.table(t))

export class BackupError extends Error {}

const ERROR_FORMATO = 'El archivo no tiene el formato de backup de AppFit.'

/** Exporta todas las tablas en una lectura coherente. La API key solo se incluye si se pide. */
export async function exportarBackup({ incluirApiKey = false }: { incluirApiKey?: boolean } = {}): Promise<BackupV2> {
  return db.transaction('r', usuarioTablas(), async () => {
    const [foods, entries, settings, exercises, routines, workouts, sets, meals] = await Promise.all([
      db.foods.toArray(),
      db.entries.toArray(),
      db.settings.toArray(),
      db.exercises.toArray(),
      db.routines.toArray(),
      db.workouts.toArray(),
      db.sets.toArray(),
      db.meals.toArray(),
    ])
    return {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      dbVersion: db.verno,
      incluyeApiKey: incluirApiKey && settings.some((s) => Boolean(s.apiKey)),
      foods,
      entries,
      settings: incluirApiKey ? settings : settings.map((s) => ({ ...s, apiKey: '' })),
      exercises,
      routines,
      workouts,
      sets,
      meals,
    }
  })
}

export function descargarBackup(data: BackupV2): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const fecha = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `appfit-backup-${fecha}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Valida un backup de cualquier versión conocida y lo lleva al formato actual.
 * v1 → v2: mismas tablas y registros; solo se añaden los metadatos.
 */
export function migrarBackup(raw: unknown): BackupV2 {
  if (typeof raw !== 'object' || raw === null) throw new BackupError(ERROR_FORMATO)
  const d = raw as Record<string, unknown>
  if (typeof d.version !== 'number') throw new BackupError(ERROR_FORMATO)
  if (d.version > BACKUP_VERSION) {
    throw new BackupError('Este backup es de una versión más nueva de AppFit. Actualiza la app antes de importarlo.')
  }
  if (d.version !== 1 && d.version !== 2) throw new BackupError(ERROR_FORMATO)
  if (TABLAS_OBLIGATORIAS.some((t) => !Array.isArray(d[t]))) throw new BackupError(ERROR_FORMATO)
  if (TABLAS_OPCIONALES.some((t) => d[t] !== undefined && !Array.isArray(d[t]))) throw new BackupError(ERROR_FORMATO)

  const tablas = {
    foods: d.foods as Food[],
    entries: d.entries as Entry[],
    settings: d.settings as Settings[],
    exercises: d.exercises as Exercise[],
    routines: d.routines as Routine[],
    workouts: d.workouts as Workout[],
    sets: d.sets as SetEntry[],
    meals: (d.meals as Meal[] | undefined) ?? [],
  }
  const exportedAt = typeof d.exportedAt === 'string' ? d.exportedAt : ''

  if (d.version === 1) {
    return { version: 2, exportedAt, dbVersion: 1, incluyeApiKey: tablas.settings.some((s) => Boolean(s?.apiKey)), ...tablas }
  }
  return {
    version: 2,
    exportedAt,
    dbVersion: typeof d.dbVersion === 'number' ? d.dbVersion : 1,
    incluyeApiKey: Boolean(d.incluyeApiKey),
    ...tablas,
  }
}

/**
 * Sustituye todos los datos locales por los del backup: vacía **todas las tablas de usuario** (también las que el backup
 * no trae, pero no el catálogo) y las rellena. De los ajustes se toma todo del backup salvo la API key: si el móvil ya tiene una,
 * se conserva; si no, se usa la del backup.
 */
export async function importarBackup(json: string): Promise<void> {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new BackupError('El archivo no es un JSON válido.')
  }
  const backup = migrarBackup(data)

  await db.transaction('rw', usuarioTablas(), async () => {
    const actual = await db.settings.get(1)
    await Promise.all(usuarioTablas().map((t) => t.clear()))
    for (const t of TABLAS_OBLIGATORIAS) {
      if (t !== 'settings') await db.table(t).bulkAdd(backup[t])
    }
    for (const t of TABLAS_OPCIONALES) {
      await db.table(t).bulkAdd(backup[t] ?? [])
    }
    const delBackup = backup.settings.find((s) => s.id === 1) ?? backup.settings[0]
    await db.settings.put(conDefaults({ ...delBackup, apiKey: actual?.apiKey || delBackup?.apiKey || '' }))
  })
}

/** Borra solo los datos del usuario: el catálogo se conserva. */
export async function borrarTodosLosDatos(): Promise<void> {
  await db.transaction('rw', usuarioTablas(), async () => {
    await Promise.all(usuarioTablas().map((t) => t.clear()))
  })
}
