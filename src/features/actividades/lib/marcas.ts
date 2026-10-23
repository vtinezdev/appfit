// Tus mejores marcas en Actividades (A24): la salida más larga, la de más desnivel y el mejor ritmo. Funciones puras sobre
// las actividades guardadas; todas juntas, sin separar por tipo. Sin ranking ni comparación con nadie.
import type { Actividad } from '../../../shared/db/types'
import { ritmoSegPorKm } from './actividad'

/** El mejor ritmo solo cuenta salidas de 5 km o más, para que un paseo corto o un sprint no lo gane (decisión de Víctor). */
export const MIN_METROS_RITMO = 5000

export type TipoMarca = 'distancia' | 'desnivel' | 'ritmo'
export const TIPOS_MARCA: readonly TipoMarca[] = ['distancia', 'desnivel', 'ritmo']

/** Nombre de la marca, para el bloque de Actividades. */
export const NOMBRE_MARCA: Record<TipoMarca, string> = { distancia: 'Más larga', desnivel: 'Más desnivel', ritmo: 'Mejor ritmo' }
/** Frase de la marca para el detalle y el aviso al guardar. */
export const FRASE_MARCA: Record<TipoMarca, string> = {
  distancia: 'Tu salida más larga',
  desnivel: 'Tu salida con más desnivel',
  ritmo: 'Tu mejor ritmo en 5 km o más',
}

export interface Marca {
  actividad: Actividad
  /** Metros (distancia y desnivel) o segundos por km (ritmo). */
  valor: number
}

export type MejoresMarcas = Partial<Record<TipoMarca, Marca>>

type Datos = Pick<Actividad, 'distanciaM' | 'duracionSeg' | 'desnivelM'>

/** Valor de una actividad para una marca, o `null` si no opta a ella. */
export function valorMarca(tipo: TipoMarca, a: Datos): number | null {
  if (tipo === 'distancia') return a.distanciaM > 0 ? a.distanciaM : null
  if (tipo === 'desnivel') return a.desnivelM && a.desnivelM > 0 ? a.desnivelM : null
  return a.distanciaM >= MIN_METROS_RITMO ? ritmoSegPorKm(a.duracionSeg, a.distanciaM) : null
}

/** ¿`v` mejora `actual`? El ritmo mejora bajando; lo demás, subiendo. Un empate no mejora: la marca es de quien llegó antes. */
const mejora = (tipo: TipoMarca, v: number, actual: number) => (tipo === 'ritmo' ? v < actual : v > actual)

/** Las mejores marcas de las actividades terminadas. En empate, la más antigua. */
export function mejoresMarcas(actividades: readonly Actividad[]): MejoresMarcas {
  const r: MejoresMarcas = {}
  const orden = actividades.filter((a) => !a.enCurso).sort((x, y) => x.inicio - y.inicio || x.id - y.id)
  for (const tipo of TIPOS_MARCA) {
    for (const a of orden) {
      const v = valorMarca(tipo, a)
      if (v === null) continue
      const actual = r[tipo]
      if (!actual || mejora(tipo, v, actual.valor)) r[tipo] = { actividad: a, valor: v }
    }
  }
  return r
}

/**
 * Marcas que tiene una actividad, para su detalle: es la mejor y hay al menos otra que optaba (con una sola salida, «tu
 * salida más larga» no dice nada).
 */
export function marcasDe(actividades: readonly Actividad[], id: number): TipoMarca[] {
  const mejores = mejoresMarcas(actividades)
  return TIPOS_MARCA.filter((tipo) => mejores[tipo]?.actividad.id === id
    && actividades.some((a) => a.id !== id && !a.enCurso && valorMarca(tipo, a) !== null))
}

/**
 * Marcas que bate una actividad nueva frente a las que había (aviso al guardar): mejora a la anterior mejor. Sin marca
 * anterior de ese tipo, no hay nada que batir.
 */
export function marcasBatidas(previas: readonly Actividad[], nueva: Datos): TipoMarca[] {
  const mejores = mejoresMarcas(previas)
  return TIPOS_MARCA.filter((tipo) => {
    const v = valorMarca(tipo, nueva)
    const actual = mejores[tipo]
    return v !== null && actual !== undefined && mejora(tipo, v, actual.valor)
  })
}

/** Aviso al guardar: «Actividad guardada · Tu salida más larga», o solo el mensaje si no bate nada. */
export function mensajeConMarcas(mensaje: string, batidas: readonly TipoMarca[]): string {
  if (batidas.length === 0) return mensaje
  const frases = batidas.map((t, i) => (i === 0 ? FRASE_MARCA[t] : FRASE_MARCA[t].replace(/^Tu /, 'tu ')))
  return `${mensaje} · ${frases.join(' y ')}`
}
