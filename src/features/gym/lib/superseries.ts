// Superseries (A21): dos ejercicios seguidos que se alternan serie a serie; el descanso llega al terminar la ronda.
// Se definen en la rutina o en la sesión y se guardan como pares de ids de ejercicio en el registro (campo opcional
// `superseries`, sin índice: no hace falta versión de Dexie y la copia lo conserva). Un par solo vale mientras sus dos
// ejercicios estén seguidos y en ese orden; si se separan (mover, quitar, sustituir), se ignora sin borrarlo.
import type { SetEntry } from '../../../shared/db/types'

/** [primero, segundo]: ids de ejercicio, en el orden en que se hacen. */
export type Superserie = readonly [number, number]

/** Lo que añade A21 a una rutina o un entreno. */
export interface ConSuperseries { superseries?: Superserie[] }

/** Los pares guardados en un registro, descartando lo mal formado. */
export function superseriesDe(x: unknown): Superserie[] {
  const lista = (x as ConSuperseries | null | undefined)?.superseries
  if (!Array.isArray(lista)) return []
  return lista.filter((p): p is Superserie => Array.isArray(p) && p.length === 2 && p.every(n => Number.isInteger(n)) && p[0] !== p[1])
}

/** Los pares que valen con este orden: seguidos, en su orden, y cada ejercicio en uno solo (el primero que aparece). */
export function superseriesValidas(pares: readonly Superserie[], orden: readonly number[]): Superserie[] {
  const usados = new Set<number>()
  const validas: Superserie[] = []
  for (const [a, b] of pares) {
    const i = orden.indexOf(a)
    if (i < 0 || orden[i + 1] !== b || usados.has(a) || usados.has(b)) continue
    usados.add(a); usados.add(b)
    validas.push([a, b])
  }
  return validas
}

/** El par (válido) en el que está `exId`, si lo hay. */
export function superserieDe(pares: readonly Superserie[], exId: number): Superserie | undefined {
  return pares.find(p => p[0] === exId || p[1] === exId)
}

/**
 * Une `exId` con el ejercicio que le sigue en `orden`. `null` si no hay siguiente o alguno de los dos ya está en una
 * superserie. Devuelve la lista nueva (los pares que ya no valen se quedan fuera).
 */
export function unirConSiguiente(pares: readonly Superserie[], orden: readonly number[], exId: number): Superserie[] | null {
  const validas = superseriesValidas(pares, orden)
  const i = orden.indexOf(exId)
  const siguiente = i >= 0 ? orden[i + 1] : undefined
  if (siguiente === undefined || superserieDe(validas, exId) || superserieDe(validas, siguiente)) return null
  return [...validas, [exId, siguiente]]
}

/** Quita el par de `exId` (y los que ya no valían). */
export function separar(pares: readonly Superserie[], orden: readonly number[], exId: number): Superserie[] {
  return superseriesValidas(pares, orden).filter(p => p[0] !== exId && p[1] !== exId)
}

/** Agrupa el orden de la sesión en bloques: un ejercicio suelto o los dos de una superserie. */
export function bloquesSesion(orden: readonly number[], pares: readonly Superserie[]): number[][] {
  const validas = superseriesValidas(pares, orden)
  const bloques: number[][] = []
  for (let i = 0; i < orden.length; i++) {
    const par = validas.find(p => p[0] === orden[i])
    if (par) { bloques.push([par[0], par[1]]); i++ } else bloques.push([orden[i]])
  }
  return bloques
}

// Los calentamientos se hacen antes, cada uno a su ritmo: la ronda solo alterna las series efectivas.
const pendiente = (sets: readonly SetEntry[], marcadas: readonly number[], exId: number) =>
  sets.some(s => s.exerciseId === exId && s.tipo !== 'calentamiento' && !marcadas.includes(s.id))

/**
 * Tras marcar una serie de `exId` (ya incluida en `marcadas`): a qué ejercicio de su superserie toca ir. Del primero al
 * segundo si al segundo le quedan series; del segundo al primero si al primero le quedan. `null` si no está en una
 * superserie o la ronda no sigue (entonces manda el avance de siempre).
 */
export function siguienteEnRonda(pares: readonly Superserie[], sets: readonly SetEntry[], marcadas: readonly number[], exId: number): number | null {
  const par = superserieDe(pares, exId)
  if (!par) return null
  const otro = par[0] === exId ? par[1] : par[0]
  return pendiente(sets, marcadas, otro) ? otro : null
}

/** Sin descanso tras una serie del primero de la superserie mientras al segundo le queden series: se descansa al terminar la ronda. */
export function sinDescanso(pares: readonly Superserie[], sets: readonly SetEntry[], marcadas: readonly number[], exId: number): boolean {
  const par = superserieDe(pares, exId)
  return !!par && par[0] === exId && pendiente(sets, marcadas, par[1])
}
