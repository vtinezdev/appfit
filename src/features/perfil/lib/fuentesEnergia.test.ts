import { describe, expect, it } from 'vitest'
import { ECUACIONES, NIVELES_ACTIVIDAD } from './energia'
import { enlaceFuente, FUENTES_ENERGIA, fuenteEnergia } from './fuentesEnergia'

describe('fuentes de la estimación energética', () => {
  it('ids únicos y cada fuente tiene enlace verificable (DOI/URL) o una nota que dice por qué no', () => {
    expect(new Set(FUENTES_ENERGIA.map((f) => f.id)).size).toBe(FUENTES_ENERGIA.length)
    for (const f of FUENTES_ENERGIA) {
      expect(enlaceFuente(f) !== undefined || ('nota' in f && f.nota), f.id).toBeTruthy()
      if ('doi' in f) expect(f.doi).toMatch(/^10\.\d{4,}\//)
      expect(f.uso.length).toBeGreaterThan(10)
    }
  })
  it('toda fuente referenciada por una ecuación o un nivel existe', () => {
    for (const e of Object.values(ECUACIONES)) expect(fuenteEnergia(e.fuente)).toBeDefined()
    for (const n of Object.values(NIVELES_ACTIVIDAD)) expect(fuenteEnergia(n.fuente)).toBeDefined()
  })
  it('la fuente de los factores de actividad declara que no está verificada', () => {
    expect(fuenteEnergia('mcArdle1996').nota).toMatch(/No verificado/)
  })
})
