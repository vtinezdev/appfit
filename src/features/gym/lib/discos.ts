/** Discos estándar por lado (kg), de mayor a menor. */
export const DISCOS_ESTANDAR = [25, 20, 15, 10, 5, 2.5, 1.25] as const
export const BARRAS = [20, 15, 10] as const
export const BARRA_POR_DEFECTO = 20
const PASO = 1.25

export interface ResultadoDiscos {
  /** Discos por lado, de mayor a menor. */
  porLado: { disco: number; cantidad: number }[]
  /** Peso total realmente cargable (barra + 2 × discos). */
  alcanzable: number
  /** El peso pedido se puede cargar exactamente. */
  exacto: boolean
  /** El peso pedido es menor que la barra: no hay discos que poner. */
  menorQueBarra: boolean
}

/**
 * Discos por lado para un peso total. Los discos son múltiplos de 1,25 kg, así que el reparto voraz es óptimo y el
 * peso alcanzable más cercano es el múltiplo de 2,5 kg (1,25 por lado) sobre la barra más próximo al pedido.
 */
export function calcularDiscos(total: number, barra: number = BARRA_POR_DEFECTO, discos: readonly number[] = DISCOS_ESTANDAR): ResultadoDiscos {
  if (!Number.isFinite(total) || !Number.isFinite(barra)) return { porLado: [], alcanzable: Math.max(0, barra || 0), exacto: false, menorQueBarra: true }
  const porLadoKg = (total - barra) / 2
  if (porLadoKg < 0) return { porLado: [], alcanzable: barra, exacto: false, menorQueBarra: true }
  let unidades = Math.round(porLadoKg / PASO)
  const porLado: ResultadoDiscos['porLado'] = []
  for (const disco of discos) {
    const u = Math.round(disco / PASO)
    const n = Math.floor(unidades / u)
    if (n > 0) { porLado.push({ disco, cantidad: n }); unidades -= n * u }
  }
  const usado = porLado.reduce((a, d) => a + d.disco * d.cantidad, 0)
  const alcanzable = Math.round((barra + 2 * usado) * 100) / 100
  return { porLado, alcanzable, exacto: Math.abs(alcanzable - total) < 1e-9, menorQueBarra: false }
}
