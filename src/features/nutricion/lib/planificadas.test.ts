import { describe, expect, it } from 'vitest'
import type { MealItem, Planificada } from '../../../shared/db/types'
import { agruparCompra, agruparPlanificadas, alternarMarca, cantidadCompra, diaInicialPlan, expandirRecetas, listaCompra, type RecetaCompra, nombreDia, nombreSemana, rangoSemana, sePuedePlanificar, semanaPlan, SIN_CATEGORIA, textoListaCompra } from './planificadas'

let id = 0
const fila = (p: Partial<Planificada>): Planificada => ({ id: ++id, fecha: '2026-03-10', comida: 'comida', nombre: 'Arroz', gramos: 100, kcal: 130, prot: 2.7, carb: 28, grasa: 0.3, createdAt: 1, ...p })

describe('días planificables', () => {
  it('hoy y cualquier día futuro, nunca días pasados', () => {
    expect(sePuedePlanificar('2026-03-09', '2026-03-10')).toBe(false)
    expect(sePuedePlanificar('2026-03-10', '2026-03-10')).toBe(true)
    expect(sePuedePlanificar('2026-03-17', '2026-03-10')).toBe(true)
    expect(sePuedePlanificar('2027-01-20', '2026-03-10')).toBe(true)
  })

  it('nombra hoy y mañana', () => {
    expect(nombreDia('2026-03-10', '2026-03-10')).toBe('Hoy')
    expect(nombreDia('2026-03-11', '2026-03-10')).toBe('Mañana')
    expect(nombreDia('2026-03-13', '2026-03-10')).toMatch(/13/)
  })
})

describe('semana del Plan', () => {
  // 2026-03-10 es martes; su semana va del lunes 9 al domingo 15.
  it('siete días de lunes a domingo, con los pasados marcados y lo planificado de cada uno', () => {
    const dias = semanaPlan('2026-03-09', '2026-03-10', [fila({ fecha: '2026-03-12', kcal: 300 }), fila({ fecha: '2026-03-12', kcal: 200 }), fila({ fecha: '2026-03-20' })])
    expect(dias.map((d) => d.letra).join('')).toBe('LMXJVSD')
    expect(dias.map((d) => d.numero)).toEqual([9, 10, 11, 12, 13, 14, 15])
    expect(dias.filter((d) => d.pasado).map((d) => d.fecha)).toEqual(['2026-03-09'])
    expect(dias.find((d) => d.hoy)?.fecha).toBe('2026-03-10')
    expect(dias[3]).toMatchObject({ planificados: 2, kcal: 500 })
  })

  it('nombra la semana y su rango, también entre dos meses', () => {
    expect(nombreSemana('2026-03-09', '2026-03-10')).toBe('Esta semana')
    expect(nombreSemana('2026-03-16', '2026-03-10')).toBe('Semana que viene')
    expect(nombreSemana('2026-03-30', '2026-03-10')).toBe('Dentro de 3 semanas')
    expect(rangoSemana('2026-03-09')).toBe('9 – 15 mar')
    expect(rangoSemana('2026-03-30')).toBe('30 mar – 5 abr')
  })

  it('abre en hoy si es su semana y, si no, en el lunes', () => {
    expect(diaInicialPlan('2026-03-09', '2026-03-10')).toBe('2026-03-10')
    expect(diaInicialPlan('2026-03-16', '2026-03-10')).toBe('2026-03-16')
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
    expect(cantidadCompra(0.07)).toBe('menos de 1 g')
    expect(cantidadCompra(0.6)).toBe('1 g')
    expect(textoListaCompra(listaCompra([fila({ nombre: 'Arroz', gramos: 1200 }), fila({ nombre: 'Huevos', gramos: 120 })]))).toBe('- Arroz: 1,2 kg\n- Huevos: 120 g')
  })

  it('sin planificadas, una lista vacía', () => {
    expect(listaCompra([])).toEqual([])
    expect(textoListaCompra([])).toBe('')
  })

  it('agrupa por categoría en el orden de la lista, con lo que no tiene al final', () => {
    const articulos = listaCompra([fila({ foodId: 1, nombre: 'Pollo' }), fila({ catalogId: 'ciqual:1', nombre: 'Manzana' }), fila({ nombre: 'Tomate' }), fila({ foodId: 2, nombre: 'Arroz' })])
    const grupos = agruparCompra(articulos, new Map([['user:1', 'Carnes'], ['catalog:ciqual:1', 'Frutas'], ['user:2', 'Cereales, arroz y pasta']]))
    expect(grupos.map((g) => [g.categoria, g.articulos.map((a) => a.nombre)])).toEqual([['Frutas', ['Manzana']], ['Cereales, arroz y pasta', ['Arroz']], ['Carnes', ['Pollo']], [SIN_CATEGORIA, ['Tomate']]])
  })

  it('marca y desmarca lo ya comprado', () => {
    expect(alternarMarca([], 'user:1')).toEqual(['user:1'])
    expect(alternarMarca(['user:1', 'user:2'], 'user:1')).toEqual(['user:2'])
  })
})

