/** Cuatro destinos por rueda mantienen controles amplios incluso en 320 px. */
export const OPCIONES_POR_RUEDA = 4

export function paginasRueda<T>(opciones: readonly T[]): T[][] {
  const paginas: T[][] = []
  for (let i = 0; i < opciones.length; i += OPCIONES_POR_RUEDA) paginas.push(opciones.slice(i, i + OPCIONES_POR_RUEDA))
  return paginas
}

/** Coordenadas unitarias, de arriba en sentido horario. El tamaño/radio vive en tokens.css. */
export function posicionesRueda(cantidad: number): { x: number; y: number }[] {
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > OPCIONES_POR_RUEDA) return []
  return Array.from({ length: cantidad }, (_, i) => {
    const angulo = (2 * Math.PI * i) / cantidad - Math.PI / 2
    return { x: Math.round(Math.cos(angulo) * 1000) / 1000, y: Math.round(Math.sin(angulo) * 1000) / 1000 }
  })
}
