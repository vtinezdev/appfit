import { describe, expect, it } from 'vitest'
import type { FoodRef } from '../../../shared/db/foodRef'
import type { CatalogFood, Entry, Food } from '../../../shared/db/types'
import { normalizeName } from '../../../shared/lib/text'
import {
  aItemGuardado,
  actualizaAlimentoGuardado,
  decidirGuardado,
  elegibleDeCatalogo,
  elegibleDeFood,
  faltanValores,
  filtrarAlimentos,
  itemDeProductoIncompleto,
  itemDesdeElegible,
  itemSinCoincidencia,
  medidaPendiente,
  mismosValores,
  NOMBRE_RAPIDA_POR_DEFECTO,
  por100DesdeEntrada,
  procedencia,
  rankFrecuentes,
  validarKcalRapidas,
  type AlimentoElegible,
} from './alimentos'

const PLATANO: Food = {
  id: 7, nombre: 'Plátano', nombreNorm: 'platano', kcal100: 89, prot100: 1.1, carb100: 22.8, grasa100: 0.3, fuente: 'gemini', updatedAt: 0,
}
const VALORES_PLATANO = { kcal100: 89, prot100: 1.1, carb100: 22.8, grasa100: 0.3 }

describe('mismosValores', () => {
  it('tolera diferencias de redondeo por debajo de 0,05', () => {
    expect(mismosValores(VALORES_PLATANO, { ...VALORES_PLATANO, prot100: 1.13 })).toBe(true)
    expect(mismosValores(VALORES_PLATANO, { ...VALORES_PLATANO, prot100: 1.2 })).toBe(false)
  })
})

describe('por100DesdeEntrada', () => {
  it('reconstruye los valores por 100 g desde el snapshot de la entrada', () => {
    expect(por100DesdeEntrada({ gramos: 200, kcal: 330, prot: 62, carb: 0, grasa: 7.2 })).toEqual({
      kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6,
    })
  })

  it('con 0 gramos devuelve ceros en vez de NaN o Infinity', () => {
    expect(por100DesdeEntrada({ gramos: 0, kcal: 900, prot: 40, carb: 0, grasa: 0 })).toEqual({
      kcal100: 0, prot100: 0, carb100: 0, grasa100: 0,
    })
  })
})

describe('decidirGuardado', () => {
  it('crea si no existe, reutiliza si coincide y actualiza si el usuario cambió los valores', () => {
    expect(decidirGuardado(undefined, VALORES_PLATANO)).toBe('crear')
    expect(decidirGuardado(PLATANO, VALORES_PLATANO)).toBe('reutilizar')
    expect(decidirGuardado(PLATANO, { ...VALORES_PLATANO, kcal100: 95 })).toBe('actualizar')
  })
})

describe('aItemGuardado y actualizaAlimentoGuardado', () => {
  const local = itemDesdeElegible(elegibleDeFood(PLATANO), 120)

  it('un alimento guardado sin cambios se reutiliza sin avisar', () => {
    expect(aItemGuardado(local)).toMatchObject({ nombre: 'Plátano', gramos: 120, ...VALORES_PLATANO, fuenteSiNuevo: 'manual' })
    expect(actualizaAlimentoGuardado(local)).toBe(false)
  })

  it('si el usuario cambia los valores de un alimento guardado, se avisa', () => {
    expect(actualizaAlimentoGuardado({ ...local, kcal100: 95 })).toBe(true)
  })

  it('si el usuario renombra un alimento guardado, ya no se avisa (será otro alimento)', () => {
    expect(actualizaAlimentoGuardado({ ...local, nombre: 'Plátano macho', kcal100: 120 })).toBe(false)
  })

  it('quita los espacios sobrantes del nombre', () => {
    expect(aItemGuardado({ ...local, nombre: '  Plátano  ' }).nombre).toBe('Plátano')
  })
})

