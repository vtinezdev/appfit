/**
 * Geometría de la media luna de secciones (ADR 043). Espejo de los tokens `--arco-*` de tokens.css para el test:
 * a 320 px la órbita horizontal es la mínima y aun así ninguna sección pisa a su vecina.
 */
export const ARCO = {
  /** Órbita horizontal mínima (px), la de 320 px de ancho: `--arco-rx`. */
  rxMinimo: 124,
  /** Órbita horizontal habitual (px), desde 376 px de ancho: el tope `9rem` de `--arco-rx`. Con ella se reparten los puntos. */
  rxHabitual: 144,
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
 * La órbita es más alta que ancha: a ángulos iguales, los extremos quedarían más separados que las de arriba.
 * Por eso se reparten a distancias iguales sobre la curva, medida con la órbita habitual.
 */
export function posicionesArco(cantidad: number): { x: number; y: number }[] {
  if (!Number.isInteger(cantidad) || cantidad < 1) return []
  if (cantidad === 1) return [{ x: 0, y: -1 }]
  const proporcion = ARCO.ry / ARCO.rxHabitual
  const desde = (DESDE * Math.PI) / 180, hasta = (HASTA * Math.PI) / 180
  const angulos = Array.from({ length: MUESTRAS + 1 }, (_, k) => desde + ((hasta - desde) * k) / MUESTRAS)
  // Longitud acumulada de la curva hasta cada muestra.
  const acumulada = [0]
  for (let k = 1; k <= MUESTRAS; k++) {
    const dx = Math.cos(angulos[k]) - Math.cos(angulos[k - 1])
    const dy = (Math.sin(angulos[k]) - Math.sin(angulos[k - 1])) * proporcion
    acumulada.push(acumulada[k - 1] + Math.hypot(dx, dy))
  }
  const total = acumulada[MUESTRAS]
  let k = 1
  return Array.from({ length: cantidad }, (_, i) => {
    const objetivo = (total * i) / (cantidad - 1)
    while (k < MUESTRAS && acumulada[k] < objetivo) k++
    const t = (objetivo - acumulada[k - 1]) / (acumulada[k] - acumulada[k - 1])
    const angulo = angulos[k - 1] + (angulos[k] - angulos[k - 1]) * Math.min(Math.max(t, 0), 1)
    return { x: redondear(Math.cos(angulo)), y: redondear(-Math.sin(angulo)) }
  })
}

/** Tramos con que se mide la curva: de sobra para que el reparto no se note. */
const MUESTRAS = 360

const redondear = (n: number) => Math.round(n * 1000) / 1000
