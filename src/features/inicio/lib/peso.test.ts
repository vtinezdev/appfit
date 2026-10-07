import { describe, expect, it } from 'vitest'
import type { Peso } from '../../../shared/db/types'
import { fraseVariacion, tendenciaPeso, validarPeso } from './peso'

const p = (fecha: string, kg: number): Peso => ({ id: 0, fecha, kg, createdAt: 0 })

describe('validarPeso', () => {
  it('redondea a 1 decimal y acepta 20–300', () => {
    expect(validarPeso(72.46)).toBe(72.5)
    expect(validarPeso(20)).toBe(20)
    expect(validarPeso(300)).toBe(300)
  })

  it('rechaza lo fuera de rango o no finito', () => {
    for (const x of [19.9, 300.1, 0, -5, Number.NaN, Infinity]) expect(validarPeso(x), String(x)).toBeNull()
  })
})

describe('tendenciaPeso', () => {
  it('sin pesajes (o solo futuros): null', () => {
    expect(tendenciaPeso([], '2026-09-30')).toBeNull()
    expect(tendenciaPeso([p('2026-10-05', 70)], '2026-09-30')).toBeNull()
  })

  it('variación contra el último pesaje con al menos 7 días de antigüedad', () => {
    const t = tendenciaPeso([p('2026-09-20', 73), p('2026-09-23', 72.4), p('2026-09-24', 72.2), p('2026-09-30', 71.8)], '2026-09-30')
    expect(t).toMatchObject({ actual: 71.8, fecha: '2026-09-30', variacion7d: -0.6 })
  })

  it('sin pesaje de hace 7 días o más no hay variación', () => {
    const t = tendenciaPeso([p('2026-09-25', 72), p('2026-09-30', 71.8)], '2026-09-30')
    expect(t?.variacion7d).toBeNull()
  })

  it('el último pesaje puede ser anterior a hoy: la variación se mide desde su fecha', () => {
    const t = tendenciaPeso([p('2026-09-10', 70), p('2026-09-20', 71)], '2026-09-30')
    expect(t).toMatchObject({ actual: 71, fecha: '2026-09-20', variacion7d: 1 })
  })

  it('ordena los pesajes aunque lleguen desordenados', () => {
    const t = tendenciaPeso([p('2026-09-30', 71), p('2026-09-01', 72), p('2026-09-15', 71.5)], '2026-09-30')
    expect(t).toMatchObject({ actual: 71, fecha: '2026-09-30', variacion7d: -0.5 })
  })
})

describe('fraseVariacion', () => {
  it('signo menos tipográfico, un decimal y el mismo tono al subir o bajar', () => {
    expect(fraseVariacion(-0.6)).toBe('−0,6 kg en 7 días')
    expect(fraseVariacion(1.2)).toBe('+1,2 kg en 7 días')
    expect(fraseVariacion(0)).toBe('Sin cambios en 7 días')
  })
})

import { mediaMovilPeso } from './peso'

describe('mediaMovilPeso', () => {
  it('promedia los pesajes de los 7 días naturales que acaban en cada fecha', () => {
    const r = mediaMovilPeso([
      { fecha: '2026-10-07', kg: 70 }, { fecha: '2026-10-01', kg: 72 }, { fecha: '2026-10-03', kg: 71 }, { fecha: '2026-09-20', kg: 80 },
    ])
    expect(r.map((p) => p.fecha)).toEqual(['2026-09-20', '2026-10-01', '2026-10-03', '2026-10-07'])
    expect(r[0].media).toBe(80)
    expect(r[1].media).toBe(72)
    expect(r[2].media).toBe(71.5)
    // el 7 de octubre: ventana 1–7 → 72, 71, 70
    expect(r[3].media).toBe(71)
  })
  it('el 1 de octubre no entra en la ventana del 8', () => {
    const r = mediaMovilPeso([{ fecha: '2026-10-01', kg: 72 }, { fecha: '2026-10-08', kg: 70 }])
    expect(r[1].media).toBe(70)
  })
  it('sin pesajes devuelve vacío', () => {
    expect(mediaMovilPeso([])).toEqual([])
  })
})
