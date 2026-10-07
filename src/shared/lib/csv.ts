// Exportación a CSV pensada para Excel en español: separador «;», coma decimal y UTF-8 con BOM.
// Funciones puras: leer la base y descargar los archivos está en `exportarCsv.ts`.
import type { Agua, Entry, Exercise, Medida, Peso, SetEntry, Workout } from '../db/types'

export const BOM = '﻿'
const SEPARADOR = ';'
const SALTO = '\r\n'

export type CeldaCsv = string | number | undefined | null

/** Número con coma decimal y sin separador de millares (Excel lo reconoce como número). */
export function numeroCsv(n: number): string {
  return Number.isFinite(n) ? String(n).replace('.', ',') : ''
}

/**
 * Una celda: números con coma decimal; texto entre comillas si lleva «;», comillas o saltos de línea. Un texto que
 * empieza por =, +, - o @ se prefija con un apóstrofo para que Excel no lo ejecute como fórmula.
 */
export function celdaCsv(valor: CeldaCsv): string {
  if (valor === undefined || valor === null) return ''
  if (typeof valor === 'number') return numeroCsv(valor)
  let texto = valor
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/** CSV completo: BOM, cabecera y filas con salto de línea CRLF. */
export function serializarCsv(columnas: string[], filas: CeldaCsv[][]): string {
  return BOM + [columnas, ...filas].map((f) => f.map(celdaCsv).join(SEPARADOR)).join(SALTO) + SALTO
}

const porFecha = <T extends { fecha: string }>(filas: T[]) => [...filas].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))

export function csvComidas(entries: Entry[]): string {
  const filas = [...entries].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.createdAt - b.createdAt))
  return serializarCsv(
    ['fecha', 'comida', 'alimento', 'gramos', 'kcal', 'proteina_g', 'hidratos_g', 'grasa_g', 'fibra_g', 'azucares_g', 'sal_g', 'grasas_saturadas_g', 'plato', 'kcal_rapidas'],
    filas.map((e) => [e.fecha, e.comida, e.nombre, e.gramos, e.kcal, e.prot, e.carb, e.grasa, e.nutrientes?.fibra, e.nutrientes?.azucares, e.nutrientes?.sal, e.nutrientes?.agSat, e.nombrePlato, e.rapida ? 'sí' : '']),
  )
}

export function csvPesos(pesos: Peso[]): string {
  return serializarCsv(['fecha', 'peso_kg'], porFecha(pesos).map((p) => [p.fecha, p.kg]))
}

/** Fecha local YYYY-MM-DD de una marca de tiempo. */
function fechaLocal(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function csvSeries(sets: SetEntry[], workouts: Workout[], exercises: Exercise[]): string {
  const entreno = new Map(workouts.map((w) => [w.id, w]))
  const ejercicio = new Map(exercises.map((e) => [e.id, e.nombre]))
  const filas = sets
    .map((s) => ({ s, w: entreno.get(s.workoutId) }))
    .filter((x): x is { s: SetEntry; w: Workout } => x.w !== undefined)
    .sort((a, b) => a.w.inicio - b.w.inicio || a.s.workoutId - b.s.workoutId || a.s.createdAt - b.s.createdAt || a.s.orden - b.s.orden)
  return serializarCsv(
    ['fecha', 'ejercicio', 'serie', 'tipo', 'reps', 'peso_kg', 'rir'],
    filas.map(({ s, w }) => [fechaLocal(w.inicio), ejercicio.get(s.exerciseId) ?? 'Ejercicio no disponible', s.orden + 1, s.tipo === 'calentamiento' ? 'calentamiento' : 'efectiva', s.reps, s.peso, s.rir]),
  )
}

export function csvAgua(agua: Agua[]): string {
  return serializarCsv(['fecha', 'ml'], porFecha(agua).map((a) => [a.fecha, a.ml]))
}

export function csvMedidas(medidas: Medida[]): string {
  return serializarCsv(
    ['fecha', 'cintura_cm', 'cadera_cm', 'pecho_cm', 'brazo_cm', 'muslo_cm', 'grasa_pct'],
    porFecha(medidas).map((m) => [m.fecha, m.cintura, m.cadera, m.pecho, m.brazo, m.muslo, m.grasaPct]),
  )
}
