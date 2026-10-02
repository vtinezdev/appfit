// Básicos para consultas completas y genéricas. Compartidos por buscador e intérprete; los pesos viven en raciones.ts.
import type { CatalogFood } from '../../../../shared/db/types'
import { mismaRaiz, tokensConsulta } from '../../../../shared/lib/text'

/** Selección curada por id: no cambia nombres, nutrientes ni referencias de alimentos existentes. */
export const PREFERIDOS: Readonly<Record<string, string>> = {
  huevo: 'ciqual:22000',
  'clara de huevo': 'ciqual:22001',
  plátano: 'ciqual:13005',
  manzana: 'ciqual:13039',
  pera: 'ciqual:13037',
  mandarina: 'ciqual:13024',
  melocotón: 'ciqual:13043',
  fresa: 'ciqual:13014',
  nuez: 'ciqual:15005',
  tomate: 'ciqual:20276',
  cebolla: 'ciqual:20034',
  zanahoria: 'ciqual:20009',
  pimiento: 'ciqual:20041',
  pepino: 'ciqual:20019',
  limón: 'ciqual:13009',
  yogur: 'ciqual:19593',
  pan: 'ciqual:7001',
  tostada: 'ciqual:7004',
  croissant: 'ciqual:7603',
  magdalena: 'ciqual:24632',
  'tortita de arroz': 'ciqual:7352',
  'tortilla de patata': 'ciqual:22510',
  leche: 'ciqual:19033',
  café: 'ciqual:18004',
  'café con leche': 'ciqual:18151',
  cerveza: 'ciqual:5001',
  aceite: 'ciqual:17270',
  atún: 'ciqual:26039',
  'jamón york': 'ciqual:28900',
  pollo: 'ciqual:36017',
  pechuga: 'ciqual:36017',
  'pechuga de pollo': 'ciqual:36017',
  arroz: 'ciqual:9100',
  pasta: 'ciqual:9810',
  macarrones: 'ciqual:9810',
  espaguetis: 'ciqual:9810',
}

const ENTRADAS = Object.entries(PREFERIDOS).map(([nombre, id]) => ({ tokens: tokensConsulta(nombre), id }))

// «Tostada» ya era el pan tostado del intérprete, pero el paquete no incluye ese alias en su índice.
// Se comprueba la equivalencia explícita sin ampliar el stemming ni modificar el catálogo.
const EQUIVALENCIAS: Readonly<Record<string, string>> = { 'ciqual:7004': 'pan tostado' }

/** Sin prefijos ni palabras adicionales: «pollo» tiene preferido; «pollo con piel» o «pollo asado», no. */
export function preferidoDe(consulta: string): string | undefined {
  const tokens = tokensConsulta(consulta)
  return ENTRADAS.find((e) => e.tokens.length === tokens.length && e.tokens.every((t, i) => mismaRaiz(t, tokens[i])))?.id
}

/** Un id curado solo vale si sigue visible y sus tokens (incluidos los alias) encajan con toda la consulta. */
export function preferidoCompatible(food: CatalogFood, consulta: string): boolean {
  if (food.id !== preferidoDe(consulta) || food.tipo !== 'generico' || food.tok.length === 0) return false
  const tokens = tokensConsulta(EQUIVALENCIAS[food.id] ?? consulta)
  return tokens.every((t) => food.tok.some((w) => w.startsWith(t)))
}