describe('recetas en la lista de la compra', () => {
  const ing = (p: Partial<MealItem> & Pick<MealItem, 'nombre' | 'gramos'>): MealItem => ({ kcal: 0, prot: 0, carb: 0, grasa: 0, ...p })
  const lentejas: RecetaCompra = {
    nombre: 'Lentejas con chorizo',
    pesoCocinadoG: 2400,
    ingredientes: [ing({ catalogId: 'ciqual:1', nombre: 'Lenteja, seca', gramos: 400 }), ing({ catalogId: 'ciqual:18066', nombre: 'Agua del grifo', gramos: 1600 }), ing({ nombre: 'Chorizo', gramos: 150 })],
  }
  const recetas = new Map([['catalog:tipicos:lentejas', lentejas]])

  it('una receta planificada sale por sus ingredientes, en proporción a lo planificado y sin el agua del grifo', () => {
    // 800 g de 2.400 g cocinados: un tercio del lote.
    const lista = listaCompra(expandirRecetas([fila({ catalogId: 'tipicos:lentejas', nombre: 'Lentejas con chorizo', gramos: 800 })], recetas))
    expect(lista.map((a) => [a.nombre, Math.round(a.gramos), a.recetas])).toEqual([['Chorizo', 50, ['Lentejas con chorizo']], ['Lenteja, seca', 133, ['Lentejas con chorizo']]])
  })

  it('suma los ingredientes de varias recetas y lo planificado suelto, y dice de qué recetas sale', () => {
    const tortilla: RecetaCompra = { nombre: 'Tortilla', pesoCocinadoG: 600, ingredientes: [ing({ nombre: 'Chorizo', gramos: 60 }), ing({ nombre: 'Agua del grifo', gramos: 50 })] }
    const lista = listaCompra(expandirRecetas([
      fila({ catalogId: 'tipicos:lentejas', nombre: 'Lentejas con chorizo', gramos: 2400 }),
      fila({ foodId: 7, nombre: 'Tortilla', gramos: 300 }),
      fila({ nombre: 'chorizo', gramos: 20 }),
    ], new Map([...recetas, ['user:7', tortilla]])))
    const chorizo = lista.find((a) => a.nombre === 'Chorizo')!
    expect([chorizo.gramos, chorizo.veces, chorizo.recetas]).toEqual([200, 3, ['Lentejas con chorizo', 'Tortilla']])
    expect(lista.some((a) => a.nombre.startsWith('Agua'))).toBe(false)
  })

  it('lo que no es receta, las kcal rápidas y una receta sin peso pasan tal cual', () => {
    const filas = [fila({ foodId: 1, nombre: 'Arroz' }), fila({ nombre: 'Cena fuera', gramos: 0, rapida: true }), fila({ catalogId: 'tipicos:raro', nombre: 'Raro', gramos: 100 })]
    expect(expandirRecetas(filas, new Map([['catalog:tipicos:raro', { ...lentejas, pesoCocinadoG: 0 }]]))).toEqual(filas)
  })
})

