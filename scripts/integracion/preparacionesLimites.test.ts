// Las preparaciones del catálogo (scripts/catalogo) y las recetas propias de la app comparten límites.
// Vive aquí y no junto a preparacionesLib porque importa código de la app (fuera del typecheck de scripts/catalogo).
import { describe, expect, it } from 'vitest'
import * as app from '../../src/features/nutricion/lib/recetas'
import * as catalogo from '../catalogo/preparacionesLib.ts'

describe('límites de las preparaciones', () => {
  it('son los mismos en el catálogo y en las recetas propias', () => {
    const limites = (m: typeof catalogo | typeof app) => [m.RACIONES_MAX, m.PASOS_MAX, m.PASO_MAX_CARACTERES, m.TIEMPO_MAX_MIN, m.NOTAS_MAX_CARACTERES]
    expect(limites(catalogo)).toEqual(limites(app))
  })
})
