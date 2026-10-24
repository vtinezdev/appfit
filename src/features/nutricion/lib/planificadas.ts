// Comidas planificadas y lista de la compra (B16). Funciones puras: qué días se pueden planificar, cómo se agrupan y
// qué hay que comprar. Las planificadas viven en su tabla (ADR 059) y no cuentan en nada hasta «Lo he comido».
import { claveRef, refDe } from '../../../shared/db/foodRef'
import type { Comida, Planificada } from '../../../shared/db/types'
import { addDays, formatFriendly } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { normalizeName } from '../../../shared/lib/text'
import { COMIDAS } from './comidas'

/** Se planifica de hoy a una semana vista. */
export const DIAS_PLANIFICABLES = 8

/** Hoy y los días siguientes que se pueden planificar (nunca días pasados, decisión de Víctor). */
export function diasPlanificables(hoy: string, dias = DIAS_PLANIFICABLES): string[] {
  return Array.from({ length: dias }, (_, i) => addDays(hoy, i))
}

/** Si una fecha se puede planificar: hoy o un día futuro dentro de la ventana. */
export const sePuedePlanificar = (fecha: string, hoy: string, dias = DIAS_PLANIFICABLES) => fecha >= hoy && fecha <= addDays(hoy, dias - 1)

/** «Hoy», «Mañana» o «Lunes, 27 oct». */
export function nombreDia(fecha: string, hoy: string): string {
  if (fecha === hoy) return 'Hoy'
  if (fecha === addDays(hoy, 1)) return 'Mañana'
  return formatFriendly(fecha)
}

export interface GrupoPlanificado {
  fecha: string
  comida: Comida
  filas: Planificada[]
  kcal: number
}

/** Las planificadas por día y comida, en orden (día; desayuno, comida, cena, snack). */
export function agruparPlanificadas(filas: readonly Planificada[]): GrupoPlanificado[] {
  const orden = new Map(COMIDAS.map((c, i) => [c.valor, i]))
  const grupos = new Map<string, GrupoPlanificado>()
  for (const f of filas) {
    const clave = `${f.fecha}|${f.comida}`
    const g = grupos.get(clave) ?? { fecha: f.fecha, comida: f.comida, filas: [], kcal: 0 }
    g.filas.push(f)
    g.kcal += f.kcal
    grupos.set(clave, g)
  }
  return [...grupos.values()].sort((a, b) => a.fecha.localeCompare(b.fecha) || (orden.get(a.comida) ?? 0) - (orden.get(b.comida) ?? 0))
}

export interface ArticuloCompra {
  clave: string
  nombre: string
  gramos: number
  /** Cuántas veces sale en lo planificado. */
  veces: number
}

/**
 * La lista de la compra de unas planificadas: gramos sumados por alimento (por su referencia o, sin ella, por el nombre),
 * sin las «kcal rápidas» (no son un alimento) ni filas sin gramos. Ordenada por nombre.
 */
export function listaCompra(filas: readonly Planificada[]): ArticuloCompra[] {
  const porClave = new Map<string, ArticuloCompra>()
  for (const f of filas) {
    if (f.rapida || !(f.gramos > 0)) continue
    const ref = refDe(f)
    const clave = ref ? claveRef(ref) : `nombre:${normalizeName(f.nombre)}`
    const a = porClave.get(clave) ?? { clave, nombre: f.nombre, gramos: 0, veces: 0 }
    a.gramos += f.gramos
    a.veces += 1
    porClave.set(clave, a)
  }
  return [...porClave.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

/** Gramos para leer en la lista: «350 g» o, desde 1 kg, «1,2 kg». */
export function cantidadCompra(gramos: number): string {
  return gramos >= 1000 ? `${formatNumber(gramos / 1000, 1)} kg` : `${formatInt(Math.round(gramos))} g`
}

/** El texto que se copia: una línea por artículo, «- Arroz: 350 g». */
export function textoListaCompra(articulos: readonly ArticuloCompra[]): string {
  return articulos.map((a) => `- ${a.nombre}: ${cantidadCompra(a.gramos)}`).join('\n')
}
