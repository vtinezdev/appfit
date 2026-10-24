// «Tu mes» como imagen para compartir (B15): un SVG de 1080 × 1350 con el título, el periodo y sus cifras en dos columnas,
// con los colores del tema ya resueltos. Lo pasa a PNG la utilidad del póster (`gym/lib/exportarImagen`, A10). Solo lleva
// las cifras del periodo: nada del perfil.
import { ALTO_POSTER, ANCHO_POSTER, escaparXml, partirLineas } from '../../gym/lib/posterImagen'
import type { CifraPeriodo } from './tuPeriodo'

export interface ColoresTuPeriodo { fondo: string; texto: string; tenue: string; filete: string }

const MARGEN = 80
const rgb = (c: string) => `rgb(${c})`
const LETRA = {
  titulo: 'font-family:Saira,sans-serif;font-weight:900;font-stretch:62.5%',
  cifra: 'font-family:Saira,sans-serif;font-weight:800;font-stretch:70%;font-style:italic',
  texto: 'font-family:Saira,sans-serif;font-weight:500',
  rotulo: 'font-family:Saira,sans-serif;font-weight:700;letter-spacing:0.08em',
}
const texto = (x: number, y: number, t: string, tam: number, color: string, letra: string) =>
  `<text x="${x}" y="${y}" style="${letra};font-size:${tam}px" fill="${rgb(color)}">${escaparXml(t)}</text>`

export function svgTuPeriodo(d: { titulo: string; subtitulo: string; cifras: readonly CifraPeriodo[]; grupo: string | null }, c: ColoresTuPeriodo, css = ''): string {
  const partes = [`<rect width="${ANCHO_POSTER}" height="${ALTO_POSTER}" fill="${rgb(c.fondo)}"/>`]
  let y = MARGEN + 40
  partes.push(texto(MARGEN, y, `APPFIT · ${d.subtitulo.toUpperCase()}`, 30, c.tenue, LETRA.rotulo))
  for (const linea of partirLineas(d.titulo, 18, 2)) {
    y += 130
    partes.push(texto(MARGEN, y, linea, 140, c.texto, LETRA.titulo))
  }
  y += 70
  const columna = (ANCHO_POSTER - 2 * MARGEN) / 2
  d.cifras.slice(0, 8).forEach((cifra, i) => {
    const x = MARGEN + (i % 2) * columna
    const fila = y + Math.floor(i / 2) * 190
    partes.push(`<rect x="${x}" y="${fila}" width="${columna - 32}" height="2" fill="${rgb(c.filete)}"/>`)
    partes.push(texto(x, fila + 52, cifra.rotulo, 30, c.tenue, LETRA.texto))
    partes.push(`<text x="${x}" y="${fila + 150}" fill="${rgb(c.texto)}"><tspan style="${LETRA.cifra};font-size:96px">${escaparXml(cifra.valor)}</tspan>`
      + (cifra.unidad ? `<tspan style="${LETRA.texto};font-size:32px" fill="${rgb(c.tenue)}"> ${escaparXml(cifra.unidad)}</tspan>` : '') + '</text>')
  })
  if (d.grupo) partes.push(texto(MARGEN, ALTO_POSTER - MARGEN - 60, `Lo más trabajado: ${d.grupo}`, 36, c.texto, LETRA.texto))
  partes.push(texto(MARGEN, ALTO_POSTER - MARGEN, 'Hecho con AppFit', 28, c.tenue, LETRA.texto))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO_POSTER}" height="${ALTO_POSTER}" viewBox="0 0 ${ANCHO_POSTER} ${ALTO_POSTER}">${css ? `<style>${css}</style>` : ''}${partes.join('')}</svg>`
}

/** «appfit-tu-octubre-2026.png». */
export const nombreArchivoTuPeriodo = (clave: string, titulo: string) =>
  `appfit-${titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}${clave.length === 7 ? `-${clave.slice(0, 4)}` : ''}.png`
