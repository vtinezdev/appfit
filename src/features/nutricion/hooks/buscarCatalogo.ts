// Búsqueda en el catálogo con corrección de erratas, compartida por el buscador (`useBusquedaCatalogo`) y el
// intérprete (`useInterpretarLocal`). No es un hook: es una función asíncrona sin estado.
import type { CatalogFood } from '../../../shared/db/types'
import { tokensConsulta } from '../../../shared/lib/text'
import * as catalogRepo from '../data/catalogRepo'
import { conTildes, corregirTokens } from '../lib/catalogo/erratas'
import { rankCatalogo } from '../lib/catalogo/ranking'
import { preferidoCompatible, preferidoDe } from '../lib/catalogo/preferidos'

/**
 * Candidatos que se piden al índice antes de ordenar. `catalogRepo.buscar` los da en el orden del índice, así que
 * hay que pedir de sobra para no perder los buenos: con CIQUAL, el prefijo más común de una búsqueda normal
 * («queso») tiene unas 250 filas y con los productos de marca (`offes`) unas 400 más. Con 600 el ranking tarda
 * unos milisegundos (medido en el README de `scripts/catalogo/`).
 */
export const CANDIDATOS = 600

export interface ResultadoCatalogo {
  /** Candidatos ya ordenados por relevancia (sin recortar). */
  foods: CatalogFood[]
  /** Consulta efectivamente usada (la corregida si hubo errata). */
  consulta: string
  /** Solo si la consulta original no daba nada y se corrigió: el texto corregido, con tildes, para mostrarlo. */
  corregida?: string
}

/** Recupera por id el básico si quedó fuera del límite del índice, sin añadirlo dos veces ni rescatar ocultos. */
async function candidatosConPreferido(consulta: string): Promise<CatalogFood[]> {
  const foods = await catalogRepo.buscar(consulta, CANDIDATOS)
  const id = preferidoDe(consulta)
  if (id && !foods.some((f) => f.id === id)) {
    const preferido = await catalogRepo.obtener(id)
    if (preferido && preferidoCompatible(preferido, consulta)) foods.push(preferido)
  }
  return foods
}

/**
 * Busca `consulta` en el catálogo y ordena los candidatos. Si no hay ninguno, corrige las erratas contra el
 * vocabulario del índice y reintenta una vez; solo entonces devuelve `corregida`.
 */
export async function buscarCatalogo(consulta: string, frecuentes?: ReadonlySet<string>): Promise<ResultadoCatalogo> {
  let foods = await candidatosConPreferido(consulta)
  if (foods.length > 0) return { foods: rankCatalogo(foods, consulta, frecuentes), consulta }

  const { palabras, frecuencias } = await catalogRepo.vocabulario()
  const { tokens, corregido } = corregirTokens(tokensConsulta(consulta), palabras, frecuencias)
  if (!corregido) return { foods: [], consulta }
  const nueva = tokens.join(' ')
  foods = await candidatosConPreferido(nueva)
  if (foods.length === 0) return { foods: [], consulta }
  const ordenados = rankCatalogo(foods, nueva, frecuentes)
  return { foods: ordenados, consulta: nueva, corregida: conTildes(tokens, ordenados.slice(0, 10).map((f) => f.nombre)) }
}
