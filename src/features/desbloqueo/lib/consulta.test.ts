import { describe, expect, it } from 'vitest'
import { accionDesbloqueo } from './consulta'

describe('accionDesbloqueo', () => {
  it('con sesión pregunta, haya copia o no; sin sesión olvida; cargando espera', () => {
    for (const fase of ['sin-copia', 'al-dia', 'pendiente', 'subiendo', 'sin-conexion', 'error', 'conflicto', 'perdida'] as const) {
      expect(accionDesbloqueo(fase), fase).toBe('preguntar')
    }
    expect(accionDesbloqueo('sin-sesion')).toBe('olvidar')
    expect(accionDesbloqueo('cargando')).toBe('nada')
  })
})
