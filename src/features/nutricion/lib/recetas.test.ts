import { describe, expect, it } from 'vitest'
import type { MealItem } from '../../../shared/db/types'
import { elegibleDeCatalogo, elegibleDeFood, itemDesdeElegible, kcalPorRacion } from './alimentos'
import { escalarIngredientes, gramosPorRacion, infoReceta, marcarRecetasPropias, ingredienteDeItem, itemDeIngrediente, limpiarPasos, nombreLibre, pesoCrudoTotal, por100DeReceta, racionesDe, textoRaciones, textoTiempo, valoresPorRacion, validarReceta } from './recetas'

const arroz: MealItem = { nombre: 'Arroz', gramos: 200, kcal: 700, prot: 14, carb: 156, grasa: 2, nutrientes: { fibra: 2, sal: 0 } }
const pollo: MealItem = { nombre: 'Pollo', gramos: 300, kcal: 330, prot: 69, carb: 0, grasa: 4, nutrientes: { fibra: 0 } }

describe('por100DeReceta', () => {
  it('suma los ingredientes y divide entre el peso cocinado', () => {
    // 1030 kcal en 800 g cocinados = 128,75 por 100 g
    expect(por100DeReceta([arroz, pollo], 800)).toMatchObject({ kcal100: 128.8, prot100: 10.4, carb100: 19.5, grasa100: 0.8 })
  })
  it('el cocinado pesa más (agua) y baja la densidad', () => {
    expect(por100DeReceta([arroz, pollo], 1000).kcal100).toBeLessThan(por100DeReceta([arroz, pollo], 800).kcal100)
  })
  it('un nutriente solo se conoce si lo conocen todos los ingredientes', () => {
    const r = por100DeReceta([arroz, pollo], 500)
    expect(r.nutrientes).toEqual({ fibra: 0.4 })
  })
  it('peso 0 o sin ingredientes: ceros, sin NaN', () => {
    expect(por100DeReceta([arroz], 0)).toEqual({ kcal100: 0, prot100: 0, carb100: 0, grasa100: 0 })
    expect(por100DeReceta([], 100).nutrientes).toBeUndefined()
  })
})

describe('ingredientes', () => {
  it('pesoCrudoTotal suma gramos', () => {
    expect(pesoCrudoTotal([arroz, pollo])).toBe(500)
  })
  it('ida y vuelta item ↔ ingrediente conserva aporte y catálogo', () => {
    const item = itemDesdeElegible({ ref: { tipo: 'catalog', id: 'ciqual:1' }, nombre: 'Lentejas', kcal100: 120, prot100: 9, carb100: 20, grasa100: 0.5 }, 250)
    const m = ingredienteDeItem(item)
    expect(m).toMatchObject({ catalogId: 'ciqual:1', nombre: 'Lentejas', gramos: 250, kcal: 300, prot: 22.5, carb: 50, grasa: 1.3 })
    expect(itemDeIngrediente(m)).toMatchObject({ nombre: 'Lentejas', gramos: 250, kcal100: 120 })
  })
})

describe('validarReceta', () => {
  it('valida nombre, ingredientes y peso', () => {
    expect(validarReceta('Guiso', [arroz], 500)).toBeNull()
    expect(validarReceta(' ', [arroz], 500)).toMatch(/nombre/)
    expect(validarReceta('G', [], 500)).toMatch(/ingrediente/)
    expect(validarReceta('G', [{ ...arroz, gramos: 0 }], 500)).toMatch(/cantidad/)
    expect(validarReceta('G', [arroz], 0)).toMatch(/peso/)
  })
})

