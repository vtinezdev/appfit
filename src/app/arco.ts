/**
 * Geometría de la media luna de secciones (ADR 043). Espejo de los tokens `--arco-*` de tokens.css para el test:
 * a 320 px la órbita horizontal es la mínima y aun así ninguna sección pisa a su vecina.
 */
export const ARCO = {
  /** Órbita horizontal mínima (px), la de 320 px de ancho: `--arco-rx`. */
  rxMinimo: 124,
  /** Elevación (px): `--arco-ry`. */
  ry: 210,
  /** Caja de cada sección (px): `--arco-nodo` de ancho, con el círculo de 48 px (`--arco-circulo`) y el nombre debajo. */
  ancho: 56,
  /** Del centro del círculo hacia arriba y hacia abajo, con el nombre. */
  arriba: 24,
  abajo: 41,
} as const

/** Ángulos extremos (grados): los extremos quedan a los lados del botón, algo por encima, como en el boceto. */
const DESDE = 174
const HASTA = 6

/**
 * Puntos de la media luna en unidades de órbita, de izquierda a derecha (orden de lectura y de teclado):
 * x de −1 a 1 y y negativa hacia arriba. Con un solo destino, arriba del todo.
 */
export function posicionesArco(cantidad: number): { x: number; y: number }[] {
  if (!Number.isInteger(cantidad) || cantidad < 1) return []
  if (cantidad === 1) return [{ x: 0, y: -1 }]
  const paso = (DESDE - HASTA) / (cantidad - 1)
  return Array.from({ length: cantidad }, (_, i) => {
    const angulo = ((DESDE - paso * i) * Math.PI) / 180
    return { x: redondear(Math.cos(angulo)), y: redondear(-Math.sin(angulo)) }
  })
}

const redondear = (n: number) => Math.round(n * 1000) / 1000
