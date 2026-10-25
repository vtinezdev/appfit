import { describe, expect, it } from 'vitest'
import {
  aFila,
  COLUMNAS_OFF,
  construirPaqueteOff,
  entradaManifestOff,
  esVolumen,
  indicesDeCabecera,
  normalizarGtin,
  normalizarNombre,
  pareceOtroIdioma,
  procesarLinea,
  seleccionarProductos,
  versionDeVolcado,
  type ColumnaOff,
  type ProductoOffNormalizado,
} from './offLib.ts'

const IDX = indicesDeCabecera([...COLUMNAS_OFF])

/** Una línea TSV de un producto correcto (yogur de Hacendado, principal mercado España). */
function linea(over: Partial<Record<ColumnaOff, string>> = {}): string {
  const base: Record<ColumnaOff, string> = {
    code: '8410000000017',
    product_name: 'Yogur natural',
    quantity: '500 g',
    brands: 'Hacendado,Mercadona',
    categories_tags: 'en:dairies,en:fermented-milk-products,en:yogurts,en:natural-yogurts',
    countries_tags: 'en:spain',
    states_tags: 'en:complete',
    data_quality_errors_tags: '',
    unique_scans_n: '120',
    popularity_tags: 'top-5000-scans-2023,top-country-es-scans-2023,at-least-5-es-scans-2023',
    pnns_groups_2: 'Milk and yogurt',
    'energy-kcal_100g': '60',
    'energy-kj_100g': '',
    energy_100g: '',
    fat_100g: '3',
    'saturated-fat_100g': '2',
    carbohydrates_100g: '5',
    'sugars_100g': '5',
    fiber_100g: '0.5',
    proteins_100g: '3',
    salt_100g: '0.1',
    alcohol_100g: '',
  }
  return COLUMNAS_OFF.map((c) => over[c] ?? base[c]).join('\t')
}

const excluido = (over: Partial<Record<ColumnaOff, string>>) => {
  const r = procesarLinea(linea(over), IDX)
  return r && 'excluido' in r ? r.excluido : r === undefined ? 'no-espana' : 'ok'
}

describe('cabecera', () => {
  it('localiza las columnas por nombre y falla si falta alguna', () => {
    expect(IDX.code).toBe(0)
    expect(() => indicesDeCabecera(['code', 'product_name'])).toThrow(/columnas/)
  })
})

describe('procesarLinea: un producto correcto', () => {
  const r = procesarLinea(linea(), IDX)
  it('se acepta y se normaliza', () => {
    expect(r).toBeDefined()
    expect(r && 'ok' in r ? r.ok : null).toEqual({
      gtin: '8410000000017',
      nombre: 'Yogur natural',
      marca: 'Hacendado',
      categoria: 'Yogures y postres lácteos',
      kcal: 60,
      prot: 3,
      carb: 5,
      grasa: 3,
      nutrientes: { fibra: 0.5, azucares: 5, sal: 0.1, agSat: 2 },
      ml: false,
      escaneos: 120,
    })
  })
})

