import { describe, expect, it } from 'vitest'
import { calcularReceta, construir, duplicados, leerDirectos, type Receta } from './tipicosLib.ts'
import type { PaqueteCalidad } from './calidad.ts'
const ciqual: PaqueteCalidad = { formato: 2, fuente: 'ciqual', version: '2025-es2', tipo: 'generico', filas: [
  ['1', 'Patata, cruda', '', 'Patatas y tubérculos', 80, 2, 18, 0, { fibra: 2, sal: 0 }],
  ['2', 'Aceite de oliva', '', 'Aceites y grasas', 900, 0, 0, 100, { fibra: 0 }],
] }
const receta: Receta = { id: 'patatas-prueba', nombre: 'Patatas de prueba, cocidas', categoria: 'Platos preparados', referencia: 'Receta de prueba', pesoFinalG: 150, ingredientes: [{ ciqual: '1', gramos: 200 }, { ciqual: '2', gramos: 10 }] }
const header = 'id;nombre;alias;categoria;fuente;idFuente;kcal;prot;carb;grasa;fibra;azucares;sal;agSat;notas\n'
describe('típicos', () => {
  it('suma gramos, aplica peso final y redondea al final, sin inventar nutrientes desconocidos', () => {
    const f = calcularReceta(receta, ciqual)
    expect(f.slice(4, 8)).toEqual([166.7, 2.7, 24, 6.7])
    expect(f[8]).toEqual({ fibra: 2.7 })
    expect(calcularReceta({ ...receta, pesoFinalG: 200 }, ciqual)[4]).toBe(125)
  })
  it('conserva ceros conocidos y coloca {} cuando no se conoce ningún extra', () => {
    const base: PaqueteCalidad = { ...ciqual, filas: [['1', 'Patata, cruda', '', 'Patatas y tubérculos', 80, 2, 18, 0]] }
    const f = calcularReceta({ ...receta, alias: ['papas cocidas'], ingredientes: [{ ciqual: '1', gramos: 200 }] }, base)
    expect(f[8]).toEqual({}); expect(f[9]).toEqual({ alias: ['papas cocidas'], receta: { peso: 150, ing: [['1', 200]] } })
  })
  it('lleva la formulación y, si la hay, la preparación en extra.receta', () => {
    expect(calcularReceta(receta, ciqual)[9]).toEqual({ receta: { peso: 150, ing: [['1', 200], ['2', 10]] } })
    const prep = { id: 'patatas-prueba', raciones: 2, tiempoMin: 30, pasos: ['Pela las patatas.', 'Fríelas.'], notas: 'Mejor recién hechas.' }
    expect(construir([], [receta], ciqual, '2026-10-27', [prep]).paquete.filas[0][9]?.receta)
      .toEqual({ peso: 150, ing: [['1', 200], ['2', 10]], raciones: 2, min: 30, pasos: ['Pela las patatas.', 'Fríelas.'], notas: 'Mejor recién hechas.' })
  })
  it('rechaza ingredientes ausentes, cocidos, gramos y rendimientos inválidos', () => {
    expect(() => calcularReceta({ ...receta, pesoFinalG: 0 }, ciqual)).toThrow()
    expect(() => calcularReceta({ ...receta, pesoFinalG: 211 }, ciqual)).toThrow(/mayor que la suma/)
    expect(calcularReceta({ ...receta, pesoFinalG: 210 }, ciqual)[0]).toBeDefined()
    expect(() => calcularReceta({ ...receta, ingredientes: [{ ciqual: '9', gramos: 10 }] }, ciqual)).toThrow()
    expect(() => calcularReceta({ ...receta, ingredientes: [{ ciqual: '1', gramos: -1 }] }, ciqual)).toThrow()
    expect(() => calcularReceta(receta, { ...ciqual, filas: [['1', 'Patata, cocida', '', 'Patatas y tubérculos', 80, 2, 18, 0]] })).toThrow()
  })
  it('admite conservas escurridas y cualquier categoría AppFit, pero no una inventada', () => {
    const conserva: PaqueteCalidad = { ...ciqual, filas: [['1', 'Atún, al natural, en conserva, escurrido', '', 'Pescados', 140, 27, 0, 4]] }
    expect(calcularReceta({ ...receta, ingredientes: [{ ciqual: '1', gramos: 150 }] }, conserva)[4]).toBe(140)
    expect(calcularReceta({ ...receta, nombre: 'Salsa de prueba, cocinada', categoria: 'Salsas y condimentos' }, ciqual)[3]).toBe('Salsas y condimentos')
    expect(() => calcularReceta({ ...receta, categoria: 'Tapas' }, ciqual)).toThrow()
    const fiambre: PaqueteCalidad = { ...ciqual, filas: [['1', 'Jamón cocido, superior', '', 'Embutidos y fiambres', 113, 21, 0.8, 2.8]] }
    expect(calcularReceta({ ...receta, ingredientes: [{ ciqual: '1', gramos: 150 }] }, fiambre)[5]).toBe(21)
  })
  it('lee coma decimal, vacíos desconocidos, cero y trazabilidad', () => {
    const d = leerDirectos(header + 'morro-prueba;Morro de prueba, cocido;morro de ensayo;Carnes;USDA;123;100,4;20;0;2,3;;0;;;version=2018|original=Test pork\n')[0]
    expect(d.fila[4]).toBe(100.4); expect(d.fila[8]).toEqual({ azucares: 0 })
    expect(d.fila[2]).toBe('Test pork')
    expect(() => leerDirectos(header + 'x;y')).toThrow()
    expect(() => leerDirectos(header + 'x;X, crudo;;Carnes;BEDCA;1;100;20;0;2;;;;;version=2020|original=X')).toThrow()
    expect(() => leerDirectos(header + 'x;X, crudo;;Carnes;AppFit;web;100;20;0;2;;;;;version=2026|original=X')).toThrow()
    expect(leerDirectos(header + 'x;X, crudo;;Carnes;AppFit;web;100;20;0;2;;;;;version=2026|original=X|fuentes=https://a.es/x')[0].fuente).toBe('AppFit')
  })
  it('detecta duplicados normalizados y casi iguales sin confundir crudo con cocido', () => {
    const f = ciqual.filas[0]
    expect(duplicados([[...f.slice(0, 1), ' PÁTATA,  CRUDA ', ...f.slice(2)] as typeof f], ciqual.filas)[0].exacto).toBe(true)
    expect(duplicados([['x', 'Patata, cocida', '', '', 80, 2, 18, 0]], ciqual.filas)).toEqual([])
    expect(duplicados([['x', 'Aceite de oliva virgen', '', '', 900, 0, 0, 100]], ciqual.filas)[0].exacto).toBe(false)
    expect(() => construir([], [receta, receta], ciqual, '2026-10-24')).toThrow()
  })
  it('bloquea errores y nombres idénticos a CIQUAL; excluye avisos energéticos directos', () => {
    expect(() => construir([], [{ ...receta, nombre: 'Patata, cruda' }], ciqual, '2026-10-24')).toThrow()
    const d = leerDirectos(header + 'prueba;Prueba, cruda;;Carnes;USDA;1;500;10;0;1;;;;;version=2018|original=Test')
    expect(construir(d, [], ciqual, '2026-10-24').excluidos).toEqual(['prueba'])
    expect(construir(d.map(x => ({ ...x, fuente: 'CIQUAL' })), [], ciqual, '2026-10-24').directos).toBe(1)
  })
})
