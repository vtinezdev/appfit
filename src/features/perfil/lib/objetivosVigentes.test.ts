import { describe, expect, it } from 'vitest'
import { DEFAULT_OBJETIVOS } from '../../../shared/db/settings'
import { kcalDeMacros, objetivosCuadran } from '../../nutricion/lib/objetivos'
import { calcularEnergia } from './energia'
import { objetivosVigentes } from './objetivosVigentes'

const perfil = { sexo: 'hombre', fechaNacimiento: '1996-10-06', alturaCm: 180, actividad: 'moderado', objetivo: 'definicion' } as const
const HOY = '2026-10-06'

describe('objetivos vigentes', () => {
  it('sin energía o incompleta mandan los manuales', () => {
    expect(objetivosVigentes(DEFAULT_OBJETIVOS, null)).toEqual({ ...DEFAULT_OBJETIVOS, origen: 'manual' })
    expect(objetivosVigentes(DEFAULT_OBJETIVOS, calcularEnergia({}, null, HOY))).toMatchObject({ origen: 'manual', kcal: 2200 })
  })
  it('sin objetivo elegido mandan los manuales aunque el perfil esté completo', () => {
    const e = calcularEnergia({ ...perfil, objetivo: undefined }, 80, HOY)
    expect(objetivosVigentes(DEFAULT_OBJETIVOS, e)).toMatchObject({ origen: 'manual', kcal: 2200 })
  })
  it('con perfil y objetivo, las kcal son las del perfil, cuadran y conservan el reparto', () => {
    const e = calcularEnergia(perfil, 80, HOY)
    if (e.estado !== 'ok') throw new Error('ok')
    const v = objetivosVigentes(DEFAULT_OBJETIVOS, e)
    expect(v.origen).toBe('perfil')
    expect(v.kcal).toBe(e.objetivoKcal)
    expect(objetivosCuadran(v)).toBe(true)
    expect(Math.abs(kcalDeMacros(v) - v.kcal)).toBeLessThanOrEqual(5)
    const reparto = (o: typeof v) => (o.prot * 4) / kcalDeMacros(o)
    expect(reparto(v)).toBeCloseTo(reparto({ ...DEFAULT_OBJETIVOS, origen: 'manual' }), 1)
  })
})
