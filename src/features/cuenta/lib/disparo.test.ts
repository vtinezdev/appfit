import { describe, expect, it } from 'vitest'
import { afectaALaCopia } from './disparo'

describe('afectaALaCopia', () => {
  const tablas = ['entries', 'settings']

  it('cuenta las tablas de usuario de la base de AppFit', () => {
    expect(afectaALaCopia(['idb://appfit/entries/', 'idb://appfit/entries/fecha'], 'appfit', tablas)).toBe(true)
    expect(afectaALaCopia(['idb://appfit/settings/:dels'], 'appfit', tablas)).toBe(true)
  })

  it('no cuenta el catálogo ni otras bases (la del dispositivo)', () => {
    expect(afectaALaCopia(['idb://appfit/catalogFoods/', 'idb://appfit/catalogFoods/nombre'], 'appfit', tablas)).toBe(false)
    expect(afectaALaCopia(['idb://appfit-dispositivo/vinculo/'], 'appfit', tablas)).toBe(false)
    expect(afectaALaCopia([], 'appfit', tablas)).toBe(false)
  })
})
