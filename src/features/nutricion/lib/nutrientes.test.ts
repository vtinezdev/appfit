import { describe, expect, it } from 'vitest'
import type { Entry, Food } from '../../../shared/db/types'
import { aItemGuardado, elegibleDeFood, itemDesdeElegible, mismosValores, por100DesdeEntrada, procedencia } from './alimentos'
import { macrosPorGramos } from './nutrition'
import { camposNutrientes, escalarNutrientes, resumenNutrientes } from './nutrientes'
import { entradasDesdePlantilla, itemConGramos, itemsDesdeEntradas, planCopia, resolverItemsPlantilla } from './plantillas'

const valores = { kcal100: 100, prot100: 5, carb100: 10, grasa100: 4 }
const nutrientes = { fibra: 2.4, azucares: 0, sal: 0.15, agSat: 1.2 }
const entrada: Entry = { id: 1, fecha: '2026-10-03', comida: 'comida', nombre: 'Alimento', gramos: 200, ...macrosPorGramos({ ...valores, nutrientes }, 200), createdAt: 1 }

describe('nutrientes adicionales', () => {
  it('escala conocidos conservando ceros y precisión de la sal; no inventa los ausentes', () => {
    expect(escalarNutrientes(nutrientes, 0.5)).toEqual({ fibra: 1.2, azucares: 0, sal: 0.075, agSat: 0.6 })
    expect(escalarNutrientes({ fibra: 0 }, 2)).toEqual({ fibra: 0 })
    expect(camposNutrientes(undefined)).toEqual({})
    expect(camposNutrientes({ sal: 0.12345 })).toEqual({ nutrientes: { sal: 0.12345 } })
    expect(escalarNutrientes({ sal: NaN, fibra: -1, agSat: Infinity })).toBeUndefined()
  })

  it('resume cobertura por nutriente, separando parcial, desconocido y cero', () => {
    const resumen = resumenNutrientes([{ nutrientes: { fibra: 2, azucares: 0 } }, { nutrientes: { fibra: 3 } }, {}])
    expect(resumen[0]).toMatchObject({ valor: 5, conocidos: 2, total: 3 })
    expect(resumen[1]).toMatchObject({ valor: 0, conocidos: 1, total: 3 })
    expect(resumen[2]).toMatchObject({ valor: undefined, conocidos: 0, total: 3 })
    expect(resumenNutrientes([]).every((n) => n.valor === 0 && n.total === 0)).toBe(true)
    expect(resumenNutrientes([{}]).every((n) => n.valor === undefined)).toBe(true)
  })

  it('conserva los nutrientes entre alimento, revisión, guardado y edición por gramos', () => {
    const food: Food = { id: 1, nombre: 'Alimento', nombreNorm: 'alimento', fuente: 'manual', updatedAt: 1, ...valores, nutrientes }
    const item = itemDesdeElegible(elegibleDeFood(food), 200)
    expect(aItemGuardado(item).nutrientes).toEqual(nutrientes)
    expect(por100DesdeEntrada(entrada)).toEqual({ ...valores, nutrientes })
    expect(mismosValores(item, { ...item, nutrientes: { ...nutrientes, sal: 0.16 } })).toBe(false)
    expect(mismosValores({ ...valores, nutrientes: { fibra: 0 } }, valores)).toBe(false)
    item.nutrientes!.fibra = 100
    expect(food.nutrientes!.fibra).toBe(2.4)
    expect(item.origen.valores.nutrientes!.fibra).toBe(2.4)
  })

  it('editar un nutriente de catálogo crea un alimento propio y quitar un dato no equivale a cero', () => {
    const item = itemDesdeElegible({ ref: { tipo: 'catalog', id: 'ciqual:1' }, nombre: 'Alimento', ...valores, nutrientes }, 100)
    expect(aItemGuardado(item).catalogId).toBe('ciqual:1')
    const editado = { ...item, nutrientes: { ...nutrientes, fibra: 5 } }
    expect(aItemGuardado(editado).catalogId).toBeUndefined()
    expect(procedencia(editado)).toBeUndefined()
    expect(aItemGuardado({ ...item, nutrientes: undefined }).catalogId).toBeUndefined()
  })

  it('copias y plantillas conservan snapshots independientes, incluso sin el alimento de origen', () => {
    const copia = planCopia([entrada], { fecha: '2026-10-04' }, 2, 'lote')[0]
    const items = itemsDesdeEntradas([entrada])
    const nuevas = entradasDesdePlantilla({ id: 1, nombre: 'Comida', items, usos: 0, usadoAt: 1, createdAt: 1 }, new Map(), { fecha: '2026-10-05', comida: 'cena' }, 3, 'lote')
    expect(copia.nutrientes).toEqual(entrada.nutrientes)
    expect(nuevas[0].nutrientes).toEqual(entrada.nutrientes)
    copia.nutrientes!.fibra = 999
    nuevas[0].nutrientes!.sal = 999
    expect(entrada.nutrientes).toEqual({ fibra: 4.8, azucares: 0, sal: 0.3, agSat: 2.4 })
    expect(items[0].nutrientes).toEqual(entrada.nutrientes)
    const resuelto = resolverItemsPlantilla(items, new Map())[0]
    resuelto.nutrientes!.fibra = 999
    expect(items[0].nutrientes!.fibra).toBe(4.8)
  })

  it('cambiar gramos de plantilla escala todos los valores desde la densidad original', () => {
    const item = itemsDesdeEntradas([entrada])[0]
    const por100 = por100DesdeEntrada(item)
    expect(itemConGramos(item, por100, 50).nutrientes).toEqual({ fibra: 1.2, azucares: 0, sal: 0.075, agSat: 0.6 })
    expect(itemConGramos(itemConGramos(item, por100, 0), por100, 200).nutrientes).toEqual(entrada.nutrientes)
  })
})
