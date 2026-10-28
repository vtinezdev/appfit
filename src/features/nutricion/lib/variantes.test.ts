import { describe, expect, it } from 'vitest'
import type { CatalogFood, MealItem, Receta } from '../../../shared/db/types'
import { aLote, categoriasRecetario, diferencias, filtrarRecetario, ordenarRecetario, racionRecetario, gramosRacion, ingredientesPara, mismaComposicion, nombrePlatoDe, nombrePropuesto, pesoCocinadoVariante, por100De, varianteIgual, vistaDeRecetaCatalogo, vistaDeRecetaPropia } from './variantes'

const ing = (catalogId: string, nombre: string, gramos: number, kcal100: number): MealItem => ({ catalogId, nombre, gramos, kcal: (kcal100 * gramos) / 100, prot: 0, carb: 0, grasa: 0 })
const lenteja = ing('ciqual:1', 'Lenteja, seca (promedio)', 400, 330)
const chorizo = ing('ciqual:2', 'Chorizo', 150, 450)
const patata = ing('ciqual:3', 'Patata, sin piel, cruda', 300, 80)
const agua = ing('ciqual:4', 'Agua del grifo', 1650, 0)
const normal = { ingredientes: [lenteja, chorizo, patata, agua], pesoCocinadoG: 2500 }

const catalogo = (id: string, nombre: string, kcal100: number, extra: Partial<CatalogFood> = {}): CatalogFood => ({
  id, fuente: id.split(':')[0], idExterno: id.split(':')[1], nombre, nombreNorm: nombre.toLowerCase(), tok: [], tipo: 'generico', kcal100, prot100: 10, carb100: 20, grasa100: 1, version: 'v', importadoAt: 0, ...extra,
})

describe('receta elegida', () => {
  it('una receta propia: registra su alimento y sus raciones (1 si no tiene)', () => {
    const r: Receta = { id: 7, nombre: 'Lentejas', nombreNorm: 'lentejas', ingredientes: normal.ingredientes, pesoCocinadoG: 2500, foodId: 3, raciones: 6, pasos: ['Lava las lentejas.'], createdAt: 0, updatedAt: 0 }
    const v = vistaDeRecetaPropia(r)
    expect(v).toMatchObject({ origen: 'tuya', ref: { tipo: 'user', id: 3 }, base: { recetaId: 7 }, raciones: 6, pasos: ['Lava las lentejas.'] })
    expect(vistaDeRecetaPropia({ ...r, raciones: undefined, pasos: undefined }).raciones).toBe(1)
  })
  it('una receta del catálogo resuelve sus ingredientes; si falta uno, no se enseña', () => {
    const plato = catalogo('tipicos:lentejas', 'Lentejas con chorizo', 108, { receta: { pesoFinalG: 2500, ingredientes: [{ catalogId: 'ciqual:1', gramos: 400 }], raciones: 6 } })
    const ingredientes = new Map([['ciqual:1', catalogo('ciqual:1', 'Lenteja, seca', 330)]])
    const v = vistaDeRecetaCatalogo(plato, ingredientes)!
    expect(v).toMatchObject({ origen: 'appfit', ref: { tipo: 'catalog', id: 'tipicos:lentejas' }, base: { catalogId: 'tipicos:lentejas' }, raciones: 6, pesoCocinadoG: 2500 })
    expect(v.ingredientes).toEqual([{ catalogId: 'ciqual:1', nombre: 'Lenteja, seca', gramos: 400, kcal: 1320, prot: 40, carb: 80, grasa: 4 }])
    expect(vistaDeRecetaCatalogo(plato, new Map())).toBeNull()
    expect(vistaDeRecetaCatalogo(catalogo('tipicos:pan', 'Pan', 250), ingredientes)).toBeNull()
  })
  it('gramos de una ración y valores por 100 g de una composición', () => {
    expect(gramosRacion({ raciones: 5 }, normal)).toBe(500)
    expect(gramosRacion({}, normal)).toBeNull()
    expect(por100De(normal).kcal100).toBeCloseTo((1320 + 675 + 240) / 25, 1)
  })
  it('escala los ingredientes a los gramos cocinados y los devuelve al lote', () => {
    const racion = ingredientesPara(normal, 500)
    expect(racion.map((i) => i.gramos)).toEqual([80, 30, 60, 330])
    expect(racion[0].kcal).toBe(264)
    expect(aLote(normal, racion, 500).map((i) => i.gramos)).toEqual([400, 150, 300, 1650])
  })
})

