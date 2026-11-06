import { describe, expect, it } from 'vitest'
import { detectarAppAndroid, PAQUETE_ANDROID } from './entorno'

describe('detectarAppAndroid', () => {
  it('la TWA abre la página con su paquete como referrer', () => {
    expect(detectarAppAndroid(`android-app://${PAQUETE_ANDROID}`, null)).toBe(true)
    expect(detectarAppAndroid(`android-app://${PAQUETE_ANDROID}/`, null)).toBe(true)
  })

  it('tras recargar, sin referrer, vale lo recordado en la sesión', () => {
    expect(detectarAppAndroid('', '1')).toBe(true)
  })

  it('ni el navegador, ni otra app, ni la propia web cuentan como la app de Android', () => {
    expect(detectarAppAndroid('', null)).toBe(false)
    expect(detectarAppAndroid('https://cumbrafit.app/conoce', null)).toBe(false)
    expect(detectarAppAndroid('android-app://com.otra.app', null)).toBe(false)
  })
})
