import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../../shared/db/db'
import type { CatalogFood } from '../../../../shared/db/types'
import * as catalogRepo from '../../data/catalogRepo'
import { crearBuscadorProducto, mensajeErrorOff, type DependenciasProducto } from './buscarProducto'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

const COMPLETO = {
  status: 1,
  product: {
    product_name_es: 'Leche semidesnatada',
    brands: 'Pascual',
    nutriments: { 'energy-kcal_100g': 46, proteins_100g: 3.1, carbohydrates_100g: 4.7, fat_100g: 1.6 },
  },
}

function producto(id: string, fuente: string): CatalogFood {
  return {
    id, fuente, idExterno: id, nombre: id, nombreNorm: id, tok: [id], tipo: 'marca', categoria: 'Bebidas', gtin: '8410000000000',
    kcal100: 1, prot100: 1, carb100: 1, grasa100: 1, version: '1', importadoAt: 0,
  }
}

function crear(parcial: Partial<DependenciasProducto> = {}) {
  const deps = {
    buscarEnDispositivo: vi.fn(async (_gtin: string): Promise<CatalogFood[]> => []),
    descargar: vi.fn(async (_gtin: string): Promise<unknown> => COMPLETO),
    guardar: vi.fn(async (_food: CatalogFood) => undefined),
    ahora: () => 9,
    enLinea: () => true,
    ...parcial,
  }
  return { buscar: crearBuscadorProducto(deps), deps }
}

const falla = (e: unknown) => vi.fn(async () => Promise.reject(e))

describe('buscarProducto', () => {
  it('un código no válido no consulta nada', async () => {
    const { buscar, deps } = crear()
    expect(await buscar('123')).toEqual({ tipo: 'codigo-invalido' })
    expect(deps.buscarEnDispositivo).not.toHaveBeenCalled()
    expect(deps.descargar).not.toHaveBeenCalled()
  })

  it('si ya está en el dispositivo no va a la red (funciona sin conexión) y prefiere el de OFF', async () => {
    const { buscar, deps } = crear({ buscarEnDispositivo: vi.fn(async () => [producto('usda:1', 'usda'), producto('off:1', 'off')]) })
    expect(await buscar('8410000000000')).toEqual({ tipo: 'encontrado', food: expect.objectContaining({ id: 'off:1' }) })
    expect(deps.descargar).not.toHaveBeenCalled()
  })

  it('uno de OFF guardado sin categoría se vuelve a pedir con conexión y se guarda ya clasificado', async () => {
    const antiguo = { ...producto('off:8410000000000', 'off'), categoria: undefined }
    const { buscar, deps } = crear({ buscarEnDispositivo: vi.fn(async () => [antiguo]) })
    expect(await buscar('8410000000000')).toEqual({ tipo: 'encontrado', food: expect.objectContaining({ id: 'off:8410000000000', categoria: 'Leche y nata' }) })
    expect(deps.guardar).toHaveBeenCalledWith(expect.objectContaining({ categoria: 'Leche y nata' }))
  })

  it('sin conexión, o si la nueva consulta falla, sirve la copia sin categoría del dispositivo', async () => {
    const antiguo = { ...producto('off:8410000000000', 'off'), categoria: undefined }
    const sinRed = crear({ buscarEnDispositivo: vi.fn(async () => [antiguo]), enLinea: () => false })
    expect(await sinRed.buscar('8410000000000')).toEqual({ tipo: 'encontrado', food: antiguo })
    expect(sinRed.deps.descargar).not.toHaveBeenCalled()
    const caida = crear({ buscarEnDispositivo: vi.fn(async () => [antiguo]), descargar: falla(new TypeError('Load failed')) })
    expect(await caida.buscar('8410000000000')).toEqual({ tipo: 'encontrado', food: antiguo })
    expect(caida.deps.guardar).not.toHaveBeenCalled()
  })

  it('completo: lo descarga con el código normalizado, lo guarda y lo devuelve', async () => {
    const { buscar, deps } = crear()
    const r = await buscar(' 841 0000 000000 ')
    expect(deps.descargar).toHaveBeenCalledWith('8410000000000')
    expect(r).toEqual({
      tipo: 'encontrado',
      food: expect.objectContaining({ id: 'off:8410000000000', nombre: 'Leche semidesnatada', marca: 'Pascual', importadoAt: 9 }),
    })
    expect(deps.guardar).toHaveBeenCalledWith(expect.objectContaining({ id: 'off:8410000000000' }))
  })

  it('incompleto: no se guarda en el catálogo, se devuelve para revisarlo', async () => {
    const { buscar, deps } = crear({
      descargar: vi.fn(async () => ({ status: 1, product: { product_name: 'Galletas', nutriments: { 'energy-kcal_100g': 480 } } })),
    })
    expect(await buscar('8410000000000')).toEqual({ tipo: 'incompleto', gtin: '8410000000000', nombre: 'Galletas', valores: { kcal100: 480 }, categoria: 'Galletas, bollería y pasteles' })
    expect(deps.guardar).not.toHaveBeenCalled()
  })

  it('no encontrado (404)', async () => {
    const { buscar } = crear({ descargar: vi.fn(async () => null) })
    expect(await buscar('8410000000000')).toEqual({ tipo: 'no-encontrado', gtin: '8410000000000' })
  })

  it('un fallo de red o al guardar se convierte en un mensaje que dice qué hacer', async () => {
    const sinRed = crear({ descargar: falla(new TypeError('Load failed')), enLinea: () => false })
    expect(await sinRed.buscar('8410000000000')).toEqual({ tipo: 'error', mensaje: expect.stringMatching(/Sin conexión/) })
    const alGuardar = crear({ guardar: falla(new Error('QuotaExceeded')) })
    expect(await alGuardar.buscar('8410000000000')).toEqual({ tipo: 'error', mensaje: expect.stringMatching(/No se pudo consultar/) })
  })

  it('mensajeErrorOff distingue sin conexión, tiempo agotado y otros errores', () => {
    expect(mensajeErrorOff(new Error('x'), false)).toMatch(/Sin conexión/)
    expect(mensajeErrorOff(new DOMException('t', 'TimeoutError'), true)).toMatch(/no responde/)
    expect(mensajeErrorOff(new Error('500'), true)).toMatch(/No se pudo consultar/)
  })

  it('con catalogRepo real: el producto guardado se encuentra después sin red', async () => {
    const descargar = vi.fn(async () => COMPLETO)
    const deps = { buscarEnDispositivo: catalogRepo.buscarPorGtin, guardar: catalogRepo.guardarProductoOff, ahora: () => 1 }
    await crearBuscadorProducto({ ...deps, descargar, enLinea: () => true })('8410000000000')
    const sinRed = crearBuscadorProducto({ ...deps, descargar: falla(new TypeError('offline')), enLinea: () => false })
    expect(await sinRed('8410000000000')).toEqual({ tipo: 'encontrado', food: expect.objectContaining({ id: 'off:8410000000000' }) })
    expect(descargar).toHaveBeenCalledTimes(1)
  })
})
