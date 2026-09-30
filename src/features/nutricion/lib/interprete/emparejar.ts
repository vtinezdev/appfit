// Intérprete local, paso 3: elige el alimento de una parte entre tus alimentos y el catálogo, y deja alternativas.
import type { CatalogFood, Food } from '../../../../shared/db/types'
import { mismaRaiz, tokensConsulta } from '../../../../shared/lib/text'
import { elegibleDeCatalogo, elegibleDeFood, type AlimentoElegible } from '../alimentos'

export const MAX_ALTERNATIVAS = 5

/**
 * Formas procesadas que casi nunca son lo que se quiere decir con la palabra suelta («huevo» ≠ huevo en polvo,
 * «manzana» ≠ manzana deshidratada). Van detrás salvo que la consulta las nombre. Se comparan con `nombreNorm`.
 */
const PROCESADOS = ['polvo', 'deshidratad', 'concentrad', 'confitad', 'liofilizad', 'lactante', 'infantil', 'almibar']

/**
 * Coincidencia fuerte con uno de tus alimentos: cada palabra de la consulta está en su nombre y el nombre empieza
 * por una de ellas («Arroz blanco cocido» para «arroz»; no «Tortilla de patatas» para «patata»).
 */
export function coincidenciaFuerte(nombre: string, consulta: string): boolean {
  const palabras = tokensConsulta(nombre)
  const tokens = consulta.split(' ').filter(Boolean)
  if (tokens.length === 0 || palabras.length === 0) return false
  return tokens.every((t) => palabras.some((p) => mismaRaiz(t, p))) && tokens.some((t) => mismaRaiz(t, palabras[0]))
}

function esProcesado(f: CatalogFood, tokens: string[]): boolean {
  return PROCESADOS.some((p) => f.nombreNorm.includes(p) && !tokens.some((t) => p.startsWith(t) || t.startsWith(p)))
}

export interface EmparejarInput {
  /** `ParteComida.consulta`. */
  consulta: string
  /** Tus alimentos que casan con la consulta (`filtrarAlimentos`). */
  propios: Food[]
  /** Candidatos del catálogo ya ordenados (`rankCatalogo`). */
  catalogo: CatalogFood[]
  /** Id del catálogo que se prefiere para esta consulta (`Racion.preferido`), si está entre los candidatos. */
  preferido?: string
}

export interface Emparejamiento {
  mejor?: AlimentoElegible
  alternativas: AlimentoElegible[]
}

/**
 * El mejor alimento para la consulta y hasta `MAX_ALTERNATIVAS` más:
 * 1. Uno tuyo con coincidencia fuerte (lo registras tú: gana).
 * 2. Si no, el del catálogo: el preferido de la tabla de raciones o el primero del ranking, dejando detrás las
 *    formas procesadas que la consulta no nombra.
 * 3. Si el catálogo no tiene nada, uno tuyo aunque la coincidencia sea débil.
 * Alternativas: dos tuyos como mucho primero, luego el catálogo y después el resto de los tuyos.
 */
export function emparejar({ consulta, propios, catalogo, preferido }: EmparejarInput): Emparejamiento {
  const tokens = consulta.split(' ').filter(Boolean)
  const fuertes = propios.filter((f) => coincidenciaFuerte(f.nombre, consulta))
  const debiles = propios.filter((f) => !fuertes.includes(f))
  const tuyos = [...fuertes, ...debiles].map(elegibleDeFood)

  const pref = catalogo.find((f) => f.id === preferido)
  const resto = catalogo.filter((f) => f !== pref)
  const ordenado = [...(pref ? [pref] : []), ...resto.filter((f) => !esProcesado(f, tokens)), ...resto.filter((f) => esProcesado(f, tokens))]
  const delCatalogo = ordenado.map(elegibleDeCatalogo)

  const mejor = fuertes.length > 0 ? tuyos[0] : (delCatalogo[0] ?? tuyos[0])
  const alternativas = [...tuyos.slice(0, 2), ...delCatalogo, ...tuyos.slice(2)].filter((a) => a !== mejor).slice(0, MAX_ALTERNATIVAS)
  return { mejor, alternativas }
}
