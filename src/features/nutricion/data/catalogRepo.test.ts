import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../shared/db/db'
import type { CatalogFood } from '../../../shared/db/types'
import { tokenizar } from '../../../shared/lib/text'
import * as catalogRepo from './catalogRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

function food(fuente: string, idExterno: string, nombre: string, extra: Partial<CatalogFood> = {}): CatalogFood {
  return {
    id: `${fuente}:${idExterno}`, fuente, idExterno, nombre, nombreNorm: nombre.toLowerCase(), tok: tokenizar(nombre),
    tipo: 'generico', kcal100: 100, prot100: 1, carb100: 1, grasa100: 1, version: '1', importadoAt: 1, ...extra,
  }
}

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
    it('las palabras vacías de la consulta no filtran («pechuga de pollo» encuentra «Pollo, pechuga…»)', async () => {
      await catalogRepo.guardarLote([food('ciqual', '9', 'Pollo, pechuga sin piel')])
      expect(await ids('pechuga de pollo')).toEqual(['ciqual:9', 'usda:1'])
      expect(await ids('arroz con pollo')).toEqual(['usda:3'])
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

  describe('importarFuente', () => {
    const meta = (id: string, version: string, filas: number) => ({ id, version, importadoAt: 5, licencia: 'L', atribucion: 'A', filas })

    it('instala las filas y anota la fuente', async () => {
      await catalogRepo.importarFuente(meta('ciqual', 'v1', 2), [food('ciqual', '1', 'A', { version: 'v1' }), food('ciqual', '2', 'B', { version: 'v1' })])
      expect(await catalogRepo.contar()).toBe(2)
      expect(await catalogRepo.fuentes()).toEqual([meta('ciqual', 'v1', 2)])
    })

    it('reemplaza una versión antigua: actualiza las filas que siguen y borra las que ya no están', async () => {
      await catalogRepo.importarFuente(meta('ciqual', 'v1', 2), [food('ciqual', '1', 'A', { version: 'v1' }), food('ciqual', '2', 'B', { version: 'v1' })])
      await catalogRepo.importarFuente(meta('ciqual', 'v2', 2), [food('ciqual', '1', 'A nueva', { version: 'v2' }), food('ciqual', '3', 'C', { version: 'v2' })])
      expect((await db.catalogFoods.toArray()).map((f) => [f.id, f.version]).sort()).toEqual([['ciqual:1', 'v2'], ['ciqual:3', 'v2']])
      expect((await catalogRepo.obtener('ciqual:1'))?.nombre).toBe('A nueva')
      expect((await catalogRepo.fuentes()).map((s) => s.version)).toEqual(['v2'])
    })

    it('no toca otras fuentes ni las tablas de usuario', async () => {
      await db.foods.add({ nombre: 'Mío', nombreNorm: 'mio', kcal100: 1, prot100: 0, carb100: 0, grasa100: 0, fuente: 'manual', updatedAt: 0 })
      await catalogRepo.importarFuente(meta('off', 'o1', 1), [food('off', '1', 'Producto', { version: 'o1' })])
      await catalogRepo.importarFuente(meta('ciqual', 'v1', 1), [food('ciqual', '1', 'A', { version: 'v1' })])
      await catalogRepo.importarFuente(meta('ciqual', 'v2', 1), [food('ciqual', '2', 'B', { version: 'v2' })])
      expect((await db.catalogFoods.toArray()).map((f) => f.id).sort()).toEqual(['ciqual:2', 'off:1'])
      expect((await catalogRepo.fuentes()).map((s) => `${s.id}@${s.version}`).sort()).toEqual(['ciqual@v2', 'off@o1'])
      expect(await db.foods.count()).toBe(1)
    })

    it('rechaza filas de otra fuente sin escribir nada', async () => {
      await expect(catalogRepo.importarFuente(meta('ciqual', 'v1', 1), [food('off', '1', 'X', { version: 'v1' })])).rejects.toThrow(/fuente/)
      expect(await catalogRepo.contar()).toBe(0)
      expect(await catalogRepo.fuentes()).toEqual([])
    })

    it('la fuente se anota al final: si falla a medias no consta como instalada y se puede reintentar', async () => {
      const foods = [food('ciqual', '1', 'A', { version: 'v1' }), food('ciqual', '2', 'B', { version: 'v1' })]
      const falla = vi.spyOn(db.catalogSources, 'put').mockRejectedValueOnce(new Error('cuota'))
      await expect(catalogRepo.importarFuente(meta('ciqual', 'v1', 2), foods)).rejects.toThrow('cuota')
      falla.mockRestore()
      expect(await catalogRepo.fuentes()).toEqual([])
      await catalogRepo.importarFuente(meta('ciqual', 'v1', 2), foods)
      expect(await catalogRepo.contar()).toBe(2)
      expect((await catalogRepo.fuentes()).map((s) => s.id)).toEqual(['ciqual'])
    })
  })
})

