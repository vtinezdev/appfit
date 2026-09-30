import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { tokensConsulta } from '../../../../shared/lib/text'
import { conTildes, corregirTokens, distancia, distanciaMaxima } from './erratas'
import { aCatalogFoods, validarManifest, validarPaquete } from './paquete'

const leer = (archivo: string): unknown => JSON.parse(readFileSync(new URL(`../../../../../public/catalogo/${archivo}`, import.meta.url), 'utf8'))

/**
 * El vocabulario del índice con los genéricos de CIQUAL (`tok` de todos sus alimentos) y su frecuencia. No se usan
 * los productos de marca: sus nombres traen erratas propias («Yougurt») que harían que «yougur» ya encontrara algo
 * y, por diseño, solo se corrige cuando una palabra no encuentra nada.
 */
const FRECUENCIAS = new Map<string, number>()
const ciqual = validarManifest(leer('manifest.json')).fuentes.find((f) => f.id === 'ciqual')!
for (const x of aCatalogFoods(validarPaquete(leer(ciqual.archivo)), 1)) for (const t of x.tok) FRECUENCIAS.set(t, (FRECUENCIAS.get(t) ?? 0) + 1)
const VOCABULARIO = [...FRECUENCIAS.keys()].sort()

const corregir = (q: string) => corregirTokens(tokensConsulta(q), VOCABULARIO, FRECUENCIAS).tokens.join(' ')

describe('distancia (Damerau-Levenshtein)', () => {
  it('sustitución, inserción, borrado y transposición cuentan 1', () => {
    expect(distancia('gato', 'gato', 2)).toBe(0)
    expect(distancia('gato', 'gata', 2)).toBe(1)
    expect(distancia('gato', 'gatos', 2)).toBe(1)
    expect(distancia('gatos', 'gato', 2)).toBe(1)
    expect(distancia('gato', 'gaot', 2)).toBe(1) // transposición
  })
  it('devuelve max + 1 cuando lo supera', () => {
    expect(distancia('gato', 'perro', 1)).toBe(2)
    expect(distancia('abc', 'abcdefg', 2)).toBe(3)
  })
  it('distancia máxima por longitud: 0 (≤3), 1 (4–6), 2 (≥7)', () => {
    expect([1, 3, 4, 6, 7, 12].map(distanciaMaxima)).toEqual([0, 0, 1, 1, 2, 2])
  })
})

describe('corregirTokens con el vocabulario real', () => {
  it('corrige erratas típicas', () => {
    expect(corregir('platno')).toBe('platano')
    expect(corregir('yougur')).toBe('yogur')
    expect(corregir('berengena')).toBe('berenjena')
    expect(corregir('macarrnes')).toBe('macarrones')
    expect(corregir('macarones')).toBe('macaron') // ya existe «macaron» (la galleta): no se «corrige»
    expect(corregir('tomtae')).toBe('tomate') // transposición
    expect(corregir('lentejsa')).toBe('lentejas')
    expect(corregir('zanaoria')).toBe('zanahoria')
  })
  it('corrige solo el token con errata y deja los demás', () => {
    expect(corregir('pechuga de polo')).toBe('pechuga polo')
    expect(corregir('arroz con polol')).toBe('arroz pollo')
  })
  it('no toca una palabra que ya encuentra algo (por prefijo), aunque parezca una errata', () => {
    expect(corregir('platan')).toBe('platan')
    expect(corregir('yog')).toBe('yog')
    expect(corregir('tomat')).toBe('tomat')
    expect(corregir('pollo')).toBe('pollo')
  })
  it('no corrige palabras cortas (≤ 3 letras): demasiados falsos positivos', () => {
    for (const p of ['xyz', 'pnn', 'lch', 'zzz', 'qux']) expect(corregir(p)).toBe(p)
    expect(corregirTokens(['pna'], ['pan', 'pina', 'pena']).corregido).toBe(false)
  })
  it('con 4–6 letras admite 1 letra de diferencia y con 7 o más, 2', () => {
    const vocab = ['manzana', 'pera'].sort()
    expect(corregirTokens(['perx'], vocab).tokens).toEqual(['pera'])
    expect(corregirTokens(['pxrx'], vocab).corregido).toBe(false) // 2 letras en una palabra de 4
    expect(corregirTokens(['manzxnx'], vocab).tokens).toEqual(['manzana']) // 2 letras en una de 7
    expect(corregirTokens(['mxnzxnx'], vocab).corregido).toBe(false) // 3 letras
  })
  it('sin candidata razonable, no cambia nada', () => {
    const r = corregirTokens(['qwertyuiop'], VOCABULARIO)
    expect(r).toEqual({ tokens: ['qwertyuiop'], corregido: false })
  })
  it('indica si algo cambió', () => {
    expect(corregirTokens(['platno'], VOCABULARIO).corregido).toBe(true)
    expect(corregirTokens(['platano'], VOCABULARIO).corregido).toBe(false)
  })
  it('compara también contra el prefijo de la palabra (errata mientras se escribe)', () => {
    // «manzxn» no es prefijo de nada; contra el prefijo «manzan» de «manzana» está a 1.
    expect(corregirTokens(['manzxn'], ['manzana']).tokens).toEqual(['manzana'])
  })
})

describe('conTildes', () => {
  it('recupera las tildes de los nombres de los resultados', () => {
    expect(conTildes(['platano'], ['Plátano, pulpa sin piel, crudo', 'Plátano macho'])).toBe('plátano')
    expect(conTildes(['jamon', 'cocido'], ['Jamón cocido, superior'])).toBe('jamón cocido')
  })
  it('si la palabra no aparece en los nombres, deja el token', () => {
    expect(conTildes(['zzz'], ['Leche'])).toBe('zzz')
  })
})
