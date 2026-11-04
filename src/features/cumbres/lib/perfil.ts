// Perfil de la montaña: una silueta genérica (no hay datos de rutas reales) o la forma propia de una montaña
// (`siluetas.ts`). La altura del dibujo es la altitud de la cima; lo subido se rellena desde abajo y la marca va por la
// ladera izquierda, que sube siempre.

export type Punto = readonly [number, number]

/**
 * Forma de una silueta en coordenadas de 0 a 1. `subida`: de [0, 0] a la cima (y = 1), siempre hacia arriba y a la
 * derecha, así cada altura tiene un único punto en la ladera. `bajada`: de después de la cima a [1, 0], por debajo de ella.
 */
export interface FormaMontana {
  subida: readonly Punto[]
  bajada: readonly Punto[]
}

/** La silueta de siempre, para las montañas sin forma propia. */
export const FORMA_GENERICA: FormaMontana = {
  subida: [[0, 0], [0.14, 0.2], [0.25, 0.27], [0.37, 0.52], [0.45, 0.57], [0.56, 1]],
  bajada: [[0.67, 0.66], [0.74, 0.7], [0.86, 0.34], [1, 0]],
}

export interface Lienzo {
  ancho: number
  alto: number
  /** Espacio libre sobre la cima (para que la marca no se corte). */
  margen: number
}

const aLienzo = (l: Lienzo, [x, y]: Punto): Punto => [x * l.ancho, l.alto - y * (l.alto - l.margen)]

const num = (n: number) => String(Math.round(n * 10) / 10)

/** Trazado SVG (`d`) de la silueta cerrada por la base. */
export function trazadoSilueta(l: Lienzo, forma: FormaMontana = FORMA_GENERICA): string {
  return [...forma.subida, ...forma.bajada].map((p, i) => {
    const [x, y] = aLienzo(l, p)
    return `${i === 0 ? 'M' : 'L'}${num(x)} ${num(y)}`
  }).join(' ') + 'Z'
}

/** Punto de la ladera de subida a una fracción de la altitud (0 a 1, recortada). */
export function puntoEnLadera(l: Lienzo, fraccion: number, forma: FormaMontana = FORMA_GENERICA): { x: number; y: number } {
  const SUBIDA = forma.subida
  const f = Number.isFinite(fraccion) ? Math.min(1, Math.max(0, fraccion)) : 0
  for (let i = 1; i < SUBIDA.length; i++) {
    const [x0, y0] = SUBIDA[i - 1]
    const [x1, y1] = SUBIDA[i]
    if (f <= y1) {
      const t = y1 === y0 ? 0 : (f - y0) / (y1 - y0)
      const [x, y] = aLienzo(l, [x0 + (x1 - x0) * t, f])
      return { x, y }
    }
  }
  const [x, y] = aLienzo(l, SUBIDA[SUBIDA.length - 1])
  return { x, y }
}

/** Altura (y del lienzo) de una fracción de la altitud: para el relleno y las líneas de los hitos. */
export function yDeFraccion(l: Lienzo, fraccion: number): number {
  const f = Number.isFinite(fraccion) ? Math.min(1, Math.max(0, fraccion)) : 0
  return l.alto - f * (l.alto - l.margen)
}
