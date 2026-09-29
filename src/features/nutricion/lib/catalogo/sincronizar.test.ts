import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../../shared/db/db'
import type { CatalogFood, CatalogSource } from '../../../../shared/db/types'
import * as catalogRepo from '../../data/catalogRepo'
import { crearSincronizador } from './sincronizar'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

const entrada = (version: string, filas = 2) => ({
  id: 'ciqual',
  version,
  archivo: `ciqual-${version}.json`,
  filas,
  licencia: 'Licence Ouverte Etalab 2.0',
  atribucion: 'ANSES, Ciqual',
})

const manifest = (version: string, filas = 2) => ({ formato: 1, fuentes: [entrada(version, filas)] })

const paquete = (version: string) => ({
  formato: 1,
  fuente: 'ciqual',
  version,
  filas: [
    ['1', 'Leche entera', 'Lait entier', 'Lácteos', 64, 3.3, 4.7, 3.6],
    ['2', 'Manzana', 'Pomme', 'Frutas', 52, 0.3, 11.4, 0.2, { fibra: 2 }],
  ] as unknown[][],
})

/** Servidor falso: url → JSON (o un Error que se lanza). */
function servidor(archivos: Record<string, unknown>) {
  return vi.fn(async (url: string) => {
    if (!(url in archivos)) throw new Error(`404 ${url}`)
    const v = archivos[url]
    if (v instanceof Error) throw v
    return v
  })
}

function instalada(version: string): CatalogSource {
  return { id: 'ciqual', version, importadoAt: 1, licencia: 'L', atribucion: 'A', filas: 2 }
}

function crear(archivos: Record<string, unknown>, instaladas: CatalogSource[] = []) {
  const fetchJson = servidor(archivos)
  const importarFuente = vi.fn(async (_meta: CatalogSource, _foods: CatalogFood[]) => undefined)
  const sincronizar = crearSincronizador({
    fetchJson,
    fuentesInstaladas: async () => instaladas,
    importarFuente,
    ahora: () => 777,
  })
  return { sincronizar, fetchJson, importarFuente }
}

describe('sincronizar', () => {
  it('sin cambios: solo descarga el manifest (sin caché) y no importa', async () => {
    const { sincronizar, fetchJson, importarFuente } = crear({ '/catalogo/manifest.json': manifest('v1') }, [instalada('v1')])
    expect(await sincronizar()).toEqual({ actualizadas: [], alDia: ['ciqual'] })
    expect(fetchJson).toHaveBeenCalledTimes(1)
    expect(fetchJson).toHaveBeenCalledWith('/catalogo/manifest.json', { sinCache: true })
    expect(importarFuente).not.toHaveBeenCalled()
  })

  it('primera instalación: descarga, convierte e importa con los metadatos del manifest', async () => {
    const { sincronizar, importarFuente } = crear({
      '/catalogo/manifest.json': manifest('v1'),
      '/catalogo/ciqual-v1.json': paquete('v1'),
    })
    expect(await sincronizar()).toEqual({ actualizadas: [{ id: 'ciqual', version: 'v1', filas: 2 }], alDia: [] })
    expect(importarFuente).toHaveBeenCalledTimes(1)
    const [meta, foods] = importarFuente.mock.calls[0]
    expect(meta).toEqual({
      id: 'ciqual',
      version: 'v1',
      importadoAt: 777,
      licencia: 'Licence Ouverte Etalab 2.0',
      atribucion: 'ANSES, Ciqual',
      filas: 2,
    })
    expect(foods.map((f) => f.id)).toEqual(['ciqual:1', 'ciqual:2'])
    expect(foods.every((f) => f.version === 'v1' && f.importadoAt === 777)).toBe(true)
  })

  it('versión nueva: reimporta la fuente que cambió', async () => {
    const { sincronizar, importarFuente } = crear(
      { '/catalogo/manifest.json': manifest('v2'), '/catalogo/ciqual-v2.json': paquete('v2') },
      [instalada('v1')],
    )
    expect((await sincronizar()).actualizadas.map((a) => a.version)).toEqual(['v2'])
    expect(importarFuente).toHaveBeenCalledTimes(1)
  })

  it('solo toca las fuentes del manifest: una fuente instalada que no figura (off) se ignora', async () => {
    const off: CatalogSource = { ...instalada('o1'), id: 'off' }
    const { sincronizar, importarFuente } = crear(
      { '/catalogo/manifest.json': manifest('v1'), '/catalogo/ciqual-v1.json': paquete('v1') },
      [off],
    )
    await sincronizar()
    expect(importarFuente.mock.calls.map((c) => c[0].id)).toEqual(['ciqual'])
  })

  it('fallo de red en el manifest o en el paquete: propaga el error y no importa', async () => {
    const a = crear({ '/catalogo/manifest.json': new Error('sin red') })
    await expect(a.sincronizar()).rejects.toThrow('sin red')
    const b = crear({ '/catalogo/manifest.json': manifest('v1') }) // falta el paquete → 404
    await expect(b.sincronizar()).rejects.toThrow(/404/)
    expect(a.importarFuente).not.toHaveBeenCalled()
    expect(b.importarFuente).not.toHaveBeenCalled()
  })

  it('manifest o paquete corruptos: error y no importa', async () => {
    const m = crear({ '/catalogo/manifest.json': { formato: 9, fuentes: [] } })
    await expect(m.sincronizar()).rejects.toThrow(/formato/)

    const corrupto = paquete('v1')
    corrupto.filas[0][4] = Number.NaN
    const p = crear({ '/catalogo/manifest.json': manifest('v1'), '/catalogo/ciqual-v1.json': corrupto })
    await expect(p.sincronizar()).rejects.toThrow(/kcal/)
    expect(p.importarFuente).not.toHaveBeenCalled()
  })

  it('paquete que no coincide con el manifest (versión, fuente o nº de filas): error', async () => {
    const otraVersion = crear({ '/catalogo/manifest.json': manifest('v1'), '/catalogo/ciqual-v1.json': paquete('v0') })
    await expect(otraVersion.sincronizar()).rejects.toThrow(/no coincide/)
    const cortado = crear({ '/catalogo/manifest.json': manifest('v1', 3), '/catalogo/ciqual-v1.json': paquete('v1') })
    await expect(cortado.sincronizar()).rejects.toThrow(/3/)
    const ajeno = crear({
      '/catalogo/manifest.json': manifest('v1'),
      '/catalogo/ciqual-v1.json': { ...paquete('v1'), fuente: 'off' },
    })
    await expect(ajeno.sincronizar()).rejects.toThrow(/no coincide/)
    for (const c of [otraVersion, cortado, ajeno]) expect(c.importarFuente).not.toHaveBeenCalled()
  })

  it('llamadas simultáneas comparten la misma sincronización; al acabar se puede volver a lanzar', async () => {
    const { sincronizar, fetchJson, importarFuente } = crear({
      '/catalogo/manifest.json': manifest('v1'),
      '/catalogo/ciqual-v1.json': paquete('v1'),
    })
    const pa = sincronizar()
    const pb = sincronizar()
    expect(pa).toBe(pb)
    await Promise.all([pa, pb])
    expect(importarFuente).toHaveBeenCalledTimes(1)
    expect(fetchJson).toHaveBeenCalledTimes(2) // manifest + paquete, una sola vez
    await sincronizar()
    expect(fetchJson).toHaveBeenCalledTimes(4) // otra ronda (el falso sigue sin instalada): manifest + paquete
  })

  it('tras un fallo el cerrojo se libera', async () => {
    let falla = true
    const fetchJson = vi.fn(async (url: string) => {
      if (falla) throw new Error('sin red')
      return url.endsWith('manifest.json') ? manifest('v1') : paquete('v1')
    })
    const sincronizar = crearSincronizador({
      fetchJson,
      fuentesInstaladas: async () => [],
      importarFuente: async () => undefined,
      ahora: () => 1,
    })
    await expect(sincronizar()).rejects.toThrow('sin red')
    falla = false
    expect((await sincronizar()).actualizadas).toHaveLength(1)
  })
})

