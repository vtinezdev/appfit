import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ResumenTarjetaRevision } from '../hooks/useRevisionSemanal'
import { semanaDe } from '../lib/revisionSemanal'
import TarjetaRevisionSemanal from './TarjetaRevisionSemanal'

const nutricion = { diasRegistrados: 6, kcalMedia: 2310, protMedia: 150, kcalObjetivo: 2200, protObjetivo: 150, adherencia: 67, diasEnRango: 4, diferenciaKcal: -40 }
const base: ResumenTarjetaRevision = {
  semana: semanaDe('2026-10-05'),
  cerradaAntes: undefined,
  peso: { media: 79.2, pesajes: 3, diferencia: -0.6 },
  nutricion,
  sesiones: 4,
  sesionesAnterior: 3,
}
const render = (r: Partial<ResumenTarjetaRevision> = {}) =>
  renderToStaticMarkup(<TarjetaRevisionSemanal resumen={{ ...base, ...r }} onVer={() => {}} onCerrar={() => {}} />)

describe('TarjetaRevisionSemanal', () => {
  it('semana, peso medio, kcal frente al objetivo y entrenos con su cambio, sin acento ni color de juicio', () => {
    const html = render()
    for (const t of ['5–11 oct', '79,2 kg', '−0,6 kg', '2.310', 'objetivo 2.200', '+1', 'Hecho', 'Ver revisión']) expect(html).toContain(t)
    expect(html).not.toContain('bg-accent')
    expect(html).not.toContain('destructive')
    expect(html.match(/<button/g)).toHaveLength(2)
  })

  it('sin pesajes ni comidas lo dice en su fila, sin cifras inventadas', () => {
    const html = render({
      peso: { media: null, pesajes: 0, diferencia: null },
      nutricion: { ...nutricion, diasRegistrados: 0, kcalMedia: null, kcalObjetivo: null, diferenciaKcal: null },
      sesiones: 2,
      sesionesAnterior: 2,
    })
    for (const t of ['Sin pesajes', 'Sin registros', 'Sin cambios']) expect(html).toContain(t)
    expect(html).not.toContain('objetivo')
  })
})
