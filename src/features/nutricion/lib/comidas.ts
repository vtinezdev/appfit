import type { Comida } from '../../../shared/db/types'

/** Un orden común para el diario, los selectores y el movimiento entre comidas. */
export const COMIDAS: { valor: Comida; label: string }[] = [
  { valor: 'desayuno', label: 'Desayuno' },
  { valor: 'comida', label: 'Comida' },
  { valor: 'cena', label: 'Cena' },
  { valor: 'snack', label: 'Snack' },
]

export function esComida(value: unknown): value is Comida {
  return COMIDAS.some(c => c.valor === value)
}

export function nombreComida(comida: Comida): string {
  return COMIDAS.find(c => c.valor === comida)!.label
}
