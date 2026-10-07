// Gasto observado (adaptativo): lo que realmente gastas según lo que comes y cómo cambia tu peso.
// gasto = kcal medias − (pendiente de la media móvil de peso en kg/día × 7.700). Funciones puras.
// Limitaciones: 7.700 kcal por kg es una aproximación (Hall, 2008) y el peso cambia por agua, sal y digestión;
// solo es fiable con mucho registro y pesajes frecuentes, por eso se exigen mínimos y, si no se cumplen, no se calcula.
import { addDays } from '../../../shared/lib/dates'
import { mediaMovilPeso } from '../../inicio/lib/peso'
import { KCAL_POR_KG, REDONDEO_OBJETIVO_KCAL } from './energia'

export const DIAS_VENTANA = 28
export const DIAS_VENTANA_MIN = 21
export const FRACCION_REGISTRO_MIN = 0.8
export const PESAJES_SEMANA_MIN = 2

export interface GastoObservadoOk {
  estado: 'ok'
  /** kcal/día redondeadas a 10. */
  gasto: number
  gastoExacto: number
  kcalMedia: number
  /** Variación de la media de peso (kg por semana; negativa = bajando). */
  kgSemana: number
  dias: number
  diasRegistrados: number
  pesajes: number
}
export interface GastoObservadoInsuficiente {
  estado: 'insuficiente'
  dias: number
  diasRegistrados: number
  pesajes: number
  /** Qué falta, en lenguaje llano. */
  motivos: string[]
}
export type GastoObservado = GastoObservadoOk | GastoObservadoInsuficiente

export interface EntradaGasto {
  /** Fecha de la ventana (YYYY-MM-DD) de la que se mira hacia atrás; el día en curso no cuenta (suele estar a medias). */
  hoy: string
  /** kcal registradas por día; solo los días con alguna comida registrada. */
  kcalPorDia: ReadonlyMap<string, number>
  pesos: { fecha: string; kg: number }[]
  dias?: number
}

/** Pendiente de mínimos cuadrados de `y` respecto a `x`; `null` con menos de 2 puntos o sin variación en x. */
export function pendiente(puntos: { x: number; y: number }[]): number | null {
  if (puntos.length < 2) return null
  const n = puntos.length
  const mx = puntos.reduce((a, p) => a + p.x, 0) / n
  const my = puntos.reduce((a, p) => a + p.y, 0) / n
  const sxx = puntos.reduce((a, p) => a + (p.x - mx) ** 2, 0)
  if (sxx === 0) return null
  return puntos.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0) / sxx
}

function diasEntre(desde: string, hasta: string): number {
  const [ya, ma, da] = desde.split('-').map(Number)
  const [yb, mb, db] = hasta.split('-').map(Number)
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000)
}

export function calcularGastoObservado({ hoy, kcalPorDia, pesos, dias = DIAS_VENTANA }: EntradaGasto): GastoObservado {
  const n = Math.max(DIAS_VENTANA_MIN, Math.floor(dias))
  const fin = addDays(hoy, -1)
  const inicio = addDays(fin, -(n - 1))
  const fechas = Array.from({ length: n }, (_, i) => addDays(inicio, i))
  const registrados = fechas.filter((f) => (kcalPorDia.get(f) ?? 0) > 0)
  const pesosVentana = pesos.filter((p) => p.fecha >= inicio && p.fecha <= fin)

  const motivos: string[] = []
  const minDias = Math.ceil(n * FRACCION_REGISTRO_MIN)
  if (registrados.length < minDias) motivos.push(`Faltan comidas registradas: ${registrados.length} de ${n} días, y hacen falta al menos ${minDias}.`)
  const semanas = Math.floor(n / 7)
  const flojas = Array.from({ length: semanas }, (_, s) => {
    const desde = addDays(inicio, s * 7)
    const hasta = addDays(desde, 6)
    return pesosVentana.filter((p) => p.fecha >= desde && p.fecha <= hasta).length
  }).filter((c) => c < PESAJES_SEMANA_MIN).length
  if (flojas > 0) motivos.push(`Faltan pesajes: hacen falta al menos ${PESAJES_SEMANA_MIN} por semana durante ${semanas} semanas seguidas.`)

  // La media móvil usa también los pesajes de la semana anterior a la ventana, para que la primera media sea completa.
  const puntos = mediaMovilPeso(pesos).filter((p) => p.fecha >= inicio && p.fecha <= fin).map((p) => ({ x: diasEntre(inicio, p.fecha), y: p.media }))
  const base = { dias: n, diasRegistrados: registrados.length, pesajes: pesosVentana.length }
  const kgDia = pendiente(puntos)
  if (motivos.length === 0 && kgDia === null) motivos.push('No hay variación de fechas en los pesajes para calcular una tendencia.')
  if (motivos.length > 0 || kgDia === null) return { estado: 'insuficiente', ...base, motivos }

  const kcalMedia = registrados.reduce((a, f) => a + (kcalPorDia.get(f) ?? 0), 0) / registrados.length
  const gastoExacto = kcalMedia - kgDia * KCAL_POR_KG
  return {
    estado: 'ok', ...base, kcalMedia, kgSemana: kgDia * 7, gastoExacto,
    gasto: Math.round(gastoExacto / REDONDEO_OBJETIVO_KCAL) * REDONDEO_OBJETIVO_KCAL,
  }
}