describe('preparación', () => {
  it('validarReceta: raciones enteras de 1 a 50, pasos, tiempo y notas con límite', () => {
    expect(validarReceta('G', [arroz], 500, { raciones: 4, pasos: ['Hervir'], tiempoMin: 30, notas: 'Aguanta 3 días' })).toBeNull()
    expect(validarReceta('G', [arroz], 500, { raciones: 0 })).toMatch(/raciones/)
    expect(validarReceta('G', [arroz], 500, { raciones: 2.5 })).toMatch(/raciones/)
    expect(validarReceta('G', [arroz], 500, { raciones: 51 })).toMatch(/raciones/)
    expect(validarReceta('G', [arroz], 500, { pasos: ['x'.repeat(1001)] })).toMatch(/paso/)
    expect(validarReceta('G', [arroz], 500, { pasos: Array(41).fill('x') })).toMatch(/pasos/)
    expect(validarReceta('G', [arroz], 500, { tiempoMin: 0 })).toMatch(/tiempo/)
    expect(validarReceta('G', [arroz], 500, { notas: 'x'.repeat(2001) })).toMatch(/notas/)
  })
  it('racionesDe: sin campo o imposible, 1', () => {
    expect(racionesDe({})).toBe(1)
    expect(racionesDe({ raciones: 0 })).toBe(1)
    expect(racionesDe({ raciones: 4 })).toBe(4)
  })
  it('gramos y valores por ración salen del peso cocinado', () => {
    const receta = { ingredientes: [arroz, pollo], pesoCocinadoG: 800, raciones: 4 }
    expect(gramosPorRacion(receta)).toBe(200)
    // 128,8 kcal/100 g × 200 g
    expect(valoresPorRacion(receta)).toMatchObject({ kcal: 257.6, prot: 20.8, carb: 39, grasa: 1.6 })
    // Receta antigua: una ración es todo el peso cocinado
    expect(valoresPorRacion({ ingredientes: [arroz, pollo], pesoCocinadoG: 800 }).kcal).toBe(1030.4)
  })
  it('escalarIngredientes multiplica cantidades y aporte; misma ración o base imposible, igual', () => {
    expect(escalarIngredientes([arroz], 4, 2)[0]).toMatchObject({ gramos: 100, kcal: 350, prot: 7, carb: 78, grasa: 1 })
    expect(escalarIngredientes([arroz], 4, 6)[0].gramos).toBe(300)
    expect(escalarIngredientes([arroz], 4, 4)).toEqual([arroz])
    expect(escalarIngredientes([arroz], 0, 4)).toEqual([arroz])
  })
  it('limpiarPasos quita espacios y pasos vacíos', () => {
    expect(limpiarPasos(['  Batir ', '', '   ', 'Cuajar'])).toEqual(['Batir', 'Cuajar'])
  })
})

describe('textos', () => {
  it('tiempo en minutos y horas', () => {
    expect([10, 60, 75, 120].map(textoTiempo)).toEqual(['10 min', '1 h', '1 h 15 min', '2 h'])
  })
  it('raciones en singular y plural', () => {
    expect([1, 4, 1.5].map(textoRaciones)).toEqual(['1 ración', '4 raciones', '1,5 raciones'])
  })
})

describe('recetas en las listas para elegir', () => {
  const food = (id: number, nombre: string) => elegibleDeFood({ id, nombre, nombreNorm: nombre.toLowerCase(), kcal100: 150, prot100: 5, carb100: 20, grasa100: 5, fuente: 'manual', updatedAt: 0 })
  it('marca solo los alimentos que son de una receta, con sus raciones (1 si no tiene)', () => {
    const [lentejas, pan] = marcarRecetasPropias([food(1, 'Lentejas'), food(2, 'Pan')], new Map([[1, { pesoCocinadoG: 2400, raciones: 6 }]]))
    expect(lentejas.receta).toEqual({ origen: 'tuya', raciones: 6, gramosRacion: 400 })
    expect(pan.receta).toBeUndefined()
    expect(infoReceta({ pesoCocinadoG: 800 })).toEqual({ origen: 'tuya', raciones: 1, gramosRacion: 800 })
  })
  it('kcal por ración solo con raciones; si no, se habla de 100 g', () => {
    expect(kcalPorRacion({ kcal100: 150, receta: { origen: 'tuya', raciones: 6, gramosRacion: 400 } })).toBe(600)
    expect(kcalPorRacion({ kcal100: 150, receta: { origen: 'appfit' } })).toBeNull()
    expect(kcalPorRacion({ kcal100: 150 })).toBeNull()
  })
  it('una receta del catálogo lleva su info; con raciones, los gramos de una', () => {
    const base = { id: 'tipicos:x', fuente: 'tipicos', idExterno: 'x', nombre: 'X', nombreNorm: 'x', tok: [], tipo: 'generico' as const, kcal100: 100, prot100: 1, carb100: 1, grasa100: 1, version: 'v', importadoAt: 0 }
    expect(elegibleDeCatalogo({ ...base, receta: { pesoFinalG: 2500, ingredientes: [], raciones: 6 } }).receta).toEqual({ origen: 'appfit', raciones: 6, gramosRacion: 416.7 })
    expect(elegibleDeCatalogo({ ...base, receta: { pesoFinalG: 2500, ingredientes: [] } }).receta).toEqual({ origen: 'appfit' })
    expect(elegibleDeCatalogo(base).receta).toBeUndefined()
  })
})

describe('nombreLibre', () => {
  it('conserva el nombre si está libre y numera las copias si no', () => {
    expect(nombreLibre(' Lentejas ', new Set())).toBe('Lentejas')
    expect(nombreLibre('Lentejas', new Set(['lentejas']))).toBe('Lentejas (copia)')
    expect(nombreLibre('Lentejas', new Set(['lentejas', 'lentejas (copia)', 'lentejas (copia 2)']))).toBe('Lentejas (copia 3)')
  })
  it('compara sin mayúsculas ni tildes', () => {
    expect(nombreLibre('Crema de calabacín', new Set(['crema de calabacin']))).toBe('Crema de calabacín (copia)')
    expect(nombreLibre('Arroz Al Horno', new Set(['arroz al horno']))).toBe('Arroz Al Horno (copia)')
  })
})
