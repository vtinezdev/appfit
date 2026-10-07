import { db, TABLAS_USUARIO } from '../db/db'
import { conDefaults } from '../db/settings'
import type { Agua, Entry, Exercise, Food, Meal, Medida, NombreAlimento, NotaMedida, ObjetivoDia, Peso, Porcion, Receta, Routine, SetEntry, Settings, Workout } from '../db/types'

/**
 * Formato del backup JSON. Reglas para cambiarlo:
 * - El catálogo de alimentos (`TABLAS_CATALOGO`) NUNCA entra: es re-descargable y puede ser grande. Solo se
 *   exportan, importan y borran las `TABLAS_USUARIO`; una tabla de datos del usuario nueva va en esa lista.
 * - Añadir una tabla nueva de usuario: va en TABLAS_OPCIONALES (si falta en un backup, se importa vacía). No sube la versión.
 * - Campos opcionales nuevos en los registros (p. ej. `catalogId` en entries) no cambian la versión.
 * - Campos de `settings` que se dejan de usar tampoco: `conDefaults` los descarta al importar (así se quitaron
 *   `apiKey` y `modelo` al retirar la IA, junto con el metadato `incluyeApiKey`, que ahora se ignora).
 * - Cambiar la forma de los registros: sube BACKUP_VERSION y se añade el paso correspondiente en `migrarBackup`.
 *   Lo mismo si un `upgrade()` de Dexie transforma registros, porque importar se salta los upgrades.
 */
export const BACKUP_VERSION = 3

const TABLAS_OBLIGATORIAS = ['foods', 'entries', 'settings', 'exercises', 'routines', 'workouts', 'sets'] as const
const TABLAS_OPCIONALES = ['meals', 'notasMedida', 'pesos', 'nombresAlimentos', 'porciones', 'recetas', 'agua', 'objetivosDia', 'medidas'] as const

export interface BackupV3 {
  version: 3
  exportedAt: string
  /** Versión del esquema de Dexie al exportar (informativo). */
  dbVersion: number
  foods: Food[]
  entries: Entry[]
  settings: Settings[]
  exercises: Exercise[]
  routines: Routine[]
  workouts: Workout[]
  sets: SetEntry[]
  /** Opcional: los backups anteriores a la fase 1 de Nutrición v2 no la traen. */
  meals?: Meal[]
  /** Opcional: los backups anteriores a las notas de medidas no la traen. */
  notasMedida?: NotaMedida[]
  /** Opcional: los backups anteriores a la pantalla Inicio no la traen. */
  pesos?: Peso[]
  /** Opcional en backups anteriores a los nombres personalizados de alimentos. */
  nombresAlimentos?: NombreAlimento[]
  /** Opcionales en backups anteriores a la v3 (mejoras funcionales). */
  porciones?: Porcion[]
  recetas?: Receta[]
  agua?: Agua[]
  objetivosDia?: ObjetivoDia[]
  medidas?: Medida[]
}

/** Las tablas de datos del usuario (todas menos el catálogo). */
const usuarioTablas = () => TABLAS_USUARIO.map((t) => db.table(t))

export class BackupError extends Error {}

const ERROR_FORMATO = 'El archivo no tiene el formato de backup de AppFit.'

/** Exporta todas las tablas en una lectura coherente. */
export async function exportarBackup(): Promise<BackupV3> {
  return db.transaction('r', usuarioTablas(), async () => {
    const [foods, entries, settings, exercises, routines, workouts, sets, meals, notasMedida, pesos, nombresAlimentos, porciones, recetas, agua, objetivosDia, medidas] = await Promise.all([
      db.foods.toArray(),
      db.entries.toArray(),
      db.settings.toArray(),
      db.exercises.toArray(),
      db.routines.toArray(),
      db.workouts.toArray(),
      db.sets.toArray(),
      db.meals.toArray(),
      db.notasMedida.toArray(),
      db.pesos.toArray(),
      db.nombresAlimentos.toArray(),
      db.porciones.toArray(),
      db.recetas.toArray(),
      db.agua.toArray(),
      db.objetivosDia.toArray(),
      db.medidas.toArray(),
    ])
    return {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      dbVersion: db.verno,
      foods,
      entries,
      settings,
      exercises,
      routines,
      workouts,
      sets,
      meals,
      notasMedida,
      pesos,
      nombresAlimentos,
      porciones,
      recetas,
      agua,
      objetivosDia,
      medidas,
    }
  })
}

export function descargarBackup(data: BackupV3): void {
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
 * v1 → v2 → v3: mismas tablas y registros; solo se añaden metadatos y las tablas nuevas (vacías si faltan).
 */
export function migrarBackup(raw: unknown): BackupV3 {
  if (typeof raw !== 'object' || raw === null) throw new BackupError(ERROR_FORMATO)
  const d = raw as Record<string, unknown>
  if (typeof d.version !== 'number') throw new BackupError(ERROR_FORMATO)
  if (d.version > BACKUP_VERSION) {
    throw new BackupError('Este backup es de una versión más nueva de AppFit. Actualiza la app antes de importarlo.')
  }
  if (d.version !== 1 && d.version !== 2 && d.version !== 3) throw new BackupError(ERROR_FORMATO)
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
    notasMedida: (d.notasMedida as NotaMedida[] | undefined) ?? [],
    pesos: (d.pesos as Peso[] | undefined) ?? [],
    nombresAlimentos: (d.nombresAlimentos as NombreAlimento[] | undefined) ?? [],
    porciones: (d.porciones as Porcion[] | undefined) ?? [],
    recetas: (d.recetas as Receta[] | undefined) ?? [],
    agua: (d.agua as Agua[] | undefined) ?? [],
    objetivosDia: (d.objetivosDia as ObjetivoDia[] | undefined) ?? [],
    medidas: (d.medidas as Medida[] | undefined) ?? [],
  }
  const exportedAt = typeof d.exportedAt === 'string' ? d.exportedAt : ''

  if (d.version === 1) {
    return { version: 3, exportedAt, dbVersion: 1, ...tablas }
  }
  return {
    version: 3,
    exportedAt,
    dbVersion: typeof d.dbVersion === 'number' ? d.dbVersion : 1,
    ...tablas,
  }
}

/**
 * Sustituye todos los datos locales por los del backup: vacía **todas las tablas de usuario** (también las que el backup
 * no trae, pero no el catálogo) y las rellena. Los ajustes vienen del backup, completados con los valores por defecto.
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
    await Promise.all(usuarioTablas().map((t) => t.clear()))
    for (const t of TABLAS_OBLIGATORIAS) {
      if (t !== 'settings') await db.table(t).bulkAdd(backup[t])
    }
    for (const t of TABLAS_OPCIONALES) {
      await db.table(t).bulkAdd(backup[t] ?? [])
    }
    const delBackup = backup.settings.find((s) => s.id === 1) ?? backup.settings[0]
    const ajustes = conDefaults(delBackup)
    // Importar una copia equivale a haberla exportado en su fecha: así el aviso de copia no dice «aún no has hecho una».
    const fechaCopia = Date.parse(backup.exportedAt)
    if (Number.isFinite(fechaCopia)) ajustes.ultimaExportacion = fechaCopia
    await db.settings.put(ajustes)
  })
}

/** Borra solo los datos del usuario: el catálogo se conserva. */
export async function borrarTodosLosDatos(): Promise<void> {
  await db.transaction('rw', usuarioTablas(), async () => {
    await Promise.all(usuarioTablas().map((t) => t.clear()))
  })
}
