import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import NutrientesDetalle from './NutrientesDetalle'
import MacroInputs from './MacroInputs'

describe('presentación de nutrientes adicionales', () => {
  it('el diario muestra consumo/cobertura y accesos contextuales sin metodología permanente', () => {
    const html = renderToStaticMarkup(<NutrientesDetalle objetivoKcal={2200} entries={[{ nutrientes: { fibra: 30, azucares: 50, sal: 6, agSat: 20 } }]} />)
    expect(html.match(/role="progressbar"/g)).toHaveLength(4)
    for (const nombre of ['Fibra', 'Azúcares', 'Sal', 'Grasas saturadas']) expect(html).toContain(`aria-label="Información sobre ${nombre}"`)
    expect(html.match(/Información disponible en 1 de 1 alimentos<\/p>/g)).toHaveLength(4)
    for (const texto of ['Mín.', 'Máx.', 'sin máximo indicado', 'sin mínimo indicado', 'Referencias diarias y fuentes', 'who.int']) expect(html).not.toContain(texto)
    expect(html.match(/aria-haspopup="dialog"/g)).toHaveLength(4)
  })

  it('no inventa consumos desconocidos ni referencias diarias en la revisión de un alimento', () => {
    const entries = [{ nutrientes: { fibra: 0 } }, {}]
    const diario = renderToStaticMarkup(<NutrientesDetalle objetivoKcal={2000} entries={entries} />)
    expect(diario.match(/role="progressbar"/g)).toHaveLength(1)
    expect(diario).toContain('0 g, suma parcial')
    expect(diario.match(/Sin datos/g)).toHaveLength(3)
    expect(diario).toContain('Información disponible en 0 de 2 alimentos')
    expect(diario).toContain('Información disponible en 1 de 2 alimentos')
    const alimento = renderToStaticMarkup(<NutrientesDetalle entries={entries} />)
    expect(alimento).not.toContain('progressbar')
    expect(alimento).not.toContain('Referencias diarias')
    expect(alimento).not.toContain('Información sobre')
  })

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
    expect(sencillo.match(/inputMode="decimal"/g)).toHaveLength(4)
    expect(detallado.match(/inputMode="decimal"/g)).toHaveLength(8)
    expect(detallado.match(/placeholder="Sin datos"/g)).toHaveLength(4)
    expect(detallado).toContain('aria-label="Fibra/100g"')
    expect(detallado).toContain('aria-label="Grasas saturadas/100g"')
  })
})
