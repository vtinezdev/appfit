import { formatNumber } from '../../../shared/lib/format'

export interface OpcionCantidad {
  /** «Tu ración», «1 rebanada», «1 unidad», «100 g». */
  label: string
  gramos: number
}

const MAXIMO = 5

/**
 * Cantidades de un toque para un alimento: tu ración habitual, tus raciones propias, el peso de una unidad (tabla del
 * intérprete) o, en una receta casera, toda, la mitad y un cuarto de su peso cocinado; y 100 g (o 100 ml). Sin
 * repetir gramos ni pasar de cinco; los gramos se redondean a la décima.
 */
export function opcionesCantidad({ habitual, porciones = [], unidad, pesoReceta, ml = false }: {
  habitual?: number; porciones?: { nombre: string; gramos: number }[]; unidad?: number; pesoReceta?: number; ml?: boolean
}): OpcionCantidad[] {
  const receta = pesoReceta && pesoReceta > 0
    ? [{ label: 'Toda la receta', gramos: pesoReceta }, { label: 'La mitad', gramos: pesoReceta / 2 }, { label: 'Un cuarto', gramos: pesoReceta / 4 }]
    : []
  const candidatas: OpcionCantidad[] = [
    ...(habitual && habitual > 0 ? [{ label: 'Tu ración', gramos: habitual }] : []),
    ...porciones.filter((p) => p.gramos > 0).map((p) => ({ label: `1 ${p.nombre}`, gramos: p.gramos })),
    ...receta,
    ...(!receta.length && unidad && unidad > 0 ? [{ label: '1 unidad', gramos: unidad }] : []),
    { label: `100 ${ml ? 'ml' : 'g'}`, gramos: 100 },
  ].map((o) => ({ ...o, gramos: Math.round(o.gramos * 10) / 10 }))
  const vistos = new Set<number>()
  return candidatas.filter((o) => (vistos.has(o.gramos) ? false : (vistos.add(o.gramos), true))).slice(0, MAXIMO)
}

/** «Tu ración · 150 g»; la de 100 g se queda en «100 g». */
export function textoOpcion(o: OpcionCantidad, ml = false): string {
  const u = ml ? 'ml' : 'g'
  return o.label === `100 ${u}` ? o.label : `${o.label} · ${formatNumber(o.gramos, 1)} ${u}`
}
