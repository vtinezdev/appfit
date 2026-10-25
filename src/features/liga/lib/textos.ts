// Textos de la Liga (puros, para la lista de Progreso y el bloque de cada ejercicio).
import { formatDiaMes, parseISODate } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { SESIONES_SIN_RECORD } from './estancamiento'
import { divisionDe, PASO_ELITE, SEMANAS_DE_GRACIA, SEMANAS_POR_LIGA, siguienteLiga, type Ascenso, type Division, type LigaEjercicio, type Pico } from './liga'

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

/** «Semana 2 de 3» dentro de su liga; vacío sin liga y en Élite. */
export function textoSemanaDeLiga(d: Division): string {
  return d.semana ? `Semana ${formatInt(d.semana)} de ${formatInt(SEMANAS_POR_LIGA)}` : ''
}

/** Dónde está: «Semana 2 de 3 en Plata», «Élite» o «Sin liga». */
export function textoDivision(d: Division): string {
  return d.semana ? `${textoSemanaDeLiga(d)} en ${d.nombre}` : d.nombre
}

/**
 * Qué pasa ahora con la liga del ejercicio. Los básicos y los mantenidos, en Élite, no sugieren variar; los demás lo
 * sugieren y, si llevan `SESIONES_SIN_RECORD` sesiones o más sin récord, lo dicen.
 */
export function textoSiguiente(l: LigaEjercicio, hoy: string, { basico = false, mantenido = false, sinRecords = 0 }: ContextoLiga = {}): string {
  const desde = fechaCorta(l.ultimaFecha, hoy)
  const siguiente = siguienteLiga(l.division.paso)
  if (!siguiente) {
    if (basico) return 'Es un ejercicio básico: es habitual mantenerlo mucho tiempo.'
    return mantenido
      ? 'Lo mantienes en Élite: no te avisa durante el entreno.'
      : `Llevas mucho tiempo con este ejercicio${sinRecords >= SESIONES_SIN_RECORD ? ` y no hay récords en sus últimas ${formatInt(sinRecords)} sesiones` : ''}. Si te apetece variar, puede ser buen momento; si no, puedes seguir con él.`
  }
  const { liga, semanas } = siguiente
  if (l.division.paso === 0) return `Sin hacerlo desde el ${desde}. Si vuelves, empieza en ${liga}.`
  if (l.semanasSin > SEMANAS_DE_GRACIA) return `Sin hacerlo desde el ${desde}: cada semana sin él retrocede una. Si vuelves, sigue desde aquí.`
  if (l.hechaEstaSemana) {
    return semanas === 1
      ? `Esta semana ya cuenta. La próxima semana que lo hagas, sube a ${liga}.`
      : `Esta semana ya cuenta. Te faltan ${textoSemanas(semanas)} con él para ${liga}.`
  }
  return semanas === 1 ? `Si lo haces esta semana, sube a ${liga}.` : `Si lo haces esta semana, te quedarán ${textoSemanas(semanas - 1)} para ${liga}.`
}

/** La mejor marca de las rachas anteriores: «Zafiro · 3 mar». */
export function textoPico(p: Pico, hoy: string): string {
  return `${divisionDe(p.paso).nombre} · ${fechaCorta(p.fecha, hoy)}`
}

/** Línea del aviso de Élite en el entreno: «Élite: llevas 18 semanas seguidas con este ejercicio». */
export function textoAvisoElite(l: LigaEjercicio): string {
  return `Élite: llevas ${textoSemanas(l.semanasSeguidas)} seguidas con este ejercicio`
}

/** Lo que avanza un ejercicio al terminar un entreno: empieza en Bronce, sube de liga, llega a Élite o suma una semana. */
export function textoAscenso(a: Ascenso): string {
  if (a.de.paso === 0) return `Empieza en ${a.a.nombre}`
  if (a.a.elite) return 'Llega a Élite: ciclo completado'
  if (a.de.liga !== a.a.liga) return `Sube a ${a.a.nombre}`
  return textoDivision(a.a)
}

/** Lo que merece fila propia: empezar, cambiar de liga o llegar a Élite. El resto solo suma una semana en su liga. */
export function ascensoDestacado(a: Ascenso): boolean {
  return a.de.liga !== a.a.liga
}
