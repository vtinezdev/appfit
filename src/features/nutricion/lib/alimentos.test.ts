import { describe, expect, it } from 'vitest'
import type { FoodRef } from '../../../shared/db/foodRef'
import type { CatalogFood, Entry, Food } from '../../../shared/db/types'
import { normalizeName } from '../../../shared/lib/text'
import {
  aItemGuardado,
  coherenciaEnergetica,
  actualizaAlimentoGuardado,
  creaAlimentoNuevo,
  decidirGuardado,
  elegibleDeCatalogo,
  elegibleDeFood,
  faltaCategoria,
  faltanValores,
  filtrarAlimentos,
  itemDeProductoIncompleto,
  itemDesdeElegible,
  recetaDeItem,
  itemSinCoincidencia,
  medidaPendiente,
  pendienteRevision,
  mismosValores,
  NOMBRE_RAPIDA_POR_DEFECTO,
  por100DesdeEntrada,
  procedencia,
  rankFrecuentes,
  validarKcalRapidas,
  type AlimentoElegible,
  type ItemRevision,
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
  it('uno del catálogo lleva su categoría (sin detalle si no es de marca)', () => {
    const cf: CatalogFood = {
      id: 'ciqual:13005', fuente: 'ciqual', idExterno: '13005', nombre: 'Plátano, pulpa, crudo', nombreNorm: 'platano, pulpa, crudo', tok: [],
      tipo: 'generico', categoria: 'Frutas', kcal100: 90, prot100: 1.1, carb100: 20, grasa100: 0.2, version: '1', importadoAt: 0,
    }
    expect(elegibleDeCatalogo(cf)).toEqual({
      ref: { tipo: 'catalog', id: 'ciqual:13005' }, nombre: 'Plátano, pulpa, crudo', categoria: 'Frutas', kcal100: 90, prot100: 1.1, carb100: 20, grasa100: 0.2,
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

describe('categoría en la revisión', () => {
  const POLLO_CAT: AlimentoElegible = { ref: { tipo: 'catalog', id: 'ciqual:36003' }, nombre: 'Pollo, pechuga', categoria: 'Carnes', kcal100: 120, prot100: 23, carb100: 0, grasa100: 2 }

  it('un alimento propio con categoría la muestra como detalle y la pasa al ítem', () => {
    const conCategoria = { ...PLATANO, categoria: 'Frutas' }
    expect(elegibleDeFood(conCategoria)).toMatchObject({ categoria: 'Frutas' })
    expect(itemDesdeElegible(elegibleDeFood(conCategoria), 100).categoria).toBe('Frutas')
  })

  it('del catálogo sin cambios o de un alimento guardado con su nombre: no crea alimento ni pide categoría', () => {
    const delCatalogo = itemDesdeElegible(POLLO_CAT, 150)
    expect(creaAlimentoNuevo(delCatalogo)).toBe(false)
    const propio = itemDesdeElegible(elegibleDeFood(PLATANO), 120)
    expect(creaAlimentoNuevo(propio)).toBe(false)
    expect(faltaCategoria(propio)).toBe(false)
    // Cambiar los valores de uno guardado lo actualiza: tampoco es nuevo.
    expect(creaAlimentoNuevo({ ...propio, kcal100: 95 })).toBe(false)
  })

  it('del catálogo con cambios crea un alimento con la categoría heredada', () => {
    const cambiado = { ...itemDesdeElegible(POLLO_CAT, 150), kcal100: 110 }
    expect(creaAlimentoNuevo(cambiado)).toBe(true)
    expect(faltaCategoria(cambiado)).toBe(false)
    expect(aItemGuardado(cambiado)).toMatchObject({ categoria: 'Carnes' })
    expect(aItemGuardado(cambiado).catalogId).toBeUndefined()
  })

  it('renombrar uno guardado, sin coincidencia o un producto incompleto: hay que elegirla', () => {
    expect(faltaCategoria({ ...itemDesdeElegible(elegibleDeFood(PLATANO), 120), nombre: 'Plátano de Canarias' })).toBe(true)
    const nuevo = itemSinCoincidencia('tortilla de patata', 150)
    expect(faltaCategoria(nuevo)).toBe(true)
    expect(faltaCategoria({ ...nuevo, categoria: 'No existe' })).toBe(true)
    expect(faltaCategoria({ ...nuevo, categoria: 'Platos preparados' })).toBe(false)
    expect(aItemGuardado({ ...nuevo, categoria: 'No existe' })).not.toHaveProperty('categoria')
    expect(faltaCategoria(itemDeProductoIncompleto('Galletas', { kcal100: 480 }))).toBe(true)
  })

  it('un producto incompleto lleva la categoría que dio Open Food Facts, si es válida', () => {
    expect(itemDeProductoIncompleto('Galletas', { kcal100: 480 }, 'Galletas, bollería y pasteles').categoria).toBe('Galletas, bollería y pasteles')
    expect(itemDeProductoIncompleto('Galletas', { kcal100: 480 }, 'otra')).not.toHaveProperty('categoria')
  })
})

describe('pendienteRevision', () => {
  const listo = itemDesdeElegible(elegibleDeFood(PLATANO), 120)

  it('un alimento completo no tiene nada pendiente', () => {
    expect(pendienteRevision(listo)).toBeNull()
    expect(pendienteRevision(listo, true)).toBeNull()
  })

  it('marca lo que impide guardar, primero los valores', () => {
    const nuevo = itemSinCoincidencia('salsa rara', 20)
    expect(pendienteRevision(nuevo, true)).toBe('Faltan sus valores')
    expect(pendienteRevision({ ...nuevo, kcal100: 300 }, true)).toBe('Elige su categoría')
    expect(pendienteRevision({ ...nuevo, kcal100: 300 })).toBeNull()
    expect(pendienteRevision({ ...listo, nombre: '  ' })).toBe('Ponle nombre')
    const medida = { opciones: [5, 15] } as unknown as ItemRevision['medida']
    expect(pendienteRevision({ ...listo, medida })).toBe('Elige la cantidad')
  })

  it('avisa de los gramos puestos por defecto', () => {
    expect(pendienteRevision({ ...listo, gramosEstimados: true })).toBe('Revisa la cantidad')
    expect(pendienteRevision({ ...listo, gramosEstimados: false })).toBeNull()
  })
})

describe('coherenciaEnergetica', () => {
  const v = (kcal100: number, prot100: number, carb100: number, grasa100: number, fibra?: number) =>
    ({ kcal100, prot100, carb100, grasa100, nutrientes: fibra === undefined ? undefined : { fibra } })

  it('cuadra con 4·P + 4·C + 9·G: sin aviso', () => {
    expect(coherenciaEnergetica(v(295, 10, 30, 15))).toBeNull()
  })

  it('descuadres pequeños (redondeo, fibra) no avisan', () => {
    expect(coherenciaEnergetica(v(200, 10, 30, 6))).toBeNull() // 214: 7 %
    expect(coherenciaEnergetica(v(100, 5, 20, 1))).toBeNull() // 109
    expect(coherenciaEnergetica(v(20, 2, 8, 0.5))).toBeNull() // 44,5: 24,5 kcal, por debajo de 30
  })

  it('descuadres notorios avisan con las kcal esperadas redondeadas', () => {
    expect(coherenciaEnergetica(v(200, 10, 30, 15))).toEqual({ esperadas: 295 })
    expect(coherenciaEnergetica(v(450, 6, 50, 12))).toEqual({ esperadas: 332 })
  })

  it('hace falta superar a la vez 30 kcal y el 25 %', () => {
    expect(coherenciaEnergetica(v(600, 30, 50, 22.5))).toBeNull() // 522,5: 77,5 kcal pero 13 %
    expect(coherenciaEnergetica(v(40, 10, 10, 0))).toEqual({ esperadas: 80 }) // 40 kcal y 100 %
    expect(coherenciaEnergetica(v(60, 10, 10, 0))).toBeNull() // 20 kcal
  })

  it('cuenta la fibra a 2 kcal/g si se conoce', () => {
    expect(coherenciaEnergetica(v(180, 5, 20, 2))).toEqual({ esperadas: 118 })
    expect(coherenciaEnergetica(v(180, 5, 20, 2, 30))).toBeNull() // 178
  })

  it('kcal olvidadas (0) con macros: avisa', () => {
    expect(coherenciaEnergetica(v(0, 10, 30, 15))).toEqual({ esperadas: 295 })
  })

  it('sin macros (solo kcal, o todo a cero): no hay con qué comparar', () => {
    expect(coherenciaEnergetica(v(250, 0, 0, 0))).toBeNull()
    expect(coherenciaEnergetica(v(0, 0, 0, 0))).toBeNull()
  })

  it('bebidas con alcohol: el alcohol no se registra y avisan (el texto lo explica)', () => {
    expect(coherenciaEnergetica(v(83, 0.1, 2.6, 0))).toEqual({ esperadas: 11 }) // vino tinto
  })
})

describe('recetaDeItem', () => {
  const plato = elegibleDeCatalogo({ id: 'tipicos:arroz-al-horno', fuente: 'tipicos', idExterno: 'arroz-al-horno', nombre: 'Arroz al horno, horneado', nombreNorm: 'arroz al horno, horneado', tok: [], tipo: 'generico', kcal100: 172, prot100: 6, carb100: 20, grasa100: 7, version: 'v', importadoAt: 0, receta: { pesoFinalG: 2300, ingredientes: [], raciones: 6 } })
  it('un ítem de una receta conserva su referencia para abrir su hoja', () => {
    const item = itemDesdeElegible(plato, 383)
    expect(recetaDeItem(item)).toMatchObject({ ref: { tipo: 'catalog', id: 'tipicos:arroz-al-horno' }, nombre: 'Arroz al horno, horneado', kcal100: 172, receta: { origen: 'appfit', raciones: 6 } })
  })
  it('deja de ser la receta si se cambia el nombre o los valores; un alimento normal no lo es', () => {
    const item = itemDesdeElegible(plato, 383)
    expect(recetaDeItem({ ...item, nombre: 'Arroz de la abuela' })).toBeUndefined()
    expect(recetaDeItem({ ...item, kcal100: 150 })).toBeUndefined()
    expect(recetaDeItem({ ...item, gramos: 500 })).toBeDefined()
    expect(recetaDeItem(itemDesdeElegible({ ...plato, receta: undefined }, 100))).toBeUndefined()
  })
})
