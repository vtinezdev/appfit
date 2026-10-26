// El póster de una sesión como imagen para compartir (ENT-11): un SVG de 1080 × 1920 (9:16, el de las historias y los
// estados) compuesto aquí, sin DOM, con los colores del tema ya resueltos (un canvas no entiende variables CSS).
// `exportarImagen` lo pasa a PNG. Solo lleva datos del entreno: título, fecha, cifras, récords, ejercicios, «Hoy» y el
// muñeco. Nada del perfil. Cuenta con formas antes que con frases: barras de series, trofeos y cifras.
import type { VistaCuerpo } from '../components/mapaMuscularGeometria'
import type { EjercicioPoster, HitoSesion } from './fichaEntreno'
import type { ZonaMuscular } from './musculos'

export const ANCHO_POSTER = 1080
export const ALTO_POSTER = 1920
/** Ejercicios que caben en la imagen; el resto se cuenta en una línea. */
export const MAX_EJERCICIOS_POSTER = 8

/** Colores del póster como tripletes «r g b» (los de los tokens), ya resueltos para el tema actual. */
export interface ColoresPoster {
  fondo: string
  texto: string
  tenue: string
  /** Músculos sin trabajar. */
  pista: string
  /** Rótulos de «Hoy». */
  acento: string
  /** Rampa de la sesión, niveles 1 a 5. */
  musculo: readonly [string, string, string, string, string]
}

export interface CifraPoster { rotulo: string; valor: string; unidad?: string }

export interface DatosPosterImagen {
  titulo: string
  /** «vie 9 oct · 18:05 – 18:57» (y el gimnasio, si no es el habitual). */
  fecha: string
  cifras: CifraPoster[]
  /** Ejercicios en su orden; con ellos, los récords van en cada ejercicio y «Hoy» se queda con los demás hitos. */
  ejercicios?: EjercicioPoster[]
  /** Récords del entreno: con alguno, el trofeo y su número bajo las cifras. */
  records?: number
  hoy: HitoSesion[]
  /** El entreno nº 10, 25, 50…: la cifra y su texto encima del título (A23). */
  hito?: { cifra: string; texto: string; desde: string }
  /** Niveles del mapa de la sesión y la geometría del muñeco (`CUERPOS[figura]`, con su `viewBox`); sin ellos, sin muñeco. */
  muneco?: { levels: Partial<Record<ZonaMuscular, number>>; cuerpo: { frontal: VistaCuerpo; trasera: VistaCuerpo }; viewBox: string }
}

