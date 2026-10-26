// Apuntar los pasos de una semana de una vez: el total se reparte a partes iguales entre sus días ya pasados (lunes a
// hoy como mucho) y cada día se puede corregir. Se guarda día a día en la tabla `pasos`, así que Caminos y los logros
// siguen contando por día. Funciones puras: el borrador son los textos de la hoja.
import { addDays, etiquetaPeriodo, weekDates } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { ERROR_PASOS, leerCifraPasos, leerPasos, PASOS_MAX, pasosTexto } from './pasos'

/** Los días de la semana de `lunes` que no son futuros. */
export const diasDeSemana = (lunes: string, hoy: string): string[] => weekDates(lunes).filter((f) => f <= hoy)

/** Lunes de la última semana que se puede apuntar (la de hoy). */
export const ultimaSemana = (hoy: string): string => weekDates(hoy)[0]

/** `total` a partes iguales entre `n` días; lo que sobra de la división, un paso más en los primeros. */
export function repartirPasos(total: number, n: number): number[] {
  if (n <= 0) return []
  const base = Math.floor(total / n)
  const resto = total - base * n
  return Array.from({ length: n }, (_, i) => base + (i < resto ? 1 : 0))
}

/** Textos de la hoja: el total y cada día (vacío = sin pasos ese día). */
export interface BorradorSemana {
  total: string
  dias: Record<string, string>
}

const suma = (fechas: readonly string[], dias: Record<string, string>) => fechas.reduce((t, f) => t + (leerPasos(dias[f] ?? '') ?? 0), 0)

/** La semana como está: los días ya apuntados y su suma como total. */
export function borradorInicial(fechas: readonly string[], apuntados: ReadonlyMap<string, number>): BorradorSemana {
  const dias = Object.fromEntries(fechas.map((f) => [f, apuntados.has(f) ? String(apuntados.get(f)) : '']))
  const total = suma(fechas, dias)
  return { total: total > 0 ? String(total) : '', dias }
}

/** Total máximo: `PASOS_MAX` por día. */
export const totalMaximo = (n: number) => n * PASOS_MAX

/** Cambiar el total lo reparte otra vez a partes iguales; vacío, vacía los días. Si no se entiende, los días no cambian. */
export function conTotal(b: BorradorSemana, fechas: readonly string[], texto: string): BorradorSemana {
  if (texto.trim() === '') return { total: texto, dias: Object.fromEntries(fechas.map((f) => [f, ''])) }
  const total = leerCifraPasos(texto)
  if (total === null || total < 1 || total > totalMaximo(fechas.length)) return { ...b, total: texto }
  const partes = repartirPasos(total, fechas.length)
  return { total: texto, dias: Object.fromEntries(fechas.map((f, i) => [f, partes[i] > 0 ? String(partes[i]) : ''])) }
}

/** Cambiar un día deja el total en la suma de los días. */
export function conDia(b: BorradorSemana, fechas: readonly string[], fecha: string, texto: string): BorradorSemana {
  const dias = { ...b.dias, [fecha]: texto }
  const total = suma(fechas, dias)
  return { total: total > 0 ? String(total) : '', dias }
}

export const ERROR_TOTAL = (n: number) => `El total de la semana va de 1 a ${formatInt(totalMaximo(n))} pasos (${formatInt(PASOS_MAX)} al día como mucho).`
export const ERROR_VACIA = 'Escribe el total de la semana o los pasos de algún día.'

/** Lo que se guarda: cada día con sus pasos o `null` (sin pasos: se borra si los tenía). */
export type DiasSemana = { fecha: string; pasos: number | null }[]

/** Lee el borrador; con error, qué arreglar (`fecha`, el día que falla). */
export function leerSemana(fechas: readonly string[], b: BorradorSemana): { dias: DiasSemana } | { error: string; fecha?: string } {
  const dias: DiasSemana = []
  for (const fecha of fechas) {
    const texto = (b.dias[fecha] ?? '').trim()
    const pasos = texto === '' ? null : leerPasos(texto)
    if (texto !== '' && pasos === null) return { error: ERROR_PASOS, fecha }
    dias.push({ fecha, pasos })
  }
  const total = dias.reduce((t, d) => t + (d.pasos ?? 0), 0)
  if (b.total.trim() !== '' && leerCifraPasos(b.total) !== total) return { error: ERROR_TOTAL(fechas.length) }
  if (total === 0) return { error: ERROR_VACIA }
  return { dias }
}

/** ¿Cambia algo de lo ya apuntado? (para avisar de que se sustituye). */
export const sustituye = (dias: DiasSemana, apuntados: ReadonlyMap<string, number>) =>
  dias.some((d) => apuntados.has(d.fecha) && apuntados.get(d.fecha) !== d.pasos)

/** Pasos apuntados de lunes a `hasta`. */
export function pasosDeSemana(apuntados: ReadonlyMap<string, number>, hasta: string): number {
  let total = 0
  for (let f = weekDates(hasta)[0]; f <= hasta; f = addDays(f, 1)) total += apuntados.get(f) ?? 0
  return total
}

/** Aviso al guardar una semana: «63.000 pasos del 19–25 oct». */
export const mensajeSemana = (lunes: string, dias: DiasSemana) =>
  `${pasosTexto(dias.reduce((t, d) => t + (d.pasos ?? 0), 0))} del ${etiquetaPeriodo('semana', lunes)}`
