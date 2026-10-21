import type { Comida, Entry, Meal, MealItem } from '../../../shared/db/types'
import { claveRef, refDe } from '../../../shared/db/foodRef'
import { addDays } from '../../../shared/lib/dates'
import { normalizeName } from '../../../shared/lib/text'
import { itemsDesdeEntradas } from './plantillas'

export const DIAS_PARA_TIPICA = 3
export const VENTANA_TIPICAS = 30

export interface ComidaTipica {
  clave: string
  nombre: string
  items: MealItem[]
  /** Ausente para sugerencias del historial, que no crean una plantilla al consultarlas. */
  id?: number
  origen: 'marcada' | 'historial'
  dias: number
  ultimaFecha?: string
}

/** Los mismos alimentos, independientemente del orden, cantidad o división en varias filas. */
export function claveCombinacion(items: readonly MealItem[]): string {
  return JSON.stringify([...new Set(items.map(item => {
    const ref = refDe(item)
    return ref ? claveRef(ref) : `${item.rapida ? 'rapida' : 'nombre'}:${normalizeName(item.nombre)}`
  }))].sort())
}

/** Una combinación por comida y día, incluyendo alimentos registrados por separado. No escribe datos. */
export function comidasTipicas({ entries, plantillas, comida, fecha }: { entries: Entry[]; plantillas: Meal[]; comida: Comida; fecha: string }): ComidaTipica[] {
  const desde = addDays(fecha, -(VENTANA_TIPICAS - 1))
  const porDia = new Map<string, Entry[]>()
  for (const entry of entries) {
    if (entry.comida !== comida || entry.fecha < desde || entry.fecha > fecha) continue
    const dia = porDia.get(entry.fecha) ?? []
    dia.push(entry)
    porDia.set(entry.fecha, dia)
  }
  const repetidas = new Map<string, ComidaTipica>()
  for (const [dia, entradas] of [...porDia].sort(([a], [b]) => b.localeCompare(a))) {
    const items = itemsDesdeEntradas([...entradas].sort((a, b) => a.createdAt - b.createdAt || a.id - b.id))
    const clave = claveCombinacion(items)
    const anterior = repetidas.get(clave)
    if (anterior) anterior.dias += 1
    else {
      const nombresPlato = new Set(items.map(it => it.nombrePlato?.trim()).filter(Boolean))
      const unPlato = items[0]?.platoId && items.every(it => it.platoId === items[0].platoId)
      repetidas.set(clave, { clave, nombre: unPlato && nombresPlato.size === 1 ? [...nombresPlato][0]! : [...new Set(items.map(it => it.nombre))].join(' + '), items, origen: 'historial', dias: 1, ultimaFecha: dia })
    }
  }
  const resultado: ComidaTipica[] = []
  const guardadas = new Set<string>()
  for (const meal of [...plantillas].sort((a, b) => b.usadoAt - a.usadoAt || b.id - a.id)) {
    if ((meal.comida && meal.comida !== comida) || meal.items.length === 0) continue
    const clave = claveCombinacion(meal.items)
    guardadas.add(clave)
    // Las variantes que el usuario guardó con nombres o cantidades distintos siguen siendo accesibles.
    resultado.push({ clave: `${clave}:guardada:${meal.id}`, nombre: meal.nombre, items: meal.items, id: meal.id, origen: 'marcada', dias: repetidas.get(clave)?.dias ?? 0 })
  }
  for (const tipica of [...repetidas.values()].filter(it => it.dias >= DIAS_PARA_TIPICA).sort((a, b) => b.dias - a.dias || b.ultimaFecha!.localeCompare(a.ultimaFecha!) || a.clave.localeCompare(b.clave))) {
    if (!guardadas.has(tipica.clave)) resultado.push(tipica)
  }
  return resultado
}
