// Intérprete local, paso 2: cuántos gramos son «2 huevos» o «una lata de atún». Tabla de pesos curada a mano.
// Los alimentos preferidos se comparten con el buscador en ../catalogo/preferidos.ts.
import { mismaRaiz, tokensConsulta } from '../../../../shared/lib/text'
import type { ParteComida } from './parsear'
import { GRAMOS_POR_UNIDAD, UNIDADES_EXACTAS, type Unidad } from './unidades'

export interface Racion {
  /** Peso de una unidad («un plátano»). Sin él, un alimento sin unidad se estima en 100 g. */
  gramos?: number
  /** Medidas caseras que cambian con el alimento («una lata de atún» no pesa lo que una de cerveza). */
  medidas?: Partial<Record<Unidad, number>>
}

/** Pesos por unidad típicos (parte comestible) y medidas caseras. La clave se escribe normal. */
const TABLA: Record<string, Racion> = {
  huevo: { gramos: 60 },
  'clara de huevo': { gramos: 35 },
  platano: { gramos: 120 },
  manzana: { gramos: 180 },
  pera: { gramos: 170 },
  naranja: { gramos: 200 },
  mandarina: { gramos: 70 },
  kiwi: { gramos: 75 },
  melocoton: { gramos: 150 },
  fresa: { gramos: 12 },
  uva: { gramos: 5 },
  nuez: { gramos: 5 },
  almendra: { gramos: 1.2 },
  aguacate: { gramos: 150 },
  tomate: { gramos: 120 },
  patata: { gramos: 170 },
  cebolla: { gramos: 110 },
  zanahoria: { gramos: 70 },
  pimiento: { gramos: 150 },
  pepino: { gramos: 250 },
  limon: { gramos: 100 },
  yogur: { gramos: 125 },
  'yogur griego': { gramos: 125 },
  tostada: { gramos: 30 },
  galleta: { gramos: 8 },
  croissant: { gramos: 60 },
  magdalena: { gramos: 30 },
  'tortita de arroz': { gramos: 8 },
  'tortilla de patata': { gramos: 150 },
  leche: { gramos: 200 },
  cafe: { gramos: 100 },
  'cafe con leche': { gramos: 200 },
  cerveza: { gramos: 330, medidas: { lata: 330 } },
  'coca cola': { gramos: 330, medidas: { lata: 330 } },
  atún: { gramos: 60, medidas: { lata: 60 } },
  jamón: { medidas: { loncha: 15 } },
  'jamón york': { medidas: { loncha: 15 } },
  queso: { medidas: { loncha: 20 } },
  'pechuga de pollo': { gramos: 150 },
  pechuga: { gramos: 150 },
  salchicha: { gramos: 50 },
}

const ENTRADAS = Object.entries(TABLA).map(([nombre, racion]) => ({ tokens: tokensConsulta(nombre), racion }))

function mismasPalabras(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((t, i) => mismaRaiz(t, b[i]))
}

/** Las medidas que la tabla concreta por alimento («lata» de atún: 60 g), para la pantalla de medidas. */
export function medidasPorAlimento(): { alimento: string; unidad: Unidad; gramos: number }[] {
  return Object.entries(TABLA).flatMap(([alimento, racion]) =>
    Object.entries(racion.medidas ?? {}).map(([unidad, gramos]) => ({ alimento, unidad: unidad as Unidad, gramos: gramos as number })),
  )
}

/**
 * La ración de una consulta (en la forma de `ParteComida.consulta`). Si la consulta entera no está en la tabla,
 * vale la de su primera palabra para el peso («huevo duro» pesa como un huevo). No elige alimentos del catálogo.
 */
export function racionDe(consulta: string): Racion | undefined {
  const tokens = consulta.split(' ').filter(Boolean)
  if (tokens.length === 0) return undefined
  const exacta = ENTRADAS.find((e) => mismasPalabras(e.tokens, tokens))
  if (exacta) return exacta.racion
  if (tokens.length === 1) return undefined
  const primera = ENTRADAS.find((e) => mismasPalabras(e.tokens, tokens.slice(0, 1)))
  if (!primera) return undefined
  const { gramos, medidas } = primera.racion
  return { gramos, medidas }
}

/** Gramos que se usan cuando no se sabe cuánto pesa (y se avisa de que es una estimación). */
export const GRAMOS_SIN_DATO = 100

/**
 * Gramos de una parte: con peso o volumen, lo que diga; con medida casera, la del alimento o la típica; con
 * unidades sueltas («2 huevos»), el peso por unidad. Si no hay dato, 100 g por unidad y `estimados: true`.
 */
export function gramosDeParte(parte: Pick<ParteComida, 'cantidad' | 'unidad'>, racion: Racion | undefined): { gramos: number; estimados: boolean } {
  const cantidad = parte.cantidad ?? 1
  const { unidad } = parte
  let gramos: number
  let estimados = false
  if (unidad !== undefined) {
    gramos = cantidad * (UNIDADES_EXACTAS.has(unidad) ? GRAMOS_POR_UNIDAD[unidad] : (racion?.medidas?.[unidad] ?? GRAMOS_POR_UNIDAD[unidad]))
  } else if (racion?.gramos !== undefined) {
    gramos = cantidad * racion.gramos
  } else {
    gramos = cantidad * GRAMOS_SIN_DATO
    estimados = true
  }
  return { gramos: Math.max(1, Math.round(gramos)), estimados }
}
