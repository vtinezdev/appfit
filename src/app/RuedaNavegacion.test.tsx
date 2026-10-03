import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import RuedaNavegacion from './RuedaNavegacion'
import { DESTINOS, type Tab } from './navegacion'

const noop = () => {}
describe('rueda de navegación', () => {
  it.each(DESTINOS.map((d) => d.key))('conserva nombres, iconos y destino actual %s', (actual: Tab) => {
    const html = renderToStaticMarkup(<RuedaNavegacion destinos={DESTINOS} actual={actual} onElegir={noop} onClose={noop} />)
    for (const d of DESTINOS) expect(html).toContain(`aria-label="${d.label}"`)
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    expect(html).toContain(`aria-label="${DESTINOS.find((d) => d.key === actual)!.label}" aria-current="page"`)
    expect(html).toContain('aria-label="Cerrar menú"')
    expect(html.match(/h-menu-item w-menu-item/g)).toHaveLength(4)
    expect(html.match(/var\(--menu-orbit\)/g)).toHaveLength(8)
    expect(html).not.toContain('Más destinos')
  })
  it('destinos futuros abren la página que contiene la sección actual', () => {
    const destinos = [...DESTINOS, { key: 'nuevo', label: 'Nueva sección', icon: 'plus' as const }]
    const html = renderToStaticMarkup(<RuedaNavegacion destinos={destinos} actual="nuevo" onElegir={noop} onClose={noop} />)
    expect(html).toContain('aria-label="Nueva sección" aria-current="page"')
    expect(html).toContain('aria-label="Destinos anteriores"')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Más destinos"/)
    expect(html).toContain('2 de 2')
    expect(html).not.toContain('aria-label="Inicio"')
  })
})
