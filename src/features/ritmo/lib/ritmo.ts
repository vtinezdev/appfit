// Ritmo: constancia semanal con el descanso dentro (gaming.md, ADR 029). Estado de cada semana, hilo (racha de semanas
// con presencia), comodines, vueltas e hitos. Funciones puras: todo se deriva de los registros, del plan y de las pausas.
import type { Pausa, TramoPlanSemanal } from '../../../shared/db/types'
import { addDays, startOfWeek } from '../../../shared/lib/dates'
import { pausaDeSemana } from './pausas'
import { evaluarSemana, planDeSemana, type EstadoSemanaPlan } from './plan'

export type EstadoSemana = 'cumplida' | 'parcial' | 'presente' | 'vacia'

export const ESTADOS_SEMANA: Record<EstadoSemana, { nombre: string; descripcion: string }> = {
  cumplida: { nombre: 'Cumplida', descripcion: 'Entrenos y días registrados del plan' },
  parcial: { nombre: 'Parcial', descripcion: 'Solo una de las dos partes del plan' },
  presente: { nombre: 'Presente', descripcion: 'Al menos un entreno o 3 días registrados' },
  vacia: { nombre: 'Vacía', descripcion: 'Nada de lo anterior' },
}

/** Días con alguna comida registrada que hacen «presente» una semana sin entrenos. */
export const DIAS_PRESENCIA = 3
/** Un comodín por cada 4 semanas cumplidas, como mucho 2 guardados. */
export const SEMANAS_POR_COMODIN = 4
export const MAX_COMODINES = 2
/** Hitos de semanas cumplidas (también son logros de la Vitrina). */
export const HITOS_SEMANAS = [4, 12, 26, 52] as const

export interface SemanaRitmo extends EstadoSemanaPlan {
  lunes: string
  estado: EstadoSemana
  pausa: Pausa | null
  /** La semana ya terminó (su domingo es anterior a hoy). La actual no rompe el hilo hasta que termina. */
  cerrada: boolean
  /** Semana vacía salvada con un comodín: el hilo sigue, sin sumar. */
  comodin: boolean
  /** Semana vacía en pausa: el hilo se congela, sin sumar ni romperse. */
  congelada: boolean
  /** Primera semana con presencia tras una vacía: se celebra. */
  vuelta: boolean
  /** Hilo al acabar esta semana. */
  hilo: number
  /** Primer día en que la semana tuvo presencia (un entreno o el tercer día registrado); `null` si no la tuvo. */
  presenteEl: string | null
}

export interface Hito {
  semanas: number
  /** Día en que se cumplió la semana que lo alcanzó; `null` si aún no. */
  fecha: string | null
}

export interface ResultadoRitmo {
  /** De la primera semana con registros a la actual, en orden. */
  semanas: SemanaRitmo[]
  actual: SemanaRitmo
  hiloActual: number
  mejorHilo: number
  comodines: number
  /** Semanas cumplidas desde el último comodín ganado (0–3). */
  progresoComodin: number
  cumplidas: number
  vueltas: number
  hitos: Hito[]
}

export interface DatosRitmo {
  hoy: string
  /** Días con un entreno que cuenta (≥ 6 series efectivas). */
  diasEntreno: ReadonlySet<string>
  /** Días con alguna comida registrada; `null` si la nutrición no cuenta. */
  diasRegistro: ReadonlySet<string> | null
  planes?: readonly TramoPlanSemanal[]
  pausas?: readonly Pausa[]
}

/**
 * Cumplida (plan entero), parcial (solo entrenos o solo días registrados), presente (algún entreno o 3 días
 * registrados) o vacía. En una pausa de entreno solo cuenta la nutrición.
 */