describe('procesarLinea: filtros', () => {
  it('lo que no se vende en España ni se cuenta', () => {
    expect(procesarLinea(linea({ countries_tags: 'en:france' }), IDX)).toBeUndefined()
    expect(procesarLinea(linea({ countries_tags: 'en:spain-and-more' }), IDX)).toBeUndefined()
  })
  it('exige que España sea el mercado principal (popularity_tags top-country-es)', () => {
    expect(excluido({ popularity_tags: 'top-country-fr-scans-2023' })).toBe('no-es-mercado-principal-espana')
    expect(excluido({ popularity_tags: '' })).toBe('no-es-mercado-principal-espana')
  })
  it('nombre y marca son obligatorios', () => {
    expect(excluido({ product_name: '  ' })).toBe('sin-nombre')
    expect(excluido({ brands: '' })).toBe('sin-marca')
  })
  it('código de barras válido (8 a 14 dígitos)', () => {
    expect(excluido({ code: 'abc' })).toBe('codigo-invalido')
    expect(excluido({ code: '123' })).toBe('codigo-invalido')
  })
  it('sin errores de calidad de OFF', () => {
    expect(excluido({ data_quality_errors_tags: 'en:energy-value-in-kcal-does-not-match-value-computed-from-other-nutrients' })).toBe(
      'errores-de-calidad-de-off',
    )
  })
  it('fuera infantiles y suplementos', () => {
    expect(excluido({ categories_tags: 'en:baby-foods,en:baby-milks' })).toBe('infantil-o-suplemento')
    expect(excluido({ categories_tags: 'en:dietary-supplements' })).toBe('infantil-o-suplemento')
    expect(excluido({ categories_tags: 'en:baby-cereals-x' })).toBe('infantil-o-suplemento') // cualquier «baby-…»
  })
  it('exige los 4 valores básicos', () => {
    expect(excluido({ 'energy-kcal_100g': '' })).toBe('sin-nutrientes-basicos')
    expect(excluido({ proteins_100g: '' })).toBe('sin-nutrientes-basicos')
    expect(excluido({ carbohydrates_100g: '' })).toBe('sin-nutrientes-basicos')
    expect(excluido({ fat_100g: '' })).toBe('sin-nutrientes-basicos')
  })
  it('nombres inválidos: solo la marca, basura, emojis, dato nutricional, otro idioma, demasiado largo', () => {
    expect(excluido({ product_name: 'Hacendado' })).toBe('nombre-invalido')
    expect(excluido({ product_name: 'test' })).toBe('nombre-invalido')
    expect(excluido({ product_name: '12' })).toBe('nombre-invalido')
    expect(excluido({ product_name: 'Blonde 🍺' })).toBe('nombre-invalido')
    expect(excluido({ product_name: '69 kcal' })).toBe('nombre-invalido')
    expect(excluido({ product_name: 'Tortilla sans oeufs' })).toBe('nombre-en-otro-idioma')
    expect(excluido({ product_name: 'Käsekuchen' })).toBe('nombre-en-otro-idioma')
    expect(excluido({ product_name: 'Yogur '.repeat(20) })).toBe('nombre-demasiado-largo')
  })
})

describe('procesarLinea: energía y calidad (un aviso excluye el producto)', () => {
  it('kJ ÷ 4,184 cuando no hay kcal', () => {
    const r = procesarLinea(linea({ 'energy-kcal_100g': '', 'energy-kj_100g': '251' }), IDX)
    expect(r && 'ok' in r ? r.ok.kcal : null).toBe(60)
    const r2 = procesarLinea(linea({ 'energy-kcal_100g': '', energy_100g: '251' }), IDX)
    expect(r2 && 'ok' in r2 ? r2.ok.kcal : null).toBe(60)
  })
  it('energía incoherente con los macros: excluido', () => {
    expect(excluido({ 'energy-kcal_100g': '250' })).toBe('calidad:energia-incoherente')
  })
  it('valores imposibles: excluido', () => {
    expect(excluido({ 'energy-kcal_100g': '950', fat_100g: '100', proteins_100g: '0', carbohydrates_100g: '0' })).toBe('calidad:kcal-excesiva')
    expect(excluido({ carbohydrates_100g: '-5' })).toBe('calidad:numero-invalido')
    expect(excluido({ sugars_100g: '9' })).toBe('calidad:azucares-mayor-que-carb')
    expect(excluido({ 'saturated-fat_100g': '5' })).toBe('calidad:agsat-mayor-que-grasa')
  })
  it('el alcohol (% vol) explica la energía de una cerveza; sin él sería incoherente', () => {
    const cerveza = {
      product_name: 'Cerveza dorada',
      quantity: '33 cl',
      categories_tags: 'en:beers',
      'energy-kcal_100g': '43',
      proteins_100g: '0.4',
      carbohydrates_100g: '3.6',
      fat_100g: '0',
      'saturated-fat_100g': '0',
      'sugars_100g': '0',
      fiber_100g: '0',
    } as const
    const r = procesarLinea(linea({ ...cerveza, alcohol_100g: '4.7' }), IDX)
    expect(r && 'ok' in r ? [r.ok.ml, r.ok.categoria] : r).toEqual([true, 'Bebidas alcohólicas'])
    expect(excluido({ ...cerveza, alcohol_100g: '' })).toBe('calidad:energia-incoherente')
  })
  it('una bebida con más de 350 kcal/100 ml no existe: excluida', () => {
    expect(
      excluido({ quantity: '1 l', categories_tags: 'en:sodas', 'energy-kcal_100g': '479', fat_100g: '50', proteins_100g: '0', carbohydrates_100g: '5', 'sugars_100g': '5', 'saturated-fat_100g': '5', fiber_100g: '0' }),
    ).toBe('calidad:bebida-con-energia-imposible')
  })
})

