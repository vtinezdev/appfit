import { describe, expect, it } from 'vitest'
import type { Entry, Food, Meal, MealItem } from '../../../shared/db/types'
import { por100DesdeEntrada } from './alimentos'
import {
  copiaEsNoOp,
  entradasDesdePlantilla,
  itemConGramos,
  itemsConGramosValidos,
  itemsDesdeEntradas,
  planCopia,
  resolverItemsPlantilla,
} from './plantillas'

function entrada(over: Partial<Entry> = {}): Entry {
  return {
    id: 1, fecha: '2026-09-28', comida: 'cena', foodId: 3, nombre: 'Pollo',
    gramos: 150, kcal: 250, prot: 40, carb: 0, grasa: 8, createdAt: 100, ...over,
  }
}

const POLLO: Food = { id: 3, nombre: 'Pollo', nombreNorm: 'pollo', kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6, fuente: 'gemini', updatedAt: 0 }

function item(over: Partial<MealItem> = {}): MealItem {
  return { foodId: 3, nombre: 'Pollo', gramos: 150, kcal: 250, prot: 40, carb: 0, grasa: 8, ...over }
}

function meal(over: Partial<Meal> = {}): Meal {
  return { id: 1, nombre: 'Mi cena', comida: 'cena', items: [item()], usos: 0, usadoAt: 100, createdAt: 100, ...over }
}

describe('copiaEsNoOp (A2)', () => {
  it('copiar el día entero al mismo día es no-op, sin importar la comida de destino', () => {
    expect(copiaEsNoOp({ fecha: '2026-09-28' }, { fecha: '2026-09-28' })).toBe(true)
  })

  it('copiar el día entero a otro día no es no-op', () => {
    expect(copiaEsNoOp({ fecha: '2026-09-28' }, { fecha: '2026-09-29' })).toBe(false)
  })

  it('copiar una comida al mismo día y la misma comida es no-op', () => {
    expect(copiaEsNoOp({ fecha: '2026-09-28', comida: 'cena' }, { fecha: '2026-09-28', comida: 'cena' })).toBe(true)
  })

  it('copiar una comida al mismo día pero otra comida no es no-op', () => {
    expect(copiaEsNoOp({ fecha: '2026-09-28', comida: 'cena' }, { fecha: '2026-09-28', comida: 'snack' })).toBe(false)
  })

  it('copiar una comida a otro día no es no-op aunque la comida coincida', () => {
    expect(copiaEsNoOp({ fecha: '2026-09-28', comida: 'cena' }, { fecha: '2026-09-29', comida: 'cena' })).toBe(false)
  })
})

describe('planCopia (A2)', () => {
  it('copia a otro día conservando la comida si no se especifica destino.comida', () => {
    const [copia] = planCopia([entrada()], { fecha: '2026-09-29' }, 500)
    expect(copia).toEqual({
      fecha: '2026-09-29', comida: 'cena', foodId: 3, nombre: 'Pollo',
      gramos: 150, kcal: 250, prot: 40, carb: 0, grasa: 8, textoOriginal: undefined, createdAt: 500, rapida: undefined,
    })
  })

  it('cambia la comida si se especifica destino.comida', () => {
    const [copia] = planCopia([entrada()], { fecha: '2026-09-29', comida: 'snack' }, 500)
    expect(copia.comida).toBe('snack')
  })

  it('no copia el id ni conserva el createdAt original', () => {
    const [copia] = planCopia([entrada({ id: 42, createdAt: 1 })], { fecha: '2026-09-29' }, 999)
    expect(copia).not.toHaveProperty('id')
    expect(copia.createdAt).toBe(999)
  })

  it('mantiene el snapshot y la marca «rápida» de una entrada rápida', () => {
    const rapida = entrada({ foodId: undefined, gramos: 0, rapida: true, nombre: 'Pizza fuera' })
    const [copia] = planCopia([rapida], { fecha: '2026-09-29' }, 500)
    expect(copia).toMatchObject({ rapida: true, gramos: 0, foodId: undefined, nombre: 'Pizza fuera' })
  })

  it('copia varias entradas manteniendo el orden', () => {
    const copias = planCopia([entrada({ id: 1, nombre: 'A' }), entrada({ id: 2, nombre: 'B' })], { fecha: '2026-09-29' }, 500)
    expect(copias.map((c) => c.nombre)).toEqual(['A', 'B'])
  })
})

