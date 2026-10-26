import { describe, expect, it } from 'vitest'
import type { Perfil } from '../../../shared/db/types'
import { calcularEnergia, type EnergiaOk } from './energia'
import { tramosEnergia } from './tramosEnergia'

const BASE: Perfil = { sexo: 'hombre', fechaNacimiento: '1999-03-14', alturaCm: 175, actividad: 'moderado' }
function energia(perfil: Partial<Perfil>, observado?: number): EnergiaOk {
  const e = calcularEnergia({ ...BASE, ...perfil }, 74.4, '2026-10-26', observado)
  if (e.estado !== 'ok') throw new Error('perfil incompleto')
  return e
}
const suma = (pcts: { pct: number }[]) => pcts.reduce((t, p) => t + p.pct, 0)

describe('tramosEnergia', () => {
  it('volumen: reposo, actividad y el superávit al final; los anchos suman 100', () => {
    const e = energia({ objetivo: 'volumen', intensidadKcal: 300 })
    const { barra, filas } = tramosEnergia(e)
    expect(barra.map((b) => b.estilo)).toEqual(['reposo', 'actividad', 'superavit'])
    expect(suma(barra)).toBeCloseTo(100)
    expect(barra[2].pct).toBeCloseTo((300 / (e.get + 300)) * 100)
    expect(filas.map((f) => [f.etiqueta, f.kcal])).toEqual([['En reposo', expect.any(String)], ['Actividad', expect.stringMatching(/^\+/)], ['Volumen', '+300']])
  })

  it('definición: el déficit se recorta del final del gasto y la barra mide el gasto', () => {
    const e = energia({ objetivo: 'definicion', intensidadKcal: 400 })
    const { barra, filas } = tramosEnergia(e)
    expect(barra.map((b) => b.estilo)).toEqual(['reposo', 'actividad', 'deficit'])
    expect(suma(barra)).toBeCloseTo(100)
    expect(barra[2].pct).toBeCloseTo((400 / e.get) * 100)
    expect(barra[0].pct).toBeCloseTo((e.tmb.valor / e.get) * 100)
    expect(filas.at(-1)).toMatchObject({ estilo: 'deficit', etiqueta: 'Definición', kcal: '−400' })
  })

  it('mantenimiento o sin objetivo: sin fila de ajuste', () => {
    expect(tramosEnergia(energia({ objetivo: 'mantenimiento' })).filas.map((f) => f.estilo)).toEqual(['reposo', 'actividad'])
    expect(tramosEnergia(energia({})).barra.map((b) => b.estilo)).toEqual(['reposo', 'actividad'])
  })

  it('con el gasto observado no se separa reposo y actividad', () => {
    const e = energia({ objetivo: 'volumen', intensidadKcal: 300, usarGastoObservado: true }, 2650)
    const { barra, filas } = tramosEnergia(e)
    expect(e.origenGet).toBe('observado')
    expect(barra.map((b) => b.estilo)).toEqual(['observado', 'superavit'])
    expect(filas[0]).toMatchObject({ etiqueta: 'Gasto observado', kcal: '2.650' })
    expect(filas[0].detalle).toMatch(/^En lugar del estimado/)
  })
})