describe('procesarLinea: cantidad → ml', () => {
  it('esVolumen: ml, cl, l sí; g y kg no; mezcla con masa no', () => {
    expect(esVolumen('500 ml')).toBe(true)
    expect(esVolumen('1,5 L')).toBe(true)
    expect(esVolumen('6 x 33 cl')).toBe(true)
    expect(esVolumen('6x33cl')).toBe(true)
    expect(esVolumen('500 g')).toBe(false)
    expect(esVolumen('1 kg')).toBe(false)
    expect(esVolumen('1 l (1 kg)')).toBe(false)
    expect(esVolumen('')).toBe(false)
  })
  it('un producto en litros lleva ml', () => {
    const r = procesarLinea(linea({ quantity: '1 l', product_name: 'Leche entera', categories_tags: 'en:milks' }), IDX)
    expect(r && 'ok' in r ? r.ok.ml : null).toBe(true)
  })
})

describe('normalizarNombre', () => {
  it('quita la cantidad, la marca repetida y los separadores', () => {
    expect(normalizarNombre('Leche entera Hacendado 1 L', 'Hacendado')).toBe('Leche entera')
    expect(normalizarNombre('Hacendado - Leche entera', 'Hacendado')).toBe('Leche entera')
    expect(normalizarNombre('Coca-Cola Zero 6 x 33 cl', 'Coca-Cola')).toBe('Zero')
    expect(normalizarNombre('Atún claro en aceite 3x80g', 'Calvo')).toBe('Atún claro en aceite')
    expect(normalizarNombre('Galletas María (200 g)', 'Gullón')).toBe('Galletas María')
  })
  it('TODO MAYÚSCULAS pasa a frase y todo minúsculas se capitaliza', () => {
    expect(normalizarNombre('LECHE ENTERA', '')).toBe('Leche entera')
    expect(normalizarNombre('pan de molde', '')).toBe('Pan de molde')
    expect(normalizarNombre('Pan de Molde Integral', '')).toBe('Pan de Molde Integral')
  })
  it('espacios, entidades HTML y caracteres de control', () => {
    expect(normalizarNombre('  Zumo   de\tnaranja ', '')).toBe('Zumo de naranja')
    expect(normalizarNombre('Zumo &quot;exprimido&quot; de naranja', '')).toBe('Zumo "exprimido" de naranja')
  })
  it('si solo queda la marca, devuelve vacío; una marca dentro del nombre se conserva', () => {
    expect(normalizarNombre('Hacendado 500 g', 'Hacendado')).toBe('')
    expect(normalizarNombre('Nocilla original', 'Nocilla')).toBe('Original')
    expect(normalizarNombre('Pan sin gluten', 'Schär')).toBe('Pan sin gluten')
  })
})

describe('pareceOtroIdioma', () => {
  it('acentos que el español no usa y palabras de otros idiomas', () => {
    expect(pareceOtroIdioma('Crème fraîche')).toBe(true)
    expect(pareceOtroIdioma('Skyr Erdbeere')).toBe(true)
    expect(pareceOtroIdioma('Pasta con verdura mit Gemüse')).toBe(true)
    expect(pareceOtroIdioma('Džem')).toBe(true)
  })
  it('el español, incluida la ñ, la ü y los acentos agudos', () => {
    expect(pareceOtroIdioma('Pingüino de piña y menta')).toBe(false)
    expect(pareceOtroIdioma('Atún claro al natural')).toBe(false)
    expect(pareceOtroIdioma('Yogur natural')).toBe(false)
  })
})

describe('gtin', () => {
  it('replica la regla de la app (foodRef.normalizarGtin)', () => {
    expect(normalizarGtin('8410000000017')).toBe('8410000000017')
    expect(normalizarGtin('96385074')).toBe('0000096385074') // EAN-8
    expect(normalizarGtin('012345678905')).toBe('0012345678905') // UPC-A
    expect(normalizarGtin('01234567890128')).toBe('1234567890128') // GTIN-14 con 0
    expect(normalizarGtin('123')).toBeUndefined()
    expect(normalizarGtin('123456789012345')).toBeUndefined()
  })
})

const P = (over: Partial<ProductoOffNormalizado> = {}): ProductoOffNormalizado => ({
  gtin: '8410000000017',
  nombre: 'Yogur natural',
  marca: 'Hacendado',
  categoria: 'Yogures y postres lácteos',
  kcal: 60,
  prot: 3,
  carb: 5,
  grasa: 3,
  nutrientes: {},
  ml: false,
  escaneos: 10,
  ...over,
})

