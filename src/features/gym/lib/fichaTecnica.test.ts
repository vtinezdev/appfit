import { describe, expect, it } from 'vitest'
import { CATALOGO_POR_ID } from './catalogoEjercicios'
import { nivelesFicha, NIVEL_PRINCIPAL, NIVEL_SECUNDARIO, textoMusculosFicha } from './fichaTecnica'

describe('ficha de técnica', () => {
  const banca = CATALOGO_POR_ID.get('appfit:press-banca')!
  it('principales en alto, secundarios en medio y el resto a cero', () => {
    const n = nivelesFicha(banca)
    expect(n.pecho).toBe(NIVEL_PRINCIPAL)
    expect(n.triceps).toBe(NIVEL_SECUNDARIO)
    expect(n.cuadriceps).toBe(0)
    expect(nivelesFicha({ primaryMuscles: ['completo'], secondaryMuscles: ['core'] }).core).toBe(NIVEL_SECUNDARIO)
  })
  it('describe los músculos en una frase', () => {
    expect(textoMusculosFicha({ primaryMuscles: ['pecho'], secondaryMuscles: ['triceps', 'hombros'] })).toBe('Pecho; también tríceps y hombros')
    expect(textoMusculosFicha({ primaryMuscles: ['gluteos', 'isquiotibiales'], secondaryMuscles: [] })).toBe('Glúteos e isquiotibiales')
    expect(textoMusculosFicha({ primaryMuscles: ['espalda'], secondaryMuscles: ['biceps', 'isquiotibiales'] })).toBe('Espalda; también bíceps e isquiotibiales')
  })
})
