import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import TarjetaEnergia from './TarjetaEnergia'

const objetivos = { kcal: 2100, prot: 150, carb: 250, grasa: 70 }
const render = (kcal: number, prot: number, carb: number, grasa: number, o = objetivos) =>
  renderToStaticMarkup(<TarjetaEnergia totales={{ kcal, prot, carb, grasa }} objetivos={o} onAbrir={() => {}} />)

describe('TarjetaEnergia', () => {
  it('rueda con lo consumido por macro y lo que falta; cifras y leyenda en texto', () => {
    const html = render(1240, 92, 130, 39)
    for (const c of ['stroke-kcal-rest', 'stroke-protein', 'stroke-carbs', 'stroke-fat']) expect(html).toContain(c)
    expect(html).toContain('1.240')
    expect(html).toContain('de <strong class="font-semibold text-fg">2.100</strong> kcal')
    expect(html).toContain('Quedan 860 kcal')
    for (const t of ['Proteína', 'Hidratos', 'Grasa', '92 g', '130 g', '39 g']) expect(html).toContain(t)
    expect(html).not.toContain('stroke-surface-muted') // sin segunda vuelta
  })

  it('al pasarse, el exceso da una segunda vuelta y se cuenta sin alarma', () => {
    const html = render(2450, 92, 300, 60)
    expect(html).toContain('stroke-surface-muted')
    expect(html).toContain('350 kcal sobre el objetivo')
    expect(html).not.toContain('destructive')
  })

  it('sin objetivo no inventa meta ni frase', () => {
    const html = render(800, 50, 50, 0, { kcal: 0, prot: 0, carb: 0, grasa: 0 })
    expect(html).not.toContain('de <strong')
    expect(html).not.toContain('Quedan')
    expect(html).toContain('800')
  })

  it('toda la tarjeta es un botón y la rueda queda fuera del árbol accesible', () => {
    const html = render(0, 0, 0, 0)
    expect(html.match(/<button/g)).toHaveLength(1)
    expect(html).toContain('<svg viewBox="0 0 120 120" class="block h-full w-full -rotate-90" aria-hidden="true"')
  })
})
