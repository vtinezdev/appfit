// Metas personales (campo `metas` de `settings`, B13). Cada cambio lee y escribe en la misma transacción, como
// `updateSettings`. El estado de cada meta no se guarda: se deriva al leer (`lib/metas.estadoMetas`).
import { db } from '../../../shared/db/db'
import { getSettings, updateSettings } from '../../../shared/db/settings'
import type { Meta } from '../../../shared/db/types'
import { mejorCarga, validarMeta, type NuevaMeta } from '../lib/metas'

export class MetaInvalida extends Error {}

function cambiar(f: (metas: Meta[]) => Meta[]): Promise<Meta[]> {
  return db.transaction('rw', db.settings, async () => {
    const metas = f((await getSettings()).metas ?? [])
    await updateSettings({ metas: metas.length ? metas : undefined })
    return metas
  })
}

/** Valida la meta (una de récord, por encima de lo mejor del ejercicio) y lanza `MetaInvalida` con el motivo. */
async function validar(m: NuevaMeta, hoy: string): Promise<void> {
  const mejor = m.tipo === 'record' && m.exerciseId !== undefined ? mejorCarga(await db.sets.where('exerciseId').equals(m.exerciseId).toArray(), m.exerciseId) : 0
  const error = validarMeta(m, hoy, mejor)
  if (error) throw new MetaInvalida(error)
}

const limpia = (m: NuevaMeta): Omit<Meta, 'id' | 'creada'> => ({
  tipo: m.tipo, valor: m.valor,
  ...(m.tipo === 'record' && m.exerciseId !== undefined ? { exerciseId: m.exerciseId } : {}),
  ...(m.tipo === 'km-mes' && m.mes ? { mes: m.mes } : {}),
  ...(m.tipo !== 'km-mes' && m.fecha ? { fecha: m.fecha } : {}),
})

export async function crear(m: NuevaMeta, hoy: string, id: string = crypto.randomUUID()): Promise<Meta> {
  await validar(m, hoy)
  const nueva: Meta = { id, ...limpia(m), creada: hoy }
  await cambiar((metas) => [...metas, nueva])
  return nueva
}

/** Cambia el valor o el plazo («¿Cambiar fecha?»). El tipo, el ejercicio y el día de creación se conservan. */
export async function editar(id: string, cambios: Pick<NuevaMeta, 'valor' | 'fecha' | 'mes'>, hoy: string): Promise<void> {
  const actual = (await getSettings()).metas?.find((m) => m.id === id)
  if (!actual) throw new MetaInvalida('La meta ya no está.')
  const siguiente: NuevaMeta = { tipo: actual.tipo, exerciseId: actual.exerciseId, valor: cambios.valor, mes: cambios.mes ?? actual.mes, fecha: cambios.fecha }
  // Al editar, la meta de récord puede quedar por debajo de lo ya levantado si se cumplió: solo se exige plazo válido.
  const error = validarMeta(siguiente, hoy, 0)
  if (error) throw new MetaInvalida(error)
  await cambiar((metas) => metas.map((m) => (m.id === id ? { id, creada: m.creada, ...limpia(siguiente) } : m)))
}

/** Borra una meta y la devuelve, para «Deshacer». */
export async function borrar(id: string): Promise<{ meta: Meta; indice: number } | undefined> {
  let quitada: { meta: Meta; indice: number } | undefined
  await cambiar((metas) => {
    const indice = metas.findIndex((m) => m.id === id)
    if (indice >= 0) quitada = { meta: metas[indice], indice }
    return metas.filter((m) => m.id !== id)
  })
  return quitada
}

/** Vuelve a poner una meta borrada en su sitio. */
export function restaurar({ meta, indice }: { meta: Meta; indice: number }): Promise<Meta[]> {
  return cambiar((metas) => (metas.some((m) => m.id === meta.id) ? metas : [...metas.slice(0, indice), meta, ...metas.slice(indice)]))
}
