// Pausas de Ritmo (campo `pausas` de `settings`). Cada cambio lee y escribe en la misma transacción, como `updateSettings`.
import { db } from '../../../shared/db/db'
import { getSettings, updateSettings } from '../../../shared/db/settings'
import type { Pausa } from '../../../shared/db/types'
import { anadirPausa, quitarPausa, terminarPausa, type NuevaPausa, validarPausa } from '../lib/pausas'

function cambiar(f: (pausas: Pausa[] | undefined) => Pausa[]): Promise<Pausa[]> {
  return db.transaction('rw', db.settings, async () => {
    const pausas = f((await getSettings()).pausas)
    await updateSettings({ pausas: pausas.length ? pausas : undefined })
    return pausas
  })
}

export class PausaInvalida extends Error {}

/** Declara una pausa (recorta las que se solapen). Devuelve las pausas anteriores, para deshacer. */
export async function pausar(nueva: NuevaPausa, id: string = crypto.randomUUID()): Promise<Pausa[]> {
  const error = validarPausa(nueva)
  if (error) throw new PausaInvalida(error)
  const antes = (await getSettings()).pausas ?? []
  await cambiar((p) => anadirPausa(p, nueva, id))
  return antes
}

/** Reanudar hoy: la pausa acaba ayer. Devuelve las pausas anteriores, para deshacer. */
export async function reanudar(id: string, hoy: string): Promise<Pausa[]> {
  const antes = (await getSettings()).pausas ?? []
  await cambiar((p) => terminarPausa(p, id, hoy))
  return antes
}

/** Borra una pausa. Devuelve las pausas anteriores, para deshacer. */
export async function borrar(id: string): Promise<Pausa[]> {
  const antes = (await getSettings()).pausas ?? []
  await cambiar((p) => quitarPausa(p, id))
  return antes
}

/** Deja las pausas como estaban (Deshacer). */
export function restaurar(pausas: Pausa[]): Promise<Pausa[]> {
  return cambiar(() => [...pausas])
}
