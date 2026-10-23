import { describe, expect, it } from 'vitest'
import { CUERPOS, VIEWBOX_CUERPO } from '../components/mapaMuscularGeometria'
import { ALTO_POSTER, ANCHO_POSTER, escaparXml, nombreArchivoPoster, partirLineas, svgPoster, type ColoresPoster, type DatosPosterImagen } from './posterImagen'

const claro: ColoresPoster = { fondo: '24 26 20', texto: '245 247 240', tenue: '188 190 180', pista: '54 57 48', acento: '198 244 50', musculo: ['1 1 1', '2 2 2', '3 3 3', '4 4 4', '5 5 5'] }
const datos: DatosPosterImagen = {
  titulo: 'Torso A',
  fecha: 'vie 9 oct · 18:05 – 18:57',
  cifras: [{ rotulo: 'Duración', valor: '52 min' }, { rotulo: 'Volumen', valor: '8.450', unidad: 'kg' }, { rotulo: 'Series', valor: '18' }],
  hoy: [{ tipo: 'record', etiqueta: 'Récord', texto: 'Press banca · Peso máximo: 82,5 kg (+5 kg)' }],
}

describe('svgPoster', () => {
  it('un SVG de 1080 × 1350 con título, fecha, cifras, «Hoy» y el pie, con los colores del tema', () => {
    const svg = svgPoster(datos, claro)
    expect(svg).toMatch(new RegExp(`^<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO_POSTER}" height="${ALTO_POSTER}"`))
    for (const t of ['Torso A', 'vie 9 oct · 18:05 – 18:57', 'Duración', '52 min', '8.450', ' kg', 'HOY', 'Récord', 'Hecho con AppFit']) expect(svg).toContain(`>${t}<`)
    expect(svg).toContain('<rect width="1080" height="1350" fill="rgb(24 26 20)"/>')
    expect(svg).toContain('fill="rgb(198 244 50)">Récord<')
    expect(svg).not.toMatch(/var\(--/)
  })

  it('escapa lo que escribe la persona y no deja el título salirse', () => {
    const svg = svgPoster({ ...datos, titulo: 'Pierna <fuerte> & "rápida" con un nombre larguísimo que no cabe en dos líneas del póster' }, claro)
    expect(svg).toContain('Pierna &lt;fuerte&gt; &amp;')
    expect(svg).not.toContain('<fuerte>')
    expect(svg.match(/font-size:112px/g)).toHaveLength(2)
    expect(svg).toContain('…<')
  })

  it('el muñeco pinta cada zona con su nivel; sin «Hoy» ni niveles, sin esas partes; el CSS va dentro', () => {
    const con = svgPoster({ ...datos, muneco: { levels: { pecho: 5, biceps: 2 }, cuerpo: CUERPOS.hombre, viewBox: VIEWBOX_CUERPO } }, claro, '@font-face{}')
    expect(con).toContain(`<path d="${CUERPOS.hombre.frontal.zonas.pecho}" fill="rgb(5 5 5)"`)
    expect(con).toContain(`<path d="${CUERPOS.hombre.frontal.zonas.biceps}" fill="rgb(2 2 2)"`)
    expect(con).toContain(`<path d="${CUERPOS.hombre.trasera.silueta}" fill="none"`)
    expect(con).toContain('<style>@font-face{}</style>')
    const sin = svgPoster({ ...datos, hoy: [] }, claro)
    expect(sin).not.toContain('HOY')
    expect(sin).not.toContain('<g transform')
  })
})

describe('textos del póster', () => {
  it('parte por palabras, corta las larguísimas y termina con «…» lo que no cabe', () => {
    expect(partirLineas('Torso A', 22, 2)).toEqual(['Torso A'])
    expect(partirLineas('uno dos tres cuatro', 8, 2)).toEqual(['uno dos', 'tres…'])
    expect(partirLineas('Supercalifragilístico', 10, 3)).toEqual(['Supercalif', 'ragilístic', 'o'])
    expect(escaparXml(`<a href='x'>&</a>`)).toBe('&lt;a href=&apos;x&apos;&gt;&amp;&lt;/a&gt;')
  })

  it('el archivo se llama por la rutina y el día, sin acentos', () => {
    expect(nombreArchivoPoster('Pierna & Glúteo (2)', new Date(2026, 9, 9, 18).getTime())).toBe('appfit-pierna-gluteo-2-2026-10-09.png')
    expect(nombreArchivoPoster('¡¡!!', new Date(2026, 0, 1).getTime())).toBe('appfit-entreno-2026-01-01.png')
  })
})
