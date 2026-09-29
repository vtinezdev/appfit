import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../shared/db/db'
import type { CatalogFood } from '../../../shared/db/types'
import * as catalogRepo from './catalogRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

function food(fuente: string, idExterno: string, nombre: string, extra: Partial<CatalogFood> = {}): CatalogFood {
  return {
    id: `${fuente}:${idExterno}`, fuente, idExterno, nombre, nombreNorm: nombre.toLowerCase(), tok: catalogRepo.tokenizar(nombre),
    tipo: 'generico', kcal100: 100, prot100: 1, carb100: 1, grasa100: 1, version: '1', importadoAt: 1, ...extra,
  }
}

describe('tokenizar', () => {
  it('normaliza, separa y no repite', () => {
    expect(catalogRepo.tokenizar('Pechuga de Pollo, a la plancha (pollo)')).toEqual(['pechuga', 'de', 'pollo', 'a', 'la', 'plancha'])
    expect(catalogRepo.tokenizar('  ')).toEqual([])
    expect(catalogRepo.tokenizar('Ñoquis Café')).toEqual(['noquis', 'cafe']) // como normalizeName, la ñ pasa a n
    expect(catalogRepo.tokenizar('Straße  Smørrebrød 100%')).toEqual(['straße', 'smørrebrød', '100']) // sin tildes que quitar, no se pierde nada
  })
})

