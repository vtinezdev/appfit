// Comidas planificadas y lista de la compra (B16). Funciones puras: qué días se pueden planificar, la semana del Plan,
// cómo se agrupan y qué hay que comprar. Las planificadas viven en su tabla (ADR 059) y no cuentan en nada hasta
// «Lo he comido».
import { claveRef, refDe } from '../../../shared/db/foodRef'
import type { Comida, Planificada } from '../../../shared/db/types'
import { addDays, diasEntre, formatFriendly, parseISODate, startOfWeek } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { normalizeName } from '../../../shared/lib/text'
import { CATEGORIAS_ALIMENTO } from './catalogo/categorias'
import { COMIDAS } from './comidas'

/** Si una fecha se puede planificar: hoy o cualquier día futuro, nunca días pasados (decisiones de Víctor). */
export const sePuedePlanificar = (fecha: string, hoy: string) => fecha >= hoy

const LETRAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const MESES_ABREV = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export interface DiaPlan {
  fecha: string
  letra: string
  numero: number
  /** Antes de hoy: no se planifica. */
  pasado: boolean
  hoy: boolean
  /** Alimentos planificados ese día. */
  planificados: number
  kcal: number
}

/** Los siete días (lunes a domingo) de la semana del Plan que empieza en `lunes`, con lo planificado de cada uno. */
export function semanaPlan(lunes: string, hoy: string, filas: readonly Planificada[]): DiaPlan[] {
  return Array.from({ length: 7 }, (_, i) => {
    const fecha = addDays(lunes, i)
    const delDia = filas.filter((f) => f.fecha === fecha)
    const d = parseISODate(fecha)
    return { fecha, letra: LETRAS[d.getDay()], numero: d.getDate(), pasado: fecha < hoy, hoy: fecha === hoy, planificados: delDia.length, kcal: delDia.reduce((s, f) => s + f.kcal, 0) }
  })
}

/** «Esta semana», «Semana que viene» o «Dentro de 3 semanas». */
export function nombreSemana(lunes: string, hoy: string): string {
  const semanas = Math.round(diasEntre(startOfWeek(hoy), lunes) / 7)
  if (semanas <= 0) return 'Esta semana'
  if (semanas === 1) return 'Semana que viene'
  return `Dentro de ${formatInt(semanas)} semanas`
}

/** «2 – 8 nov» o, si cambia de mes, «28 oct – 3 nov». */
export function rangoSemana(lunes: string): string {
  const a = parseISODate(lunes)
  const b = parseISODate(addDays(lunes, 6))
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} – ${b.getDate()} ${MESES_ABREV[b.getMonth()]}`
    : `${a.getDate()} ${MESES_ABREV[a.getMonth()]} – ${b.getDate()} ${MESES_ABREV[b.getMonth()]}`
}

/** El día que abre el Plan en una semana: hoy si cae en ella; si no, su lunes (o hoy, si la semana ya pasó). */
export function diaInicialPlan(lunes: string, hoy: string): string {
  if (startOfWeek(hoy) === lunes) return hoy
  return lunes < hoy ? hoy : lunes
}

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

export interface GrupoCompra {
  /** Una de las categorías de alimento o «Sin categoría». */
  categoria: string
  articulos: ArticuloCompra[]
}

export const SIN_CATEGORIA = 'Sin categoría'

/**
 * La lista agrupada por la categoría de cada alimento (`categorias`: clave de referencia → categoría, ver
 * `foodsRepo.categoriasDeEntradas`), en el orden de las categorías y con «Sin categoría» al final.
 */
export function agruparCompra(articulos: readonly ArticuloCompra[], categorias: ReadonlyMap<string, string>): GrupoCompra[] {
  const grupos = new Map<string, ArticuloCompra[]>()
  for (const a of articulos) {
    const categoria = categorias.get(a.clave) ?? SIN_CATEGORIA
    grupos.set(categoria, [...(grupos.get(categoria) ?? []), a])
  }
  const orden = (c: string) => { const i = (CATEGORIAS_ALIMENTO as readonly string[]).indexOf(c); return i < 0 ? CATEGORIAS_ALIMENTO.length : i }
  return [...grupos].map(([categoria, lista]) => ({ categoria, articulos: lista })).sort((a, b) => orden(a.categoria) - orden(b.categoria))
}

/** Marca o desmarca un artículo de la lista (lo ya comprado). */
export function alternarMarca(marcadas: readonly string[], clave: string): string[] {
  return marcadas.includes(clave) ? marcadas.filter((c) => c !== clave) : [...marcadas, clave]
}

/** Gramos para leer en la lista: «350 g» o, desde 1 kg, «1,2 kg». */
export function cantidadCompra(gramos: number): string {
  return gramos >= 1000 ? `${formatNumber(gramos / 1000, 1)} kg` : `${formatInt(Math.round(gramos))} g`
}

/** El texto que se copia: una línea por artículo, «- Arroz: 350 g». */
export function textoListaCompra(articulos: readonly ArticuloCompra[]): string {
  return articulos.map((a) => `- ${a.nombre}: ${cantidadCompra(a.gramos)}`).join('\n')
}
