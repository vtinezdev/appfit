import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { addDays } from '../../../shared/lib/dates'
import { calcularRitmo } from '../lib/ritmo'
import CalendarioSemanas from './CalendarioSemanas'

const HOY = '2026-10-21' // miércoles
const dias = (lunes: string, n: number) => Array.from({ length: n }, (_, i) => addDays(lunes, i))
const ritmo = calcularRitmo({
  hoy: HOY,
  diasEntreno: new Set(['2026-09-28', '2026-09-30', '2026-10-02', '2026-10-13', '2026-10-19']),
  diasRegistro: new Set([...dias('2026-09-28', 5), '2026-10-06']),
})
const render = (onVerRevision?: (lunes: string) => void) =>
  renderToStaticMarkup(<CalendarioSemanas ritmo={ritmo} hoy={HOY} onVerRevision={onVerRevision} />)

describe('CalendarioSemanas › revisiones', () => {
  it('cada semana cerrada con registros es una fila que abre su revisión; la actual y las vacías, no', () => {
    // Sin abrir el desplegable la lista ya está en el HTML (Disclosure la oculta).
    const html = render(() => {})
    const filas = [...html.matchAll(/aria-label="(Semana del [^"]+)\. Ver revisión"/g)].map((m) => m[1])
    expect(filas).toEqual(['Semana del 12 oct, Presente · vuelta', 'Semana del 5 oct, Vacía', 'Semana del 28 sep, Cumplida'])
    expect(html).toContain('Semana del 19 oct')
    expect(html).not.toContain('Semana del 19 oct, En curso. Ver revisión')
  })

  it('sin `onVerRevision` (como antes) la lista no tiene botones de semana', () => {
    expect(render()).not.toContain('Ver revisión')
  })
})
