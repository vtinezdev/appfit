import type { Por100 } from './alimentos'

/** Cómo se ordenan los resultados de Buscar. */
export type OrdenBusqueda = 'relevancia' | 'mas-proteina' | 'menos-proteina' | 'menos-kcal' | 'mas-kcal' | 'menos-hidratos' | 'menos-grasa'

export const ORDENES_BUSQUEDA: { valor: OrdenBusqueda; label: string }[] = [
  { valor: 'relevancia', label: 'Relevancia' },
  { valor: 'mas-proteina', label: 'Más proteína' },
  { valor: 'menos-proteina', label: 'Menos proteína' },
  { valor: 'menos-kcal', label: 'Menos kcal' },
  { valor: 'mas-kcal', label: 'Más kcal' },
  { valor: 'menos-hidratos', label: 'Menos hidratos' },
  { valor: 'menos-grasa', label: 'Menos grasa' },
]

const CLAVE: Record<Exclude<OrdenBusqueda, 'relevancia'>, [keyof Por100, 1 | -1]> = {
  'mas-proteina': ['prot100', -1], 'menos-proteina': ['prot100', 1], 'menos-kcal': ['kcal100', 1], 'mas-kcal': ['kcal100', -1],
  'menos-hidratos': ['carb100', 1], 'menos-grasa': ['grasa100', 1],
}

/**
 * Ordena los resultados por 100 g. «Relevancia» los deja como llegan (el orden del buscador); el resto es estable: a
 * igualdad, se conserva el orden del buscador.
 */
export function ordenarElegibles<T extends Por100>(lista: readonly T[], orden: OrdenBusqueda): T[] {
  if (orden === 'relevancia') return [...lista]
  const [campo, signo] = CLAVE[orden]
  return lista.map((a, i) => ({ a, i })).sort((x, y) => signo * ((x.a[campo] as number) - (y.a[campo] as number)) || x.i - y.i).map((x) => x.a)
}

/** «Yogur al estilo griego, natural» → lo principal y el detalle, para escribir el nombre en dos líneas. */
export function partesNombre(nombre: string): [string, string] {
  const i = nombre.indexOf(',')
  return i < 0 ? [nombre.trim(), ''] : [nombre.slice(0, i).trim(), nombre.slice(i + 1).trim()]
}
