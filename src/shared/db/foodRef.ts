// Referencia a un alimento desde una entrada o un ítem de plantilla.
// Invariante: como mucho una de `foodId` (alimento del usuario) y `catalogId` (catálogo).
// Sin ninguna de las dos solo es válido si es una «rápida» (o un alimento del usuario ya borrado, que
// deja `foodId` colgando: las referencias son blandas y el snapshot sigue siendo legible).
import type { CatalogFood } from './types'

export type FoodRef = { tipo: 'user'; id: number } | { tipo: 'catalog'; id: string }

interface ConReferencia {
  foodId?: number
  catalogId?: string
}

/** Lee la referencia de una entrada/ítem. `undefined` si no tiene (rápida). Lanza si incumple el invariante. */
export function refDe(x: ConReferencia): FoodRef | undefined {
  if (x.foodId !== undefined && x.catalogId !== undefined) {
    throw new Error('Una entrada no puede referenciar a la vez un alimento del usuario y uno del catálogo.')
  }
  if (x.foodId !== undefined) return { tipo: 'user', id: x.foodId }
  if (x.catalogId !== undefined) return { tipo: 'catalog', id: x.catalogId }
  return undefined
}

/** Los campos a guardar para una referencia (el otro queda sin definir). */
export function camposDeRef(ref: FoodRef | undefined): ConReferencia {
  if (!ref) return {}
  return ref.tipo === 'user' ? { foodId: ref.id } : { catalogId: ref.id }
}

/** Id estable de catálogo: `fuente:idExterno`. */
export function catalogId(fuente: CatalogFood['fuente'], idExterno: string | number): string {
  return `${fuente}:${idExterno}`
}

/** Normaliza un código de barras a GTIN-13: solo dígitos; EAN-8/UPC-A se rellenan con ceros y un GTIN-14 que empieza por 0 los pierde. */
export function normalizarGtin(raw: string): string | undefined {
  const d = raw.replace(/\D/g, '')
  if (d.length < 8 || d.length > 14) return undefined
  if (d.length === 14) return d.startsWith('0') ? d.slice(1) : d
  return d.padStart(13, '0')
}

/** Clave de texto única para una referencia (`user:3`, `catalog:ciqual:1000`), para usarla en Map/Set o como `key`. */
export function claveRef(ref: FoodRef): string {
  return `${ref.tipo}:${ref.id}`
}
