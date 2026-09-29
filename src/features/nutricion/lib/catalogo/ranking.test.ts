import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { CatalogFood } from '../../../../shared/db/types'
import { normalizeName, tokenizar, tokensConsulta } from '../../../../shared/lib/text'
import { aCatalogFoods, validarPaquete } from './paquete'
import { rankCatalogo } from './ranking'

function food(id: string, nombre: string, extra: Partial<CatalogFood> = {}): CatalogFood {
  return {
    id: `ciqual:${id}`, fuente: 'ciqual', idExterno: id, nombre, nombreNorm: normalizeName(nombre), tok: tokenizar(nombre),
    tipo: 'generico', kcal100: 100, prot100: 1, carb100: 1, grasa100: 1, completitud: 1, version: '1', importadoAt: 0, ...extra,
  }
}

const nombres = (foods: CatalogFood[]) => foods.map((f) => f.nombre)

describe('rankCatalogo', () => {
  it('pone primero el alimento («Pollo, …»), después los platos que empiezan igual y luego el resto', () => {
    const foods = [
      food('1', 'Nuggets de pollo, envasado'),
      food('2', 'Pollo, pechuga sin piel, cruda'),
      food('3', 'Grasa de pollo'),
      food('4', 'Pollo, muslo, asado'),
      food('5', 'Pollo a la vasca, envasado'),
    ]
    expect(nombres(rankCatalogo(foods, 'pollo'))).toEqual([
      'Pollo, muslo, asado',
      'Pollo, pechuga sin piel, cruda',
      'Pollo a la vasca, envasado',
      'Grasa de pollo',
      'Nuggets de pollo, envasado',
    ])
  })

  it('el nombre exacto gana a todo', () => {
    const foods = [food('1', 'Arroz blanco, cocido'), food('2', 'Arroz')]
    expect(nombres(rankCatalogo(foods, 'ARROZ'))[0]).toBe('Arroz')
  })

  it('una palabra entera gana a un simple prefijo («pan» antes que «panceta»)', () => {
    const foods = [food('1', 'Panceta ahumada'), food('2', 'Pan de pueblo'), food('3', 'Panecillo')]
    expect(nombres(rankCatalogo(foods, 'pan'))[0]).toBe('Pan de pueblo')
  })

  it('con varias palabras, prefiere las coincidencias al principio e ignora las palabras vacías', () => {
    const foods = [food('1', 'Jamón de pollo o pechuga de pollo en loncha'), food('2', 'Pollo, pechuga sin piel, cruda')]
    expect(nombres(rankCatalogo(foods, 'pechuga de pollo'))[0]).toBe('Pollo, pechuga sin piel, cruda')
  })

  it('una coincidencia solo por alias va detrás de las que están en el nombre', () => {
    const foods = [food('1', 'Plátano, crudo', { tok: tokenizar('Plátano, crudo banana') }), food('2', 'Banana split')]
    expect(nombres(rankCatalogo(foods, 'banana'))).toEqual(['Banana split', 'Plátano, crudo'])
  })

  it('desempata por completitud y después por fuente', () => {
    const foods = [
      food('1', 'Leche entera', { completitud: 0.5 }),
      { ...food('2', 'Leche entera'), id: 'usda:2', fuente: 'usda' },
      food('3', 'Leche entera'),
    ]
    expect(rankCatalogo(foods, 'leche entera').map((f) => f.id)).toEqual(['ciqual:3', 'usda:2', 'ciqual:1'])
  })

  it('consulta vacía → nada', () => {
    expect(rankCatalogo([food('1', 'Arroz')], '  ')).toEqual([])
  })
})

describe('rankCatalogo con el catálogo publicado (regresión de relevancia)', () => {
  const leer = (archivo: string): unknown => JSON.parse(readFileSync(new URL(`../../../../../public/catalogo/${archivo}`, import.meta.url), 'utf8'))
  const manifest = leer('manifest.json') as { fuentes: { archivo: string }[] }
  const catalogo = aCatalogFoods(validarPaquete(leer(manifest.fuentes[0].archivo)), 0)
  // Mismo filtro que `catalogRepo.buscar` (todas las palabras útiles, por prefijo), sin base de datos.
  const buscar = (q: string) => {
    const tokens = tokensConsulta(q)
    return rankCatalogo(catalogo.filter((f) => tokens.every((t) => f.tok.some((w) => w.startsWith(t)))), q)
  }

  it.each([
    ['pollo', /^Pollo/],
    ['arroz', /^Arroz/],
    ['platano', /^Plátano/],
    ['leche semi', /^Leche semidesnatada/],
    ['huevo', /^Huevo/],
    ['pechuga de pollo', /^Pollo, pechuga/],
    ['pan', /^Pan\b/],
    ['lentejas', /^Lenteja/],
    ['huevos', /^Huevo/],
  ])('«%s» → el primer resultado es el alimento básico', (q, esperado) => {
    expect(buscar(q)[0]?.nombre).toMatch(esperado)
  })
})