describe('sincronizar con catalogRepo real', () => {
  function conRepo(archivos: Record<string, unknown>) {
    return crearSincronizador({
      fetchJson: servidor(archivos),
      fuentesInstaladas: catalogRepo.fuentes,
      importarFuente: catalogRepo.importarFuente,
      ahora: () => 5,
    })
  }

  it('instala, luego actualiza sin duplicar y sin tocar off ni datos de usuario', async () => {
    await db.foods.add({ nombre: 'Mío', nombreNorm: 'mio', kcal100: 1, prot100: 0, carb100: 0, grasa100: 0, fuente: 'manual', updatedAt: 0 })
    await catalogRepo.importarFuente(
      { id: 'off', version: 'o1', importadoAt: 1, licencia: 'ODbL', atribucion: 'OFF', filas: 1 },
      [
        {
          id: 'off:1', fuente: 'off', idExterno: '1', nombre: 'Producto', nombreNorm: 'producto', tok: ['producto'],
          tipo: 'marca', kcal100: 1, prot100: 1, carb100: 1, grasa100: 1, version: 'o1', importadoAt: 1,
        },
      ],
    )
    await conRepo({ '/catalogo/manifest.json': manifest('v1'), '/catalogo/ciqual-v1.json': paquete('v1') })()
    expect(await catalogRepo.contar()).toBe(3)
    await conRepo({ '/catalogo/manifest.json': manifest('v1'), '/catalogo/ciqual-v1.json': paquete('v1') })() // al día
    expect((await catalogRepo.buscar('leche')).map((f) => f.id)).toEqual(['ciqual:1'])
    await conRepo({ '/catalogo/manifest.json': manifest('v2'), '/catalogo/ciqual-v2.json': paquete('v2') })()
    expect(await catalogRepo.contar()).toBe(3)
    expect((await catalogRepo.fuentes()).map((s) => `${s.id}@${s.version}`).sort()).toEqual(['ciqual@v2', 'off@o1'])
    expect(await db.foods.count()).toBe(1)
  })

  it('un paquete corrupto no toca lo ya importado', async () => {
    await conRepo({ '/catalogo/manifest.json': manifest('v1'), '/catalogo/ciqual-v1.json': paquete('v1') })()
    const corrupto = paquete('v2')
    corrupto.filas[1][7] = -3
    await expect(
      conRepo({ '/catalogo/manifest.json': manifest('v2'), '/catalogo/ciqual-v2.json': corrupto })(),
    ).rejects.toThrow(/grasa/)
    expect((await catalogRepo.fuentes()).map((s) => s.version)).toEqual(['v1'])
    expect((await db.catalogFoods.toArray()).every((f) => f.version === 'v1')).toBe(true)
    expect(await catalogRepo.contar()).toBe(2)
  })
})