describe('catalogRepo.vocabulario', () => {
  it('devuelve las palabras del índice ordenadas y sin repetir, con su frecuencia', async () => {
    await catalogRepo.guardarLote([food('ciqual', '1', 'Leche entera'), food('ciqual', '2', 'Leche desnatada'), food('off', '1', 'Yogur')])
    const v = await catalogRepo.vocabulario()
    expect(v.palabras).toEqual(['desnatada', 'entera', 'leche', 'yogur'])
    expect(v.frecuencias.get('leche')).toBe(2)
    expect(v.frecuencias.get('yogur')).toBe(1)
  })

  it('se guarda en caché y se invalida al escribir (importar, borrar fuente, borrar catálogo, producto escaneado)', async () => {
    await catalogRepo.guardarLote([food('ciqual', '1', 'Leche')])
    const a = await catalogRepo.vocabulario()
    expect(await catalogRepo.vocabulario()).toBe(a) // misma referencia: sin releer el índice
    await catalogRepo.guardarLote([food('ciqual', '2', 'Arroz')])
    expect((await catalogRepo.vocabulario()).palabras).toEqual(['arroz', 'leche'])

    await catalogRepo.importarFuente(
      { id: 'ciqual', version: '2', importadoAt: 1, licencia: 'L', atribucion: 'A', filas: 1 },
      [food('ciqual', '3', 'Pan', { version: '2' })],
    )
    expect((await catalogRepo.vocabulario()).palabras).toEqual(['pan'])

    await catalogRepo.guardarProductoOff(food('off', '8410000000000', 'Galletas', { tipo: 'marca', gtin: '8410000000000', version: 'live' }))
    expect((await catalogRepo.vocabulario()).palabras).toEqual(['galletas', 'pan'])

    await catalogRepo.borrarFuente('ciqual')
    expect((await catalogRepo.vocabulario()).palabras).toEqual(['galletas'])
    await catalogRepo.borrarCatalogo()
    expect((await catalogRepo.vocabulario()).palabras).toEqual([])
  })
})

describe('catalogRepo: alimentos ocultos', () => {
  it('un oculto (tok vacío) no se encuentra al buscar, pero obtener, porIds y buscarPorGtin lo resuelven', async () => {
    await catalogRepo.guardarLote([
      food('ciqual', '19016', 'Leche entera (promedio)'),
      food('ciqual', '19023', 'Leche entera, UHT', { tok: [] }),
    ])
    expect((await catalogRepo.buscar('leche entera')).map((f) => f.id)).toEqual(['ciqual:19016'])
    expect((await catalogRepo.obtener('ciqual:19023'))?.nombre).toBe('Leche entera, UHT')
    expect([...(await catalogRepo.porIds(['ciqual:19023'])).keys()]).toEqual(['ciqual:19023'])
    // Y no aporta palabras al vocabulario de erratas.
    expect((await catalogRepo.vocabulario()).frecuencias.get('uht')).toBeUndefined()
  })
})

describe('catalogRepo.guardarProductoOff', () => {
  it('guarda el producto y anota la fuente off con licencia, atribución y número de productos', async () => {
    await catalogRepo.guardarProductoOff(food('off', '8410000000000', 'Leche', { tipo: 'marca', gtin: '8410000000000', version: 'live', importadoAt: 5 }))
    await catalogRepo.guardarProductoOff(food('off', '8410000000001', 'Yogur', { tipo: 'marca', gtin: '8410000000001', version: 'live', importadoAt: 7 }))
    await catalogRepo.guardarProductoOff(food('off', '8410000000001', 'Yogur natural', { tipo: 'marca', gtin: '8410000000001', version: 'live', importadoAt: 8 }))
    expect((await catalogRepo.buscarPorGtin('8410000000001')).map((f) => f.nombre)).toEqual(['Yogur natural'])
    expect(await catalogRepo.fuentes()).toEqual([
      { id: 'off', version: 'live', importadoAt: 8, filas: 2, licencia: expect.stringMatching(/ODbL/), atribucion: expect.stringMatching(/Open Food Facts/) },
    ])
  })

  it('rechaza alimentos que no son de Open Food Facts', async () => {
    await expect(catalogRepo.guardarProductoOff(food('ciqual', '1', 'Leche'))).rejects.toThrow(/Open Food Facts/)
    expect(await catalogRepo.contar()).toBe(0)
  })
})
