import { describe, expect, it } from 'vitest'
import { aplicaCobro, COBRO_ACTIVO, detectarPreviewCobro, previewPermitido } from './cobro'

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
  const local = 'appfit-test.localhost'

  it('por la dirección o por lo recordado en la sesión', () => {
    expect(detectarPreviewCobro('?preview=cobro', null, local)).toBe(true)
    expect(detectarPreviewCobro('?x=1&preview=cobro', null, local)).toBe(true)
    expect(detectarPreviewCobro('', '1', local)).toBe(true)
    expect(detectarPreviewCobro('', null, local)).toBe(false)
    expect(detectarPreviewCobro('?preview=otra', null, local)).toBe(false)
  })

  it('nunca en la web publicada: un enlace así serviría de anzuelo para un engaño', () => {
    for (const host of ['cumbrafit.app', 'www.cumbrafit.es', 'appfit.pages.dev', 'localhost.cumbrafit.app', 'evil-localhost.com']) {
      expect(detectarPreviewCobro('?preview=cobro', null, host)).toBe(false)
      expect(detectarPreviewCobro('', '1', host)).toBe(false)
    }
  })

  it('direcciones locales permitidas', () => {
    for (const host of ['localhost', 'appfit-test.localhost', '127.0.0.1', '[::1]']) expect(previewPermitido(host)).toBe(true)
  })
})