describe('variantes', () => {
  it('describe lo quitado, lo añadido y las cantidades que cambian', () => {
    const queso = ing('ciqual:9', 'Queso Emmental, rallado', 50, 380)
    const variante = [lenteja, { ...patata, gramos: 400 }, agua, queso]
    expect(diferencias(normal.ingredientes, variante)).toEqual(['Sin chorizo', 'Patata: 400 g en vez de 300 g', 'Con queso emmental (50 g)'])
    expect(nombrePropuesto(diferencias(normal.ingredientes, variante))).toBe('Sin chorizo · Patata: 400 g en vez de 300 g')
    expect(nombrePropuesto([])).toBe('Mi variante')
  })
  it('los redondeos al escalar no cuentan como cambio', () => {
    const ida = aLote(normal, ingredientesPara(normal, 417), 417)
    expect(mismaComposicion(normal.ingredientes, ida)).toBe(true)
    expect(mismaComposicion(normal.ingredientes, [lenteja, chorizo, { ...patata, gramos: 310 }, agua])).toBe(false)
  })
  it('reutiliza una variante con la misma composición', () => {
    const sinChorizo = { id: 1, catalogId: 'tipicos:lentejas', nombre: 'Sin chorizo', ingredientes: [lenteja, patata, agua], pesoCocinadoG: 2300, createdAt: 0, updatedAt: 0 }
    expect(varianteIgual([sinChorizo], [lenteja, patata, agua])).toBe(sinChorizo)
    expect(varianteIgual([sinChorizo], normal.ingredientes)).toBeUndefined()
  })
  it('peso cocinado en proporción al crudo y nombre del plato', () => {
    expect(pesoCocinadoVariante(normal, [lenteja, patata, agua])).toBe(Math.round((2500 * 2350) / 2500))
    expect(nombrePlatoDe({ nombre: 'Lentejas con chorizo' }, { nombre: 'Sin chorizo' })).toBe('Lentejas con chorizo · Sin chorizo')
    expect(nombrePlatoDe({ nombre: 'Lentejas con chorizo' })).toBe('Lentejas con chorizo')
  })
})

describe('recetario AppFit', () => {
  const plato = (nombre: string, pasos?: string[]) => ({ nombre, receta: { pesoFinalG: 1000, ingredientes: [], ...(pasos ? { pasos } : {}) } })
  const platos = [plato('Tortilla de patatas, cuajada'), plato('Lentejas con chorizo, estofadas', ['Lava.']), plato('Lentejas con calabaza, cocidas'), plato('Ñoquis con tomate', ['Cuece.'])]
  it('sin consulta: primero los que tienen pasos y después por nombre', () => {
    expect(filtrarRecetario(platos, '').map((p) => p.nombre)).toEqual(['Lentejas con chorizo, estofadas', 'Ñoquis con tomate', 'Lentejas con calabaza, cocidas', 'Tortilla de patatas, cuajada'])
  })
  it('busca por el principio de las palabras, sin tildes ni mayúsculas', () => {
    expect(filtrarRecetario(platos, 'LENT cala').map((p) => p.nombre)).toEqual(['Lentejas con calabaza, cocidas'])
    expect(filtrarRecetario(platos, 'noquis').map((p) => p.nombre)).toEqual(['Ñoquis con tomate'])
    expect(filtrarRecetario(platos, 'tejas')).toEqual([])
  })
})

describe('recetario AppFit: ración, orden y categorías', () => {
  const plato = (nombre: string, kcal100: number, prot100: number, raciones: number | undefined, categoria: string) =>
    ({ nombre, kcal100, prot100, carb100: 10, grasa100: 5, categoria, receta: { pesoFinalG: 800, ingredientes: [], ...(raciones ? { raciones } : {}) } })
  const tortilla = plato('Tortilla', 200, 8, 4, 'Platos preparados')
  const bizcocho = plato('Bizcocho', 400, 6, 8, 'Galletas, bollería y pasteles')
  const pan = plato('Pan', 250, 9, undefined, 'Pan y tostadas')
  it('por ración si la tiene; si no, por 100 g', () => {
    expect(racionRecetario(tortilla)).toEqual({ kcal: 400, prot: 16, carb: 20, grasa: 10, porRacion: true })
    expect(racionRecetario(pan)).toEqual({ kcal: 250, prot: 9, carb: 10, grasa: 5, porRacion: false })
  })
  it('ordena por lo que aporta una ración; «relevancia» no cambia el orden', () => {
    expect(ordenarRecetario([tortilla, bizcocho, pan], 'menos-kcal').map((p) => p.nombre)).toEqual(['Pan', 'Tortilla', 'Bizcocho'])
    expect(ordenarRecetario([tortilla, bizcocho, pan], 'mas-proteina').map((p) => p.nombre)).toEqual(['Tortilla', 'Pan', 'Bizcocho'])
    expect(ordenarRecetario([tortilla, bizcocho, pan], 'relevancia').map((p) => p.nombre)).toEqual(['Tortilla', 'Bizcocho', 'Pan'])
  })
  it('categorías presentes en el orden de siempre', () => {
    expect(categoriasRecetario([bizcocho, tortilla, pan, tortilla])).toEqual(['Pan y tostadas', 'Galletas, bollería y pasteles', 'Platos preparados'])
  })
})
