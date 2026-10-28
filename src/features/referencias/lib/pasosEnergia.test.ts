import { describe, expect, it } from 'vitest'
import type { Perfil } from '../../../shared/db/types'
import { formatNumber } from '../../../shared/lib/format'
import { calcularEnergia, type EnergiaOk } from '../../perfil/lib/energia'
import { pasosEnergia } from './pasosEnergia'

const BASE: Perfil = { sexo: 'hombre', fechaNacimiento: '1999-03-14', alturaCm: 175, actividad: 'moderado' }
function energia(perfil: Partial<Perfil>, observado?: number): EnergiaOk {
  const e = calcularEnergia({ ...BASE, ...perfil }, 74.4, '2026-10-26', observado)
  if (e.estado !== 'ok') throw new Error('perfil incompleto')
  return e
}

describe('pasosEnergia', () => {
  it('sin perfil: los cuatro pasos con su regla y sin cifras tuyas', () => {
    const pasos = pasosEnergia(null)
    expect(pasos.map((p) => p.titulo)).toEqual(['En reposo', 'Con tu deporte', 'Según tu objetivo', 'Con límites'])
    expect(pasos.every((p) => p.tuyo === null)).toBe(true)
    expect(pasos[1].regla).toBe('× 1,2 a 1,9 según cuánto deporte haces')
  })

  it('con perfil: tu reposo, tu factor, tu ajuste y el objetivo final', () => {
    const e = energia({ objetivo: 'volumen', intensidadKcal: 300 })
    const [reposo, deporte, objetivo, limites] = pasosEnergia(e)
    expect(reposo.tuyo).toMatch(/^[\d.]+ kcal$/)
    expect(deporte.tuyo).toMatch(/^× 1,55 = [\d.]+ kcal$/)
    expect(objetivo.tuyo).toBe('Volumen · +300 kcal')
    expect(limites.tuyo).toBe(`= ${formatNumber(e.objetivoKcal!)} kcal`)
  })

  it('sin objetivo elegido no hay cifra final; con gasto observado, el paso del deporte lo dice', () => {
    expect(pasosEnergia(energia({}))[2].tuyo).toBe('Sin elegir')
    expect(pasosEnergia(energia({}))[3].tuyo).toBeNull()
    const obs = pasosEnergia(energia({ objetivo: 'mantenimiento', usarGastoObservado: true }, 2700))
    expect(obs[1].regla).toMatch(/gasto observado/)
  })
})
