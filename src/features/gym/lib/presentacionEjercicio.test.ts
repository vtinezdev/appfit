import { describe, expect, it } from 'vitest'
import { subtituloEjercicio } from './presentacionEjercicio'

describe('subtituloEjercicio', () => {
  it('músculo principal · material', () => {
    expect(subtituloEjercicio({ grupo: 'Pecho', primaryMuscles: ['pecho'], equipment: ['barra'] })).toBe('Pecho · barra')
    expect(subtituloEjercicio({ grupo: 'Hombros', primaryMuscles: ['hombros'], equipment: ['smith'] })).toBe('Hombros · Smith')
  })
  it('dos principales se unen con «y» o «e»', () => {
    expect(subtituloEjercicio({ grupo: 'Cuerpo completo', primaryMuscles: ['gluteos', 'isquiotibiales'], equipment: ['barra'] })).toBe('Glúteos e isquiotibiales · barra')
    expect(subtituloEjercicio({ grupo: 'Cuerpo completo', primaryMuscles: ['cuadriceps', 'gluteos'], equipment: ['otros', 'barra'] })).toBe('Cuádriceps y glúteos · barra')
  })
  it('sin clasificación usa el grupo guardado y omite «Otros»', () => {
    expect(subtituloEjercicio({ grupo: 'Espalda' })).toBe('Espalda')
    expect(subtituloEjercicio({ grupo: 'Core', primaryMuscles: ['core'], equipment: ['otros'] })).toBe('Core')
  })
})
