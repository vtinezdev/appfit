/**
 * Rejilla de secciones (ADR 060): cuántas columnas lleva. Dos filas como mucho mientras quepan,
 * con la de arriba igual o más larga; la que queda corta se centra (en CSS). Cuatro columnas caben a 320 px.
 */
export const COLUMNAS_MAXIMAS = 4

export function columnasRejilla(cantidad: number): number {
  if (!Number.isInteger(cantidad) || cantidad < 1) return 1
  if (cantidad <= COLUMNAS_MAXIMAS) return cantidad
  return Math.min(Math.ceil(cantidad / 2), COLUMNAS_MAXIMAS)
}
