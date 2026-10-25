// Raciones propias por alimento («rebanada» de pan bimbo = 30 g). Lógica pura; los datos viven en `porcionesRepo`.
import { normalizeName, singular } from '../../../../shared/lib/text'
import { coincidenciaFuerte } from './emparejar'

export const GRAMOS_PORCION_MIN = 0.5
export const GRAMOS_PORCION_MAX = 5000

export interface PorcionBasica {
  ref: string
  nombre: string
  nombreNorm: string
  gramos: number
}

export interface PorcionValida {
  nombre: string
  nombreNorm: string
  gramos: number
}

/**
 * Valida una ración: una sola palabra (así el intérprete la reconoce tras la cantidad) y gramos entre 0,5 y 5.000.
 * Devuelve la ración saneada o el texto del error.
 */
export function validarPorcion(nombre: string, gramos: number): PorcionValida | string {
  const limpio = nombre.trim()
  if (!limpio) return 'Escribe el nombre de la ración (por ejemplo «rebanada»).'
  if (/\s/.test(limpio)) return 'El nombre de la ración debe ser una sola palabra («rebanada», «bol»).'
  if (/\d/.test(limpio)) return 'El nombre de la ración no puede llevar números.'
  if (!Number.isFinite(gramos) || gramos < GRAMOS_PORCION_MIN || gramos > GRAMOS_PORCION_MAX) return 'Los gramos de la ración deben estar entre 0,5 y 5.000.'
  return { nombre: limpio, nombreNorm: normalizeName(limpio), gramos: Math.round(gramos * 10) / 10 }
}

/** Formas con las que se puede escribir una ración: singular, plural simple («rebanada» → «rebanadas»). */
export function formasPorcion(nombreNorm: string): string[] {
  const base = singular(nombreNorm)
  return [...new Set([nombreNorm, base, `${base}s`, `${base}es`])]
}

/** Mapa forma escrita → nombre normalizado de la ración, para que el parser reconozca raciones propias como unidades. */
export function mapaFormasPorciones(porciones: Pick<PorcionBasica, 'nombreNorm'>[]): Map<string, string> {
  const mapa = new Map<string, string>()
  for (const p of porciones) for (const f of formasPorcion(p.nombreNorm)) if (!mapa.has(f)) mapa.set(f, p.nombreNorm)
  return mapa
}

export interface CandidataPorcion<T extends PorcionBasica = PorcionBasica> {
  porcion: T
  /** Nombre del alimento al que pertenece la ración. */
  nombreAlimento: string
}

/**
 * Elige la ración (de entre las que se llaman `unidadNorm`) cuyo alimento encaja con lo escrito: todas las palabras
 * de la consulta están en su nombre («2 rebanadas de pan bimbo» → «Pan Bimbo»). Con la consulta vacía no hay encaje.
 */
export function elegirPorcion<T extends PorcionBasica>(unidadNorm: string, consulta: string, candidatas: CandidataPorcion<T>[]): CandidataPorcion<T> | undefined {
  if (!consulta.trim()) return undefined
  return candidatas.find((c) => c.porcion.nombreNorm === unidadNorm && coincidenciaFuerte(c.nombreAlimento, consulta))
}
