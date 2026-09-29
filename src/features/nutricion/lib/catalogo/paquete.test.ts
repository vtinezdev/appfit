import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { aCatalogFoods, validarManifest, validarPaquete, type Paquete } from './paquete'

const entrada = {
  id: 'ciqual',
  version: '2025-es1',
  archivo: 'ciqual-2025-es1.json',
  filas: 2,
  licencia: 'Licence Ouverte Etalab 2.0',
  atribucion: 'ANSES, Ciqual',
}

const paquete = () => ({
  formato: 1,
  fuente: 'ciqual',
  version: '2025-es1',
  filas: [
    ['1', 'Leche entera', 'Lait entier', 'Lácteos', 64, 3.3, 4.7, 3.6],
    ['2', 'Ñoquis de patata', 'Gnocchi', 'Platos', 150, 4, 30, 1, {}, ['ñoqui']],
    ['3', 'Manzana', 'Pomme', 'Frutas', 52, 0.3, 11.4, 0.2, { fibra: 2, sal: 0 }],
  ],
})

describe('validarManifest', () => {
  it('acepta un manifest válido', () => {
    expect(validarManifest({ formato: 1, fuentes: [entrada] }).fuentes[0].id).toBe('ciqual')
  })
  it('rechaza otro formato, campos que faltan y fuentes repetidas', () => {
    expect(() => validarManifest({ formato: 2, fuentes: [] })).toThrow(/formato/)
    expect(() => validarManifest(null)).toThrow(/objeto/)
    expect(() => validarManifest({ formato: 1 })).toThrow(/fuentes/)
    expect(() => validarManifest({ formato: 1, fuentes: [{ ...entrada, version: undefined }] })).toThrow(/version/)
    expect(() => validarManifest({ formato: 1, fuentes: [{ ...entrada, filas: -1 }] })).toThrow(/filas/)
    expect(() => validarManifest({ formato: 1, fuentes: [entrada, entrada] })).toThrow(/repetida/)
  })
  it('el archivo debe ser un nombre simple, sin rutas', () => {
    for (const archivo of ['../x.json', 'a/b.json', 'https://evil.test/x.json', '.oculto']) {
      expect(() => validarManifest({ formato: 1, fuentes: [{ ...entrada, archivo }] })).toThrow(/archivo/)
    }
  })
})

describe('validarPaquete', () => {
  it('acepta un paquete válido', () => {
    expect(validarPaquete(paquete()).filas).toHaveLength(3)
  })
  it('rechaza otro formato o estructura', () => {
    expect(() => validarPaquete({ ...paquete(), formato: 2 })).toThrow(/formato/)
    expect(() => validarPaquete({ ...paquete(), version: '' })).toThrow(/version/)
    expect(() => validarPaquete({ ...paquete(), filas: 'x' })).toThrow(/filas/)
    expect(() => validarPaquete('hola')).toThrow(/objeto/)
  })
  it('rechaza filas corruptas nombrando la fila', () => {
    const con = (i: number, campo: number, valor: unknown) => {
      const p = paquete()
      ;(p.filas[i] as unknown[])[campo] = valor
      return p
    }
    expect(() => validarPaquete(con(0, 4, Number.NaN))).toThrow(/fila 1.*kcal/)
    expect(() => validarPaquete(con(0, 5, -1))).toThrow(/prot/)
    expect(() => validarPaquete(con(0, 6, '4'))).toThrow(/carb/)
    expect(() => validarPaquete(con(1, 1, ' '))).toThrow(/fila 2.*nombre/)
    expect(() => validarPaquete(con(2, 8, { fibra: Infinity }))).toThrow(/fibra/)
    expect(() => validarPaquete(con(2, 8, { vitC: 3 }))).toThrow(/vitC/)
    expect(() => validarPaquete(con(1, 9, 'ñoqui'))).toThrow(/alias/)
    expect(() => validarPaquete(con(1, 9, [''])) ).toThrow(/alias/)
  })
  it('rechaza filas cortas y ids repetidos', () => {
    const corta = paquete()
    corta.filas[0] = ['1', 'x'] as never
    expect(() => validarPaquete(corta)).toThrow(/entre 8 y 10/)
    const repetida = paquete()
    repetida.filas[1][0] = '1'
    expect(() => validarPaquete(repetida)).toThrow(/repetido/)
  })
})

describe('aCatalogFoods', () => {
  const foods = aCatalogFoods(validarPaquete(paquete()), 1234)

  it('rellena los campos fijos', () => {
    expect(foods[0]).toEqual({
      id: 'ciqual:1',
      fuente: 'ciqual',
      idExterno: '1',
      nombre: 'Leche entera',
      nombreOriginal: 'Lait entier',
      nombreNorm: 'leche entera',
      tok: ['leche', 'entera'],
      tipo: 'generico',
      categoria: 'Lácteos',
      kcal100: 64,
      prot100: 3.3,
      carb100: 4.7,
      grasa100: 3.6,
      completitud: 0.5,
      version: '2025-es1',
      importadoAt: 1234,
    })
    expect(foods[0]).not.toHaveProperty('nutrientes')
  })
  it('el alias entra en tok pero el nombre mostrado no cambia; nutrientes {} no se guarda', () => {
    expect(foods[1].tok).toEqual(['noquis', 'de', 'patata', 'noqui'])
    expect(foods[1].nombre).toBe('Ñoquis de patata')
    expect(foods[1].nombreNorm).toBe('noquis de patata')
    expect(foods[1]).not.toHaveProperty('nutrientes')
    expect(foods[1].completitud).toBe(0.5)
  })
  it('nutrientes conocidos (también 0) y completitud = (4 + claves) / 8', () => {
    expect(foods[2].nutrientes).toEqual({ fibra: 2, sal: 0 })
    expect(foods[2].completitud).toBe(0.75)
  })
  it('un alias con otras palabras se puede buscar', () => {
    const p: Paquete = { formato: 1, fuente: 'ciqual', version: 'v', filas: [['9', 'Pan', '', '', 1, 1, 1, 1, {}, ['bocata']]] }
    const [f] = aCatalogFoods(p, 1)
    expect(f.tok).toEqual(['pan', 'bocata'])
    expect(f).not.toHaveProperty('nombreOriginal')
    expect(f).not.toHaveProperty('categoria')
  })
})

describe('paquete publicado en public/catalogo', () => {
  const leer = (archivo: string): unknown => JSON.parse(readFileSync(new URL(`../../../../../public/catalogo/${archivo}`, import.meta.url), 'utf8'))

  it('el manifest y sus paquetes son válidos y coherentes', () => {
    const manifest = validarManifest(leer('manifest.json'))
    expect(manifest.fuentes.length).toBeGreaterThan(0)
    for (const f of manifest.fuentes) {
      const p = validarPaquete(leer(f.archivo))
      expect(p.fuente).toBe(f.id)
      expect(p.version).toBe(f.version)
      expect(p.filas).toHaveLength(f.filas)
      const foods = aCatalogFoods(p, 1)
      expect(new Set(foods.map((x) => x.id)).size).toBe(foods.length)
      expect(foods.every((x) => x.tok.length > 0)).toBe(true)
    }
  })
})