function uso(foodId: number | undefined, fecha: string, comida: Entry['comida'], createdAt = 0, extra: Partial<Entry> = {}): Entry {
  return { id: 0, fecha, comida, foodId, nombre: 'x', gramos: 100, kcal: 0, prot: 0, carb: 0, grasa: 0, createdAt, ...extra }
}

const ids = (refs: FoodRef[]) => refs.map((r) => r.id)

describe('rankFrecuentes (A3)', () => {
  it('cuenta alimentos propios y del catálogo sin confundirlos aunque compartan id', () => {
    const entries = [
      uso(undefined, '2026-09-28', 'cena', 10, { catalogId: 'ciqual:1' }),
      uso(undefined, '2026-09-27', 'cena', 5, { catalogId: 'ciqual:1' }),
      uso(1, '2026-09-28', 'cena', 20),
    ]
    expect(rankFrecuentes(entries, { comida: 'cena', hoy: '2026-09-28' })).toEqual([
      { tipo: 'catalog', id: 'ciqual:1' },
      { tipo: 'user', id: 1 },
    ])
  })

  it('ignora una entrada que referencia a la vez un alimento propio y uno del catálogo', () => {
    const entries = [uso(1, '2026-09-28', 'cena', 0, { catalogId: 'ciqual:1' }), uso(2, '2026-09-28', 'cena')]
    expect(ids(rankFrecuentes(entries, { comida: 'cena', hoy: '2026-09-28' }))).toEqual([2])
  })

  it('pesa más los usos en la misma comida', () => {
    // El 1 se usa 2 veces en la comida; el 2, una vez en la cena → para la cena gana el 2 (3 puntos contra 2).
    const entries = [uso(1, '2026-09-27', 'comida'), uso(1, '2026-09-28', 'comida'), uso(2, '2026-09-28', 'cena')]
    expect(ids(rankFrecuentes(entries, { comida: 'cena', hoy: '2026-09-28' }))).toEqual([2, 1])
    expect(ids(rankFrecuentes(entries, { comida: 'comida', hoy: '2026-09-28' }))).toEqual([1, 2])
  })

  it('ignora lo que queda fuera de la ventana, lo futuro y las entradas rápidas o sin alimento', () => {
    const entries = [
      uso(1, '2026-07-01', 'cena'),
      uso(2, '2026-09-29', 'cena'),
      uso(undefined, '2026-09-28', 'cena'),
      uso(3, '2026-09-28', 'cena', 0, { rapida: true }),
      uso(4, '2026-08-01', 'cena'),
    ]
    expect(ids(rankFrecuentes(entries, { comida: 'cena', hoy: '2026-09-28' }))).toEqual([4])
    expect(ids(rankFrecuentes(entries, { comida: 'cena', hoy: '2026-09-28', dias: 30 }))).toEqual([])
  })

  it('en caso de empate gana el usado más recientemente', () => {
    const entries = [uso(1, '2026-09-28', 'cena', 100), uso(2, '2026-09-28', 'cena', 200)]
    expect(ids(rankFrecuentes(entries, { comida: 'cena', hoy: '2026-09-28' }))).toEqual([2, 1])
  })
})

describe('filtrarAlimentos (A3)', () => {
  const food = (id: number, nombre: string): Food => ({ ...PLATANO, id, nombre, nombreNorm: normalizeName(nombre) })
  const foods = [food(1, 'Plátano'), food(2, 'Pan de plátano'), food(3, 'Pechuga de pollo'), food(4, 'Pollo asado')]

  it('ignora tildes y mayúsculas', () => {
    expect(filtrarAlimentos(foods, 'PLATANO').map((f) => f.id)).toEqual([1, 2])
  })

  it('exige todas las palabras en cualquier orden', () => {
    expect(filtrarAlimentos(foods, 'pollo pechuga').map((f) => f.id)).toEqual([3])
  })

  it('pone primero los que empiezan por la búsqueda', () => {
    expect(filtrarAlimentos(foods, 'pollo').map((f) => f.id)).toEqual([4, 3])
  })

  it('una búsqueda vacía no devuelve nada', () => {
    expect(filtrarAlimentos(foods, '   ')).toEqual([])
  })
})

