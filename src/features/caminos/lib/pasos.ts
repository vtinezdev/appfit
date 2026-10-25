// Pasos de Caminos: una web app no puede leer Apple Salud ni Health Connect, así que se apunta a mano el total del día
// que marca el móvil. Se pasan a metros con la zancada y avanzan la ruta con lo que no esté ya en las actividades de ese
// día: el total del móvil incluye las caminatas y carreras registradas, y así no cuentan dos veces.
import type { Actividad, DiaPasos, Perfil } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'

/** Pasos de un día como mucho (más es casi seguro una errata). */
export const PASOS_MAX = 100_000
export const ZANCADA_MIN_CM = 30
export const ZANCADA_MAX_CM = 150
/**
 * Zancada al caminar ≈ 0,415 × la altura (0,413 en mujeres): la regla con la que estiman los podómetros. Es una
 * aproximación de AppFit, no una medida: quien la conozca puede poner la suya.
 */
export const FACTOR_ZANCADA = { hombre: 0.415, mujer: 0.413 } as const
/** Sin altura en el perfil: la de una persona de unos 1,70 m. */
export const ZANCADA_POR_DEFECTO_CM = 70

export interface Zancada {
  cm: number
  /** `propia`, la que puso la persona; `altura`, estimada por el perfil; `defecto`, sin altura. */
  origen: 'propia' | 'altura' | 'defecto'
}

/** Zancada estimada por la altura y el sexo del perfil (sin sexo, la media de los dos factores). `null` sin altura. */
export function zancadaEstimadaCm(perfil: Pick<Perfil, 'alturaCm' | 'sexo'> | undefined): number | null {
  const altura = perfil?.alturaCm
  if (!altura || altura <= 0) return null
  const factor = perfil?.sexo ? FACTOR_ZANCADA[perfil.sexo] : (FACTOR_ZANCADA.hombre + FACTOR_ZANCADA.mujer) / 2
  return Math.round(altura * factor)
}

/** La zancada con la que se cuentan los pasos: la propia, la estimada por la altura o la de por defecto. */
export function zancadaDe(propiaCm: number | undefined, perfil: Pick<Perfil, 'alturaCm' | 'sexo'> | undefined): Zancada {
  if (propiaCm !== undefined && validarZancada(propiaCm) !== null) return { cm: propiaCm, origen: 'propia' }
  const estimada = zancadaEstimadaCm(perfil)
  return estimada !== null ? { cm: estimada, origen: 'altura' } : { cm: ZANCADA_POR_DEFECTO_CM, origen: 'defecto' }
}

/** Metros de unos pasos con una zancada (en cm), redondeados al metro. */
export const metrosDePasos = (pasos: number, zancadaCm: number) => Math.round((pasos * zancadaCm) / 100)

/**
 * Lee los pasos escritos («8432», «8.432» o «8 432»). `null` si no es un número entero de 1 a `PASOS_MAX`.
 */
export function leerPasos(texto: string): number | null {
  const limpio = texto.trim().replace(/\s/g, '')
  if (!/^(\d+|\d{1,3}(\.\d{3})+)$/.test(limpio)) return null
  return validarPasos(Number(limpio.replace(/\./g, '')))
}

export function validarPasos(n: number): number | null {
  return Number.isInteger(n) && n >= 1 && n <= PASOS_MAX ? n : null
}

/** Zancada en cm entera entre `ZANCADA_MIN_CM` y `ZANCADA_MAX_CM`; `null` si no. */
export function validarZancada(n: number | undefined): number | null {
  return n !== undefined && Number.isInteger(n) && n >= ZANCADA_MIN_CM && n <= ZANCADA_MAX_CM ? n : null
}

export const ERROR_PASOS = `Escribe los pasos del día: un número entero de 1 a ${formatInt(PASOS_MAX)}.`
export const ERROR_ZANCADA = `La zancada va en centímetros, de ${formatInt(ZANCADA_MIN_CM)} a ${formatInt(ZANCADA_MAX_CM)}.`

/** Lo que dan los pasos de un día. */
export interface AportePasos {
  fecha: string
  pasos: number
  /** Metros de los pasos con la zancada. */
  metrosPasos: number
  /** Metros de las actividades terminadas de ese día (ya incluidos en el total del móvil). */
  metrosActividades: number
  /** Lo que avanzan Caminos: lo que sobra de los pasos sobre las actividades (nunca negativo). */
  metros: number
}

/** Lo que dan los pasos de cada día, en orden de fecha. */
export function aportesDePasos(
  dias: readonly Pick<DiaPasos, 'fecha' | 'pasos'>[],
  actividades: readonly Pick<Actividad, 'fecha' | 'distanciaM' | 'enCurso'>[],
  zancadaCm: number,
): AportePasos[] {
  const porDia = new Map<string, number>()
  for (const a of actividades) if (!a.enCurso && a.distanciaM > 0) porDia.set(a.fecha, (porDia.get(a.fecha) ?? 0) + Math.round(a.distanciaM))
  return [...dias].sort((a, b) => a.fecha.localeCompare(b.fecha)).map(({ fecha, pasos }) => {
    const metrosPasos = metrosDePasos(pasos, zancadaCm)
    const metrosActividades = porDia.get(fecha) ?? 0
    return { fecha, pasos, metrosPasos, metrosActividades, metros: Math.max(0, metrosPasos - metrosActividades) }
  })
}

/** «1 paso», «8.432 pasos». */
export const pasosTexto = (n: number) => (n === 1 ? '1 paso' : `${formatInt(n)} pasos`)
