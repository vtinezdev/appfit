import { describe, expect, it } from 'vitest'
import { parsear } from './parsear'
import { elegirPorcion, formasPorcion, mapaFormasPorciones, validarPorcion } from './porciones'

const bimbo = { ref: 'user:1', nombre: 'rebanada', nombreNorm: 'rebanada', gramos: 32 }
const bocata = { ref: 'user:2', nombre: 'rebanada', nombreNorm: 'rebanada', gramos: 50 }

describe('validarPorcion', () => {
  it('acepta una palabra y gramos razonables', () => {
    expect(validarPorcion(' Rebanada ', 32)).toEqual({ nombre: 'Rebanada', nombreNorm: 'rebanada', gramos: 32 })
  })
  it.each([['', 30], ['dos palabras', 30], ['loncha2', 30], ['bol', 0], ['bol', 6000], ['bol', NaN]])('rechaza %s / %s', (n, g) => {
    expect(typeof validarPorcion(n, g as number)).toBe('string')
  })
})

describe('formas y mapa', () => {
  it('genera singular y plural', () => {
    expect(formasPorcion('rebanada')).toEqual(expect.arrayContaining(['rebanada', 'rebanadas']))
    expect(mapaFormasPorciones([{ nombreNorm: 'rebanada' }]).get('rebanadas')).toBe('rebanada')
  })
})

describe('el parser reconoce raciones propias como unidad', () => {
  const mapa = mapaFormasPorciones([{ nombreNorm: 'tostada' }, { nombreNorm: 'rebanada' }])
  it('«2 tostadas de pan bimbo» → cantidad 2, unidadPropia tostada', () => {
    expect(parsear('2 tostadas de pan bimbo', mapa)).toMatchObject([{ cantidad: 2, unidadPropia: 'tostada', consulta: 'pan bimbo' }])
  })
  it('conserva la unidad estándar a la vez (rebanada) para poder volver a ella', () => {
    expect(parsear('una rebanada de pan', mapa)).toMatchObject([{ cantidad: 1, unidad: 'rebanada', unidadPropia: 'rebanada', consulta: 'pan' }])
  })
  it('sin raciones propias nada cambia', () => {
    expect(parsear('2 tostadas de pan bimbo')[0].unidadPropia).toBeUndefined()
  })
})

describe('elegirPorcion', () => {
  const candidatas = [{ porcion: bimbo, nombreAlimento: 'Pan Bimbo integral' }, { porcion: bocata, nombreAlimento: 'Pan de bocata' }]
  it('elige la ración del alimento que encaja con lo escrito', () => {
    expect(elegirPorcion('rebanada', 'pan bimbo', candidatas)?.porcion.gramos).toBe(32)
    expect(elegirPorcion('rebanada', 'pan bocata', candidatas)?.porcion.gramos).toBe(50)
  })
  it('sin encaje o sin consulta no elige', () => {
    expect(elegirPorcion('rebanada', 'queso', candidatas)).toBeUndefined()
    expect(elegirPorcion('rebanada', '', candidatas)).toBeUndefined()
    expect(elegirPorcion('bol', 'pan bimbo', candidatas)).toBeUndefined()
  })
})
