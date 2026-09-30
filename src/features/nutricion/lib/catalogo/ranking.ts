// Ordena por relevancia los candidatos que devuelve `catalogRepo.buscar` (que los da en el orden del índice,
// no por relevancia). Función pura: quien muestra resultados pide candidatos de sobra, los ordena y recorta.
import type { CatalogFood } from '../../../../shared/db/types'
import { tokensConsulta } from '../../../../shared/lib/text'

/** En caso de empate, qué fuente va antes (menor = antes). Las que no están aquí van detrás. */
export const PRIORIDAD_FUENTE: Record<string, number> = { ciqual: 0, usda: 1, offes: 2, off: 3 }

/** Posición que se asigna a un token que solo coincide por un alias (no aparece en el nombre). */
const SOLO_ALIAS = 99

interface Puntuacion {
  /**
   * 0 genérico (o un producto de marca que el usuario ya usa), 1 producto de marca: «yogur natural» es antes el
   * yogur de CIQUAL que el de una marca, aunque una marca se llame exactamente así. Va el primero porque los
   * genéricos son la base fiable del catálogo; escribir la marca («yogur natural hacendado») deja solo productos.
   */
  marca: number
  /** 0 si el nombre (sin palabras vacías) o algún alias es exactamente la consulta. */
  exacto: number
  /** 0 si el nombre empieza por la consulta como palabras completas («pan …»), 1 si solo como prefijo («panceta»), 2 si no. */
  empieza: number
  /** 0 si es un alimento que el usuario ya ha usado (`frecuentes`): lo que uno come se repite. */
  frecuente: number
  /**
   * 0 si el primer tramo del nombre (hasta la primera coma) es justo la consulta: «Pollo, carne cruda» es el
   * alimento; «Pollo a la vasca, envasado» es un plato.
   */
  tramo: number
  /** Tokens de la consulta que coinciden con una palabra entera del nombre (más = mejor). */
  exactas: number
  /** 1 si el alimento es «secundario» (Martinica/Reunión, infantiles): va detrás de los demás. */
  secundario: number
  /** Suma de las posiciones en el nombre de la primera palabra que casa con cada token (menor = más al principio). */
  posiciones: number
  /** Palabras del nombre: a igualdad, el nombre más corto suele ser el alimento básico («Arroz blanco, cocido»). */
  palabras: number
  completitud: number
  fuente: number
}

function puntuar(f: CatalogFood, tokens: string[], consulta: string, frecuentes?: ReadonlySet<string>): Puntuacion {
  const palabras = tokensConsulta(f.nombre)
  const nombre = palabras.join(' ')
  const posiciones = tokens.reduce((suma, t) => {
    const i = palabras.findIndex((w) => w.startsWith(t))
    return suma + (i === -1 ? SOLO_ALIAS : i)
  }, 0)
  const esAlias = f.alias?.some((a) => tokensConsulta(a).join(' ') === consulta) ?? false
  return {
    marca: f.tipo === 'marca' && !frecuentes?.has(f.id) ? 1 : 0,
    exacto: nombre === consulta || esAlias ? 0 : 1,
    empieza: nombre === consulta || nombre.startsWith(`${consulta} `) ? 0 : nombre.startsWith(consulta) ? 1 : 2,
    frecuente: frecuentes?.has(f.id) ? 0 : 1,
    tramo: tokensConsulta(f.nombre.split(',')[0]).join(' ') === consulta ? 0 : 1,
    exactas: tokens.filter((t) => palabras.includes(t)).length,
    secundario: f.secundario ? 1 : 0,
    posiciones,
    palabras: palabras.length,
    completitud: f.completitud ?? 0,
    fuente: PRIORIDAD_FUENTE[f.fuente] ?? Object.keys(PRIORIDAD_FUENTE).length,
  }
}

function comparar(a: Puntuacion, b: Puntuacion): number {
  return (
    a.marca - b.marca ||
    a.exacto - b.exacto ||
    a.empieza - b.empieza ||
    a.frecuente - b.frecuente ||
    a.tramo - b.tramo ||
    b.exactas - a.exactas ||
    a.secundario - b.secundario ||
    a.posiciones - b.posiciones ||
    a.palabras - b.palabras ||
    b.completitud - a.completitud ||
    a.fuente - b.fuente
  )
}

/**
 * Ordena alimentos del catálogo por relevancia para la consulta `q`: genérico (o marca que ya usas) antes que marca >
 * nombre o alias exacto > empieza por la consulta > ya lo has usado (`frecuentes`) > su primer tramo es la
 * consulta > más palabras enteras coincidentes > no secundario > coincidencias más al principio del nombre >
 * nombre más corto > más completo > fuente preferida > alfabético. No filtra: los candidatos ya vienen
 * filtrados por `catalogRepo.buscar`. `frecuentes` son ids de catálogo (`catalogId`).
 */
export function rankCatalogo(foods: CatalogFood[], q: string, frecuentes?: ReadonlySet<string>): CatalogFood[] {
  const tokens = tokensConsulta(q)
  if (tokens.length === 0) return []
  const consulta = tokens.join(' ')
  return foods
    .map((f) => ({ f, p: puntuar(f, tokens, consulta, frecuentes) }))
    .sort((a, b) => comparar(a.p, b.p) || a.f.nombre.localeCompare(b.f.nombre, 'es'))
    .map(({ f }) => f)
}
