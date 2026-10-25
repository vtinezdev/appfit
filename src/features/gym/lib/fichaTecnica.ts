// Ficha de técnica de un ejercicio del catálogo (ENT-09): lo que se calcula del catálogo. Los textos (claves y errores)
// viven aparte, en `fichasEjercicios`, que solo se carga al abrir una ficha.
import { unir } from './presentacionEjercicio'
import type { CatalogExercise } from './catalogoEjercicios'
import type { NivelMuscular } from './cargaMuscular'
import { MUSCULOS, ZONAS_MUSCULARES, type ZonaMuscular } from './musculos'

/** Nivel del muñeco de la ficha: los principales en alto y los secundarios en medio. */
export const NIVEL_PRINCIPAL: NivelMuscular = 5
export const NIVEL_SECUNDARIO: NivelMuscular = 3

/** Niveles de cada zona para el muñeco de la ficha; «Cuerpo completo» no pinta nada por sí solo. */
export function nivelesFicha(c: Pick<CatalogExercise, 'primaryMuscles' | 'secondaryMuscles'>): Record<ZonaMuscular, NivelMuscular> {
  const niveles = Object.fromEntries(ZONAS_MUSCULARES.map(z => [z, 0])) as Record<ZonaMuscular, NivelMuscular>
  for (const m of c.secondaryMuscles) if (m !== 'completo') niveles[m] = NIVEL_SECUNDARIO
  for (const m of c.primaryMuscles) if (m !== 'completo') niveles[m] = NIVEL_PRINCIPAL
  return niveles
}

/** «a, b y c» («e» delante de «i», como `unir`). */
const lista = (ms: string[]) => ms.length <= 1 ? (ms[0] ?? '') : `${ms.slice(0, -1).join(', ')} ${/^h?i(?!e)/i.test(ms.at(-1)!) ? 'e' : 'y'} ${ms.at(-1)}`

/** «Pecho; también tríceps y hombros». */
export function textoMusculosFicha(c: Pick<CatalogExercise, 'primaryMuscles' | 'secondaryMuscles'>): string {
  const principales = c.primaryMuscles.map(m => MUSCULOS[m])
  const secundarios = c.secondaryMuscles.filter(m => !c.primaryMuscles.includes(m)).map(m => MUSCULOS[m].toLowerCase())
  const base = principales.length === 2 ? unir(principales[0], principales[1]) : lista(principales)
  return secundarios.length ? `${base}; también ${lista(secundarios)}` : base
}
