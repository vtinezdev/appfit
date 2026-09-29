import type { Entry, Objetivos } from '../../../shared/db/types'
import { formatInt, round1 } from '../../../shared/lib/format'

export interface Macros {
  kcal: number
  prot: number
  carb: number
  grasa: number
}

/** Escala los valores "por 100 g" a los gramos indicados. */
export function macrosPorGramos(
  por100: { kcal100: number; prot100: number; carb100: number; grasa100: number },
  gramos: number,
): Macros {
  const factor = gramos / 100
  return {
    kcal: round1(por100.kcal100 * factor),
    prot: round1(por100.prot100 * factor),
    carb: round1(por100.carb100 * factor),
    grasa: round1(por100.grasa100 * factor),
  }
}

/** «P41 C0 G3»: proteína, carbohidratos y grasa redondeados a entero, con el formato de las filas de Hoy. */
export function resumenMacros({ prot, carb, grasa }: Pick<Macros, 'prot' | 'carb' | 'grasa'>): string {
  return `P${formatInt(prot)} C${formatInt(carb)} G${formatInt(grasa)}`
}

export function sumMacros(entries: Macros[]): Macros {
  return entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      prot: acc.prot + e.prot,
      carb: acc.carb + e.carb,
      grasa: acc.grasa + e.grasa,
    }),
    { kcal: 0, prot: 0, carb: 0, grasa: 0 },
  )
}

export function aggregateByDate(entries: Entry[]): Map<string, Macros> {
  const byDate = new Map<string, Macros>()
  for (const e of entries) {
    const prev = byDate.get(e.fecha) ?? { kcal: 0, prot: 0, carb: 0, grasa: 0 }
    byDate.set(e.fecha, {
      kcal: prev.kcal + e.kcal,
      prot: prev.prot + e.prot,
      carb: prev.carb + e.carb,
      grasa: prev.grasa + e.grasa,
    })
  }
  return byDate
}

export function macrosDeRango(entries: Entry[], fechas: string[]): Macros[] {
  const byDate = aggregateByDate(entries)
  return fechas.map((f) => byDate.get(f) ?? { kcal: 0, prot: 0, carb: 0, grasa: 0 })
}

export function porcentajeObjetivo(valor: number, objetivo: number): number {
  if (objetivo <= 0) return 0
  return Math.min(100, Math.round((valor / objetivo) * 100))
}

export function distribucionPCG(m: Macros): { prot: number; carb: number; grasa: number } {
  const kcalProt = m.prot * 4
  const kcalCarb = m.carb * 4
  const kcalGrasa = m.grasa * 9
  const total = kcalProt + kcalCarb + kcalGrasa
  if (total <= 0) return { prot: 0, carb: 0, grasa: 0 }
  return {
    prot: Math.round((kcalProt / total) * 100),
    carb: Math.round((kcalCarb / total) * 100),
    grasa: Math.round((kcalGrasa / total) * 100),
  }
}

export function mediaDiaria(macros: Macros[]): Macros {
  if (macros.length === 0) return { kcal: 0, prot: 0, carb: 0, grasa: 0 }
  const total = sumMacros(macros)
  return {
    kcal: round1(total.kcal / macros.length),
    prot: round1(total.prot / macros.length),
    carb: round1(total.carb / macros.length),
    grasa: round1(total.grasa / macros.length),
  }
}

export const OBJETIVOS_VACIOS: Objetivos = { kcal: 0, prot: 0, carb: 0, grasa: 0 }

export interface ResumenPeriodo {
  /** Macros de cada fecha del periodo, en el mismo orden (0 en los días sin registros). */
  porDia: Macros[]
  /** Suma y media de los días registrados; la distribución P/C/G sale de esa suma. */
  total: Macros
  media: Macros
  diasRegistrados: number
  distribucion: { prot: number; carb: number; grasa: number }
}

/**
 * Resumen de un periodo. La media solo cuenta los días con al menos una entrada y fecha ≤ `hoy`:
 * los días futuros o sin registrar no bajan la media.
 */
export function resumenPeriodo(entries: Entry[], fechas: string[], hoy: string): ResumenPeriodo {
  const byDate = aggregateByDate(entries)
  const porDia = macrosDeRango(entries, fechas)
  const registrados = fechas.filter((f) => f <= hoy && byDate.has(f)).map((f) => byDate.get(f)!)
  const total = sumMacros(registrados)
  return {
    porDia,
    total,
    media: mediaDiaria(registrados),
    diasRegistrados: registrados.length,
    distribucion: distribucionPCG(total),
  }
}
