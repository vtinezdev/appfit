// Liga por ejercicio (gaming.md): cuanto más tiempo seguido se hace un ejercicio, más sube. Una división por semana con
// el ejercicio hasta Élite; sin él, la primera semana no cuenta y desde la segunda baja una división por semana. Élite
// sugiere, sin obligar, cambiarlo. Funciones puras: todo se deriva de los entrenos terminados y de las pausas de Ritmo.
import type { Pausa, SetEntry, Workout } from '../../../shared/db/types'
import { addDays, startOfWeek, toISODate } from '../../../shared/lib/dates'
import { tieneReps } from '../../gym/lib/ejecucion'
import { esEfectiva } from '../../gym/lib/workout'
import { pausaDeSemana } from '../../ritmo/lib/pausas'

/** Ligas de abajo arriba; cada una con tres divisiones (III, II, I). Encima, Élite. */
export const LIGAS = ['Bronce', 'Plata', 'Oro', 'Platino', 'Diamante'] as const
export const DIVISIONES_POR_LIGA = 3
/** Paso de Élite: 16 semanas con el ejercicio. */
export const PASO_ELITE = LIGAS.length * DIVISIONES_POR_LIGA + 1
/** Semanas seguidas sin el ejercicio que no bajan (la de gracia: rutinas A/B, una semana floja). */
export const SEMANAS_DE_GRACIA = 1

const ROMANOS = ['I', 'II', 'III'] as const

export interface Division {
  /** 0 = sin liga; 1–15 las divisiones; `PASO_ELITE` = Élite. */
  paso: number
  liga: (typeof LIGAS)[number] | 'Élite' | null
  /** «Oro II», «Élite» o «Sin liga». */
  nombre: string
  elite: boolean
}

/** División de un paso (se recorta a 0–`PASO_ELITE`). */
export function divisionDe(paso: number): Division {
  const p = Math.max(0, Math.min(PASO_ELITE, Math.floor(paso)))
  if (p === 0) return { paso: 0, liga: null, nombre: 'Sin liga', elite: false }
  if (p === PASO_ELITE) return { paso: p, liga: 'Élite', nombre: 'Élite', elite: true }
  const liga = LIGAS[Math.floor((p - 1) / DIVISIONES_POR_LIGA)]
  const numero = ROMANOS[DIVISIONES_POR_LIGA - 1 - ((p - 1) % DIVISIONES_POR_LIGA)]
  return { paso: p, liga, nombre: `${liga} ${numero}`, elite: false }
}

/** Primera sesión de una semana con el ejercicio (la que sube) y el último día de esa semana con él. */
export interface SesionSemana {
  workoutId: number
  fecha: string
  ultimaFecha: string
}

export interface SemanaLiga {
  lunes: string
  /** Primera sesión de la semana con el ejercicio; `null` si no se hizo. */
  sesion: SesionSemana | null
  /** Semana sin el ejercicio en pausa de Ritmo: ni sube ni baja. */
  congelada: boolean
  /** Paso al empezar la semana y al acabarla (o hasta hoy, la actual). */
  antes: number
  despues: number
}

export interface Pico {
  paso: number
  /** Último día en que lo alcanzó (primera sesión de esa semana). */
  fecha: string
}

export interface LigaEjercicio {
  exerciseId: number
  division: Division
  /** De la primera semana con el ejercicio a la actual, en orden. */
  semanas: SemanaLiga[]
  /** Semanas con el ejercicio en la racha actual (que solo rompen dos semanas seguidas sin él); 0 si está rota. */
  semanasSeguidas: number
  /** Semanas cerradas seguidas sin el ejercicio hasta hoy (sin contar las congeladas); desde la segunda, baja. */
  semanasSin: number
  /** Ya se hizo en la semana en curso: la siguiente división llega la próxima semana con él. */
  hechaEstaSemana: boolean
  /** Último día con el ejercicio. */
  ultimaFecha: string
  /** El fantasma: el pico de las rachas anteriores a la actual, o `null` si no las hubo. */
  pico: Pico | null
  /** Cada llegada a Élite desde Diamante I: la primera sesión de esa semana. */
  ciclos: SesionSemana[]
}

