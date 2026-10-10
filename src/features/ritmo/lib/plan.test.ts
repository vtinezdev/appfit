import { describe, expect, it } from 'vitest'
import { cambiarPlan, evaluarSemana, normalizarPlan, PLAN_POR_DEFECTO, planDeSemana } from './plan'

const SEMANA = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']

describe('planDeSemana / cambiarPlan', () => {
  it('sin tramos rige el plan por defecto (3 entrenos y 5 días)', () => {
    expect(planDeSemana(undefined, '2026-10-05')).toEqual(PLAN_POR_DEFECTO)
    expect(PLAN_POR_DEFECTO).toEqual({ entrenos: 3, diasRegistro: 5 })
  })

  it('la primera vez que se elige un plan vale también para las semanas anteriores', () => {
    const tramos = cambiarPlan(undefined, { entrenos: 4, diasRegistro: 6 }, '2026-10-05')
    expect(planDeSemana(tramos, '2026-01-05')).toEqual({ entrenos: 4, diasRegistro: 6 })
  })

  it('cambiarlo después no toca las semanas pasadas y sustituye el de la semana actual', () => {
    let tramos = cambiarPlan(undefined, { entrenos: 4, diasRegistro: 6 }, '2026-09-07')
    tramos = cambiarPlan(tramos, { entrenos: 3, diasRegistro: 5 }, '2026-10-05')
    tramos = cambiarPlan(tramos, { entrenos: 5, diasRegistro: 7 }, '2026-10-05')
    expect(tramos).toHaveLength(2)
    expect(planDeSemana(tramos, '2026-09-28')).toEqual({ entrenos: 4, diasRegistro: 6 })
    expect(planDeSemana(tramos, '2026-10-05')).toEqual({ entrenos: 5, diasRegistro: 7 })
    expect(planDeSemana(tramos, '2026-12-07')).toEqual({ entrenos: 5, diasRegistro: 7 })
  })

  it('acota valores fuera de rango (p. ej. de un backup editado a mano)', () => {
    expect(normalizarPlan({ entrenos: 12, diasRegistro: 1 })).toEqual({ entrenos: 6, diasRegistro: 3 })
    expect(normalizarPlan({ entrenos: Number.NaN, diasRegistro: 4.4 })).toEqual({ entrenos: 3, diasRegistro: 4 })
  })
})

describe('evaluarSemana', () => {
  const plan = { entrenos: 3, diasRegistro: 5 }
  const entrenos = new Set(['2026-10-05', '2026-10-07', '2026-10-09'])
  const registro = new Set(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-10'])

  it('cumplida con entrenos y días registrados; marca el día en que se cumplió', () => {
    const e = evaluarSemana(SEMANA, entrenos, registro, plan, '2026-10-11')
    expect(e).toMatchObject({ entrenos: 3, diasRegistrados: 5, cumplida: true, cumplidaEl: '2026-10-10' })
  })

  it('solo cuentan los días hasta hoy', () => {
    const e = evaluarSemana(SEMANA, entrenos, registro, plan, '2026-10-08')
    expect(e).toMatchObject({ entrenos: 2, diasRegistrados: 4, cumplida: false, cumplidaEl: null })
  })

  it('con la nutrición excluida basta con los entrenos', () => {
    const e = evaluarSemana(SEMANA, entrenos, null, plan, '2026-10-11')
    expect(e).toMatchObject({ diasRegistrados: null, cumplida: true, cumplidaEl: '2026-10-09' })
  })

  it('le falta uno de los dos: no cumplida', () => {
    expect(evaluarSemana(SEMANA, new Set(['2026-10-05']), registro, plan, '2026-10-11').cumplida).toBe(false)
  })
})
