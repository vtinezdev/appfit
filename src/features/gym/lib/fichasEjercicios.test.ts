import { describe, expect, it } from 'vitest'
import { CATALOGO_EJERCICIOS } from './catalogoEjercicios'
import { BRAZOS } from './fichas/brazos'
import { CADERA_GEMELOS } from './fichas/caderaGemelos'
import { CORE } from './fichas/core'
import { ESPALDA } from './fichas/espalda'
import { HOMBROS } from './fichas/hombros'
import { PECHO } from './fichas/pecho'
import { PIERNAS } from './fichas/piernas'
import { FICHAS } from './fichasEjercicios'

describe('fichas de técnica', () => {
  const ids = CATALOGO_EJERCICIOS.map(e => e.id.replace(/^appfit:/, ''))

  it('cada ficha es de un ejercicio del catálogo, sin repetir entre grupos', () => {
    const grupos = [PECHO, ESPALDA, HOMBROS, BRAZOS, PIERNAS, CADERA_GEMELOS, CORE].flatMap(g => Object.keys(g))
    expect(grupos.length).toBe(new Set(grupos).size)
    expect(Object.keys(FICHAS).filter(k => !ids.includes(k))).toEqual([])
  })

  it('todos los ejercicios del catálogo tienen ficha', () => {
    expect(ids.filter(id => !FICHAS[id])).toEqual([])
  })

  it('tres claves y dos errores por ficha, frases cortas y terminadas en punto', () => {
    for (const [id, f] of Object.entries(FICHAS)) {
      expect(f.claves, id).toHaveLength(3)
      expect(f.errores, id).toHaveLength(2)
      for (const t of [...f.claves, ...f.errores]) {
        expect(t, id).toMatch(/^[A-ZÁÉÍÓÚÑ¿].*[.]$/u)
        expect(t.length, `${id}: ${t}`).toBeLessThanOrEqual(130)
      }
    }
  })
})
