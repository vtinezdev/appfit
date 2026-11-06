import { describe, expect, it } from 'vitest'
import { calcularAcceso, dePagoBloqueado, DIAS_PRUEBA, resumenAcceso, type EntornoAcceso } from './acceso'

const APLICA: EntornoAcceso = { aplica: true, desbloqueado: false }

describe('calcularAcceso', () => {
  it('donde el cobro no se aplica, todo abierto aunque la prueba haya pasado', () => {
    const a = calcularAcceso({ primeraApertura: '2026-01-01' }, { aplica: false, desbloqueado: false }, '2026-11-06')
    expect(a).toEqual({ tipo: 'abierto' })
    expect(dePagoBloqueado(a)).toBe(false)
  })

  it('el primer día quedan los treinta; el trigésimo, uno', () => {
    expect(calcularAcceso({ primeraApertura: '2026-11-01' }, APLICA, '2026-11-01')).toEqual({ tipo: 'prueba', quedan: DIAS_PRUEBA, ultimoDia: '2026-11-30' })
    expect(calcularAcceso({ primeraApertura: '2026-11-01' }, APLICA, '2026-11-30')).toEqual({ tipo: 'prueba', quedan: 1, ultimoDia: '2026-11-30' })
  })

  it('al día siguiente del último, la prueba ha terminado y lo de pago queda bloqueado', () => {
    const a = calcularAcceso({ primeraApertura: '2026-11-01' }, APLICA, '2026-12-01')
    expect(a).toEqual({ tipo: 'terminada', ultimoDia: '2026-11-30' })
    expect(dePagoBloqueado(a)).toBe(true)
  })

  it('cruza meses y años y no depende del cambio de hora', () => {
    expect(calcularAcceso({ primeraApertura: '2026-12-15' }, APLICA, '2027-01-13')).toMatchObject({ tipo: 'prueba', quedan: 1 })
    expect(calcularAcceso({ primeraApertura: '2026-03-20' }, APLICA, '2026-04-10')).toMatchObject({ tipo: 'prueba', quedan: 9 })
  })

  it('desbloqueada no caduca', () => {
    expect(calcularAcceso({ primeraApertura: '2020-01-01' }, { aplica: true, desbloqueado: true }, '2026-11-06')).toEqual({ tipo: 'desbloqueado' })
  })

  it('sin primera apertura (un backup recién importado), la prueba empieza hoy', () => {
    expect(calcularAcceso({}, APLICA, '2026-11-06')).toMatchObject({ tipo: 'prueba', quedan: DIAS_PRUEBA })
    expect(calcularAcceso(undefined, APLICA, '2026-11-06')).toMatchObject({ tipo: 'prueba', quedan: DIAS_PRUEBA })
  })

  it('una primera apertura en el futuro (reloj cambiado) no da más de un mes', () => {
    expect(calcularAcceso({ primeraApertura: '2027-06-01' }, APLICA, '2026-11-06')).toMatchObject({ tipo: 'prueba', quedan: DIAS_PRUEBA })
  })
})

describe('resumenAcceso', () => {
  it('cuenta los días, el último y el final; abierto no dice nada', () => {
    expect(resumenAcceso({ tipo: 'abierto' })).toBeNull()
    expect(resumenAcceso({ tipo: 'prueba', quedan: 12, ultimoDia: '2026-11-30' })).toBe('Prueba: quedan 12 días')
    expect(resumenAcceso({ tipo: 'prueba', quedan: 1, ultimoDia: '2026-11-30' })).toBe('Prueba: último día')
    expect(resumenAcceso({ tipo: 'terminada', ultimoDia: '2026-11-30' })).toBe('Prueba terminada')
    expect(resumenAcceso({ tipo: 'desbloqueado' })).toBe('Desbloqueada')
  })
})
