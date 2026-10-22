import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { addDays } from '../../../shared/lib/dates'
import { tendenciaPeso } from '../lib/peso'
import AccesoPeso from './AccesoPeso'

const HOY = '2026-10-22'
const render = (pesos: { fecha: string; kg: number }[]) => {
  const conId = pesos.map((p, i) => ({ ...p, id: i + 1, createdAt: i }))
  const texto = renderToStaticMarkup(
    <AccesoPeso tendencia={tendenciaPeso(conId, HOY)} pesos={pesos} hoy={HOY} onRegistrar={() => {}} onVerHistorial={() => {}} />,
  )
  return texto.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
}

describe('AccesoPeso', () => {
  it('con pesajes de varias semanas: media de 7 días, ritmo y último pesaje en pequeño', () => {
    const t = render(Array.from({ length: 28 }, (_, i) => ({ fecha: addDays(HOY, i - 27), kg: 82 - 0.05 * i })))
    expect(t).toContain('80,8 kg · media 7 días')
    expect(t).toContain('−0,4 kg/sem')
    expect(t).toContain('Último: 80,7 kg')
    expect(t).not.toContain('en 7 días ')
  })

  it('con media pero sin ritmo (pocas semanas): la variación a 7 días de siempre', () => {
    const t = render([{ fecha: addDays(HOY, -9), kg: 81.4 }, { fecha: addDays(HOY, -2), kg: 81 }, { fecha: HOY, kg: 80.6 }])
    expect(t).toContain('80,8 kg · media 7 días')
    expect(t).toContain('−0,8 kg en 7 días')
    expect(t).toContain('Último: 80,6 kg')
  })

  it('un solo pesaje en la semana: el último como cifra y dice qué falta para la media', () => {
    const t = render([{ fecha: addDays(HOY, -10), kg: 81.2 }, { fecha: HOY, kg: 80.6 }])
    expect(t).toContain('80,6 kg ')
    expect(t).not.toContain('media 7 días')
    expect(t).toContain('−0,6 kg en 7 días')
    expect(t).toContain('La media sale con 2 pesajes en 7 días')
  })

  it('sin pesajes', () => {
    expect(render([])).toContain('Sin pesajes')
  })
})
