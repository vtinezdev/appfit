// «Tu mes» como imagen para compartir (B15): un SVG de 1080 × 1350 con la misma estructura que la página: la portada
// (periodo, título y frase), el calendario del mes, cuatro cifras y los mejores momentos (cumbres, caminos, el mejor
// récord, los logros), con los colores del tema ya resueltos. Lo pasa a PNG la utilidad del póster
// (`gym/lib/exportarImagen`, A10). Solo lleva lo del periodo: nada del perfil.
import { trazoIcono, type IconName } from '../../../shared/components/Icon'
import { escaparXml, partirLineas } from '../../gym/lib/posterImagen'
import type { CifraPeriodo } from './tuPeriodo'
import type { CalendarioPeriodo } from './tuPeriodoSecciones'
import { svgLogotipo } from '../../../shared/design/marca'

/** 4:5, como la publicación de un feed (el póster del entreno, en cambio, es vertical de historia). */
export const ANCHO_POSTER = 1080
export const ALTO_POSTER = 1350

/** Tripletes «r g b» de los tokens del grafito: fondo, texto, tenue, el carril (días vacíos, filetes) y el acento (comidas). */
export interface ColoresTuPeriodo { fondo: string; texto: string; tenue: string; filete: string; acento: string }

export interface MomentoImagen { icono: IconName; texto: string; detalle?: string }

export interface DatosImagenTuPeriodo {
  titulo: string
  subtitulo: string
  frase: string | null
  /** Solo en los meses. */
  calendario: CalendarioPeriodo | null
  /** Las cuatro primeras salen. */
  cifras: readonly CifraPeriodo[]
  /** Los que quepan, en orden. */
  momentos: readonly MomentoImagen[]
}

const MARGEN = 80
const ANCHO_UTIL = ANCHO_POSTER - 2 * MARGEN
const PIE = ALTO_POSTER - MARGEN
const rgb = (c: string) => `rgb(${c})`
const LETRA = {
  titulo: 'font-family:Saira,sans-serif;font-weight:900;font-stretch:62.5%',
  cifra: 'font-family:Saira,sans-serif;font-weight:800;font-stretch:70%;font-style:italic',
  texto: 'font-family:Saira,sans-serif;font-weight:500',
  fuerte: 'font-family:Saira,sans-serif;font-weight:700',
  rotulo: 'font-family:Saira,sans-serif;font-weight:700;letter-spacing:0.08em',
}
const texto = (x: number, y: number, t: string, tam: number, color: string, letra: string, extra = '') =>
  `<text x="${x}" y="${y}" style="${letra};font-size:${tam}px" fill="${rgb(color)}"${extra}>${escaparXml(t)}</text>`
const icono = (nombre: IconName, x: number, y: number, tam: number, color: string) =>
  `<path d="${trazoIcono(nombre)}" transform="translate(${x} ${y}) scale(${tam / 24})" fill="none" stroke="${rgb(color)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`

const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const HUECO_CAL = 12

/** El calendario desde `y`: letras de la semana y un cuadro por día; devuelve dónde acaba. */
function calendario(cal: CalendarioPeriodo, c: ColoresTuPeriodo, y: number, partes: string[]): number {
  const ancho = (ANCHO_UTIL - 6 * HUECO_CAL) / 7
  const filas = Math.ceil((cal.hueco + cal.dias.length) / 7)
  const alto = filas > 5 ? 54 : 64
  LETRAS.forEach((l, i) => partes.push(texto(MARGEN + i * (ancho + HUECO_CAL) + ancho / 2, y + 26, l, 26, c.tenue, LETRA.fuerte, ' text-anchor="middle"')))
  const arriba = y + 46
  cal.dias.forEach((d, i) => {
    const pos = cal.hueco + i
    const x = MARGEN + (pos % 7) * (ancho + HUECO_CAL)
    const yy = arriba + Math.floor(pos / 7) * (alto + HUECO_CAL)
    const caja = `x="${x + (d.actividad && !d.entreno ? 1.5 : 0)}" y="${yy + (d.actividad && !d.entreno ? 1.5 : 0)}" width="${ancho - (d.actividad && !d.entreno ? 3 : 0)}" height="${alto - (d.actividad && !d.entreno ? 3 : 0)}" rx="12"`
    if (d.entreno) partes.push(`<rect ${caja} fill="${rgb(c.texto)}"/>`)
    else if (d.actividad) partes.push(`<rect ${caja} fill="none" stroke="${rgb(c.texto)}" stroke-width="3"/>`)
    else partes.push(`<rect ${caja} fill="${rgb(c.filete)}"/>`)
    const numero = d.entreno ? c.fondo : d.actividad ? c.texto : c.tenue
    partes.push(texto(x + ancho / 2, yy + alto / 2 + (d.comidas ? 4 : 10), String(d.dia), 28, numero, LETRA.fuerte, ' text-anchor="middle"'))
    if (d.comidas) partes.push(`<circle cx="${x + ancho / 2}" cy="${yy + alto - 12}" r="5" fill="${rgb(d.entreno ? c.fondo : c.acento)}"/>`)
  })
  return arriba + filas * (alto + HUECO_CAL) - HUECO_CAL
}

