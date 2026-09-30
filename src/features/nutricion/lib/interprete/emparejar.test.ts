import { describe, expect, it } from 'vitest'
import type { CatalogFood, Food } from '../../../../shared/db/types'
import { normalizeName, tokenizar } from '../../../../shared/lib/text'
import { coincidenciaFuerte, emparejar, MAX_ALTERNATIVAS } from './emparejar'

let siguiente = 1
function propio(nombre: string): Food {
  return { id: siguiente++, nombre, nombreNorm: normalizeName(nombre), kcal100: 100, prot100: 1, carb100: 1, grasa100: 1, fuente: 'manual', updatedAt: 0 }
}

function cat(idExterno: string, nombre: string): CatalogFood {
  return {
    id: `ciqual:${idExterno}`, fuente: 'ciqual', idExterno, nombre, nombreNorm: normalizeName(nombre), tok: tokenizar(nombre),
    tipo: 'generico', kcal100: 100, prot100: 1, carb100: 1, grasa100: 1, version: '1', importadoAt: 0,
  }
}

describe('coincidenciaFuerte', () => {
  it('todas las palabras de la consulta están y el nombre empieza por una', () => {
    expect(coincidenciaFuerte('Arroz blanco cocido', 'arroz')).toBe(true)
    expect(coincidenciaFuerte('Huevos camperos', 'huevo')).toBe(true)
    expect(coincidenciaFuerte('Pechuga de pollo', 'pechuga pollo')).toBe(true)
    expect(coincidenciaFuerte('Tomates cherry', 'tomat')).toBe(true)
  })

  it('no si el alimento es otra cosa que contiene la palabra', () => {
    expect(coincidenciaFuerte('Tortilla de patatas', 'patata')).toBe(false)
    expect(coincidenciaFuerte('Pechuga de pollo', 'pollo')).toBe(false)
    expect(coincidenciaFuerte('Arroz', 'arroz pollo')).toBe(false)
  })
})

describe('emparejar', () => {
  it('uno tuyo con coincidencia fuerte gana al catálogo', () => {
    const mio = propio('Arroz blanco cocido')
    const r = emparejar({ consulta: 'arroz', propios: [mio], catalogo: [cat('1', 'Arroz blanco, crudo')] })
    expect(r.mejor?.ref).toEqual({ tipo: 'user', id: mio.id })
    expect(r.alternativas.map((a) => a.nombre)).toEqual(['Arroz blanco, crudo'])
  })

  it('uno tuyo con coincidencia débil no gana al catálogo, pero queda como alternativa', () => {
    const mio = propio('Tortilla de patatas')
    const r = emparejar({ consulta: 'patata', propios: [mio], catalogo: [cat('1', 'Patata, hervida')] })
    expect(r.mejor?.nombre).toBe('Patata, hervida')
    expect(r.alternativas.map((a) => a.nombre)).toEqual(['Tortilla de patatas'])
  })

  it('sin nada en el catálogo, vale uno tuyo aunque sea débil', () => {
    const mio = propio('Tortilla de patatas')
    expect(emparejar({ consulta: 'patata', propios: [mio], catalogo: [] }).mejor?.nombre).toBe('Tortilla de patatas')
  })

  it('sin candidatos no hay mejor ni alternativas', () => {
    expect(emparejar({ consulta: 'xyz', propios: [], catalogo: [] })).toEqual({ mejor: undefined, alternativas: [] })
  })

  it('el preferido va primero aunque el ranking diga otra cosa', () => {
    const catalogo = [cat('1', 'Pasta de almendra'), cat('2', 'Pasta seca, cruda')]
    expect(emparejar({ consulta: 'pasta', propios: [], catalogo, preferido: 'ciqual:2' }).mejor?.nombre).toBe('Pasta seca, cruda')
  })

  it('las formas procesadas van detrás salvo que la consulta las nombre', () => {
    const catalogo = [cat('1', 'Huevo, en polvo'), cat('2', 'Huevo, clara, cruda'), cat('3', 'Manzana, deshidratada')]
    expect(emparejar({ consulta: 'huevo', propios: [], catalogo }).alternativas.map((a) => a.nombre)).toEqual(['Huevo, en polvo', 'Manzana, deshidratada'])
    expect(emparejar({ consulta: 'huevo', propios: [], catalogo }).mejor?.nombre).toBe('Huevo, clara, cruda')
    expect(emparejar({ consulta: 'huevo polvo', propios: [], catalogo }).mejor?.nombre).toBe('Huevo, en polvo')
  })

  it(`como mucho ${MAX_ALTERNATIVAS} alternativas: dos tuyas, luego el catálogo y después el resto de las tuyas`, () => {
    const propios = ['Queso A', 'Queso B', 'Queso C'].map(propio)
    const catalogo = ['Queso 1', 'Queso 2', 'Queso 3', 'Queso 4'].map((n, i) => cat(String(i), n))
    const r = emparejar({ consulta: 'queso', propios, catalogo })
    expect(r.mejor?.nombre).toBe('Queso A')
    expect(r.alternativas.map((a) => a.nombre)).toEqual(['Queso B', 'Queso 1', 'Queso 2', 'Queso 3', 'Queso 4'])
  })
})