export function estadoDeSemana(e: EstadoSemanaPlan, pausa: Pausa | null): EstadoSemana {
  if (e.cumplida) return 'cumplida'
  const soloNutricion = pausa?.tipo === 'entreno' && e.diasRegistrados !== null
  const dias = e.diasRegistrados ?? 0
  if (!soloNutricion && e.diasRegistrados !== null && (e.entrenos >= e.plan.entrenos || dias >= e.plan.diasRegistro)) return 'parcial'
  if ((!soloNutricion && e.entrenos > 0) || dias >= DIAS_PRESENCIA) return 'presente'
  return 'vacia'
}

const semanaDe = (lunes: string) => Array.from({ length: 7 }, (_, i) => addDays(lunes, i))

/** El día en que la semana pasó a tener presencia (o se cumplió el plan, si fue antes). */
function primerDiaPresente(lunes: string, d: DatosRitmo, pausa: Pausa | null): string | null {
  const soloNutricion = pausa?.tipo === 'entreno' && d.diasRegistro !== null
  let dias = 0
  for (const f of semanaDe(lunes)) {
    if (f > d.hoy) break
    if (d.diasRegistro?.has(f)) dias += 1
    if ((!soloNutricion && d.diasEntreno.has(f)) || dias >= DIAS_PRESENCIA) return f
  }
  return null
}

/**
 * Recorre las semanas de la primera con registros a la actual. El hilo suma cada semana con presencia; una vacía lo
 * rompe salvo que esté en pausa (se congela) o quede un comodín (se gasta solo). La semana en curso solo suma.
 */
export function calcularRitmo(d: DatosRitmo): ResultadoRitmo {
  const lunesActual = startOfWeek(d.hoy)
  const fechas = [...d.diasEntreno, ...(d.diasRegistro ?? [])].filter((f) => f <= d.hoy).sort()
  let lunes = fechas.length ? startOfWeek(fechas[0]) : lunesActual

  const semanas: SemanaRitmo[] = []
  let hilo = 0
  let mejorHilo = 0
  let comodines = 0
  let progresoComodin = 0
  let cumplidas = 0
  let vueltas = 0
  let anteriorVacia = false
  const hitos: Hito[] = HITOS_SEMANAS.map((semanas) => ({ semanas, fecha: null }))

  for (; lunes <= lunesActual; lunes = addDays(lunes, 7)) {
    const pausa = pausaDeSemana(d.pausas, lunes)
    const evaluada = evaluarSemana(semanaDe(lunes), d.diasEntreno, d.diasRegistro, planDeSemana(d.planes, lunes), d.hoy, pausa?.tipo ?? null)
    const estado = estadoDeSemana(evaluada, pausa)
    const cerrada = lunes < lunesActual
    let comodin = false
    let congelada = false
    let vuelta = false

    if (estado !== 'vacia') {
      vuelta = anteriorVacia
      if (vuelta) vueltas += 1
      anteriorVacia = false
      hilo += 1
      mejorHilo = Math.max(mejorHilo, hilo)
      if (estado === 'cumplida') {
        cumplidas += 1
        const hito = hitos.find((h) => h.semanas === cumplidas)
        if (hito) hito.fecha = evaluada.cumplidaEl
        progresoComodin += 1
        if (progresoComodin === SEMANAS_POR_COMODIN) {
          progresoComodin = 0
          comodines = Math.min(MAX_COMODINES, comodines + 1)
        }
      }
    } else if (cerrada) {
      anteriorVacia = true
      if (pausa) congelada = true
      else if (comodines > 0) { comodines -= 1; comodin = true }
      else hilo = 0
    }
    semanas.push({ ...evaluada, lunes, estado, pausa, cerrada, comodin, congelada, vuelta, hilo, presenteEl: estado === 'vacia' ? null : primerDiaPresente(lunes, d, pausa) })
  }

  const actual = semanas[semanas.length - 1]
  return { semanas, actual, hiloActual: actual.hilo, mejorHilo, comodines, progresoComodin, cumplidas, vueltas, hitos }
}

/** La semana que empieza en `lunes`, si está en el recorrido. */
export function semanaRitmo(r: ResultadoRitmo, lunes: string): SemanaRitmo | undefined {
  return r.semanas.find((s) => s.lunes === lunes)
}
