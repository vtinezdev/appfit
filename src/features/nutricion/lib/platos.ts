import type { AgrupacionPlato, Entry } from '../../../shared/db/types'

export interface Plato {
  clave: string
  nombre: string
  agrupado: boolean
  entries: Entry[]
}

/** Un id no une ingredientes de fechas o comidas distintas, ni agrupa registros antiguos por coincidencia. */
export function clavePlato(e: Entry): string {
  return JSON.stringify([e.fecha, e.comida, e.platoId])
}

/** Mantiene el orden de registro y los snapshots originales; no crea filas de totales que dupliquen macros. */
export function agruparPlatos(entries: Entry[]): Plato[] {
  const platos = new Map<string, Plato>()
  for (const e of entries) {
    const clave = e.platoId ? clavePlato(e) : `entrada:${e.id}`
    const plato = platos.get(clave)
    if (plato) plato.entries.push(e)
    else platos.set(clave, { clave, nombre: '', agrupado: Boolean(e.platoId), entries: [e] })
  }
  return [...platos.values()].map((plato) => ({
    ...plato,
    nombre: plato.entries.find((e) => e.nombrePlato?.trim())?.nombrePlato?.trim() || plato.entries.map((e) => e.nombre).join(' + '),
  }))
}

export function camposPlato(item: AgrupacionPlato): AgrupacionPlato {
  return item.platoId ? { platoId: item.platoId, ...(item.nombrePlato ? { nombrePlato: item.nombrePlato } : {}) } : {}
}

/** Cada copia/aplicación recibe un lote único desde el repositorio, sin reutilizar ids ni acumular prefijos. */
export function renovarPlatos<T extends AgrupacionPlato>(items: T[], loteId: string, clave: (item: T) => string = (item) => item.platoId!): T[] {
  const ids = new Map<string, string>()
  return items.map((item) => {
    if (!item.platoId) return { ...item }
    const origen = clave(item)
    if (!ids.has(origen)) ids.set(origen, `${loteId}:${ids.size}`)
    return { ...item, platoId: ids.get(origen)! }
  })
}
