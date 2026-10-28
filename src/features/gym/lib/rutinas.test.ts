import { describe, expect, it } from 'vitest'
import { ErrorSustitucion, ejecucionDeRutina, ejecucionEnRutina, ordenParaEmpezar, resumenRutina, sustituirEnRutina, textoVarianteRutina } from './rutinas'
import { cuandoFue } from './workout'

describe('resumenRutina', () => {
  const ejercicios = new Map([1, 2, 3, 4, 5, 6].map(id => [id, { catalogId: id === 3 ? undefined : `appfit:e${id}` }]))
  it('mosaico de cuatro, «+N», series objetivo y último entreno terminado', () => {
    const r = { id: 7, exerciseIds: [1, 2, 3, 4, 5, 6, 99], objetivos: { 1: { series: 3, repsMin: 8, repsMax: 10 }, 5: { series: 4, repsMin: 6, repsMax: 8 } } }
    const workouts = [{ routineId: 7, inicio: 100, fin: 200 }, { routineId: 7, inicio: 500, fin: 600 }, { routineId: 7, inicio: 900 }, { routineId: 8, inicio: 1000, fin: 1100 }]
    expect(resumenRutina(r, workouts, ejercicios)).toEqual({ miniaturas: ['appfit:e1', 'appfit:e2', undefined, 'appfit:e4'], resto: 2, series: null, ultima: 500 })
  })
  it('sin objetivos ni entrenos; series solo si todos los ejercicios tienen objetivo', () => {
    expect(resumenRutina({ id: 1, exerciseIds: [1] }, [], ejercicios)).toEqual({ miniaturas: ['appfit:e1'], resto: 0, series: null, ultima: null })
    const conObjetivos = { id: 1, exerciseIds: [1, 5, 99], objetivos: { 1: { series: 3, repsMin: 8, repsMax: 10 }, 5: { series: 4, repsMin: 6, repsMax: 8 } } }
    expect(resumenRutina(conObjetivos, [], ejercicios).series).toBe(7)
  })
})

describe('ordenParaEmpezar', () => {
  it('primero las nunca hechas y luego la más antigua; los empates mantienen el orden', () => {
    const ultimas: Record<string, number | null> = { A: 300, B: null, C: 100, D: null, E: 100 }
    expect(ordenParaEmpezar(['A', 'B', 'C', 'D', 'E'], r => ultimas[r])).toEqual(['B', 'D', 'C', 'E', 'A'])
  })
})

describe('cuandoFue', () => {
  it('días naturales: hoy, ayer, hace n días y fecha desde una semana', () => {
    const ahora = new Date(2026, 9, 9, 10)
    expect(cuandoFue(new Date(2026, 9, 9, 8).getTime(), ahora)).toBe('Hoy')
    expect(cuandoFue(new Date(2026, 9, 8, 23).getTime(), ahora)).toBe('Ayer')
    expect(cuandoFue(new Date(2026, 9, 4).getTime(), ahora)).toBe('Hace 5 días')
    expect(cuandoFue(new Date(2026, 9, 2).getTime(), ahora)).toBe('2 oct')
  })
})

describe('sustituirEnRutina', () => {
  const r = { id: 1, nombre: 'Empuje', exerciseIds: [3, 5, 7], objetivos: { 5: { series: 4, repsMin: 8, repsMax: 10, descansoSeg: 90 }, 7: { series: 3, repsMin: 10, repsMax: 12 } } }

  it('pone el nuevo en el mismo lugar con el objetivo del sustituido', () => {
    expect(sustituirEnRutina(r, 5, 9)).toEqual({ id: 1, nombre: 'Empuje', exerciseIds: [3, 9, 7], objetivos: { 9: { series: 4, repsMin: 8, repsMax: 10, descansoSeg: 90 }, 7: { series: 3, repsMin: 10, repsMax: 12 } } })
  })

  it('sin objetivo ni objetivos que queden, la rutina no lleva objetivos', () => {
    expect(sustituirEnRutina({ id: 2, nombre: 'B', exerciseIds: [3], objetivos: {} }, 3, 4)).toEqual({ id: 2, nombre: 'B', exerciseIds: [4] })
  })

  it('el nuevo no hereda el agarre ni la ejecución del sustituido', () => {
    const conVariante = { id: 3, nombre: 'C', exerciseIds: [3, 5], agarres: { 5: { orientacion: 'supino' as const } }, ejecuciones: { 3: 'lados' as const, 5: 'lados' as const } }
    expect(sustituirEnRutina(conVariante, 5, 9)).toEqual({ id: 3, nombre: 'C', exerciseIds: [3, 9], ejecuciones: { 3: 'lados' } })
  })

  it('no sustituye si el nuevo ya está o el viejo ya no', () => {
    expect(() => sustituirEnRutina(r, 5, 7)).toThrow(ErrorSustitucion)
    expect(() => sustituirEnRutina(r, 4, 9)).toThrow(ErrorSustitucion)
    expect(sustituirEnRutina(r, 5, 5)).toBe(r)
  })
})

describe('variante de un ejercicio en la rutina', () => {
  const habitualLados = { ejecucion: 'lados' as const, agarre: { orientacion: 'neutro' as const } }
  it('la ejecución de la rutina manda; sin elegir, la habitual (la antigua «ambos iguales» es unilateral)', () => {
    expect(ejecucionEnRutina({ ejecuciones: { 1: 'bilateral' } }, 1, habitualLados)).toBe('bilateral')
    expect(ejecucionEnRutina({}, 1, habitualLados)).toBe('lados')
    expect(ejecucionEnRutina({}, 1, { ejecucion: 'unilateral', kgUnilateral: 'total' })).toBe('lados')
    expect(ejecucionEnRutina({}, 1)).toBe('bilateral')
  })
  it('la sesión empieza con la habitual cambiada en lo que elige la rutina; sin elegir nada, sin configuración', () => {
    expect(ejecucionDeRutina({}, 1, habitualLados)).toBeUndefined()
    expect(ejecucionDeRutina({ ejecuciones: { 1: 'bilateral' } }, 1, habitualLados)).toEqual({ ejecucion: 'bilateral', agarre: { orientacion: 'neutro' } })
    expect(ejecucionDeRutina({ ejecuciones: { 1: 'lados' } }, 1)).toEqual({ ejecucion: 'lados' })
    expect(ejecucionDeRutina({ agarres: { 1: null } }, 1, habitualLados)).toEqual({ ejecucion: 'lados', agarre: undefined })
    expect(ejecucionDeRutina({ agarres: { 1: { orientacion: 'supino' } }, ejecuciones: { 1: 'lados' } }, 1, { ejecucion: 'unilateral', kgUnilateral: 'total' }))
      .toEqual({ ejecucion: 'lados', agarre: { orientacion: 'supino' } })
  })
  it('texto del botón de variante', () => {
    expect(textoVarianteRutina('lados', 'Supino', true)).toBe('Unilateral · Supino')
    expect(textoVarianteRutina('bilateral', '', true)).toBe('Bilateral · agarre sin especificar')
    expect(textoVarianteRutina('bilateral', '', false)).toBe('Bilateral')
  })
})
