import { describe, expect, it } from 'vitest'
import { conNutricionEfectiva, moduloActivo, moverTarjeta, ordenTarjetas, tarjetasInicio, TARJETAS_INICIO } from './modulos'

describe('módulos activables', () => {
  it('sin ajuste, todo activo', () => {
    expect(moduloActivo(undefined, 'nutricion')).toBe(true)
    expect(moduloActivo({}, 'gym')).toBe(true)
    expect(moduloActivo({ modulos: { gym: true } }, 'gym')).toBe(true)
    expect(moduloActivo({ modulos: { gym: false } }, 'gym')).toBe(false)
  })

  it('sin Nutrición, la gamificación cuenta solo el entreno (derivado, sin escribir)', () => {
    expect(conNutricionEfectiva({})).toBe(true)
    expect(conNutricionEfectiva({ gamificacionConNutricion: false })).toBe(false)
    expect(conNutricionEfectiva({ modulos: { nutricion: false } })).toBe(false)
    expect(conNutricionEfectiva({ modulos: { nutricion: false }, gamificacionConNutricion: true })).toBe(false)
  })

  it('tarjetas de Inicio: las de los módulos apagados no salen', () => {
    expect(tarjetasInicio({})).toEqual(TARJETAS_INICIO)
    expect(tarjetasInicio({ modulos: { nutricion: false, gym: false } })).toEqual(['progreso', 'registros', 'creatina'])
    expect(tarjetasInicio({ modulos: { peso: false } })).toContain('registros')
    expect(tarjetasInicio({ modulos: { peso: false, agua: false } })).not.toContain('registros')
  })

  it('orden guardado: sin desconocidas ni repetidas y con las que falten al final', () => {
    expect(ordenTarjetas({ ordenInicio: ['entreno', 'x', 'entreno', 'energia'] })).toEqual(['entreno', 'energia', 'progreso', 'registros', 'creatina'])
    expect(tarjetasInicio({ ordenInicio: ['entreno', 'energia'], modulos: { nutricion: false } })).toEqual(['entreno', 'progreso', 'registros', 'creatina'])
  })

  it('mover una tarjeta con las flechas', () => {
    expect(moverTarjeta(TARJETAS_INICIO, 'progreso', -1)).toEqual(['progreso', 'energia', 'registros', 'creatina', 'entreno'])
    expect(moverTarjeta(TARJETAS_INICIO, 'energia', -1)).toEqual(TARJETAS_INICIO)
    expect(moverTarjeta(TARJETAS_INICIO, 'entreno', 1)).toEqual(TARJETAS_INICIO)
  })
})