describe('seleccionarProductos', () => {
  it('ordena por escaneos y se queda con los N primeros', () => {
    const c = [
      P({ gtin: '1', nombre: 'A', escaneos: 5 }),
      P({ gtin: '2', nombre: 'B', escaneos: 50 }),
      P({ gtin: '3', nombre: 'C', escaneos: 20 }),
    ]
    expect(seleccionarProductos(c, 2).elegidos.map((p) => p.nombre)).toEqual(['B', 'C'])
  })
  it('mínimo de escaneos', () => {
    const c = [P({ gtin: '1', nombre: 'A', escaneos: 2 }), P({ gtin: '2', nombre: 'B', escaneos: 9 })]
    expect(seleccionarProductos(c, 10, 5).elegidos.map((p) => p.nombre)).toEqual(['B'])
  })
  it('mismo nombre + marca (sin tildes ni mayúsculas): gana el más escaneado', () => {
    const c = [
      P({ gtin: '1', nombre: 'Yogur natural', escaneos: 5 }),
      P({ gtin: '2', nombre: 'YOGUR NATURAL', marca: 'hacendado', escaneos: 30 }),
      P({ gtin: '3', nombre: 'Yogur natural', marca: 'Danone', escaneos: 1 }),
    ]
    const r = seleccionarProductos(c, 10)
    expect(r.elegidos.map((p) => p.gtin)).toEqual(['2', '3'])
    expect(r.duplicados).toBe(1)
  })
  it('mismo GTIN: uno solo', () => {
    const c = [P({ gtin: '1', nombre: 'A', escaneos: 5 }), P({ gtin: '1', nombre: 'B', escaneos: 4 })]
    expect(seleccionarProductos(c, 10).elegidos).toHaveLength(1)
  })
  it('los duplicados no gastan plazas del máximo', () => {
    const c = [P({ gtin: '1', escaneos: 9 }), P({ gtin: '2', escaneos: 8 }), P({ gtin: '3', nombre: 'Otro', escaneos: 7 })]
    expect(seleccionarProductos(c, 2).elegidos.map((p) => p.gtin)).toEqual(['1', '3'])
  })
  it('a igualdad de escaneos, gana el más completo y el resultado es determinista', () => {
    const c = [P({ gtin: '2', nombre: 'A', escaneos: 5 }), P({ gtin: '1', nombre: 'B', escaneos: 5, nutrientes: { fibra: 1 } })]
    expect(seleccionarProductos(c, 10).elegidos.map((p) => p.gtin)).toEqual(['1', '2'])
  })
})

describe('paquete y manifest', () => {
  it('fila de formato 2: idExterno = GTIN, marca y ml en extra, sin nombre original', () => {
    expect(aFila(P({ ml: true, nutrientes: { sal: 0.1 } }))).toEqual([
      '8410000000017',
      'Yogur natural',
      '',
      'Yogures y postres lácteos',
      60,
      3,
      5,
      3,
      { sal: 0.1 },
      { marca: 'Hacendado', ml: 1 },
    ])
    expect(aFila(P())[9]).toEqual({ marca: 'Hacendado' })
  })
  it('el paquete es de tipo marca, fuente offes y va ordenado por GTIN', () => {
    const p = construirPaqueteOff([P({ gtin: '9' }), P({ gtin: '1', nombre: 'X' })], '2026-09-30')
    expect(p).toMatchObject({ formato: 2, fuente: 'offes', version: '2026-09-30', tipo: 'marca' })
    expect(p.filas.map((f) => f[0])).toEqual(['1', '9'])
  })
  it('el manifest declara ODbL 1.0 y la atribución', () => {
    const e = entradaManifestOff(construirPaqueteOff([P()], '2026-09-30'), 'offes-2026-09-30.json')
    expect(e).toMatchObject({ id: 'offes', version: '2026-09-30', archivo: 'offes-2026-09-30.json', filas: 1, licencia: 'ODbL 1.0' })
    expect(e.atribucion).toContain('Contiene datos de Open Food Facts (openfoodfacts.org)')
    expect(e.atribucion).toContain('ODbL')
  })
  it('la versión es la fecha del volcado', () => {
    expect(versionDeVolcado('off-products-2026-09-30.csv.gz')).toBe('2026-09-30')
    expect(versionDeVolcado('otro.csv.gz')).toBeUndefined()
  })
})
