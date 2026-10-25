import type { Macros } from '../../nutricion/lib/nutrition'

/** Qué pinta cada tramo: un macro o las kcal registradas sin desglose (kcal rápidas, alimentos sin macros). */
export type TipoTramo = 'prot' | 'carbs' | 'fat' | 'otros'

export interface TramoAnillo {
  tipo: TipoTramo
  /** Fracción de la vuelta (0–1) donde empieza, desde las 12 en sentido horario. */
  inicio: number
  /** Fracción de la vuelta (0–1) que ocupa. */
  largo: number
}

export interface AnilloEnergia {
  /** Anillo exterior: lo consumido hasta el objetivo, repartido por las kcal de cada macro. El resto de la vuelta es lo que falta. */
  tramos: TramoAnillo[]
  /** Segunda vuelta (anillo interior): exceso sobre el objetivo; 1 = otro objetivo entero o más. 0 si no te pasas. */
  vuelta: number
}

/** kcal por gramo (Atwater): las mismas que `distribucionPCG`. */
const KCAL_G = { prot: 4, carbs: 4, fat: 9 } as const

const positivo = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)

/**
 * Geometría de la rueda de energía de Inicio, sin nada de DOM.
 * - Con objetivo, el anillo exterior se llena en proporción kcal/objetivo y se queda lleno al alcanzarlo;
 *   lo que pasa del objetivo se dibuja como segunda vuelta en el anillo interior.
 * - Sin objetivo no hay progreso que medir: si hay consumo, el anillo entero muestra el reparto.
 * - El reparto usa las kcal de cada macro (P y C × 4, G × 9). Si las kcal del día superan a las de los macros,
 *   la diferencia es un tramo `otros`; si las de los macros superan a las del día (redondeos), se reparte entre ellos.
 */
export function anilloEnergia(totales: Pick<Macros, 'kcal' | 'prot' | 'carb' | 'grasa'>, objetivo: number): AnilloEnergia {
  const kcal = positivo(totales.kcal)
  const meta = positivo(objetivo)
  const lleno = meta > 0 ? Math.min(kcal / meta, 1) : kcal > 0 ? 1 : 0
  const porMacro: [TipoTramo, number][] = [
    ['prot', positivo(totales.prot) * KCAL_G.prot],
    ['carbs', positivo(totales.carb) * KCAL_G.carbs],
    ['fat', positivo(totales.grasa) * KCAL_G.fat],
  ]
  const deMacros = porMacro.reduce((s, [, k]) => s + k, 0)
  porMacro.push(['otros', Math.max(kcal - deMacros, 0)])
  const base = Math.max(kcal, deMacros)

  const tramos: TramoAnillo[] = []
  let inicio = 0
  if (base > 0 && lleno > 0) {
    for (const [tipo, k] of porMacro) {
      const largo = (lleno * k) / base
      if (largo <= 0) continue
      tramos.push({ tipo, inicio, largo })
      inicio += largo
    }
  }
  return { tramos, vuelta: meta > 0 && kcal > meta ? Math.min((kcal - meta) / meta, 1) : 0 }
}
