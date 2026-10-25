import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { IDS_NUTRIENTES, referenciaNutricional, textoReferencia } from '../../../shared/lib/referenciasNutricionales'
import ReferenciaNutrienteContenido from './ReferenciaNutrienteContenido'

describe('contenido común del detalle contextual y Referencias', () => {
  it.each(IDS_NUTRIENTES)('%s muestra el valor, criterio y fuente del registro central', id => {
    const referencia = referenciaNutricional(id, { kcal: 1800, prot: 100, carb: 200, grasa: 60 })
    const html = renderToStaticMarkup(<ReferenciaNutrienteContenido referencia={referencia} />)
    expect(html).toContain(textoReferencia(referencia).replace('<', '&lt;'))
    expect(html).toContain(referencia.fuente.nombre)
    expect(html).toContain('Criterio utilizado')
    if (referencia.fuente.url) expect(html).toContain('rel="noopener noreferrer"')
  })
})