describe('itemsDesdeEntradas (A1)', () => {
  it('convierte cada entrada en un ítem con su snapshot, sin id/fecha/comida/createdAt/textoOriginal', () => {
    const [it1] = itemsDesdeEntradas([entrada({ textoOriginal: 'pollo asado' })])
    expect(it1).toEqual({ foodId: 3, nombre: 'Pollo', gramos: 150, kcal: 250, prot: 40, carb: 0, grasa: 8, rapida: undefined })
  })

  it('mantiene el snapshot y la marca «rápida» de una entrada rápida', () => {
    const [it1] = itemsDesdeEntradas([entrada({ foodId: undefined, gramos: 0, rapida: true, nombre: 'Pizza fuera' })])
    expect(it1).toMatchObject({ foodId: undefined, gramos: 0, rapida: true, nombre: 'Pizza fuera' })
  })

  it('no comparte referencias con las entradas originales: mutar una no afecta a la otra', () => {
    const e = entrada()
    const [it1] = itemsDesdeEntradas([e])
    expect(it1).not.toBe(e)
    it1.nombre = 'Otro nombre'
    it1.kcal = 999
    expect(e.nombre).toBe('Pollo')
    expect(e.kcal).toBe(250)
  })
})

describe('itemConGramos (edición de gramos en la plantilla)', () => {
  it('cambiar 150 -> 15 -> 1 -> 150 conserva exactamente los valores que corresponden a 150 g, sin deriva acumulada', () => {
    const original = item({ gramos: 150, kcal: 250, prot: 40, carb: 0, grasa: 8 })
    const por100 = por100DesdeEntrada(original)

    let actual = itemConGramos(original, por100, 15)
    actual = itemConGramos(actual, por100, 1)
    actual = itemConGramos(actual, por100, 150)

    expect(actual).toEqual(itemConGramos(original, por100, 150))
    expect(actual).toMatchObject({ gramos: 150, kcal: 250.1, prot: 40.1, carb: 0, grasa: 8 })
  })

  it('pasar por 0 g (o vacío, que llega como 0) no corrompe los valores por 100 g originales', () => {
    const original = item({ gramos: 150, kcal: 250, prot: 40, carb: 0, grasa: 8 })
    const por100 = por100DesdeEntrada(original)

    const enCero = itemConGramos(original, por100, 0)
    expect(enCero).toMatchObject({ gramos: 0, kcal: 0, prot: 0, carb: 0, grasa: 0 })

    const restaurado = itemConGramos(enCero, por100, 150)
    expect(restaurado).toEqual(itemConGramos(original, por100, 150))
  })

  it('cambiar directamente 150 -> 200 produce los valores correctos escalados desde el por100 original', () => {
    const original = item({ gramos: 150, kcal: 250, prot: 40, carb: 0, grasa: 8 })
    const por100 = por100DesdeEntrada(original)

    expect(itemConGramos(original, por100, 200)).toEqual({ ...original, gramos: 200, kcal: 333.4, prot: 53.4, carb: 0, grasa: 10.6 })
  })

  it('el snapshot de la plantilla sigue siendo correcto tras editar los gramos, aunque el alimento ya no exista', () => {
    const original = item({ gramos: 150, kcal: 250, prot: 40, carb: 0, grasa: 8 })
    const por100 = por100DesdeEntrada(original)

    let editado = itemConGramos(original, por100, 15)
    editado = itemConGramos(editado, por100, 1)
    editado = itemConGramos(editado, por100, 150)

    const plantilla = meal({ items: [editado] })
    const [entradaNueva] = entradasDesdePlantilla(plantilla, new Map(), { fecha: '2026-10-01', comida: 'cena' }, 999)

    expect(entradaNueva).toMatchObject({ gramos: 150, kcal: 250.1, prot: 40.1, carb: 0, grasa: 8 })
  })
})

