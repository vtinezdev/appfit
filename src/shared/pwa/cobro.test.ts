import { describe, expect, it } from 'vitest'
import { aplicaCobro, COBRO_ACTIVO, detectarPreviewCobro } from './cobro'

describe('aplicaCobro', () => {
  it('mientras no se pueda pagar, el cobro está apagado', () => {
    expect(COBRO_ACTIVO).toBe(false)
  })

  it('solo en la app de Android con el cobro encendido; la web y el iPhone, abiertos', () => {
    expect(aplicaCobro({ activo: true, appAndroid: true, preview: false })).toBe(true)
    expect(aplicaCobro({ activo: true, appAndroid: false, preview: false })).toBe(false)
    expect(aplicaCobro({ activo: false, appAndroid: true, preview: false })).toBe(false)
  })

  it('la vista previa lo enciende en cualquier sitio', () => {
    expect(aplicaCobro({ activo: false, appAndroid: false, preview: true })).toBe(true)
  })
})

describe('detectarPreviewCobro', () => {
  it('por la dirección o por lo recordado en la sesión', () => {
    expect(detectarPreviewCobro('?preview=cobro', null)).toBe(true)
    expect(detectarPreviewCobro('?x=1&preview=cobro', null)).toBe(true)
    expect(detectarPreviewCobro('', '1')).toBe(true)
    expect(detectarPreviewCobro('', null)).toBe(false)
    expect(detectarPreviewCobro('?preview=otra', null)).toBe(false)
  })
})
