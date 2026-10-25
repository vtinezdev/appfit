// Lecturas cruzadas de entreno y nutrición (B11): «Tus 8 semanas» al final de la revisión semanal. Funciones puras.
// Frases descriptivas con plantillas cerradas: dicen qué pasó a la vez, nunca por qué (un test impide «porque», «gracias
// a» o «debido a»). Cada frase solo sale con datos suficientes: al menos 4 semanas con las dos cosas que compara.
import type { Exercise, Objetivos, SetEntry, Workout } from '../../../shared/db/types'
import { addDays } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { PROPORCION_PROTEINA } from '../../experiencia/lib/experiencia'
import { bloqueNutricion, bloquePeso, entrenosDeSemana, recordsDeSemana, semanaAnterior, semanaDe, type Semana } from './revisionSemanal'

/** Semanas que se leen, la última incluida. */
export const SEMANAS_CRUZADAS = 8
/** Semanas con las dos variables que hacen falta para escribir una frase. */
export const MINIMO_SEMANAS = 4
/** Entrenos a partir de los que una semana es «de 3 entrenos o más». */
export const ENTRENOS_SEMANA_ALTA = 3

export interface SemanaCruzada {
  lunes: string
  /** Peso medio (kg, 1 decimal) o `null` sin pesajes. */
  peso: number | null
  /** Kcal medias de los días registrados (sin cheat days) o `null`. */
  kcal: number | null
  /** Proteína media al 90 % de su objetivo o más; `null` sin días registrados o sin objetivo. */
  proteinaEnObjetivo: boolean | null
  entrenos: number
  records: number
}

export interface DatosCruzados {
  entries: Parameters<typeof bloqueNutricion>[2]
  cheatDays: ReadonlySet<string>
  objetivos: ReadonlyMap<string, Objetivos>
  pesos: Parameters<typeof bloquePeso>[2]
  workouts: Workout[]
  sets: SetEntry[]
  exercises?: Exercise[]
}

/** Las 8 semanas que acaban en la de `lunes`, de la más antigua a la más reciente. */
export function semanasCruzadas(lunes: string, datos: DatosCruzados, hoy: string, n = SEMANAS_CRUZADAS): SemanaCruzada[] {
  const semanas: Semana[] = Array.from({ length: n }, (_, i) => semanaDe(addDays(lunes, -7 * (n - 1 - i))))
  return semanas.map((s) => {
    const nutricion = bloqueNutricion(s, semanaAnterior(s), datos.entries, datos.objetivos, hoy, datos.cheatDays)
    return {
      lunes: s.lunes,
      peso: bloquePeso(s, semanaAnterior(s), datos.pesos).media,
      kcal: nutricion.kcalMedia,
      proteinaEnObjetivo: nutricion.protMedia === null || nutricion.protObjetivo === null ? null : nutricion.protMedia >= nutricion.protObjetivo * PROPORCION_PROTEINA,
      entrenos: entrenosDeSemana(s, datos.workouts.filter((w) => w.fin !== undefined)).length,
      records: recordsDeSemana(s, datos.workouts, datos.sets).length,
    }
  })
}

const kg = (n: number) => `${formatNumber(n, 1)} kg`
const signo = (n: number) => (n > 0 ? `+${formatNumber(n, 1)}` : n < 0 ? `−${formatNumber(-n, 1)}` : '0')

export interface Lecturas {
  /** Qué partes usa la persona (módulos de B9): sin nutrición o sin gimnasio, las frases que los cruzan no salen. */
  nutricion?: boolean
  gym?: boolean
  peso?: boolean
}

/** Frases de las 8 semanas, solo las que tienen datos suficientes. Describen, nunca explican. */
export function frasesCruzadas(semanas: readonly SemanaCruzada[], usa: Lecturas = {}): string[] {
  const { nutricion = true, gym = true, peso = true } = usa
  const frases: string[] = []
  const total = semanas.length

  // Proteína en objetivo y récords.
  const conProteina = semanas.filter((s) => s.proteinaEnObjetivo !== null)
  if (nutricion && gym && conProteina.length >= MINIMO_SEMANAS) {
    const en = conProteina.filter((s) => s.proteinaEnObjetivo)
    const fuera = conProteina.filter((s) => !s.proteinaEnObjetivo)
    const records = (l: SemanaCruzada[]) => l.reduce((n, s) => n + s.records, 0)
    frases.push(`Semanas con la proteína en objetivo: ${formatInt(en.length)} de ${formatInt(conProteina.length)} · récords en esas semanas: ${formatInt(records(en))}${fuera.length ? `; en las otras: ${formatInt(records(fuera))}` : ''}.`)
  }

  // Entrenos y kcal.
  const conKcal = semanas.filter((s) => s.kcal !== null)
  const altas = conKcal.filter((s) => s.entrenos >= ENTRENOS_SEMANA_ALTA)
  const bajas = conKcal.filter((s) => s.entrenos < ENTRENOS_SEMANA_ALTA)
  if (nutricion && gym && conKcal.length >= MINIMO_SEMANAS && altas.length && bajas.length) {
    const mediaKcal = (l: SemanaCruzada[]) => Math.round(l.reduce((n, s) => n + s.kcal!, 0) / l.length)
    frases.push(`Semanas con ${formatInt(ENTRENOS_SEMANA_ALTA)} entrenos o más: ${formatInt(altas.length)} de ${formatInt(conKcal.length)} · kcal al día en esas semanas: ${formatInt(mediaKcal(altas))}; en las otras: ${formatInt(mediaKcal(bajas))}.`)
  }

  // Peso de la primera a la última semana con pesajes.
  const conPeso = semanas.filter((s) => s.peso !== null)
  if (peso && conPeso.length >= MINIMO_SEMANAS) {
    const primero = conPeso[0].peso!, ultimo = conPeso[conPeso.length - 1].peso!
    frases.push(`Peso medio: de ${kg(primero)} a ${kg(ultimo)} en ${formatInt(total)} semanas (${signo(Math.round((ultimo - primero) * 10) / 10)} kg).`)
  }
  return frases
}