describe('validarKcalRapidas (A5)', () => {
  const BASE = { nombre: 'Pizza fuera', kcal: 900, prot: 40, carb: 0, grasa: 0 }

  it('acepta kcal y devuelve los datos tal cual si todo es válido', () => {
    expect(validarKcalRapidas(BASE)).toEqual(BASE)
  })

  it('sin nombre, usa el valor por defecto', () => {
    expect(validarKcalRapidas({ ...BASE, nombre: '  ' })?.nombre).toBe(NOMBRE_RAPIDA_POR_DEFECTO)
  })

  it('quita los espacios sobrantes del nombre', () => {
    expect(validarKcalRapidas({ ...BASE, nombre: '  Pizza fuera  ' })?.nombre).toBe('Pizza fuera')
  })

  it('las kcal son obligatorias: 0, negativas o no numéricas son inválidas', () => {
    expect(validarKcalRapidas({ ...BASE, kcal: 0 })).toBeNull()
    expect(validarKcalRapidas({ ...BASE, kcal: -100 })).toBeNull()
    expect(validarKcalRapidas({ ...BASE, kcal: NaN })).toBeNull()
  })

  it('prot/carb/grasa son opcionales (0 por defecto) pero no pueden ser negativas', () => {
    expect(validarKcalRapidas({ ...BASE, prot: 0, carb: 0, grasa: 0 })).not.toBeNull()
    expect(validarKcalRapidas({ ...BASE, carb: -1 })).toBeNull()
  })
})

describe('AlimentoElegible', () => {
  it('un alimento propio conserva su id y sus valores', () => {
    expect(elegibleDeFood(PLATANO)).toEqual({ ref: { tipo: 'user', id: 7 }, nombre: 'Plátano', kcal100: 89, prot100: 1.1, carb100: 22.8, grasa100: 0.3 })
  })
  it('uno del catálogo lleva su categoría como detalle', () => {
    const cf: CatalogFood = {
      id: 'ciqual:13005', fuente: 'ciqual', idExterno: '13005', nombre: 'Plátano, pulpa, crudo', nombreNorm: 'platano, pulpa, crudo', tok: [],
      tipo: 'generico', categoria: 'Frutas', kcal100: 90, prot100: 1.1, carb100: 20, grasa100: 0.2, version: '1', importadoAt: 0,
    }
    expect(elegibleDeCatalogo(cf)).toEqual({
      ref: { tipo: 'catalog', id: 'ciqual:13005' }, nombre: 'Plátano, pulpa, crudo', detalle: 'Frutas', kcal100: 90, prot100: 1.1, carb100: 20, grasa100: 0.2,
    })
  })
})

