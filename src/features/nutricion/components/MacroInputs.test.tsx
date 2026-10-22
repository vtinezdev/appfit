import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import MacroInputs from './MacroInputs'

const render = (kcal100: number, coherencia: boolean, detallado = true) =>
  renderToStaticMarkup(<MacroInputs detallado={detallado} coherencia={coherencia} valores={{ kcal100, prot100: 10, carb100: 30, grasa100: 15 }} onChange={() => {}} />)

describe('MacroInputs › coherencia energética', () => {
  it('kcal que no cuadran: aviso con las esperadas y «Calcular kcal desde los macros»', () => {
    const html = render(200, true)
    expect(html).toContain('role="status"')
    expect(html).toContain('Con estos macros salen unas 295 kcal, no 200.')
    expect(html).toContain('Calcular kcal desde los macros')
  })

  it('el aviso va bajo los cuatro campos principales, antes de fibra, azúcares, sal y grasas saturadas', () => {
    const html = render(200, true)
    expect(html.indexOf('Grasa/100g')).toBeLessThan(html.indexOf('salen unas'))
    expect(html.indexOf('salen unas')).toBeLessThan(html.indexOf('Fibra/100g'))
  })

  it('kcal que cuadran, o sin pedir la comprobación (catálogo sin tocar, receta): sin aviso', () => {
    expect(render(295, true)).not.toContain('salen unas')
    expect(render(200, false)).not.toContain('salen unas')
  })
})
