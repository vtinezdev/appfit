import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Button from '../../../shared/components/Button'
import ResumenNutricional from './ResumenNutricional'
import NutrientesDetalle from './NutrientesDetalle'

const objetivos = { kcal: 2200, prot: 150, carb: 220, grasa: 70 }
const totales = { kcal: 113, prot: 6, carb: 9, grasa: 6 }

describe('ResumenNutricional: panel diario compartido', () => {
  it.each([false, true])('mantiene kcal, objetivos y macros en diario e Inicio (integrado: %s)', integrado => {
    const html = renderToStaticMarkup(<ResumenNutricional totales={totales} objetivos={objetivos} integrado={integrado} />)
    expect(html).toContain('<section aria-label="Resumen del día">')
    expect(html).toContain('Quedan 2.087 kcal')
    expect(html.match(/role="progressbar"/g)).toHaveLength(4)
    for (const label of ['Calorías', 'Proteína', 'Carbohidratos', 'Grasa']) expect(html).toContain(`aria-label="${label}"`)
    expect(html).not.toContain('data-surface="inverse"')
  })

  it('mantiene Ver día en la cabecera de Inicio y el título accesible', () => {
    const html = renderToStaticMarkup(<ResumenNutricional titulo="Resumen de hoy" totales={totales} objetivos={objetivos} accion={<Button onClick={() => {}}>Ver día</Button>} />)
    expect(html).toContain('aria-label="Resumen de hoy"')
    expect(html).toContain('Nutrición · hoy')
    expect(html).toContain('Ver día</button>')
  })

  it('incluye el desglose opcional dentro de la misma tarjeta y conserva los valores desconocidos', () => {
    const html = renderToStaticMarkup(<ResumenNutricional totales={totales} objetivos={objetivos} detalle={<NutrientesDetalle entries={[{ nutrientes: { fibra: 2, azucares: 0 } }, {}]} titulo="Desglose del día" />} />)
    expect(html).toContain('aria-label="Desglose del día"')
    expect(html).toContain('Parcial · 1 de 2 alimentos')
    expect(html).toContain('Sin datos')
    expect(html).toContain('</section></div></section>')
  })

  it('conserva el exceso en texto y en las barras, sin tratarlo como error', () => {
    const html = renderToStaticMarkup(<ResumenNutricional totales={{ kcal: 2500, prot: 200, carb: 250, grasa: 80 }} objetivos={objetivos} />)
    expect(html).toContain('300 kcal sobre el objetivo')
    expect(html).toContain('aria-valuemax="2500"')
    expect(html).toContain('200 de 150 g, 50 g sobre el objetivo')
    expect(html).not.toContain('destructive')
  })

  it('un día vacío o sin objetivos conserva sus cifras y no inventa metas', () => {
    const html = renderToStaticMarkup(<ResumenNutricional totales={{ kcal: 0, prot: 0, carb: 0, grasa: 0 }} objetivos={{ kcal: 0, prot: 0, carb: 0, grasa: 0 }} />)
    expect(html.match(/aria-valuenow="0"/g)).toHaveLength(4)
    expect(html).not.toContain('Quedan')
    expect(html).not.toContain('de <strong')
    expect(html).not.toContain('Desglose del día')
  })
})
