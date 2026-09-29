import { describe, expect, it } from 'vitest'
import { mensajeError, nombreFuente, resumenResultado } from './textos'

describe('nombreFuente', () => {
  it('traduce las fuentes conocidas y deja las demás en mayúsculas', () => {
    expect(nombreFuente('ciqual')).toBe('CIQUAL (ANSES)')
    expect(nombreFuente('off')).toBe('OFF')
  })
})

describe('resumenResultado', () => {
  it('distingue actualizado de al día', () => {
    expect(resumenResultado({ actualizadas: [], alDia: ['ciqual'] })).toBe('Ya está al día.')
    expect(resumenResultado({ actualizadas: [{ id: 'ciqual', version: '2025-es1', filas: 3323 }], alDia: [] })).toBe(
      'Actualizado a CIQUAL (ANSES) 2025-es1.',
    )
  })
})

describe('mensajeError', () => {
  it('sin conexión ignora el detalle técnico', () => {
    expect(mensajeError(new Error('Load failed'), false)).toMatch(/^Sin conexión/)
  })
  it('con conexión incluye el detalle si lo hay', () => {
    expect(mensajeError(new Error('No se pudo descargar x (404)'), true)).toContain('(No se pudo descargar x (404))')
    expect(mensajeError('raro', true)).toMatch(/^No se pudo actualizar el catálogo\./)
  })
})
