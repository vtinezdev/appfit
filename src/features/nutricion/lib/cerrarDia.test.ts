import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Entry, MealItem } from '../../../shared/db/types'
import type { AlimentoElegible } from './alimentos'
import { aCatalogFoods, validarManifest, validarPaquete } from './catalogo/paquete'
import type { ComidaTipica } from './comidasTipicas'
import {
  cabe,
  faltaDelDia,
  hayHueco,
  hayMasTandas,
  huecoRestante,
  IDEAS,
  ideasPara,
  proponer,
  racionesHabituales,
  tanda,
  type ConRacion,
  type Falta,
  type Propuesta,
} from './cerrarDia'

const alimento = (id: number, nombre: string, [kcal100, prot100, carb100, grasa100]: number[], categoria?: string): AlimentoElegible =>
  ({ ref: { tipo: 'user', id }, nombre, kcal100, prot100, carb100, grasa100, ...(categoria ? { categoria } : {}) })
const con = (a: AlimentoElegible, racion: number): ConRacion => ({ alimento: a, racion })

const pollo = alimento(1, 'Pechuga de pollo', [110, 23, 0, 1.5], 'Carnes')
const arroz = alimento(2, 'Arroz cocido', [130, 2.7, 28, 0.3], 'Cereales, arroz y pasta')
const champinones = alimento(3, 'Champiñones', [22, 3, 0.3, 0.3], 'Verduras y hortalizas')
const pavo = alimento(4, 'Pavo', [108, 23, 0, 1.5], 'Carnes')
const queso = alimento(5, 'Queso curado', [400, 25, 0, 33], 'Quesos')
const yogur = alimento(6, 'Yogur', [57, 10, 4, 0.2], 'Yogures y postres lácteos')

const falta: Falta = { kcal: 600, prot: 40, carb: 60, grasa: 15 }
const nombres = (ps: Propuesta[]) => ps.map((p) => (p.tipo === 'tipica' ? p.tipica.nombre : p.items.map((i) => `${i.alimento.nombre} ${i.gramos}`).join(' + ')))

describe('lo que falta del día', () => {
  it('resta macro a macro y conserva los excesos', () => {
    expect(faltaDelDia({ kcal: 1500, prot: 100, carb: 150, grasa: 70 }, { kcal: 2200, prot: 140, carb: 250, grasa: 65 }))
      .toEqual({ kcal: 700, prot: 40, carb: 100, grasa: -5 })
    expect(faltaDelDia({ kcal: 0, prot: 0, carb: 0, grasa: 0 }, null)).toBeNull()
    expect(faltaDelDia({ kcal: 0, prot: 0, carb: 0, grasa: 0 }, { kcal: 0, prot: 0, carb: 0, grasa: 0 })).toBeNull()
  })

  it('hay hueco con 150 kcal libres y proteína (10 g) o carbohidratos (20 g) pendientes', () => {
    expect(hayHueco({ kcal: 300, prot: 10, carb: 0, grasa: 0 })).toBe(true)
    expect(hayHueco({ kcal: 300, prot: 0, carb: 20, grasa: 0 })).toBe(true)
    expect(hayHueco({ kcal: 140, prot: 40, carb: 60, grasa: 10 })).toBe(false)
    expect(hayHueco({ kcal: 300, prot: 8, carb: 15, grasa: 20 })).toBe(false)
    expect(hayHueco(null)).toBe(false)
  })

  it('no se pasa de kcal, ni de carbohidratos ni de grasa más el margen; con la grasa ya pasada, solo el margen', () => {
    expect(cabe({ kcal: 600, prot: 50, carb: 65, grasa: 20 }, falta)).toBe(true)
    expect(cabe({ kcal: 601, prot: 0, carb: 0, grasa: 0 }, falta)).toBe(false)
    expect(cabe({ kcal: 500, prot: 0, carb: 66, grasa: 0 }, falta)).toBe(false)
    expect(cabe({ kcal: 500, prot: 0, carb: 0, grasa: 21 }, falta)).toBe(false)
    expect(cabe({ kcal: 100, prot: 0, carb: 0, grasa: 5 }, { ...falta, grasa: -10 })).toBe(true)
    expect(cabe({ kcal: 100, prot: 0, carb: 0, grasa: 6 }, { ...falta, grasa: -10 })).toBe(false)
  })

  it('el hueco cuenta el doble la proteína e ignora lo ya cubierto', () => {
    expect(huecoRestante({ kcal: 0, prot: 0, carb: 0, grasa: 0 }, falta)).toBe(4)
    expect(huecoRestante({ kcal: 0, prot: 20, carb: 60, grasa: 30 }, falta)).toBe(1)
    expect(huecoRestante({ kcal: 0, prot: 0, carb: 0, grasa: 0 }, { kcal: 300, prot: -5, carb: 30, grasa: 0 })).toBe(1)
  })
})

