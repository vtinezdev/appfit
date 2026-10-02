import { describe, expect, it, vi } from 'vitest'
import { consultarPersistencia, solicitarPersistencia } from './almacenamiento'

describe('protección real del almacenamiento', () => {
  it('conserva un permiso concedido sin volver a solicitarlo', async () => {
    const storage = { persisted: vi.fn().mockResolvedValue(true), persist: vi.fn() }
    expect(await consultarPersistencia(storage)).toBe('concedida')
    expect(await solicitarPersistencia(storage)).toBe('concedida')
    expect(storage.persist).not.toHaveBeenCalled()
  })

  it('distingue una solicitud rechazada de una concesión o de un error', async () => {
    const storage = { persisted: vi.fn().mockResolvedValue(false), persist: vi.fn().mockResolvedValue(false) }
    expect(await consultarPersistencia(storage)).toBe('no-concedida')
    expect(await solicitarPersistencia(storage)).toBe('no-concedida')
    expect(storage.persist).toHaveBeenCalledOnce()
  })

  it('puede conceder el permiso en un intento posterior desde Ajustes', async () => {
    const storage = { persisted: vi.fn().mockResolvedValue(false), persist: vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true) }
    expect(await solicitarPersistencia(storage)).toBe('no-concedida')
    expect(await solicitarPersistencia(storage)).toBe('concedida')
  })

  it('sin API no promete una protección que no puede solicitar', async () => {
    expect(await consultarPersistencia({})).toBe('no-disponible')
    expect(await solicitarPersistencia({})).toBe('no-disponible')
  })

  it('si se puede leer el permiso pero no pedirlo, respeta uno ya concedido', async () => {
    expect(await solicitarPersistencia({ persisted: async () => true })).toBe('concedida')
    expect(await solicitarPersistencia({ persisted: async () => false })).toBe('no-disponible')
  })

  it('permite solicitar protección aunque no exista persisted()', async () => {
    expect(await consultarPersistencia({ persist: async () => true })).toBe('no-disponible')
    expect(await solicitarPersistencia({ persist: async () => true })).toBe('concedida')
  })

  it('un fallo de consulta o de solicitud es recuperable y no queda como éxito', async () => {
    const fallo = async () => { throw new Error('Storage unavailable') }
    expect(await consultarPersistencia({ persisted: fallo })).toBe('error')
    expect(await solicitarPersistencia({ persisted: fallo })).toBe('error')
    expect(await solicitarPersistencia({ persist: fallo })).toBe('error')
  })
})
