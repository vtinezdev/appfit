import { describe, expect, it } from 'vitest'
import { GeminiError, interpretarComida, validarResultado } from './gemini'

describe('validarResultado', () => {
  it('acepta un JSON válido con un item', () => {
    const resultado = validarResultado({
      items: [{ nombre: 'Pollo', gramos: 150, kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6 }],
    })
    expect(resultado.items).toHaveLength(1)
    expect(resultado.items[0].nombre).toBe('Pollo')
  })

  it('incluye la transcripción si viene en la respuesta', () => {
    const resultado = validarResultado({
      transcripcion: 'he comido pollo',
      items: [{ nombre: 'Pollo', gramos: 150, kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6 }],
    })
    expect(resultado.transcripcion).toBe('he comido pollo')
  })

  it('rechaza una respuesta sin items', () => {
    expect(() => validarResultado({ items: [] })).toThrow(GeminiError)
    expect(() => validarResultado({})).toThrow(GeminiError)
  })

  it('rechaza un item sin nombre', () => {
    expect(() => validarResultado({ items: [{ gramos: 100, kcal100: 1, prot100: 1, carb100: 1, grasa100: 1 }] })).toThrow(GeminiError)
  })

  it('rechaza valores numéricos negativos', () => {
    expect(() =>
      validarResultado({ items: [{ nombre: 'Pollo', gramos: -10, kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6 }] }),
    ).toThrow(GeminiError)
  })

  it('rechaza valores no numéricos', () => {
    expect(() =>
      validarResultado({ items: [{ nombre: 'Pollo', gramos: 'mucho', kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6 }] }),
    ).toThrow(GeminiError)
  })

  it('rechaza una respuesta que no es un objeto', () => {
    expect(() => validarResultado(null)).toThrow(GeminiError)
    expect(() => validarResultado('texto')).toThrow(GeminiError)
  })
})

describe('interpretarComida', () => {
  it('lanza un error claro si falta la API key', async () => {
    await expect(
      interpretarComida({ apiKey: '', modelo: 'gemini-3.8-flash', texto: 'pollo', alimentosConocidos: [] }),
    ).rejects.toThrow(/API key/)
  })

  it('lanza un error claro si no hay texto ni audio', async () => {
    await expect(
      interpretarComida({ apiKey: 'fake', modelo: 'gemini-3.8-flash', alimentosConocidos: [] }),
    ).rejects.toThrow(/texto ni audio/)
  })
})
