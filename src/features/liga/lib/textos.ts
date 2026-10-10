// Textos de la Liga (puros, para la lista de Progreso y el bloque de cada ejercicio).
import { formatDiaMes, parseISODate } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { SESIONES_SIN_RECORD } from './estancamiento'
import { divisionDe, PASO_ELITE, SEMANAS_DE_GRACIA, type Ascenso, type LigaEjercicio, type Pico } from './liga'

/** «1 semana», «18 semanas». */
export function textoSemanas(n: number): string {
  return `${formatInt(n)} ${n === 1 ? 'semana' : 'semanas'}`
}

/** «7 oct» y, si no es del año de `hoy`, «7 oct de 2025». */
export function fechaCorta(iso: string, hoy: string): string {
  const dia = formatDiaMes(parseISODate(iso).getTime())
  return iso.slice(0, 4) === hoy.slice(0, 4) ? dia : `${dia} de ${iso.slice(0, 4)}`
}

/** Línea de la lista: la racha o, si está rota, desde cuándo no se hace. */
export function resumenLiga(l: LigaEjercicio, hoy: string): string {
  const n = l.semanasSeguidas
  return n > 0 ? `${textoSemanas(n)} ${n === 1 ? 'seguida' : 'seguidas'}` : `Sin hacerlo desde el ${fechaCorta(l.ultimaFecha, hoy)}`
}

/** «8 de 16 semanas hacia Élite» (en Élite, «16 de 16 semanas: la cima de la liga»). */
export function textoProgreso(l: LigaEjercicio): string {
  const de = `${formatInt(l.division.paso)} de ${formatInt(PASO_ELITE)} semanas`
  return l.division.elite ? `${de}: la cima de la liga` : `${de} hacia Élite`
}

export interface ContextoLiga {
  basico?: boolean
  mantenido?: boolean
  /** Sesiones recientes seguidas sin récord (`sesionesSinRecord`). */
  sinRecords?: number
}

/**
 * Qué pasa ahora con la liga del ejercicio. Los básicos y los mantenidos, en Élite, no sugieren variar; los demás lo
 * sugieren y, si llevan `SESIONES_SIN_RECORD` sesiones o más sin récord, lo dicen.
 */
export function textoSiguiente(l: LigaEjercicio, hoy: string, { basico = false, mantenido = false, sinRecords = 0 }: ContextoLiga = {}): string {
  const siguiente = divisionDe(l.division.paso + 1).nombre
  const desde = fechaCorta(l.ultimaFecha, hoy)
  if (l.division.elite) {
    if (basico) return 'Es un ejercicio básico: es habitual mantenerlo mucho tiempo.'
    return mantenido
      ? 'Lo mantienes en Élite: no te avisa durante el entreno.'
      : `Llevas mucho tiempo con este ejercicio${sinRecords >= SESIONES_SIN_RECORD ? ` y no hay récords en sus últimas ${formatInt(sinRecords)} sesiones` : ''}. Si te apetece variar, puede ser buen momento; si no, puedes seguir con él.`
  }
  if (l.division.paso === 0) return `Sin hacerlo desde el ${desde}. Si vuelves, empieza en ${siguiente}.`
  if (l.semanasSin > SEMANAS_DE_GRACIA) return `Sin hacerlo desde el ${desde}: baja una división por semana. Si vuelves, sube desde aquí.`
  if (l.hechaEstaSemana) return `Esta semana ya cuenta. La próxima semana que lo hagas, ${siguiente}.`
  return `Si lo haces esta semana, sube a ${siguiente}.`
}

/** El fantasma: «Platino I · 3 mar». */
export function textoPico(p: Pico, hoy: string): string {
  return `${divisionDe(p.paso).nombre} · ${fechaCorta(p.fecha, hoy)}`
}

/** Línea del aviso de Élite en el entreno: «Élite: llevas 18 semanas seguidas con este ejercicio». */
export function textoAvisoElite(l: LigaEjercicio): string {
  return `Élite: llevas ${textoSemanas(l.semanasSeguidas)} seguidas con este ejercicio`
}

/** Un ascenso al terminar un entreno: entra en la liga, sube de división o llega a Élite. */
export function textoAscenso(a: Ascenso): string {
  if (a.de.paso === 0) return `Entra en la liga: ${a.a.nombre}`
  if (a.a.elite) return 'Llega a Élite: ciclo completado'
  return `Sube de ${a.de.nombre} a ${a.a.nombre}`
}

/** Ascensos que merecen fila propia: entrar en la liga, cambiar de liga o llegar a Élite. El resto, solo de división. */
export function ascensoDestacado(a: Ascenso): boolean {
  return a.de.liga !== a.a.liga
}