describe('raciones habituales', () => {
  const entrada = (id: number, fecha: string, gramos: number, extra: Partial<Entry> = {}): Entry =>
    ({ id, fecha, comida: 'comida', foodId: 1, nombre: 'Pollo', gramos, kcal: 0, prot: 0, carb: 0, grasa: 0, createdAt: id, ...extra })

  it('la mediana de los gramos de la ventana, a 5 g, sin rápidas', () => {
    const r = racionesHabituales([
      entrada(1, '2026-10-20', 150), entrada(2, '2026-10-21', 180), entrada(3, '2026-10-22', 400),
      entrada(4, '2026-07-01', 1000), entrada(5, '2026-10-22', 900, { rapida: true, foodId: undefined }),
      entrada(6, '2026-10-22', 72, { foodId: undefined, catalogId: 'ciqual:9104' }),
      entrada(7, '2026-10-23', 78, { foodId: undefined, catalogId: 'ciqual:9104' }),
    ], { hoy: '2026-10-26' })
    expect(r.get('user:1')).toBe(180)
    expect(r.get('catalog:ciqual:9104')).toBe(75)
    expect(r.size).toBe(2)
  })
})

describe('propuestas', () => {
  it('nada sin hueco', () => {
    expect(proponer({ falta: { kcal: 100, prot: 40, carb: 0, grasa: 0 }, tipicas: [], frecuentes: [con(pollo, 150)], ideas: [] }))
      .toEqual({ fijas: [], ideas: [], sueltos: [] })
  })

  it('un suelto no pasa de tu ración: nada de 400 g de champiñones', () => {
    const { sueltos } = proponer({ falta, tipicas: [], frecuentes: [con(champinones, 100), con(pollo, 150)], ideas: [] })
    expect(nombres(sueltos)).toEqual(['Pechuga de pollo 150'])
  })

  it('reduce la ración para caber, pero no por debajo de la mitad', () => {
    const justo: Falta = { kcal: 160, prot: 30, carb: 0, grasa: 50 }
    expect(nombres(proponer({ falta: justo, tipicas: [], frecuentes: [con(pollo, 150)], ideas: [] }).sueltos)).toEqual(['Pechuga de pollo 135'])
    // Media ración de queso (50 g) ya son 200 kcal.
    expect(proponer({ falta: justo, tipicas: [], frecuentes: [con(queso, 100)], ideas: [] }).sueltos).toEqual([])
  })

  it('combina frecuentes de categorías distintas y prefiere lo que cubre los cuatro macros', () => {
    const { fijas, sueltos } = proponer({ falta, tipicas: [], frecuentes: [con(pollo, 150), con(pavo, 150), con(arroz, 150)], ideas: [] })
    expect(nombres(fijas)).toEqual(['Pechuga de pollo 150 + Arroz cocido 150', 'Pavo 150 + Arroz cocido 150'])
    expect(nombres(sueltos)[0]).toBe('Pechuga de pollo 150')
    for (const p of [...fijas, ...sueltos]) expect(cabe(p.aporte, falta)).toBe(true)
  })

  it('con la grasa ya cubierta no propone algo graso', () => {
    const { sueltos } = proponer({ falta: { ...falta, grasa: -2 }, tipicas: [], frecuentes: [con(queso, 40), con(yogur, 125)], ideas: [] })
    expect(nombres(sueltos)).toEqual(['Yogur 125'])
  })

  it('las típicas van primero si caben tal cual', () => {
    const item = (nombre: string, kcal: number, prot: number, carb: number, grasa: number): MealItem => ({ nombre, gramos: 100, kcal, prot, carb, grasa })
    const tipica = (nombre: string, items: MealItem[]): ComidaTipica => ({ clave: nombre, nombre, items, origen: 'historial', dias: 3 })
    const { fijas } = proponer({
      falta,
      tipicas: [tipica('Pollo con arroz', [item('Pollo', 200, 35, 0, 3), item('Arroz', 250, 5, 55, 1)]), tipica('Pizza', [item('Pizza', 900, 35, 100, 35)])],
      frecuentes: [con(pollo, 150), con(arroz, 150)],
      ideas: [],
    })
    expect(fijas.map((p) => p.tipo)).toEqual(['tipica', 'combinacion'])
    expect(nombres(fijas)[0]).toBe('Pollo con arroz')
  })

  it('cada idea sale una vez, sola o con el frecuente que mejor encaja, y no repite tus frecuentes', () => {
    const atun = { ...alimento(9, 'Atún', [116, 26, 0, 1], 'Pescados'), ref: { tipo: 'catalog' as const, id: 'ciqual:26039' } }
    const { ideas } = proponer({ falta, tipicas: [], frecuentes: [con(arroz, 150)], ideas: [con(atun, 60), con(arroz, 150)] })
    expect(nombres(ideas)).toEqual(['Atún 60 + Arroz cocido 150'])
    // Sin hueco de carbohidratos, mejor sola.
    expect(nombres(proponer({ falta: { ...falta, carb: 0 }, tipicas: [], frecuentes: [con(arroz, 150)], ideas: [con(atun, 60)] }).ideas)).toEqual(['Atún 60'])
    expect(ideas.every((p) => p.tipo === 'idea')).toBe(true)
  })

  it('no propone como idea lo que ya comes con otro nombre', () => {
    const polloCatalogo = { ...alimento(9, 'Pollo, pechuga sin piel a la plancha', [141, 30, 0, 2], 'Carnes'), ref: { tipo: 'catalog' as const, id: 'ciqual:36018' } }
    const pavoCatalogo = { ...alimento(10, 'Pavo, escalopa a la plancha', [124, 28.5, 0, 1.1], 'Carnes'), ref: { tipo: 'catalog' as const, id: 'ciqual:36306' } }
    const { ideas } = proponer({ falta, tipicas: [], frecuentes: [con(pollo, 150)], ideas: [con(polloCatalogo, 150), con(pavoCatalogo, 150)] })
    expect(ideas.map((p) => p.tipo !== 'tipica' && p.items[0].alimento.nombre)).toEqual(['Pavo, escalopa a la plancha'])
  })

  it('las ideas, solo de categorías que registras', () => {
    const atun = con(alimento(9, 'Atún', [116, 26, 0, 1], 'Pescados'), 60)
    const sinCategoria = con(alimento(10, 'Algo', [100, 10, 0, 0]), 100)
    expect(ideasPara([atun, sinCategoria], new Set(['Pescados']))).toEqual([atun])
    expect(ideasPara([atun], new Set(['Carnes']))).toEqual([])
  })

  it('«Sugerir otras» pasa a la siguiente tanda y al acabar vuelve a empezar', () => {
    expect(tanda([1, 2, 3, 4, 5], 2, 0)).toEqual([1, 2])
    expect(tanda([1, 2, 3, 4, 5], 2, 1)).toEqual([3, 4])
    expect(tanda([1, 2, 3, 4, 5], 2, 2)).toEqual([5])
    expect(tanda([1, 2, 3, 4, 5], 2, 3)).toEqual([1, 2])
    expect(tanda([1], 2, 7)).toEqual([1])
    expect(hayMasTandas({ fijas: [], ideas: [], sueltos: [] })).toBe(false)
  })
})

describe('lista de ideas', () => {
  const leer = (archivo: string): unknown => JSON.parse(readFileSync(`public/catalogo/${archivo}`, 'utf8'))
  const catalogo = validarManifest(leer('manifest.json')).fuentes.flatMap((f) => aCatalogFoods(validarPaquete(leer(f.archivo)), 0))
  const porId = new Map(catalogo.map((f) => [f.id, f]))

  it('sin repetidos y con raciones razonables', () => {
    expect(new Set(IDEAS.map((i) => i.id)).size).toBe(IDEAS.length)
    for (const i of IDEAS) expect(i.gramos).toBeGreaterThanOrEqual(10)
  })

  it.each(IDEAS.map((i) => i.id))('%s existe en el catálogo y tiene categoría', (id) => {
    expect(porId.get(id)?.categoria).toBeTruthy()
  })
})