/**
 * Primera sesión de cada semana con cada ejercicio: entrenos terminados hasta `hoy` con al menos una serie efectiva y con
 * repeticiones de ese ejercicio. Las variantes (ejecución, agarre, carga) cuentan como el mismo ejercicio.
 */
export function semanasPorEjercicio(workouts: readonly Workout[], sets: readonly SetEntry[], hoy: string): Map<number, Map<string, SesionSemana>> {
  const terminados = new Map<number, { inicio: number; fecha: string; lunes: string }>()
  for (const w of workouts) {
    if (w.fin === undefined) continue
    const fecha = toISODate(new Date(w.inicio))
    if (fecha <= hoy) terminados.set(w.id, { inicio: w.inicio, fecha, lunes: startOfWeek(fecha) })
  }
  const primeras = new Map<number, Map<string, SesionSemana & { inicio: number }>>()
  for (const s of sets) {
    const w = terminados.get(s.workoutId)
    if (!w || !esEfectiva(s) || !tieneReps(s)) continue
    const { lunes } = w
    const delEjercicio = primeras.get(s.exerciseId) ?? new Map()
    const actual = delEjercicio.get(lunes)
    const ultimaFecha = actual && actual.ultimaFecha > w.fecha ? actual.ultimaFecha : w.fecha
    if (!actual || w.inicio < actual.inicio || (w.inicio === actual.inicio && s.workoutId < actual.workoutId)) {
      delEjercicio.set(lunes, { workoutId: s.workoutId, fecha: w.fecha, inicio: w.inicio, ultimaFecha })
    } else actual.ultimaFecha = ultimaFecha
    primeras.set(s.exerciseId, delEjercicio)
  }
  return new Map([...primeras].map(([id, semanas]) => [id, new Map([...semanas].map(([lunes, { workoutId, fecha, ultimaFecha }]) => [lunes, { workoutId, fecha, ultimaFecha }]))]))
}

/**
 * Recorre las semanas de la primera con el ejercicio a la actual. Con el ejercicio sube una división (hasta Élite). Sin
 * él, la primera semana no cuenta y desde la segunda seguida baja una; en pausa de Ritmo se congela. La semana en
 * curso solo sube: no baja hasta que acaba.
 */
export function evolucionLiga(exerciseId: number, hechas: ReadonlyMap<string, SesionSemana>, hoy: string, pausas?: readonly Pausa[]): LigaEjercicio | null {
  const lunesHechos = [...hechas.keys()].sort()
  if (!lunesHechos.length) return null
  const lunesActual = startOfWeek(hoy)
  const semanas: SemanaLiga[] = []
  const ciclos: SesionSemana[] = []
  let paso = 0
  let sin = 0
  let seguidas = 0
  // Pico de la racha en curso y el mejor de las anteriores (el fantasma).
  let picoRacha: Pico | null = null
  let pico: Pico | null = null
  let ultimaFecha = ''

  for (let lunes = lunesHechos[0]; lunes <= lunesActual; lunes = addDays(lunes, 7)) {
    const sesion = hechas.get(lunes) ?? null
    const antes = paso
    let congelada = false
    if (sesion) {
      if (sin > SEMANAS_DE_GRACIA) {
        // Racha rota: la anterior pasa a ser el fantasma si fue mejor (o igual y más reciente).
        if (picoRacha && (!pico || picoRacha.paso >= pico.paso)) pico = picoRacha
        picoRacha = null
        seguidas = 0
      }
      sin = 0
      seguidas += 1
      paso = Math.min(PASO_ELITE, paso + 1)
      if (paso === PASO_ELITE && antes < PASO_ELITE) ciclos.push(sesion)
      if (!picoRacha || paso >= picoRacha.paso) picoRacha = { paso, fecha: sesion.fecha }
      ultimaFecha = sesion.ultimaFecha
    } else if (lunes < lunesActual) {
      if (pausaDeSemana(pausas, lunes)) congelada = true
      else {
        sin += 1
        if (sin > SEMANAS_DE_GRACIA) paso = Math.max(0, paso - 1)
      }
    }
    semanas.push({ lunes, sesion, congelada, antes, despues: paso })
  }

  // Con la racha rota, su pico también es ya de una racha anterior.
  if (sin > SEMANAS_DE_GRACIA && picoRacha && (!pico || picoRacha.paso >= pico.paso)) pico = picoRacha
  return {
    exerciseId,
    division: divisionDe(paso),
    semanas,
    semanasSeguidas: sin > SEMANAS_DE_GRACIA ? 0 : seguidas,
    semanasSin: sin,
    hechaEstaSemana: semanas.at(-1)?.lunes === lunesActual && semanas.at(-1)?.sesion !== null,
    ultimaFecha,
    pico,
    ciclos,
  }
}

