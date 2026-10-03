import { describe, expect, it } from 'vitest'
import { mapearProducto } from './mapearProducto'

const NUTRIMENTS = {
  'energy-kcal_100g': 389,
  proteins_100g: 13.5,
  carbohydrates_100g: 58.7,
  fat_100g: 7,
  fiber_100g: 10,
  sugars_100g: 1.2,
  salt_100g: 0.02,
  'saturated-fat_100g': 1.3,
}

function respuesta(product: Record<string, unknown>) {
  return { code: '8480000123456', status: 1, status_verbose: 'product found', product }
}

describe('mapearProducto', () => {
  it('un producto completo se convierte en un CatalogFood de marca de Open Food Facts', () => {
    const r = mapearProducto(
      respuesta({ product_name: 'Oat flakes', product_name_es: 'Copos de avena', brands: 'Hacendado, Mercadona', nutriments: NUTRIMENTS }),
      '8480000123456',
      42,
    )
    expect(r).toEqual({
      tipo: 'completo',
      food: {
        id: 'off:8480000123456',
        fuente: 'off',
        idExterno: '8480000123456',
        nombre: 'Copos de avena',
        nombreNorm: 'copos de avena',
        tok: ['copos', 'de', 'avena', 'hacendado'],
        tipo: 'marca',
        marca: 'Hacendado',
        gtin: '8480000123456',
        kcal100: 389,
        prot100: 13.5,
        carb100: 58.7,
        grasa100: 7,
        nutrientes: { fibra: 10, azucares: 1.2, sal: 0.02, agSat: 1.3 },
        completitud: 1,
        version: 'live',
        importadoAt: 42,
      },
    })
  })

  it('el nombre en español gana al genérico; sin él, vale el genérico', () => {
    const conEs = mapearProducto(respuesta({ product_name: 'Yaourt', product_name_es: 'Yogur', nutriments: NUTRIMENTS }), '3033490004743', 0)
    const sinEs = mapearProducto(respuesta({ product_name: 'Yaourt', product_name_es: '  ', nutriments: NUTRIMENTS }), '3033490004743', 0)
    expect(conEs.tipo === 'completo' && conEs.food.nombre).toBe('Yogur')
    expect(sinEs.tipo === 'completo' && sinEs.food.nombre).toBe('Yaourt')
  })

  it('solo kJ: se pasa a kcal (÷ 4,184), con `energy-kj_100g` o `energy_100g`', () => {
    const { 'energy-kcal_100g': _kcal, ...sinKcal } = NUTRIMENTS
    const kj = mapearProducto(respuesta({ product_name: 'A', nutriments: { ...sinKcal, 'energy-kj_100g': 1674 } }), '12345678', 0)
    const energia = mapearProducto(respuesta({ product_name: 'A', nutriments: { ...sinKcal, energy_100g: 418.4 } }), '12345678', 0)
    expect(kj.tipo === 'completo' && kj.food.kcal100).toBe(400.1)
    expect(energia.tipo === 'completo' && energia.food.kcal100).toBe(100)
  })

  it('los nutrientes que faltan quedan desconocidos, nunca a 0', () => {
    const r = mapearProducto(
      respuesta({ product_name: 'A', nutriments: { 'energy-kcal_100g': 50, proteins_100g: 1, carbohydrates_100g: 10, fat_100g: 0, sugars_100g: 9 } }),
      '12345678',
      0,
    )
    expect(r.tipo).toBe('completo')
    if (r.tipo !== 'completo') return
    expect(r.food.grasa100).toBe(0)
    expect(r.food.nutrientes).toEqual({ azucares: 9 })
    expect(r.food.completitud).toBe(5 / 8)
    expect(r.food.marca).toBeUndefined()
  })

  it('acepta cifras como texto y descarta valores negativos o no numéricos', () => {
    const r = mapearProducto(
      respuesta({ product_name: 'A', nutriments: { 'energy-kcal_100g': '120', proteins_100g: '3,5', carbohydrates_100g: 'n/a', fat_100g: -1 } }),
      '12345678',
      0,
    )
    expect(r).toEqual({ tipo: 'incompleto', nombre: 'A', valores: { kcal100: 120, prot100: 3.5 } })
  })

  it('sin nombre o sin algún valor básico: incompleto, con lo que haya', () => {
    expect(mapearProducto(respuesta({ brands: 'Marca', nutriments: NUTRIMENTS }), '12345678', 0)).toEqual({
      tipo: 'incompleto',
      nombre: '',
      marca: 'Marca',
      valores: { kcal100: 389, prot100: 13.5, carb100: 58.7, grasa100: 7, nutrientes: { fibra: 10, azucares: 1.2, sal: 0.02, agSat: 1.3 } },
    })
    expect(mapearProducto(respuesta({ product_name: 'B' }), '12345678', 0)).toEqual({ tipo: 'incompleto', nombre: 'B', valores: {} })
  })

  it('no encontrado: 404 (null), status 0, respuesta sin producto o código no válido', () => {
    expect(mapearProducto(null, '12345678', 0)).toEqual({ tipo: 'no-encontrado' })
    expect(mapearProducto({ code: '12345678', status: 0, status_verbose: 'product not found' }, '12345678', 0)).toEqual({ tipo: 'no-encontrado' })
    expect(mapearProducto({ status: 1 }, '12345678', 0)).toEqual({ tipo: 'no-encontrado' })
    expect(mapearProducto(respuesta({ product_name: 'A', nutriments: NUTRIMENTS }), '123', 0)).toEqual({ tipo: 'no-encontrado' })
  })

  it.each([
    ['EAN-8', '96385074', '0000096385074'],
    ['UPC-A (12)', '036000291452', '0036000291452'],
    ['EAN-13', '8480000123456', '8480000123456'],
    ['GTIN-14 con 0 inicial', '08480000123456', '8480000123456'],
  ])('GTIN %s: id y gtin normalizados a 13 cifras', (_, codigo, gtin) => {
    const r = mapearProducto(respuesta({ product_name: 'A', nutriments: NUTRIMENTS }), codigo, 0)
    expect(r.tipo === 'completo' && [r.food.id, r.food.gtin, r.food.idExterno]).toEqual([`off:${gtin}`, gtin, gtin])
  })
})
