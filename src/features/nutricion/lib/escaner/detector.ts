// Carga perezosa del lector de códigos y filtrado de lo que detecta.
import { normalizarGtin } from '../../../../shared/db/foodRef'

/** Formatos de los productos de supermercado (EAN/UPC). Limitarlos acelera la detección y evita falsos positivos. */
export const FORMATOS_PRODUCTO = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const

export interface Detector {
  detect(fuente: HTMLVideoElement): Promise<{ rawValue: string; format: string }[]>
}

/** Crea el lector (descarga su código y el `.wasm` la primera vez). */
export async function crearDetector(): Promise<Detector> {
  const { BarcodeDetector } = await import('./zxing')
  return new BarcodeDetector({ formats: [...FORMATOS_PRODUCTO] })
}

/** El primer código válido de producto entre los detectados, ya normalizado a GTIN-13; si no hay, `undefined`. */
export function primerCodigoValido(detectados: { rawValue: string; format: string }[]): string | undefined {
  for (const d of detectados) {
    if (!(FORMATOS_PRODUCTO as readonly string[]).includes(d.format)) continue
    const gtin = normalizarGtin(d.rawValue)
    if (gtin) return gtin
  }
  return undefined
}
