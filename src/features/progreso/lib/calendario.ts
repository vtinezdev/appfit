// Calendario único de registros (B14): el mes con lo registrado cada día (entrenos, actividades, comidas, peso y agua).
// Función pura de agregación por día con las mismas lecturas de los repos; los días se piden por mes.
import type { Actividad, Agua, Entry, Peso, Workout } from '../../../shared/db/types'
import { addDays, monthDates, startOfWeek, toISODate } from '../../../shared/lib/dates'

export interface DiaRegistros {
  fecha: string
  /** Días de relleno de la semana anterior o siguiente: se dibujan vacíos. */
  delMes: boolean
  hoy: boolean
  futuro: boolean
  /** Entrenos terminados que empezaron ese día, del más antiguo al más reciente. */
  entrenos: number[]
  /** Actividades terminadas de ese día. */
  actividades: number[]
  /** Kcal registradas (0 sin comidas). */
  kcal: number
  prot: number
  comidas: number
  peso: number | null
  aguaMl: number
}

export interface DatosCalendario {
  workouts: readonly Pick<Workout, 'id' | 'inicio' | 'fin'>[]
  actividades: readonly Pick<Actividad, 'id' | 'fecha' | 'inicio' | 'enCurso'>[]
  entries: readonly Pick<Entry, 'fecha' | 'kcal' | 'prot'>[]
  pesos: readonly Pick<Peso, 'fecha' | 'kg'>[]
  agua: readonly Pick<Agua, 'fecha' | 'ml'>[]
}

/** ¿El día tiene algo registrado? */
export const conRegistros = (d: DiaRegistros) => d.entrenos.length > 0 || d.actividades.length > 0 || d.comidas > 0 || d.peso !== null || d.aguaMl > 0

/** Semanas (lunes a domingo) del mes que contiene `mes`, con lo registrado cada día del mes. */
export function calendarioRegistros(mes: string, d: DatosCalendario, hoy: string): DiaRegistros[][] {
  const dias = monthDates(mes)
  const delMes = new Set(dias)
  const vacio = (fecha: string): DiaRegistros => ({ fecha, delMes: delMes.has(fecha), hoy: fecha === hoy, futuro: fecha > hoy, entrenos: [], actividades: [], kcal: 0, prot: 0, comidas: 0, peso: null, aguaMl: 0 })
  const porDia = new Map(dias.map((f) => [f, vacio(f)]))
  for (const w of [...d.workouts].sort((a, b) => a.inicio - b.inicio)) {
    if (w.fin === undefined) continue
    porDia.get(toISODate(new Date(w.inicio)))?.entrenos.push(w.id)
  }
  for (const a of [...d.actividades].sort((x, y) => x.inicio - y.inicio)) if (!a.enCurso) porDia.get(a.fecha)?.actividades.push(a.id)
  for (const e of d.entries) {
    const dia = porDia.get(e.fecha)
    if (!dia) continue
    dia.kcal += e.kcal
    dia.prot += e.prot
    dia.comidas += 1
  }
  for (const p of d.pesos) { const dia = porDia.get(p.fecha); if (dia) dia.peso = p.kg }
  for (const a of d.agua) { const dia = porDia.get(a.fecha); if (dia) dia.aguaMl += a.ml }
  const semanas: DiaRegistros[][] = []
  for (let lunes = startOfWeek(dias[0]); lunes <= dias[dias.length - 1]; lunes = addDays(lunes, 7)) {
    semanas.push(Array.from({ length: 7 }, (_, i) => {
      const fecha = addDays(lunes, i)
      const dia = porDia.get(fecha) ?? vacio(fecha)
      return { ...dia, kcal: Math.round(dia.kcal), prot: Math.round(dia.prot) }
    }))
  }
  return semanas
}

/** Lo que tiene un día, en una frase para el lector de pantalla: «1 entreno, 1 actividad, comidas y peso». */
export function resumenDia(d: DiaRegistros): string {
  const partes = [
    d.entrenos.length > 0 && `${d.entrenos.length} ${d.entrenos.length === 1 ? 'entreno' : 'entrenos'}`,
    d.actividades.length > 0 && `${d.actividades.length} ${d.actividades.length === 1 ? 'actividad' : 'actividades'}`,
    d.comidas > 0 && 'comidas',
    d.peso !== null && 'peso',
    d.aguaMl > 0 && 'agua',
  ].filter((p): p is string => !!p)
  if (!partes.length) return 'sin registros'
  return partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
}
