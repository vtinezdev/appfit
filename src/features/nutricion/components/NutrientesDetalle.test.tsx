import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import NutrientesDetalle from './NutrientesDetalle'
import MacroInputs from './MacroInputs'

describe('presentación de nutrientes adicionales', () => {
  it('los valores parciales y desconocidos se distinguen de cero', () => {
    const html = renderToStaticMarkup(<NutrientesDetalle entries={[{ nutrientes: { fibra: 2.5, sal: 0 } }, {}]} />)
    expect(html).toContain('2,5 g')
    expect(html).toContain('0 g')
    expect(html).toContain('Sin datos')
    expect(html.match(/Parcial/g)).toHaveLength(2)
    expect(html).toContain('1 de 2 alimentos')
  })

  it('el formulario detallado ofrece los cuatro extras opcionales; el sencillo conserva solo macros', () => {
    const valores = { kcal100: 100, prot100: 5, carb100: 10, grasa100: 4, nutrientes: { fibra: 0 } }
    const sencillo = renderToStaticMarkup(<MacroInputs valores={valores} onChange={() => {}} />)
    const detallado = renderToStaticMarkup(<MacroInputs detallado valores={valores} onChange={() => {}} />)
    expect(sencillo.match(/type="number"/g)).toHaveLength(4)
    expect(detallado.match(/type="number"/g)).toHaveLength(8)
    expect(detallado.match(/placeholder="Sin datos"/g)).toHaveLength(4)
    expect(detallado).toContain('aria-label="Fibra/100g"')
    expect(detallado).toContain('aria-label="Grasas saturadas/100g"')
  })
})
