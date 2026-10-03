/** Cuatro destinos por rueda mantienen controles amplios incluso en 320 px. */
export const OPCIONES_POR_RUEDA = 4

export function paginasRueda<T>(opciones: readonly T[]): T[][] {
  const paginas: T[][] = []
  for (let i = 0; i < opciones.length; i += OPCIONES_POR_RUEDA) paginas.push(opciones.slice(i, i + OPCIONES_POR_RUEDA))
  return paginas
}

/** Abanico ascendente: dos niveles evitan colisiones sin reducir los controles. */
export function posicionesRueda(cantidad: number): { x: number; y: number }[] {
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > OPCIONES_POR_RUEDA) return []
  const posiciones = [
    [{ x: 0, y: -.9 }],
    [{ x: -.55, y: -.85 }, { x: .55, y: -.85 }],
    [{ x: -1, y: -.55 }, { x: 0, y: -1.05 }, { x: 1, y: -.55 }],
    [{ x: -1, y: -.55 }, { x: -.48, y: -1.05 }, { x: .48, y: -1.05 }, { x: 1, y: -.55 }],
  ]
  return posiciones[cantidad - 1]
}