/** Escapa lo que va dentro de un texto o un atributo del SVG. */
export function escaparXml(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

/**
 * Parte un texto en líneas de como mucho `maxCaracteres` (por palabras; una palabra más larga se corta) y, si no cabe en
 * `maxLineas`, termina la última con «…». La anchura es una estimación: la letra es la de la app y no se mide aquí.
 */
export function partirLineas(texto: string, maxCaracteres: number, maxLineas: number): string[] {
  const palabras = texto.trim().split(/\s+/).filter(Boolean).flatMap((p) => p.length <= maxCaracteres ? [p] : p.match(new RegExp(`.{1,${maxCaracteres}}`, 'gu')) ?? [])
  const lineas: string[] = []
  for (const p of palabras) {
    const ultima = lineas.at(-1)
    if (ultima !== undefined && `${ultima} ${p}`.length <= maxCaracteres) lineas[lineas.length - 1] = `${ultima} ${p}`
    else lineas.push(p)
  }
  if (lineas.length <= maxLineas) return lineas
  const visibles = lineas.slice(0, maxLineas)
  const ultima = visibles[maxLineas - 1]
  visibles[maxLineas - 1] = `${ultima.length < maxCaracteres ? ultima : ultima.slice(0, maxCaracteres - 1).trimEnd()}…`
  return visibles
}

const rgb = (c: string) => `rgb(${c})`
const MARGEN = 80
const ANCHO_UTIL = ANCHO_POSTER - 2 * MARGEN

/** Letra de la app: Saira, estrecha y pesada en títulos y cifras (como `poster-title` y `font-numeric`). */
const LETRA = {
  titulo: 'font-family:Saira,sans-serif;font-weight:900;font-stretch:62.5%',
  cifra: 'font-family:Saira,sans-serif;font-weight:800;font-stretch:70%;font-style:italic',
  texto: 'font-family:Saira,sans-serif;font-weight:500',
  rotulo: 'font-family:Saira,sans-serif;font-weight:700;letter-spacing:0.08em',
}

function texto(x: number, y: number, contenido: string, tam: number, color: string, letra: string, extra = ''): string {
  return `<text x="${x}" y="${y}" style="${letra};font-size:${tam}px" fill="${rgb(color)}"${extra}>${escaparXml(contenido)}</text>`
}

/** El trofeo de `Icon` (24 × 24, de trazo) en `color`, con su esquina en (x, y) y `tam` de lado. */
function trofeo(x: number, y: number, tam: number, color: string): string {
  const d = 'M8 3h8v6a4 4 0 0 1-8 0V3M8 5H4v3a4 4 0 0 0 4 4M16 5h4v3a4 4 0 0 1-4 4M12 13v6M8 21h8M10 19h4'
  return `<path d="${d}" transform="translate(${x} ${y}) scale(${tam / 24})" fill="none" stroke="${rgb(color)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
}

function muneco({ levels, cuerpo, viewBox }: NonNullable<DatosPosterImagen['muneco']>, c: ColoresPoster, x: number, y: number, alto: number): string {
  const [, , anchoCaja, altoCaja] = viewBox.split(' ').map(Number)
  const escala = alto / altoCaja
  const ancho = anchoCaja * escala
  const separacion = 48
  const inicio = x + (ANCHO_UTIL - (2 * ancho + separacion)) / 2
  const trazo = `stroke="${rgb(c.fondo)}" stroke-width="${1.25 / escala}" stroke-linejoin="round"`
  return (['frontal', 'trasera'] as const).map((v, i) => {
    const vista = cuerpo[v]
    const zonas = (Object.entries(vista.zonas) as [ZonaMuscular, string][]).map(([id, d]) => {
      const nivel = levels[id] ?? 0
      return `<path d="${d}" fill="${rgb(nivel >= 1 && nivel <= 5 ? c.musculo[nivel - 1] : c.pista)}" ${trazo}/>`
    }).join('')
    return `<g transform="translate(${inicio + i * (ancho + separacion)} ${y}) scale(${escala})">`
      + `<path d="${vista.detalles}" fill="${rgb(c.pista)}" ${trazo}/>${zonas}`
      + `<path d="${vista.silueta}" fill="none" stroke="${rgb(c.tenue)}" stroke-opacity="0.5" stroke-width="${1 / escala}" stroke-linejoin="round"/></g>`
  }).join('')
}

/**
 * El SVG del póster. `css` añade reglas dentro del SVG (las `@font-face` con la letra incrustada: una imagen no carga
 * recursos de fuera). Arriba, título (hasta dos líneas), fecha y cifras con filetes; el trofeo con los récords; los
 * ejercicios (nombre, mejor serie, una barra por serie y la mejora del récord), «Hoy» y el muñeco ocupa lo que queda (si no
 * hay sitio, no va); abajo, «Hecho con AppFit».
 */
export function svgPoster(d: DatosPosterImagen, c: ColoresPoster, css = ''): string {
  const partes: string[] = [`<rect width="${ANCHO_POSTER}" height="${ALTO_POSTER}" fill="${rgb(c.fondo)}"/>`]
  let y = MARGEN
  if (d.hito) {
    y += 96
    partes.push(texto(MARGEN, y, d.hito.cifra, 120, c.acento, LETRA.cifra))
    // La cifra en cursiva estrecha mide unos 52 px por dígito a 120 px.
    const x = MARGEN + d.hito.cifra.length * 52 + 28
    partes.push(texto(x, y - 40, d.hito.texto, 40, c.texto, LETRA.texto.replace('500', '700')))
    partes.push(texto(x, y, d.hito.desde, 30, c.tenue, LETRA.texto))
    y += 24
  }
  for (const linea of partirLineas(d.titulo, 22, 2)) {
    y += 104
    partes.push(texto(MARGEN, y, linea, 112, c.texto, LETRA.titulo))
  }
  y += 60
  partes.push(texto(MARGEN, y, partirLineas(d.fecha, 50, 1)[0] ?? '', 36, c.tenue, LETRA.texto))

  // Cifras en columnas iguales, con filete a la izquierda de cada una salvo la primera.
  y += 56
  const columna = Math.floor(ANCHO_UTIL / Math.max(1, d.cifras.length))
  d.cifras.forEach((cifra, i) => {
    const filete = MARGEN + i * columna
    const x = filete + (i ? 28 : 0)
    if (i) partes.push(`<rect x="${filete}" y="${y}" width="2" height="132" fill="${rgb(c.pista)}"/>`)
    partes.push(texto(x, y + 36, cifra.rotulo, 30, c.tenue, LETRA.texto))
    partes.push(`<text x="${x}" y="${y + 116}" fill="${rgb(c.texto)}"><tspan style="${LETRA.cifra};font-size:84px">${escaparXml(cifra.valor)}</tspan>`
      + (cifra.unidad ? `<tspan style="${LETRA.texto};font-size:30px" fill="${rgb(c.tenue)}"> ${escaparXml(cifra.unidad)}</tspan>` : '') + '</text>')
  })
  y += 132

  // Los récords, en grande: el trofeo y su número.
  if (d.records) {
    y += 120
    partes.push(trofeo(MARGEN, y - 64, 72, c.acento))
    partes.push(`<text x="${MARGEN + 100}" y="${y}" fill="${rgb(c.acento)}"><tspan style="${LETRA.cifra};font-size:84px">${d.records}</tspan>`
      + `<tspan style="${LETRA.texto.replace('500', '700')};font-size:40px"> ${d.records === 1 ? 'récord personal' : 'récords personales'}</tspan></text>`)
  }

  // Cada ejercicio: nombre y mejor serie en una línea; debajo, una barra por serie (la del récord en acento) y la mejora.
  const ejercicios = d.ejercicios ?? []
  if (ejercicios.length) {
    y += 64
    for (const e of ejercicios.slice(0, MAX_EJERCICIOS_POSTER)) {
      y += 56
      partes.push(texto(MARGEN, y, partirLineas(e.nombre, 30, 1)[0] ?? '', 36, c.texto, LETRA.texto.replace('500', '600')))
      partes.push(texto(ANCHO_POSTER - MARGEN, y, partirLineas(e.mejor, 16, 1)[0] ?? '', 40, c.texto, LETRA.cifra, ' text-anchor="end"'))
      const base = y + 64
      const barras = e.series.slice(0, 12)
      barras.forEach((b, i) => {
        const alto = Math.round(44 * b.alto)
        partes.push(`<rect x="${MARGEN + i * 38}" y="${base - alto}" width="28" height="${alto}" rx="5" fill="${rgb(b.record ? c.acento : c.tenue)}"${b.record ? '' : ' fill-opacity="0.45"'}/>`)
      })
      if (e.mejora) {
        const x = MARGEN + barras.length * 38 + 24
        partes.push(trofeo(x, base - 34, 34, c.acento))
        partes.push(texto(x + 44, base - 4, e.mejora, 34, c.acento, LETRA.texto.replace('500', '700')))
      }
      y = base
    }
    const resto = ejercicios.length - MAX_EJERCICIOS_POSTER
    if (resto > 0) {
      y += 56
      partes.push(texto(MARGEN, y, `y ${resto} ${resto === 1 ? 'ejercicio' : 'ejercicios'} más`, 28, c.tenue, LETRA.texto))
    }
  }

  const hoy = ejercicios.length ? d.hoy.filter(h => h.tipo !== 'record') : d.hoy
  if (hoy.length) {
    y += 72
    partes.push(texto(MARGEN, y, 'HOY', 28, c.tenue, LETRA.rotulo))
    for (const h of hoy) {
      y += 56
      partes.push(texto(MARGEN, y, h.etiqueta, 30, c.acento, LETRA.rotulo.replace('letter-spacing:0.08em', 'letter-spacing:0')))
      partirLineas(h.texto, 44, 2).forEach((linea, i) => {
        if (i) y += 44
        partes.push(texto(MARGEN + 170, y, linea, 34, c.texto, LETRA.texto))
      })
    }
  }

  const pie = ALTO_POSTER - MARGEN
  if (d.muneco) {
    const arriba = y + 64
    const alto = pie - 72 - arriba
    if (alto > 200) partes.push(muneco(d.muneco, c, MARGEN, arriba, alto))
  }
  partes.push(texto(MARGEN, pie, 'Hecho con AppFit', 30, c.tenue, LETRA.texto))

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO_POSTER}" height="${ALTO_POSTER}" viewBox="0 0 ${ANCHO_POSTER} ${ALTO_POSTER}">`
    + (css ? `<style>${css}</style>` : '') + partes.join('') + '</svg>'
}

/** Nombre del archivo: «appfit-torso-a-2026-10-09.png», sin acentos ni signos. */
export function nombreArchivoPoster(titulo: string, inicio: number): string {
  const base = titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'entreno'
  const f = new Date(inicio)
  const dia = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
  return `appfit-${base}-${dia}.png`
}
