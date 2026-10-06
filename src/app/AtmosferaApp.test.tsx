import { readFileSync, statSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AtmosferaApp from './AtmosferaApp'
import { DESTINOS, type Tab } from './navegacion'

const markup = (tab: Tab) => renderToStaticMarkup(<AtmosferaApp tab={tab} />)
const imagePath = (tab: Tab) => markup(tab).match(/src="([^"]+)"/)![1]

describe('atmósferas de AppFit', () => {
  it('Inicio, Nutrición y Gym tienen escenas distintas sin rasterizar el contenido', () => {
    expect(new Set(['inicio', 'nutricion', 'gym'].map(tab => imagePath(tab as Tab))).size).toBe(3)
  })

  it.each(DESTINOS)('$label: decoración sin controles ni información accesible', ({ key }) => {
    const html = markup(key)
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('alt=""')
    expect(html).not.toMatch(/<(button|a|input|h[1-6])\b/)
    expect(html).toContain('width="960" height="1440"')
  })

  it('imágenes locales ligeras y con procedencia documentada', () => {
    const files = new Set(DESTINOS.flatMap(({ key }) => {
      const light = imagePath(key)
      return [light, light.replace('-claro.webp', '.webp')]
    }))
    let total = 0
    for (const src of files) {
      expect(src).toMatch(/^\/images\/atmosferas\/[a-z]+(?:-claro)?\.webp$/)
      const bytes = statSync(`public${src}`).size
      expect(bytes).toBeLessThan(100_000)
      total += bytes
      const provenance = JSON.parse(readFileSync(`public${src}.json`, 'utf8'))
      expect(JSON.stringify(provenance)).toContain('photorealistic')
    }
    expect(files.size).toBe(6)
    expect(total).toBeLessThan(400_000)
  })
})