describe('catalogRepo', () => {
  it('guardarLote es idempotente (bulkPut) y respeta los lotes', async () => {
    const lote = Array.from({ length: 25 }, (_, i) => food('usda', String(i), `Alimento ${i}`))
    await catalogRepo.guardarLote(lote, 10)
    await catalogRepo.guardarLote(lote, 10)
    expect(await catalogRepo.contar()).toBe(25)
    await catalogRepo.guardarLote([food('usda', '3', 'Cambiado', { kcal100: 5 })])
    expect((await catalogRepo.obtener('usda:3'))?.kcal100).toBe(5)
    expect(await catalogRepo.contar()).toBe(25)
  })

  it('obtener y porIds devuelven solo lo que existe', async () => {
    await catalogRepo.guardarLote([food('off', '1', 'A'), food('off', '2', 'B')])
    expect(await catalogRepo.obtener('off:9')).toBeUndefined()
    expect([...(await catalogRepo.porIds(['off:1', 'off:9', 'off:2'])).keys()].sort()).toEqual(['off:1', 'off:2'])
  })

  it('la misma etiqueta de nombre puede existir en varias fuentes', async () => {
    await catalogRepo.guardarLote([food('usda', '1', 'Leche entera'), food('off', '1', 'Leche entera'), food('off', '2', 'Leche entera')])
    expect(await catalogRepo.contar()).toBe(3)
  })

  it('buscarPorGtin normaliza y devuelve todos los productos con ese código', async () => {
    await catalogRepo.guardarLote([
      food('off', '8410000000001', 'Galletas', { gtin: '8410000000001', tipo: 'marca' }),
      food('usda', '77', 'Galletas', { gtin: '8410000000001', tipo: 'marca' }),
      food('off', '5', 'Sin código'),
    ])
    expect((await catalogRepo.buscarPorGtin('8 41000 00000 01')).map((f) => f.id).sort()).toEqual(['off:8410000000001', 'usda:77'])
    expect(await catalogRepo.buscarPorGtin('0000000000000')).toEqual([])
    expect(await catalogRepo.buscarPorGtin('abc')).toEqual([])
  })

  describe('buscar', () => {
    beforeEach(async () => {
      await catalogRepo.guardarLote([
        food('usda', '1', 'Pechuga de pollo cruda'),
        food('usda', '2', 'Pollo asado con pollo'), // dos palabras que empiezan igual
        food('usda', '3', 'Arroz con pollo'),
        food('usda', '4', 'Pollito frito'),
        food('usda', '5', 'Manzana'),
      ])
    })
    const ids = async (q: string, limite?: number) => (await catalogRepo.buscar(q, limite)).map((f) => f.id).sort()

    it('busca por prefijo de palabra usando el índice multiEntry, sin tildes ni mayúsculas', async () => {
      expect(await ids('POL')).toEqual(['usda:1', 'usda:2', 'usda:3', 'usda:4'])
      expect(await ids('pollo')).toEqual(['usda:1', 'usda:2', 'usda:3'])
    })
    it('no repite una fila que coincide por varias palabras', async () => {
      expect((await catalogRepo.buscar('po')).filter((f) => f.id === 'usda:2')).toHaveLength(1)
    })
    it('varias palabras: todas deben coincidir (en cualquier orden)', async () => {
      expect(await ids('pollo arroz')).toEqual(['usda:3'])
      expect(await ids('cruda pech')).toEqual(['usda:1'])
      expect(await ids('pollo manzana')).toEqual([])
    })
    it('respeta el límite, ignora la consulta vacía y no falla sin resultados', async () => {
      expect(await catalogRepo.buscar('pol', 2)).toHaveLength(2)
      expect(await catalogRepo.buscar('   ')).toEqual([])
      expect(await catalogRepo.buscar('zzz')).toEqual([])
    })
    it('un prefijo muy frecuente no oculta coincidencias: no hay tope de candidatos (regresión del límite de 300)', async () => {
      await catalogRepo.guardarLote([
        ...Array.from({ length: 500 }, (_, i) => food('off', `x${i}`, `Yogur ${i}`)),
        food('zz', 'ultimo', 'Yogur de limon'), // el último por id dentro del índice
      ])
      expect(await ids('yogur limon')).toEqual(['zz:ultimo'])
    })
    it('con muchas coincidencias devuelve exactamente `limite` filas distintas', async () => {
      // Cada fila tiene dos palabras que empiezan por «yo»: el cursor las ve dos veces.
      await catalogRepo.guardarLote(Array.from({ length: 50 }, (_, i) => food('off', `y${i}`, `Yogur yogurt ${i}`)))
      const r = await catalogRepo.buscar('yo', 10)
      expect(r).toHaveLength(10)
      expect(new Set(r.map((f) => f.id)).size).toBe(10)
    })
    it('no lee la tabla entera con toArray: usa el índice tok', async () => {
      const espia = vi.spyOn(db.catalogFoods, 'toArray')
      await catalogRepo.buscar('pol')
      expect(espia).not.toHaveBeenCalled()
      espia.mockRestore()
    })
    it('busca con la misma normalización con la que se guarda: «ñ» y «n» son lo mismo, y el nombre no cambia', async () => {
      await catalogRepo.guardarLote([food('usda', '9', 'Ñoquis de patata', { nombreOriginal: 'Gnocchi', nombreNorm: 'noquis de patata' })])
      for (const q of ['ñoquis', 'NOQUIS', 'Ñoq', 'noq']) expect((await catalogRepo.buscar(q)).map((f) => f.id), q).toEqual(['usda:9'])
      const [f] = await catalogRepo.buscar('noquis')
      expect(f.nombre).toBe('Ñoquis de patata') // original intacto, para mostrarlo
      expect(f.nombreOriginal).toBe('Gnocchi')
    })
  })

  it('borrarVersionesAntiguas solo quita la fuente indicada con otra versión', async () => {
    await catalogRepo.guardarLote([food('usda', '1', 'A', { version: '1' }), food('usda', '2', 'B', { version: '2' }), food('off', '1', 'C', { version: '1' })])
    expect(await catalogRepo.borrarVersionesAntiguas('usda', '2')).toBe(1)
    expect((await db.catalogFoods.toArray()).map((f) => f.id).sort()).toEqual(['off:1', 'usda:2'])
  })

  it('borrarFuente y borrarCatalogo no tocan datos del usuario', async () => {
    await db.foods.add({ nombre: 'Mío', nombreNorm: 'mio', kcal100: 1, prot100: 0, carb100: 0, grasa100: 0, fuente: 'manual', updatedAt: 0 })
    await catalogRepo.guardarLote([food('usda', '1', 'A'), food('off', '1', 'B')])
    await catalogRepo.guardarFuente({ id: 'usda', version: '1', importadoAt: 1, licencia: 'CC0', atribucion: 'USDA', filas: 1 })
    await catalogRepo.guardarFuente({ id: 'off', version: '1', importadoAt: 1, licencia: 'ODbL', atribucion: 'OFF', filas: 1 })
    await catalogRepo.borrarFuente('usda')
    expect(await catalogRepo.contar()).toBe(1)
    expect((await catalogRepo.fuentes()).map((s) => s.id)).toEqual(['off'])
    await catalogRepo.borrarCatalogo()
    expect(await catalogRepo.contar()).toBe(0)
    expect(await catalogRepo.fuentes()).toEqual([])
    expect(await db.foods.count()).toBe(1)
  })
})
