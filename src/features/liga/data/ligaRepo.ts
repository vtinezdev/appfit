// Ejercicios que el usuario decide mantener en Élite (campo `ligaMantener` de `settings`): no avisan durante el entreno.
// Cada cambio lee y escribe en la misma transacción, como `updateSettings`.
import { db } from '../../../shared/db/db'
import { getSettings, updateSettings } from '../../../shared/db/settings'

function cambiar(f: (ids: number[]) => number[]): Promise<number[]> {
  return db.transaction('rw', db.settings, async () => {
    const ids = [...new Set(f((await getSettings()).ligaMantener ?? []))].sort((a, b) => a - b)
    await updateSettings({ ligaMantener: ids.length ? ids : undefined })
    return ids
  })
}

/** «Mantener»: el ejercicio deja de avisar en Élite. */
export function mantener(exerciseId: number): Promise<number[]> {
  return cambiar((ids) => [...ids, exerciseId])
}

/** «Volver a avisar». */
export function volverAAvisar(exerciseId: number): Promise<number[]> {
  return cambiar((ids) => ids.filter((id) => id !== exerciseId))
}