export function svgTuPeriodo(d: DatosImagenTuPeriodo, c: ColoresTuPeriodo, css = ''): string {
  const partes = [`<rect width="${ANCHO_POSTER}" height="${ALTO_POSTER}" fill="${rgb(c.fondo)}"/>`]
  let y = MARGEN + 30
  partes.push(texto(MARGEN, y, `CUMBRA FIT · ${d.subtitulo.toUpperCase()}`, 30, c.tenue, LETRA.rotulo))
  for (const linea of partirLineas(d.titulo, 18, 2)) {
    y += 124
    partes.push(texto(MARGEN, y, linea, 134, c.texto, LETRA.titulo))
  }
  if (d.frase) {
    y += 14
    for (const linea of partirLineas(d.frase, 44, 2)) {
      y += 50
      partes.push(texto(MARGEN, y, linea, 38, c.texto, LETRA.texto))
    }
  }
  if (d.calendario) y = calendario(d.calendario, c, y + 40, partes)

  const cifras = d.cifras.slice(0, 4)
  if (cifras.length) {
    y += 52
    const columna = ANCHO_UTIL / cifras.length
    cifras.forEach((cifra, i) => {
      const x = MARGEN + i * columna
      partes.push(`<rect x="${x}" y="${y}" width="${columna - 28}" height="2" fill="${rgb(c.filete)}"/>`)
      partes.push(texto(x, y + 40, cifra.rotulo, 26, c.tenue, LETRA.texto))
      partes.push(`<text x="${x}" y="${y + 112}" fill="${rgb(c.texto)}"><tspan style="${LETRA.cifra};font-size:${cifras.length > 3 ? 72 : 88}px">${escaparXml(cifra.valor)}</tspan>`
        + (cifra.unidad ? `<tspan style="${LETRA.texto};font-size:28px" fill="${rgb(c.tenue)}"> ${escaparXml(cifra.unidad)}</tspan>` : '') + '</text>')
    })
    y += 130
  }

  // Los momentos, uno por fila, mientras quepan sobre el pie.
  const FILA = 64
  y += 24
  for (const m of d.momentos) {
    if (y + FILA > PIE - 56) break
    partes.push(`<rect x="${MARGEN}" y="${y}" width="52" height="52" rx="12" fill="${rgb(c.acento)}"/>`)
    partes.push(icono(m.icono, MARGEN + 12, y + 12, 28, c.fondo))
    const [principal] = partirLineas(m.texto, m.detalle ? 30 : 40, 1)
    partes.push(texto(MARGEN + 76, y + 38, principal, 34, c.texto, LETRA.fuerte))
    if (m.detalle) partes.push(texto(ANCHO_POSTER - MARGEN, y + 38, m.detalle, 28, c.tenue, LETRA.texto, ' text-anchor="end"'))
    y += FILA
  }
  partes.push(texto(MARGEN, PIE, 'Hecho con', 28, c.tenue, LETRA.texto), svgLogotipo(MARGEN + 140, PIE + 2, 52, { texto: c.texto, acento: c.acento }).svg)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO_POSTER}" height="${ALTO_POSTER}" viewBox="0 0 ${ANCHO_POSTER} ${ALTO_POSTER}">${css ? `<style>${css}</style>` : ''}${partes.join('')}</svg>`
}

/** «cumbra-fit-tu-octubre-2026.png». */
export const nombreArchivoTuPeriodo = (clave: string, titulo: string) =>
  `cumbra-fit-${titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}${clave.length === 7 ? `-${clave.slice(0, 4)}` : ''}.png`
