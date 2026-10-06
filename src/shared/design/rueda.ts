/** Seis destinos en dos filas de tres: dianas circulares de 84 px que caben incluso en 320 px. */
export const OPCIONES_POR_RUEDA = 6

/** Diámetro de cada diana (px); espejo de `--menu-node-size` (5,25 rem) para el test de geometría. */
export const DIAMETRO_DIANA = 84
/** Órbita horizontal y elevación (px) a 320 px de ancho; espejo de `--menu-orbit` y `--menu-rise`. */
export const ORBITA_320 = 104
export const ELEVACION = 160

export function paginasRueda<T>(opciones: readonly T[]): T[][] {
  const paginas: T[][] = []
  for (let i = 0; i < opciones.length; i += OPCIONES_POR_RUEDA) paginas.push(opciones.slice(i, i + OPCIONES_POR_RUEDA))
  return paginas
}

/**
 * Puntos del abanico en unidades de órbita (x) y de elevación (y, negativo = hacia arriba), en orden de lectura:
 * primero la fila de arriba. Con seis destinos, 3+3; con menos, filas de 3, 2 o 1 sin cambiar el tamaño de las dianas.
 */
export function posicionesRueda(cantidad: number): { x: number; y: number }[] {
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > OPCIONES_POR_RUEDA) return []
  const FILA_BAJA = -.8
  const FILA_ALTA = -1.4
  const fila = (n: number, y: number) => ({ 1: [0], 2: [-.55, .55], 3: [-1, 0, 1] } as Record<number, number[]>)[n].map((x) => ({ x, y }))
  if (cantidad <= 3) return fila(cantidad, -.9)
  const abajo = cantidad === 4 ? 2 : cantidad - 3 // 4 → 2+2, 5 → 3+2, 6 → 3+3
  const arriba = cantidad - abajo
  return [...fila(arriba, FILA_ALTA), ...fila(abajo, FILA_BAJA)]
}