describe('ítems del intérprete local (catálogo, propios y sin coincidencia)', () => {
  const ARROZ_CAT: AlimentoElegible = { ref: { tipo: 'catalog', id: 'ciqual:9100' }, nombre: 'Arroz blanco, crudo', kcal100: 350, prot100: 7, carb100: 78, grasa100: 0.6 }

  it('un ítem del catálogo sin cambios se guarda con su catalogId', () => {
    const item = itemDesdeElegible(ARROZ_CAT, 200)
    expect(item.origen).toMatchObject({ fuente: 'manual', guardado: false, catalogId: 'ciqual:9100', nombreNorm: 'arroz blanco, crudo' })
    expect(aItemGuardado(item)).toEqual({ nombre: 'Arroz blanco, crudo', gramos: 200, kcal100: 350, prot100: 7, carb100: 78, grasa100: 0.6, fuenteSiNuevo: 'manual', catalogId: 'ciqual:9100' })
    expect(procedencia(item)).toBe('catalogo')
  })

  it('si el usuario cambia los valores o el nombre, sale un alimento propio manual (sin catalogId)', () => {
    const item = itemDesdeElegible(ARROZ_CAT, 200)
    const otrosValores = aItemGuardado({ ...item, kcal100: 130 })
    expect(otrosValores.catalogId).toBeUndefined()
    expect(otrosValores.fuenteSiNuevo).toBe('manual')
    expect(aItemGuardado({ ...item, nombre: 'Mi arroz' }).catalogId).toBeUndefined()
    expect(procedencia({ ...item, kcal100: 130 })).toBeUndefined()
    // Cambiar solo gramos o mayúsculas/espacios del nombre no lo saca del catálogo
    expect(aItemGuardado({ ...item, gramos: 80, nombre: ' arroz blanco, CRUDO ' }).catalogId).toBe('ciqual:9100')
  })

  it('uno propio cuenta como guardado, sin catalogId', () => {
    const item = itemDesdeElegible(elegibleDeFood(PLATANO), 120, { gramosEstimados: true })
    expect(item.origen.guardado).toBe(true)
    expect(item.origen.catalogId).toBeUndefined()
    expect(item.gramosEstimados).toBe(true)
    expect(aItemGuardado(item).catalogId).toBeUndefined()
    expect(procedencia(item)).toBe('tuyo')
  })

  it('guarda las alternativas solo si hay', () => {
    expect(itemDesdeElegible(ARROZ_CAT, 100, { alternativas: [] }).origen.alternativas).toBeUndefined()
    expect(itemDesdeElegible(ARROZ_CAT, 100, { alternativas: [elegibleDeFood(PLATANO)] }).origen.alternativas).toHaveLength(1)
  })

  it('una medida ambigua sin elegir no se puede guardar; elegida, sí', () => {
    const medida = { cantidad: 2, unidad: 'cucharada' as const, opciones: [10, 15, 20, 25] }
    const item = itemDesdeElegible(ARROZ_CAT, 0, { medida })
    expect(item.medida).toEqual(medida)
    expect(medidaPendiente(item)).toBe(true)
    expect(medidaPendiente({ ...item, medida: { ...medida, elegida: 15 }, gramos: 30 })).toBe(false)
    expect(medidaPendiente(itemDesdeElegible(ARROZ_CAT, 100))).toBe(false)
    expect(itemSinCoincidencia('miel', 0, { medida }).medida).toEqual(medida)
  })

  it('sin coincidencia: valores a 0 y no se puede guardar hasta escribirlos', () => {
    const item = itemSinCoincidencia('arroz con pollo', 300)
    expect(item).toMatchObject({ nombre: 'arroz con pollo', gramos: 300, kcal100: 0, sinCoincidencia: true })
    expect(faltanValores(item)).toBe(true)
    expect(faltanValores({ ...item, kcal100: 150 })).toBe(false)
    expect(procedencia(item)).toBeUndefined()
  })
})

describe('producto escaneado incompleto', () => {
  it('lleva lo conocido y 0 en lo demás, y se guarda como alimento propio manual', () => {
    const item = itemDeProductoIncompleto('Galletas', { kcal100: 480 })
    expect(item).toMatchObject({ nombre: 'Galletas', gramos: 100, kcal100: 480, prot100: 0, datosIncompletos: true })
    expect(faltanValores(item)).toBe(false)
    expect(aItemGuardado({ ...item, prot100: 6 })).toMatchObject({ fuenteSiNuevo: 'manual' })
    expect(aItemGuardado(item).catalogId).toBeUndefined()
  })

  it('sin ningún valor no se puede guardar', () => {
    expect(faltanValores(itemDeProductoIncompleto('', {}))).toBe(true)
  })

  it('en un producto de marca, el detalle es la marca', () => {
    const f: CatalogFood = {
      id: 'off:1', fuente: 'off', idExterno: '1', nombre: 'Leche', nombreNorm: 'leche', tok: ['leche'], tipo: 'marca', marca: 'Pascual',
      kcal100: 46, prot100: 3, carb100: 5, grasa100: 1.6, version: 'live', importadoAt: 0,
    }
    expect(elegibleDeCatalogo(f).detalle).toBe('Pascual')
  })
})
