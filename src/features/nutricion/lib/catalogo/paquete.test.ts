import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { aCatalogFoods, validarManifest, validarPaquete, type Paquete } from './paquete'

const entrada = {
  id: 'ciqual',
  version: '2025-es2',
  archivo: 'ciqual-2025-es2.json',
  filas: 2,
  licencia: 'Licence Ouverte Etalab 2.0',
  atribucion: 'ANSES, Ciqual',
}

const paquete = () => ({
  formato: 2,
  fuente: 'ciqual',
  version: '2025-es2',
  tipo: 'generico',
  filas: [
    ['1', 'Leche entera', 'Lait entier', 'Leche y nata', 64, 3.3, 4.7, 3.6],
    ['2', 'Ñoquis de patata', 'Gnocchi', 'Platos preparados', 150, 4, 30, 1, {}, { alias: ['ñoqui'] }],
    ['3', 'Manzana', 'Pomme', 'Frutas', 52, 0.3, 11.4, 0.2, { fibra: 2, sal: 0 }],
  ] as unknown[][],
})

const productos = () => ({
  formato: 2,
  fuente: 'offes',
  version: '2026-09-30',
  tipo: 'marca',
  filas: [
    ['8410000000017', 'Yogur natural', '', 'Yogures y postres lácteos', 60, 4, 5, 3, { azucares: 5 }, { marca: 'Hacendado' }],
    ['8410000000024', 'Cerveza sin alcohol', '', 'Bebidas', 20, 0, 4.5, 0, {}, { marca: 'Mahou', ml: 1 }],
  ] as unknown[][],
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

describe('validarPaquete (formato 2)', () => {
  it('acepta un paquete válido', () => {
    expect(validarPaquete(paquete()).filas).toHaveLength(3)
    expect(validarPaquete(productos()).tipo).toBe('marca')
  })
  it('rechaza el formato 1 (los paquetes se republicaron), otro tipo y otra estructura', () => {
    expect(() => validarPaquete({ ...paquete(), formato: 1 })).toThrow(/formato 1.*se esperaba 2/)
    expect(() => validarPaquete({ ...paquete(), tipo: 'otro' })).toThrow(/tipo/)
    expect(() => validarPaquete({ ...paquete(), tipo: undefined })).toThrow(/tipo/)
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
  })
  it('valida el objeto extra', () => {
    const con = (extra: unknown) => {
      const p = paquete()
      ;(p.filas[1] as unknown[])[9] = extra
      return p
    }
    expect(() => validarPaquete(con(['ñoqui']))).toThrow(/extra/)
    expect(() => validarPaquete(con({ alias: 'ñoqui' }))).toThrow(/alias/)
    expect(() => validarPaquete(con({ alias: [''] }))).toThrow(/alias/)
    expect(() => validarPaquete(con({ oculto: true }))).toThrow(/oculto/)
    expect(() => validarPaquete(con({ secundario: 2 }))).toThrow(/secundario/)
    expect(() => validarPaquete(con({ marca: '' }))).toThrow(/marca/)
    // Una clave desconocida se ignora (compatibilidad hacia delante).
    expect(validarPaquete(con({ futura: 1 })).filas[1][9]).toEqual({})
  })
  it('ml solo en productos de marca', () => {
    const p = paquete()
    ;(p.filas[0] as unknown[]).push({}, { ml: 1 })
    expect(() => validarPaquete(p)).toThrow(/genérico.*100 ml/)
    expect(validarPaquete(productos()).filas[1][9]).toMatchObject({ ml: 1 })
  })
  it('rechaza filas cortas, «extra» sin «nutrientes» e ids repetidos', () => {
    const corta = paquete()
    corta.filas[0] = ['1', 'x'] as never
    expect(() => validarPaquete(corta)).toThrow(/entre 8 y 10/)
    const sinNutrientes = paquete()
    sinNutrientes.filas[0] = ['1', 'x', '', '', 1, 1, 1, 1, undefined, { alias: ['y'] }]
    expect(() => validarPaquete(sinNutrientes)).toThrow(/falta «nutrientes»/)
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
      categoria: 'Leche y nata',
      kcal100: 64,
      prot100: 3.3,
      carb100: 4.7,
      grasa100: 3.6,
      completitud: 0.5,
      version: '2025-es2',
      importadoAt: 1234,
    })
    expect(foods[0]).not.toHaveProperty('nutrientes')
    expect(foods[0]).not.toHaveProperty('alias')
  })
  it('el alias entra en tok y se guarda; el nombre mostrado no cambia; nutrientes {} no se guarda', () => {
    expect(foods[1].tok).toEqual(['noquis', 'de', 'patata', 'noqui'])
    expect(foods[1].alias).toEqual(['ñoqui'])
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
    const p: Paquete = { formato: 2, fuente: 'ciqual', version: 'v', tipo: 'generico', filas: [['9', 'Pan', '', '', 1, 1, 1, 1, {}, { alias: ['bocata'] }]] }
    const [f] = aCatalogFoods(p, 1)
    expect(f.tok).toEqual(['pan', 'bocata'])
    expect(f).not.toHaveProperty('nombreOriginal')
    expect(f).not.toHaveProperty('categoria')
  })
  it('oculto: sin tok (no se busca) pero con todos sus datos y su id', () => {
    const p: Paquete = { formato: 2, fuente: 'ciqual', version: 'v', tipo: 'generico', filas: [['19023', 'Leche entera, UHT', '', 'Leche y nata', 64, 3.5, 4.8, 3.6, {}, { oculto: 1 }]] }
    const [f] = aCatalogFoods(p, 1)
    expect(f.tok).toEqual([])
    expect(f.id).toBe('ciqual:19023')
    expect(f.nombre).toBe('Leche entera, UHT')
    expect(f.kcal100).toBe(64)
  })
  it('secundario se guarda como indicador', () => {
    const p: Paquete = { formato: 2, fuente: 'ciqual', version: 'v', tipo: 'generico', filas: [['1', 'Ñame', '', '', 1, 1, 1, 1, {}, { secundario: 1 }]] }
    expect(aCatalogFoods(p, 1)[0].secundario).toBe(true)
  })
  it('productos de marca: tipo, marca en tok, gtin = idExterno y ml', () => {
    const [yogur, cerveza] = aCatalogFoods(validarPaquete(productos()), 5)
    expect(yogur).toMatchObject({ id: 'offes:8410000000017', fuente: 'offes', tipo: 'marca', marca: 'Hacendado', gtin: '8410000000017' })
    expect(yogur.tok).toEqual(['yogur', 'natural', 'hacendado'])
    expect(yogur).not.toHaveProperty('ml')
    expect(cerveza.ml).toBe(true)
    expect(cerveza.marca).toBe('Mahou')
  })
  it('un genérico no lleva gtin aunque su id sea numérico', () => {
    expect(foods[0]).not.toHaveProperty('gtin')
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
      // Solo los ocultos quedan fuera del índice de búsqueda.
      const ocultos = p.filas.filter((fila) => fila[9]?.oculto).length
      expect(foods.filter((x) => x.tok.length === 0)).toHaveLength(ocultos)
    }
  })
  it('CIQUAL y la selección de OFF España están publicados, con su licencia', () => {
    const manifest = validarManifest(leer('manifest.json'))
    expect(manifest.fuentes.map((f) => f.id).sort()).toEqual(['ciqual', 'offes'])
    expect(manifest.fuentes.find((f) => f.id === 'offes')?.licencia).toBe('ODbL 1.0')
    expect(manifest.fuentes.find((f) => f.id === 'offes')?.atribucion).toContain('Open Food Facts')
  })
})
