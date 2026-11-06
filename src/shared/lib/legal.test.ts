/// <reference types="node" />
// Las páginas legales (public/*.html) existen, se enlazan entre sí, dicen la misma edad y el mismo contacto, y no cargan
// nada de fuera del propio origen ni scripts en línea (la CSP de public/_headers no los permitiría).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { EDAD_MINIMA, PAGINA_CONOCE, PAGINAS_LEGALES, RUTAS_ESTATICAS_SW, VERSION_TEXTOS_LEGALES } from './legal'

const raiz = join(__dirname, '../../..')
const paginas = Object.values(PAGINAS_LEGALES).map((p) => ({ ...p, html: readFileSync(join(raiz, 'public', p.archivo), 'utf8') }))

/** El correo de contacto de una página: el hueco pendiente o una dirección. */
const contactos = (html: string) => new Set(html.match(/\[CORREO DE CONTACTO\]|[\w.+-]+@[\w-]+\.[\w.]+/g) ?? [])

describe('páginas legales', () => {
  it.each(paginas)('$archivo: título, idioma y enlaces a las otras dos', ({ html, nombre, ruta }) => {
    expect(html).toContain('<html lang="es">')
    expect(html).toContain(`<title>${nombre} · Cumbra Fit</title>`)
    for (const otra of paginas.filter((p) => p.ruta !== ruta)) expect(html).toContain(`href="${otra.ruta}"`)
  })

  it.each(paginas)('$archivo: solo carga recursos del propio origen y ningún script en línea', ({ html }) => {
    for (const [, url] of html.matchAll(/<(?:script|link|img)\b[^>]*\b(?:src|href)="([^"]+)"/g)) expect(url).toMatch(/^\/(?!\/)/)
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/)
  })

  it('privacidad y condiciones nombran al responsable y la edad mínima', () => {
    for (const p of [PAGINAS_LEGALES.privacidad, PAGINAS_LEGALES.condiciones]) {
      const html = paginas.find((x) => x.archivo === p.archivo)!.html
      expect(html).toContain('Victor Martinez')
      expect(html).toContain(`<strong>${EDAD_MINIMA} años o más</strong>`)
    }
  })

  it('su «Última actualización» es la versión que se acepta en la bienvenida', () => {
    const [a, m, d] = VERSION_TEXTOS_LEGALES.split('-').map(Number)
    const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    for (const p of paginas) expect(p.html, p.archivo).toContain(`Última actualización: ${d} de ${MESES[m - 1]} de ${a}`)
  })

  it('las tres dan el mismo correo de contacto', () => {
    const todos = paginas.map((p) => [...contactos(p.html)])
    for (const c of todos) expect(c).toEqual(todos[0])
    expect(todos[0]).toHaveLength(1)
  })
})

describe('service worker', () => {
  it('deja pasar a la página estática cada ruta legal, con o sin .html, y nada más', () => {
    const libre = (ruta: string) => RUTAS_ESTATICAS_SW.some((r) => r.test(ruta))
    for (const p of [...paginas, PAGINA_CONOCE]) {
      expect(libre(p.ruta)).toBe(true)
      expect(libre(`/${p.archivo}`)).toBe(true)
    }
    for (const ruta of ['/', '/index.html', '/privacidades', '/condiciones/otra', '/catalogo/manifest.json']) expect(libre(ruta)).toBe(false)
  })
})

describe('web de la app', () => {
  const html = readFileSync(join(raiz, 'public', PAGINA_CONOCE.archivo), 'utf8')

  it('enlaza la app, las tres páginas legales y da el mismo contacto', () => {
    expect(html).toContain('href="/"')
    for (const p of paginas) expect(html).toContain(`href="${p.ruta}"`)
    expect([...contactos(html)]).toEqual([...contactos(paginas[0].html)])
  })

  it('solo carga recursos del propio origen, sin scripts en línea, y cada captura existe con texto alternativo', () => {
    for (const [, url] of html.matchAll(/<(?:script|link|img)\b[^>]*\b(?:src|href)="([^"]+)"/g)) expect(url).toMatch(/^\/(?!\/)/)
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/)
    const capturas = [...html.matchAll(/<img class="tema-(?:claro|oscuro)" src="([^"]+)"[^>]*\balt="([^"]+)"/g)]
    expect(capturas.length).toBeGreaterThanOrEqual(2)
    for (const [, src] of capturas) expect(existsSync(join(raiz, 'public', src)), src).toBe(true)
  })
})
