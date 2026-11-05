/**
 * Dibujo de la marca Cumbra Fit (ADR 064), en un solo sitio: lo usan los componentes de `shared/components/Marca`, los
 * pósteres que se comparten (SVG con los colores ya resueltos) y la generación de los PNG del icono (`scripts/marca`).
 *
 * - Icono (viewBox 0 0 100 100): la A de la cumbre, con una mancuerna de travesaño y dos montañas pequeñas debajo.
 * - Logotipo (viewBox `LOGOTIPO.viewBox`): «CUMBRA» con letras talladas que suben como una ladera; la A es la cumbre y
 *   lleva las montañas dentro. «FIT» va aparte, en la letra de los rótulos.
 */

export const ICONO = {
  viewBox: '0 0 100 100',
  /** Encaje del dibujo en el cuadrado del icono: un poco más pequeño y centrado en su peso. */
  encaje: 'translate(50 50) scale(0.96) translate(-50 -48)',
  cumbre: 'M16 86 L43 10 L57 10 L84 86 L68 86 L50 34 L32 86 Z',
  montes: 'M38 86 L43 76 L46 80 L51 68 L62 86 Z',
  /** Barra y discos de la mancuerna: [x, y, ancho, alto, radio]. */
  mancuerna: [[20, 55, 60, 7, 0], [10, 46, 7, 25, 1.5], [18, 50, 5, 17, 1], [83, 46, 7, 25, 1.5], [77, 50, 5, 17, 1]] as const,
} as const

export const LOGOTIPO = {
  viewBox: '-2 -10 285 112',
  /** Proporción ancho / alto del dibujo (sin «FIT»). */
  proporcion: 285 / 112,
  letras: 'M0 52 L6 45 L34 40.6 L34 53.6 L13 56.9 L13 87 L34 87 L34 100 L6 100 L0 94 Z M41 39.4 L54 37.4 L54 87 L62 87 L62 36.1 L75 34 L75 94 L69 100 L41 100 Z M82 100 L82 32.9 L95 30.8 L105 59.2 L115 27.6 L128 25.5 L128 100 L115 100 L115 55.5 L105 79.2 L95 62.9 L95 100 Z M135 24.4 L161 20.2 L169 27 L169 58.2 L164 64.2 L169 70.2 L169 92 L161 100 L135 100 Z M148 35.3 L156 34 L156 59.2 L148 59.2 Z M148 69.2 L156 69.2 L156 87 L148 87 Z M176 17.8 L202 13.7 L210 20.4 L210 60.9 L204 66.9 L210 100 L197 100 L191 70.9 L189 70.9 L189 100 L176 100 Z M189 28.8 L197 27.5 L197 58.9 L189 58.9 Z',
  cumbre: 'M217 100 L242.4 -8 L255.6 -8 L281 100 L265.9 100 L249 18 L232.1 100 Z',
  montes: 'M233.9 100 L240.5 83 L244.3 88 L250.9 70 L264.1 100 Z',
} as const

/** El nombre tal como se escribe en los textos. */
export const NOMBRE_APP = 'Cumbra Fit'

const rgb = (c: string) => `rgb(${c})`

/** Interior del icono (sin fondo), con un solo color o con la mancuerna en otro. Colores como «r g b». */
export function interiorIcono(tinta: string, mancuerna = tinta): string {
  const discos = ICONO.mancuerna.map(([x, y, w, h, r]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${rgb(mancuerna)}"/>`).join('')
  return `<g transform="${ICONO.encaje}"><path d="${ICONO.cumbre}" fill="${rgb(tinta)}"/><path d="${ICONO.montes}" fill="${rgb(tinta)}"/>${discos}</g>`
}

/**
 * El logotipo para una imagen (pósteres): «CUMBRA» con la cumbre en `acento` y «FIT» al lado, con la línea de base en
 * `y` y la esquina izquierda en `x`. Devuelve el SVG y el ancho que ocupa.
 */
export function svgLogotipo(x: number, y: number, alto: number, c: { texto: string; acento: string }): { svg: string; ancho: number } {
  const anchoLetras = Math.round(alto * LOGOTIPO.proporcion)
  const fit = Math.round(alto * 0.4)
  const xFit = Math.round(x + anchoLetras + alto * 0.1)
  const yFit = Math.round(y - alto * 0.07)
  const svg = `<svg x="${x}" y="${y - alto}" width="${anchoLetras}" height="${alto}" viewBox="${LOGOTIPO.viewBox}">`
    + `<path d="${LOGOTIPO.letras}" fill="${rgb(c.texto)}" fill-rule="evenodd"/><path d="${LOGOTIPO.cumbre}" fill="${rgb(c.acento)}"/>`
    + `<path d="${LOGOTIPO.montes}" fill="${rgb(c.texto)}"/></svg>`
    + `<text x="${xFit}" y="${yFit}" fill="${rgb(c.acento)}" `
    + `style="font-family:Saira,sans-serif;font-weight:700;font-stretch:85%;letter-spacing:0.08em;font-size:${fit}px">FIT</text>`
  return { svg, ancho: anchoLetras + alto * 0.1 + fit * 1.9 }
}