describe('itemsConGramosValidos', () => {
  it('es válido si todos los ítems no «rápidos» tienen gramos > 0', () => {
    expect(itemsConGramosValidos([item({ gramos: 150 }), item({ gramos: 1 })])).toBe(true)
  })

  it('no es válido si algún ítem no «rápido» tiene 0 g', () => {
    expect(itemsConGramosValidos([item({ gramos: 150 }), item({ gramos: 0 })])).toBe(false)
  })

  it('un ítem «rápido» con 0 g no invalida la plantilla', () => {
    const rapida = item({ foodId: undefined, gramos: 0, rapida: true, nombre: 'Pizza fuera' })
    expect(itemsConGramosValidos([item({ gramos: 150 }), rapida])).toBe(true)
  })

  it('una lista vacía es válida', () => {
    expect(itemsConGramosValidos([])).toBe(true)
  })
})

describe('resolverItemsPlantilla (A1)', () => {
  it('si el alimento existe, usa sus valores actuales escalados a los gramos guardados', () => {
    const [resuelto] = resolverItemsPlantilla([item({ gramos: 200 })], new Map([[3, POLLO]]))
    expect(resuelto).toEqual({ foodId: 3, nombre: 'Pollo', gramos: 200, kcal: 330, prot: 62, carb: 0, grasa: 7.2 })
  })

  it('si el alimento cambió de valores, usa los nuevos (no el snapshot guardado)', () => {
    const pechugaMasMagra: Food = { ...POLLO, kcal100: 120, prot100: 26, grasa100: 1 }
    const [resuelto] = resolverItemsPlantilla([item({ gramos: 100 })], new Map([[3, pechugaMasMagra]]))
    expect(resuelto).toMatchObject({ kcal: 120, prot: 26, grasa: 1 })
  })

  it('si el alimento ya no existe, usa el snapshot guardado en el ítem', () => {
    const [resuelto] = resolverItemsPlantilla([item()], new Map())
    expect(resuelto).toEqual(item())
  })

  it('una «rápida» (sin foodId) siempre usa su snapshot, aunque el mapa tenga alimentos', () => {
    const rapida = item({ foodId: undefined, gramos: 0, rapida: true, nombre: 'Pizza fuera' })
    const [resuelto] = resolverItemsPlantilla([rapida], new Map([[3, POLLO]]))
    expect(resuelto).toEqual(rapida)
    expect(resuelto).not.toBe(rapida)
  })

  it('una lista vacía no falla', () => {
    expect(resolverItemsPlantilla([], new Map())).toEqual([])
  })

  it('no comparte referencias con los ítems originales', () => {
    const original = item()
    const [resuelto] = resolverItemsPlantilla([original], new Map())
    expect(resuelto).not.toBe(original)
    resuelto.nombre = 'Cambiado'
    expect(original.nombre).toBe('Pollo')
  })
})

describe('entradasDesdePlantilla (A1)', () => {
  it('usa la fecha y la comida de destino, con createdAt nuevo y sin id', () => {
    const [entradaNueva] = entradasDesdePlantilla(meal(), new Map([[3, POLLO]]), { fecha: '2026-10-01', comida: 'desayuno' }, 999)
    expect(entradaNueva).not.toHaveProperty('id')
    expect(entradaNueva).toEqual({
      fecha: '2026-10-01', comida: 'desayuno', foodId: 3, nombre: 'Pollo',
      gramos: 150, kcal: 247.5, prot: 46.5, carb: 0, grasa: 5.4, createdAt: 999, rapida: undefined,
    })
  })

  it('usa el snapshot si el alimento se borró', () => {
    const [entradaNueva] = entradasDesdePlantilla(meal(), new Map(), { fecha: '2026-10-01', comida: 'cena' }, 999)
    expect(entradaNueva).toMatchObject({ foodId: 3, nombre: 'Pollo', kcal: 250, prot: 40 })
  })

  it('no comparte referencias con los ítems de la plantilla original', () => {
    const m = meal()
    const [entradaNueva] = entradasDesdePlantilla(m, new Map(), { fecha: '2026-10-01', comida: 'cena' }, 999)
    entradaNueva.nombre = 'Cambiado'
    expect(m.items[0].nombre).toBe('Pollo')
  })

  it('varios ítems producen varias entradas', () => {
    const dos = meal({ items: [item({ nombre: 'A' }), item({ nombre: 'B', foodId: undefined })] })
    const entradas = entradasDesdePlantilla(dos, new Map(), { fecha: '2026-10-01', comida: 'cena' }, 999)
    expect(entradas.map((e) => e.nombre)).toEqual(['A', 'B'])
  })
})
