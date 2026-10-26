// El póster de una sesión como imagen para compartir (ENT-11): un SVG de 1080 × 1920 (9:16, el de las historias y los
// estados) compuesto aquí, sin DOM, con los colores del tema ya resueltos (un canvas no entiende variables CSS).
// `exportarImagen` lo pasa a PNG. Solo lleva datos del entreno: título, fecha, cifras, récords, ejercicios, «Hoy» y el
// muñeco. Nada del perfil. Cuenta con formas antes que con frases: la mejor serie como pastilla, trofeos, medallas y cifras.
import { trazoIcono, type IconName } from '../../../shared/components/Icon'
import type { VistaCuerpo } from '../components/mapaMuscularGeometria'
import { partesHito, type EjercicioPoster, type HitoSesion, type TipoHito } from './fichaEntreno'
import type { ZonaMuscular } from './musculos'

export const ANCHO_POSTER = 1080
export const ALTO_POSTER = 1920
/** Ejercicios que caben en la imagen; el resto se cuenta en una línea. */
export const MAX_EJERCICIOS_POSTER = 8
/** Medallas en una fila. */
export const MAX_MEDALLAS_POSTER = 4

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
  /**
   * Logros de la Vitrina conseguidos con el entreno: el interior del SVG de su insignia (`viewBox` 0 0 100 100, con los
   * colores ya resueltos; lo arma la app, no la persona) y su nombre. Con ellos, «Hoy» no repite los logros.
   */
  medallas?: { interior: string; nombre: string }[]
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

