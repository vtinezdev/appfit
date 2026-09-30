// Intérprete local, paso 2: cuántos gramos son «2 huevos» o «una lata de atún», y qué alimento del catálogo se
// entiende por defecto con una palabra suelta («huevo» → huevo entero, no en polvo). Tabla curada a mano.
import { mismaRaiz, tokensConsulta } from '../../../../shared/lib/text'
import type { ParteComida } from './parsear'
import { GRAMOS_POR_UNIDAD, UNIDADES_EXACTAS, type Unidad } from './unidades'

export interface Racion {
  /** Peso de una unidad («un plátano»). Sin él, un alimento sin unidad se estima en 100 g. */
  gramos?: number
  /** Medidas caseras que cambian con el alimento («una lata de atún» no pesa lo que una de cerveza). */
  medidas?: Partial<Record<Unidad, number>>
  /**
   * Alimento del catálogo que se elige cuando la consulta es exactamente este nombre. Solo para palabras
   * cuya primera opción del ranking no es la habitual («huevo» → en polvo, «pasta» → de almendra).
   */
  preferido?: string
}

/** Pesos por unidad típicos (parte comestible) y alimentos preferidos de CIQUAL. La clave se escribe normal. */
const TABLA: Record<string, Racion> = {
  huevo: { gramos: 60, preferido: 'ciqual:22000' },
  'clara de huevo': { gramos: 35, preferido: 'ciqual:22001' },
  platano: { gramos: 120, preferido: 'ciqual:13005' },
  manzana: { gramos: 180, preferido: 'ciqual:13039' },
  pera: { gramos: 170, preferido: 'ciqual:13037' },
  naranja: { gramos: 200 },
  mandarina: { gramos: 70, preferido: 'ciqual:13024' },
  kiwi: { gramos: 75 },
  melocoton: { gramos: 150, preferido: 'ciqual:13043' },
  fresa: { gramos: 12, preferido: 'ciqual:13014' },
  uva: { gramos: 5 },
  nuez: { gramos: 5, preferido: 'ciqual:15005' },
  almendra: { gramos: 1.2 },
  aguacate: { gramos: 150 },
  tomate: { gramos: 120, preferido: 'ciqual:20276' },
  patata: { gramos: 170 },
  cebolla: { gramos: 110, preferido: 'ciqual:20034' },
  zanahoria: { gramos: 70, preferido: 'ciqual:20009' },
  pimiento: { gramos: 150, preferido: 'ciqual:20041' },
  pepino: { gramos: 250, preferido: 'ciqual:20019' },
  limon: { gramos: 100, preferido: 'ciqual:13009' },
  yogur: { gramos: 125, preferido: 'ciqual:19593' },
  'yogur griego': { gramos: 125 },
  pan: { preferido: 'ciqual:7001' },
  tostada: { gramos: 30, preferido: 'ciqual:7004' },
  galleta: { gramos: 8 },
  croissant: { gramos: 60, preferido: 'ciqual:7603' },
  magdalena: { gramos: 30, preferido: 'ciqual:24632' },
  'tortita de arroz': { gramos: 8, preferido: 'ciqual:7352' },
  'tortilla de patata': { gramos: 150, preferido: 'ciqual:22510' },
  leche: { gramos: 200, preferido: 'ciqual:19033' },
  cafe: { gramos: 100, preferido: 'ciqual:18004' },
  'cafe con leche': { gramos: 200, preferido: 'ciqual:18151' },
  cerveza: { gramos: 330, medidas: { lata: 330 }, preferido: 'ciqual:5001' },
  'coca cola': { gramos: 330, medidas: { lata: 330 } },
  aceite: { preferido: 'ciqual:17270' },
  atun: { gramos: 60, medidas: { lata: 60 }, preferido: 'ciqual:26039' },
  jamon: { medidas: { loncha: 15 } },
  'jamon york': { medidas: { loncha: 15 }, preferido: 'ciqual:28900' },
  queso: { medidas: { loncha: 20 } },
  'pechuga de pollo': { gramos: 150, preferido: 'ciqual:36017' },
  pechuga: { gramos: 150 },
  salchicha: { gramos: 50 },
  arroz: { preferido: 'ciqual:9100' },
  pasta: { preferido: 'ciqual:9810' },
  macarrones: { preferido: 'ciqual:9810' },
  espaguetis: { preferido: 'ciqual:9810' },
}

const ENTRADAS = Object.entries(TABLA).map(([nombre, racion]) => ({ tokens: tokensConsulta(nombre), racion }))

function mismasPalabras(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((t, i) => mismaRaiz(t, b[i]))
}

/** Los alimentos preferidos de la tabla (para comprobar en los tests que siguen existiendo en el catálogo). */
export function idsPreferidos(): string[] {
  return ENTRADAS.flatMap((e) => (e.racion.preferido ? [e.racion.preferido] : []))
}

/**
 * La ración de una consulta (en la forma de `ParteComida.consulta`). Si la consulta entera no está en la tabla,
 * vale la de su primera palabra para el peso («huevo duro» pesa como un huevo), pero sin `preferido`: «huevo
 * duro» ya se busca tal cual.
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