export interface DatosLiga {
  hoy: string
  workouts: readonly Workout[]
  sets: readonly SetEntry[]
  pausas?: readonly Pausa[]
}

/** La liga de cada ejercicio hecho alguna vez, de la división más alta a la más baja (a igualdad, el más reciente). */
export function calcularLigas(d: DatosLiga): LigaEjercicio[] {
  const ligas: LigaEjercicio[] = []
  for (const [id, hechas] of semanasPorEjercicio(d.workouts, d.sets, d.hoy)) {
    const liga = evolucionLiga(id, hechas, d.hoy, d.pausas)
    if (liga) ligas.push(liga)
  }
  return ligas.sort((a, b) => b.division.paso - a.division.paso || b.ultimaFecha.localeCompare(a.ultimaFecha) || a.exerciseId - b.exerciseId)
}

export interface Ascenso {
  exerciseId: number
  de: Division
  a: Division
}

/** Divisiones que sube un entreno: las de los ejercicios cuya primera sesión de la semana es esa. */
export function ascensosDeEntreno(ligas: readonly LigaEjercicio[], workoutId: number): Ascenso[] {
  const ascensos: Ascenso[] = []
  for (const l of ligas) {
    const semana = l.semanas.find((s) => s.sesion?.workoutId === workoutId)
    if (semana && semana.despues > semana.antes) ascensos.push({ exerciseId: l.exerciseId, de: divisionDe(semana.antes), a: divisionDe(semana.despues) })
  }
  return ascensos
}

export interface Ciclo {
  exerciseId: number
  fecha: string
  workoutId: number
}

/** Cada llegada a Élite, de la más antigua a la más reciente (los ciclos completados de la Vitrina). */
export function ciclosCompletados(ligas: readonly LigaEjercicio[]): Ciclo[] {
  return ligas.flatMap((l) => l.ciclos.map(({ fecha, workoutId }) => ({ exerciseId: l.exerciseId, fecha, workoutId })))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.exerciseId - b.exerciseId)
}

/** La primera llegada a Élite de cada ejercicio, de la más antigua a la más reciente (el logro cuenta ejercicios distintos). */
export function primerosCiclos(ligas: readonly LigaEjercicio[]): Ciclo[] {
  return ciclosCompletados(ligas.map((l) => ({ ...l, ciclos: l.ciclos.slice(0, 1) })))
}

export interface GrupoLiga {
  liga: NonNullable<Division['liga']>
  ligas: LigaEjercicio[]
}

/** Ejercicios con liga agrupados de Élite a Bronce (en el orden de `calcularLigas`) y, aparte, los que están sin liga. */
export function agruparPorLiga(ligas: readonly LigaEjercicio[]): { grupos: GrupoLiga[]; sinLiga: LigaEjercicio[] } {
  const orden: GrupoLiga['liga'][] = ['Élite', ...[...LIGAS].reverse()]
  const grupos = orden.map((liga) => ({ liga, ligas: ligas.filter((l) => l.division.liga === liga) })).filter((g) => g.ligas.length)
  return { grupos, sinLiga: ligas.filter((l) => l.division.liga === null) }
}