/** Un icono de `Icon` (24 × 24, de trazo) en `color`, con su esquina en (x, y) y `tam` de lado. */
function icono(nombre: IconName, x: number, y: number, tam: number, color: string): string {
  return `<path d="${trazoIcono(nombre)}" transform="translate(${x} ${y}) scale(${tam / 24})" fill="none" stroke="${rgb(color)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
}
const trofeo = (x: number, y: number, tam: number, color: string) => icono('trophy', x, y, tam, color)

/** Una insignia ya resuelta (medalla de la Vitrina o liga: `viewBox` 0 0 100 100) en un cuadrado de `tam`. */
const insignia = (interior: string, x: number, y: number, tam: number) =>
  `<svg x="${x}" y="${y}" width="${tam}" height="${tam}" viewBox="0 0 100 100">${interior}</svg>`

const ICONO_HITO: Record<TipoHito, IconName> = { record: 'trophy', cumbre: 'mountain', liga: 'escudo', logro: 'sparkles' }

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

/** Ejercicios en dos líneas (series, mejora y liga debajo) o en una (nombre, liga y pastilla), y cuántos caben. */
interface Modo { compacto: boolean; maxEjercicios: number }

/** Todo menos el muñeco y el pie, con el modo dado; devuelve dónde acaba, para elegir el modo que cabe. */
function componer(d: DatosPosterImagen, c: ColoresPoster, modo: Modo): { partes: string[]; y: number } {
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
  for (const linea of partirLineas(d.titulo, 28, 2)) {
    y += 84
    partes.push(texto(MARGEN, y, linea, 88, c.texto, LETRA.titulo))
  }
  y += 56
  partes.push(texto(MARGEN, y, partirLineas(d.fecha, 50, 1)[0] ?? '', 36, c.tenue, LETRA.texto))

  // Cifras en columnas iguales, con filete a la izquierda de cada una salvo la primera.
  y += 48
  const columna = Math.floor(ANCHO_UTIL / Math.max(1, d.cifras.length))
  d.cifras.forEach((cifra, i) => {
    const filete = MARGEN + i * columna
    const x = filete + (i ? 28 : 0)
    if (i) partes.push(`<rect x="${filete}" y="${y}" width="2" height="96" fill="${rgb(c.pista)}"/>`)
    partes.push(texto(x, y + 28, cifra.rotulo, 26, c.tenue, LETRA.texto))
    partes.push(`<text x="${x}" y="${y + 88}" fill="${rgb(c.texto)}"><tspan style="${LETRA.cifra};font-size:60px">${escaparXml(cifra.valor)}</tspan>`
      + (cifra.unidad ? `<tspan style="${LETRA.texto};font-size:26px" fill="${rgb(c.tenue)}"> ${escaparXml(cifra.unidad)}</tspan>` : '') + '</text>')
  })
  y += 96

  // Los récords, en grande: el trofeo y su número.
  if (d.records) {
    y += 100
    partes.push(trofeo(MARGEN, y - 50, 56, c.acento))
    partes.push(`<text x="${MARGEN + 80}" y="${y}" fill="${rgb(c.acento)}"><tspan style="${LETRA.cifra};font-size:64px">${d.records}</tspan>`
      + `<tspan style="${LETRA.texto.replace('500', '700')};font-size:34px"> ${d.records === 1 ? 'récord personal' : 'récords personales'}</tspan></text>`)
  }

  // Las medallas de la Vitrina conseguidas con el entreno, en fila, con su nombre debajo.
  const medallas = d.medallas ?? []
  if (medallas.length) {
    y += 48
    const celda = ANCHO_UTIL / MAX_MEDALLAS_POSTER
    medallas.slice(0, MAX_MEDALLAS_POSTER).forEach((m, i) => {
      const centro = MARGEN + celda * i + celda / 2
      partes.push(insignia(m.interior, centro - 60, y, 120))
      partirLineas(m.nombre, 14, 2).forEach((linea, l) =>
        partes.push(texto(centro, y + 160 + l * 34, linea, 28, c.texto, LETRA.texto.replace('500', '600'), ' text-anchor="middle"')))
    })
    y += 160 + 34
    const resto = medallas.length - MAX_MEDALLAS_POSTER
    if (resto > 0) {
      y += 48
      partes.push(texto(MARGEN, y, `y ${resto} ${resto === 1 ? 'logro' : 'logros'} más`, 28, c.tenue, LETRA.texto))
    }
  }

  // Cada ejercicio: a la derecha, la mejor serie como la pastilla del historial (la del récord en acento con trofeo). A lo
  // ancho, debajo del nombre, cuántas series, la mejora del récord y la insignia de su liga si cambia; compacto, el nombre y
  // la insignia en la misma línea que la pastilla.
  const ejercicios = d.ejercicios ?? []
  if (ejercicios.length) {
    y += modo.compacto ? 24 : 40
    for (const e of ejercicios.slice(0, modo.maxEjercicios)) {
      const etiqueta = partirLineas(e.mejor.texto, 18, 1)[0] ?? ''
      const ancho = Math.round(etiqueta.length * 15 + 44 + (e.mejor.record ? 38 : 0))
      const x = ANCHO_POSTER - MARGEN - ancho
      const base = modo.compacto ? y + 16 : y + 60
      const pastilla = (arriba: number) => {
        partes.push(`<rect x="${x}" y="${arriba}" width="${ancho}" height="58" rx="29" fill="${rgb(e.mejor.record ? c.acento : c.pista)}"/>`)
        if (e.mejor.record) partes.push(trofeo(x + 20, arriba + 14, 30, c.fondo))
        partes.push(texto(x + 22 + (e.mejor.record ? 38 : 0), arriba + 40, etiqueta, 32, e.mejor.record ? c.fondo : c.texto, LETRA.texto.replace('500', '700')))
      }
      if (modo.compacto) {
        y += 74
        pastilla(y - 46)
        const liga = e.liga && !e.liga.empieza ? e.liga : undefined
        const finNombre = liga ? x - 72 : x - 24
        if (liga) partes.push(insignia(liga.interior, x - 64, y - 42, 50))
        partes.push(texto(MARGEN, y, partirLineas(e.nombre, Math.floor((finNombre - MARGEN) / 19), 1)[0] ?? '', 36, c.texto, LETRA.texto.replace('500', '600')))
        continue
      }
      y = base
      pastilla(y - 6)
      // El nombre deja sitio a la pastilla.
      partes.push(texto(MARGEN, y, partirLineas(e.nombre, Math.floor((x - MARGEN - 24) / 19), 1)[0] ?? '', 36, c.texto, LETRA.texto.replace('500', '600')))
      y += 44
      partes.push(texto(MARGEN, y, e.series, 28, c.tenue, LETRA.texto))
      let xl = MARGEN + e.series.length * 14 + 28
      if (e.mejora) {
        partes.push(trofeo(xl - 4, y - 26, 30, c.acento))
        partes.push(texto(xl + 34, y, e.mejora, 30, c.acento, LETRA.texto.replace('500', '700')))
        xl += 34 + e.mejora.length * 16 + 28
      }
      if (e.liga) {
        partes.push(insignia(e.liga.interior, xl, y - 34, 44))
        // Sin sitio antes de la pastilla, solo la insignia.
        if (xl + 52 + e.liga.texto.length * 16 <= x - 16) partes.push(texto(xl + 52, y, e.liga.texto, 30, c.texto, LETRA.texto.replace('500', '700')))
      }
    }
    const resto = ejercicios.length - modo.maxEjercicios
    if (resto > 0) {
      y += 56
      partes.push(texto(MARGEN, y, `y ${resto} ${resto === 1 ? 'ejercicio' : 'ejercicios'} más`, 28, c.tenue, LETRA.texto))
    }
  }

  // «Hoy» sin lo que ya se ve arriba (récords, logros y, si van en los ejercicios, las ligas): icono de su sistema en un
  // cuadro de acento, lo conseguido y, debajo, de qué.
  const ligasEnEjercicios = ejercicios.some(e => e.liga)
  const hoy = d.hoy.filter(h => !(h.tipo === 'record' && ejercicios.length) && !(h.tipo === 'logro' && medallas.length) && !(h.tipo === 'liga' && ligasEnEjercicios))
  if (hoy.length) {
    y += 72
    partes.push(texto(MARGEN, y, 'HOY', 28, c.tenue, LETRA.rotulo))
    for (const h of hoy) {
      const { principal, detalle } = partesHito(h)
      y += 24
      partes.push(`<rect x="${MARGEN}" y="${y}" width="72" height="72" rx="18" fill="${rgb(c.acento)}"/>`)
      partes.push(icono(ICONO_HITO[h.tipo], MARGEN + 16, y + 16, 40, c.fondo))
      partes.push(texto(MARGEN + 96, y + 32, partirLineas(principal, 40, 1)[0] ?? '', 36, c.texto, LETRA.texto.replace('500', '700')))
      partes.push(texto(MARGEN + 96, y + 68, partirLineas(detalle, 50, 1)[0] ?? '', 28, c.tenue, LETRA.texto))
      y += 72
    }
  }
  return { partes, y }
}

/**
 * El SVG del póster. `css` añade reglas dentro del SVG (las `@font-face` con la letra incrustada: una imagen no carga
 * recursos de fuera). Arriba, el hito si lo hay, título (hasta dos líneas), fecha y cifras con filetes; el trofeo con los
 * récords; las medallas de la Vitrina; los ejercicios y «Hoy»; el muñeco ocupa lo que queda (si no hay sitio, no va);
 * abajo, «Hecho con AppFit». Si no cabe todo sobre el pie, los ejercicios pasan a una línea y, si aún no, se muestran menos.
 */
export function svgPoster(d: DatosPosterImagen, c: ColoresPoster, css = ''): string {
  const pie = ALTO_POSTER - MARGEN
  const limite = pie - 64
  const total = d.ejercicios?.length ?? 0
  const modos: Modo[] = [{ compacto: false, maxEjercicios: MAX_EJERCICIOS_POSTER }, { compacto: true, maxEjercicios: MAX_EJERCICIOS_POSTER },
    ...Array.from({ length: Math.min(total, MAX_EJERCICIOS_POSTER) - 1 }, (_, i) => ({ compacto: true, maxEjercicios: Math.min(total, MAX_EJERCICIOS_POSTER) - 1 - i }))]
  let r = componer(d, c, modos[0])
  for (const modo of modos.slice(1)) {
    if (r.y <= limite) break
    r = componer(d, c, modo)
  }
  const partes = r.partes
  if (d.muneco) {
    const arriba = r.y + 64
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
