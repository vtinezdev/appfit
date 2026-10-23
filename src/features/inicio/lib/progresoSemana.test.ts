import { describe, expect, it } from 'vitest'
import { textoKmSemana, textoMetrosSemana, textoPiezasSemana, textoRitmoSemana } from './progresoSemana'

const plan = { entrenos: 3, diasRegistro: 5 }
const semana = (extra: Partial<Parameters<typeof textoRitmoSemana>[0]> = {}) =>
  ({ cumplida: false, pausa: null, entrenos: 2, diasRegistrados: 1, plan, ...extra })

describe('líneas de la semana en las teselas', () => {
  it('metros y km con signo solo si hay algo, sin partir la cifra de su unidad', () => {
    expect(textoMetrosSemana(620)).toBe('+620 m esta semana')
    expect(textoMetrosSemana(0)).toBe('0 m esta semana')
    expect(textoKmSemana(12400)).toBe('+12,4 km esta semana')
    expect(textoKmSemana(0)).toBe('0 km esta semana')
  })

  it('Ritmo: lo hecho del plan y lo que falta, en singular o plural', () => {
    expect(textoRitmoSemana(semana())).toBe('2 de 3 entrenos · falta 1')
    expect(textoRitmoSemana(semana({ entrenos: 0 }))).toBe('0 de 3 entrenos · faltan 3')
    expect(textoRitmoSemana(semana({ entrenos: 4 }))).toBe('4 de 3 entrenos')
    expect(textoRitmoSemana(semana({ plan: { entrenos: 1, diasRegistro: 5 }, entrenos: 0 }))).toBe('0 de 1 entreno · falta 1')
  })

  it('Ritmo: cumplida o en pausa lo dicen sin cifras', () => {
    expect(textoRitmoSemana(semana({ cumplida: true }))).toBe('Semana cumplida')
    expect(textoRitmoSemana(semana({ pausa: { id: 1, desde: '2026-10-19', tipo: 'todo' } as never }))).toBe('En pausa')
  })

  it('Ritmo: con un plan sin entrenos, los días registrados', () => {
    expect(textoRitmoSemana(semana({ plan: { entrenos: 0, diasRegistro: 5 }, entrenos: 0, diasRegistrados: 3 }))).toBe('3 de 5 días · faltan 2')
  })

  it('Vitrina: piezas nuevas', () => {
    expect(textoPiezasSemana(0)).toBe('Ninguna nueva esta semana')
    expect(textoPiezasSemana(1)).toBe('1 nueva esta semana')
    expect(textoPiezasSemana(2)).toBe('2 nuevas esta semana')
  })
})
