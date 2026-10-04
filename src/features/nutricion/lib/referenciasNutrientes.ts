import type { NutrientesAdicionales } from '../../../shared/db/types'

export interface ReferenciaNutriente {
  tipo: 'minimo' | 'limite' | 'referencia'
  gramos: number
}

/** Adultos. OMS: fibra ≥25 g, sal <5 g y saturadas ≤10% de energía.
 * UE 1169/2011, anexo XIII: 90 g de azúcares TOTALES como referencia de etiquetado
 * para 2000 kcal, no límite clínico ni estimación de azúcares libres.
 * No se inventan un máximo de fibra o mínimos de sal/azúcares/saturadas.
 */
export function referenciasNutrientes(kcal: number): Record<keyof NutrientesAdicionales, ReferenciaNutriente> {
  const energia = energiaDeReferencia(kcal)
  return {
    fibra: { tipo: 'minimo', gramos: 25 },
    azucares: { tipo: 'referencia', gramos: 90 },
    sal: { tipo: 'limite', gramos: 5 },
    agSat: { tipo: 'limite', gramos: energia * 0.1 / 9 },
  }
}

export function energiaDeReferencia(kcal: number): number {
  return Number.isFinite(kcal) && kcal > 0 ? kcal : 2000
}

export const FUENTES_REFERENCIAS = {
  oms: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
  sal: 'https://www.who.int/news-room/fact-sheets/detail/salt-reduction',
  ue: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32011R1169',
}
