import { describe, expect, it } from 'vitest'
import type { Planificada } from '../../../shared/db/types'
import { agruparPlanificadas, cantidadCompra, diasPlanificables, listaCompra, nombreDia, sePuedePlanificar, textoListaCompra } from './planificadas'

let id = 0
const fila = (p: Partial<Planificada>): Planificada => ({ id: ++id, fecha: '2026-03-10', comida: 'comida', nombre: 'Arroz', gramos: 100, kcal: 130, prot: 2.7, carb: 28, grasa: 0.3, createdAt: 1, ...p })

describe('días planificables', () => {
  it('hoy y los siete siguientes, nunca días pasados', () => {
    const dias = diasPlanificables('2026-03-10')
    expect(dias).toHaveLength(8)
    expect(dias[0]).toBe('2026-03-10')
    expect(dias[7]).toBe('2026-03-17')
    expect(sePuedePlanificar('2026-03-09', '2026-03-10')).toBe(false)
    expect(sePuedePlanificar('2026-03-10', '2026-03-10')).toBe(true)
    expect(sePuedePlanificar('2026-03-17', '2026-03-10')).toBe(true)
    expect(sePuedePlanificar('2026-03-18', '2026-03-10')).toBe(false)
  })

  it('nombra hoy y mañana', () => {
    expect(nombreDia('2026-03-10', '2026-03-10')).toBe('Hoy')
    expect(nombreDia('2026-03-11', '2026-03-10')).toBe('Mañana')
    expect(nombreDia('2026-03-13', '2026-03-10')).toMatch(/13/)
  })
})

describe('agrupar planificadas', () => {
  it('por día y en el orden de las comidas, con sus kcal', () => {
    const grupos = agruparPlanificadas([
      fila({ fecha: '2026-03-11', comida: 'cena', kcal: 300 }),
      fila({ fecha: '2026-03-10', comida: 'cena', kcal: 200 }),
      fila({ fecha: '2026-03-10', comida: 'desayuno', kcal: 100 }),
      fila({ fecha: '2026-03-10', comida: 'cena', kcal: 50 }),
    ])
    expect(grupos.map((g) => `${g.fecha} ${g.comida} ${g.kcal}`)).toEqual(['2026-03-10 desayuno 100', '2026-03-10 cena 250', '2026-03-11 cena 300'])
  })
})

describe('lista de la compra', () => {
  it('suma los gramos por alimento y deja fuera las kcal rápidas', () => {
    const lista = listaCompra([
      fila({ foodId: 1, nombre: 'Pechuga de pollo', gramos: 150 }),
      fila({ foodId: 1, nombre: 'Pechuga de pollo', gramos: 200, fecha: '2026-03-11' }),
      fila({ catalogId: 'ciqual:9100', nombre: 'Arroz', gramos: 80 }),
      fila({ nombre: 'Tomate', gramos: 100 }),
      fila({ nombre: 'tomate', gramos: 50 }),
      fila({ nombre: 'Cena fuera', gramos: 0, kcal: 800, rapida: true }),
    ])
    expect(lista.map((a) => [a.nombre, a.gramos, a.veces])).toEqual([['Arroz', 80, 1], ['Pechuga de pollo', 350, 2], ['Tomate', 150, 2]])
  })

  it('no confunde un alimento propio con uno del catálogo del mismo nombre', () => {
    expect(listaCompra([fila({ foodId: 3, nombre: 'Arroz' }), fila({ catalogId: 'ciqual:1', nombre: 'Arroz' })])).toHaveLength(2)
  })

  it('el texto copiable, con kilos desde 1.000 g', () => {
    expect(cantidadCompra(350)).toBe('350 g')
    expect(cantidadCompra(1250)).toBe('1,3 kg')
    expect(textoListaCompra(listaCompra([fila({ nombre: 'Arroz', gramos: 1200 }), fila({ nombre: 'Huevos', gramos: 120 })]))).toBe('- Arroz: 1,2 kg\n- Huevos: 120 g')
  })

  it('sin planificadas, una lista vacía', () => {
    expect(listaCompra([])).toEqual([])
    expect(textoListaCompra([])).toBe('')
  })
})
