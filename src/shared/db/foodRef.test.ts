import { describe, expect, it } from 'vitest'
import { camposDeRef, catalogId, claveRef, normalizarGtin, refDe, refDeClave } from './foodRef'

describe('refDe / camposDeRef', () => {
  it('distingue alimento del usuario, del catálogo y rápida', () => {
    expect(refDe({ foodId: 3 })).toEqual({ tipo: 'user', id: 3 })
    expect(refDe({ catalogId: 'usda:1' })).toEqual({ tipo: 'catalog', id: 'usda:1' })
    expect(refDe({})).toBeUndefined()
  })
  it('foodId 0 sigue siendo una referencia', () => {
    expect(refDe({ foodId: 0 })).toEqual({ tipo: 'user', id: 0 })
  })
  it('rechaza las dos referencias a la vez', () => {
    expect(() => refDe({ foodId: 1, catalogId: 'off:1' })).toThrow(/a la vez/)
  })
  it('camposDeRef es la inversa de refDe', () => {
    for (const x of [{ foodId: 2 }, { catalogId: 'off:9' }, {}]) expect(camposDeRef(refDe(x))).toEqual(x)
  })
})

describe('catalogId', () => {
  it('es determinista: fuente:idExterno', () => {
    expect(catalogId('usda', 123456)).toBe('usda:123456')
    expect(catalogId('off', '8412345678901')).toBe('off:8412345678901')
  })
})

describe('normalizarGtin', () => {
  it('deja solo dígitos y rellena a 13', () => {
    expect(normalizarGtin('8412345678901')).toBe('8412345678901')
    expect(normalizarGtin('8 41234 56789 01')).toBe('8412345678901')
    expect(normalizarGtin('036000291452')).toBe('0036000291452') // UPC-A
    expect(normalizarGtin('96385074')).toBe('0000096385074') // EAN-8
  })
  it('un GTIN-14 con 0 inicial equivale al de 13', () => {
    expect(normalizarGtin('08412345678901')).toBe('8412345678901')
    expect(normalizarGtin('18412345678908')).toBe('18412345678908')
  })
  it('rechaza longitudes imposibles', () => {
    expect(normalizarGtin('123')).toBeUndefined()
    expect(normalizarGtin('')).toBeUndefined()
    expect(normalizarGtin('123456789012345')).toBeUndefined()
  })
})

describe('claveRef', () => {
  it('no confunde un alimento propio con uno del catálogo', () => {
    expect(claveRef({ tipo: 'user', id: 3 })).toBe('user:3')
    expect(claveRef({ tipo: 'catalog', id: 'ciqual:3' })).toBe('catalog:ciqual:3')
    expect(claveRef({ tipo: 'user', id: 3 })).not.toBe(claveRef({ tipo: 'catalog', id: '3' }))
  })
})

describe('refDeClave', () => {
  it('es la inversa de claveRef', () => {
    for (const ref of [{ tipo: 'user', id: 3 }, { tipo: 'catalog', id: 'ciqual:1000' }] as const) expect(refDeClave(claveRef(ref))).toEqual(ref)
  })
  it('rechaza claves inválidas', () => {
    for (const c of ['', 'user:', 'user:abc', 'catalog:', 'otro:1']) expect(refDeClave(c)).toBeUndefined()
  })
})
