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

/** Nombre de una combinación: el del plato si es uno solo con nombre; si no, sus alimentos unidos con «+». */
function nombreCombinacion(items: readonly MealItem[]): string {
  const nombresPlato = new Set(items.map(it => it.nombrePlato?.trim()).filter(Boolean))
  const unPlato = items[0]?.platoId && items.every(it => it.platoId === items[0].platoId)
  return unPlato && nombresPlato.size === 1 ? [...nombresPlato][0]! : [...new Set(items.map(it => it.nombre))].join(' + ')
}

/** Combinaciones de cada comida/día, disponibles en cualquier destino. Cada fecha cuenta una sola vez. No escribe datos. */
export function comidasTipicas({ entries, plantillas, fecha }: { entries: Entry[]; plantillas: Meal[]; fecha: string }): ComidaTipica[] {
  const desde = addDays(fecha, -(VENTANA_TIPICAS - 1))
  const porDia = new Map<string, Entry[]>()
  for (const entry of [...entries].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.createdAt - a.createdAt || b.id - a.id)) {
    if (entry.fecha < desde || entry.fecha > fecha) continue
    const claveDia = `${entry.fecha}:${entry.comida}`
    const dia = porDia.get(claveDia) ?? []
    dia.push(entry)
    porDia.set(claveDia, dia)
  }
  const repetidas = new Map<string, ComidaTipica>()
  const fechas = new Map<string, Set<string>>()
  for (const entradas of porDia.values()) {
    const dia = entradas[0].fecha
    const items = itemsDesdeEntradas([...entradas].sort((a, b) => a.createdAt - b.createdAt || a.id - b.id))
    const clave = claveCombinacion(items)
    const anterior = repetidas.get(clave)
    const dias = fechas.get(clave) ?? new Set<string>()
    dias.add(dia)
    fechas.set(clave, dias)
    if (anterior) anterior.dias = dias.size
    else repetidas.set(clave, { clave, nombre: nombreCombinacion(items), items, origen: 'historial', dias: 1, ultimaFecha: dia })
  }
  const resultado: ComidaTipica[] = []
  const guardadas = new Set<string>()
  for (const meal of [...plantillas].sort((a, b) => b.usadoAt - a.usadoAt || b.id - a.id)) {
    if (meal.items.length === 0) continue
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

/** «Lo de siempre» de Inicio: días hacia atrás que se miran y días en que debe repetirse la combinación. */
export const VENTANA_LO_DE_SIEMPRE = 7
export const DIAS_LO_DE_SIEMPRE = 3

export interface LoDeSiempre {
  nombre: string
  /** Los de la aparición más reciente, listos para `mealsRepo.aplicarSugerencia`. */
  items: MealItem[]
  /** kcal de la aparición más reciente (orientativas: al aplicarla se recalculan con los valores actuales). */
  kcal: number
  dias: number
}

/**
 * La combinación que más se repite en `comida` en los 7 días anteriores a `fecha` (ella no cuenta), si aparece al menos
 * 3 días; a igualdad, la más reciente. `null` si no la hay o si `fecha` ya tiene algo en esa comida. No escribe datos.
 */
export function loDeSiempre(entries: Entry[], fecha: string, comida: Comida): LoDeSiempre | null {
  if (entries.some(e => e.fecha === fecha && e.comida === comida)) return null
  const desde = addDays(fecha, -VENTANA_LO_DE_SIEMPRE)
  const porDia = new Map<string, Entry[]>()
  for (const e of entries) {
    if (e.comida !== comida || e.fecha < desde || e.fecha >= fecha) continue
    porDia.set(e.fecha, [...(porDia.get(e.fecha) ?? []), e])
  }
  const grupos = new Map<string, { dias: number; ultima: string; entradas: Entry[] }>()
  for (const [dia, entradas] of porDia) {
    const ordenadas = [...entradas].sort((a, b) => a.createdAt - b.createdAt || a.id - b.id)
    const clave = claveCombinacion(itemsDesdeEntradas(ordenadas))
    const g = grupos.get(clave)
    if (!g) grupos.set(clave, { dias: 1, ultima: dia, entradas: ordenadas })
    else {
      g.dias++
      if (dia > g.ultima) { g.ultima = dia; g.entradas = ordenadas }
    }
  }
  const mejor = [...grupos.values()].filter(g => g.dias >= DIAS_LO_DE_SIEMPRE).sort((a, b) => b.dias - a.dias || b.ultima.localeCompare(a.ultima))[0]
  if (!mejor) return null
  const items = itemsDesdeEntradas(mejor.entradas)
  return { nombre: nombreCombinacion(items), items, kcal: Math.round(mejor.entradas.reduce((t, e) => t + e.kcal, 0)), dias: mejor.dias }
}

