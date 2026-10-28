import { afterEach, describe, expect, it, vi } from 'vitest'
import { altoVisible, initViewport } from './viewport'

afterEach(() => vi.unstubAllGlobals())

describe('altoVisible', () => {
  const iphone = { ancho: 393, alto: 852 }
  it('en la PWA de iOS sin teclado ocupa la pantalla entera aunque iOS informe de menos', () => {
    expect(altoVisible({ alto: 793, standaloneIOS: true, pantalla: iphone, horizontal: false })).toBe(852)
    expect(altoVisible({ alto: 340, standaloneIOS: true, pantalla: iphone, horizontal: true })).toBe(393)
  })
  it('con el teclado abierto conserva el alto visible', () => {
    expect(altoVisible({ alto: 500, standaloneIOS: true, pantalla: iphone, horizontal: false })).toBe(500)
  })
  it('fuera de la PWA de iOS no toca el alto', () => {
    expect(altoVisible({ alto: 793, standaloneIOS: false, pantalla: iphone, horizontal: false })).toBe(793)
  })
  it('nunca encoge un alto mayor que la pantalla', () => {
    expect(altoVisible({ alto: 900, standaloneIOS: true, pantalla: iphone, horizontal: false })).toBe(900)
  })
})

describe('zona visible de la app', () => {
  function entorno(conViewport = true) {
    const viewport = Object.assign(new EventTarget(), { height: 812, offsetTop: 0, scale: 1 })
    const ventana = Object.assign(new EventTarget(), { innerHeight: 812, visualViewport: conViewport ? viewport : null })
    const valores = new Map<string, string>()
    vi.stubGlobal('window', ventana)
    vi.stubGlobal('document', { documentElement: { style: { setProperty: (key: string, value: string) => valores.set(key, value) } } })
    return { viewport, ventana, valores }
  }

  it('reduce shell y capas con el teclado y los recupera al girar/cerrar; no rediseña al hacer pinch zoom', () => {
    const { viewport, valores } = entorno()
    const limpiar = initViewport()
    viewport.height = 420
    viewport.offsetTop = 20
    viewport.dispatchEvent(new Event('resize'))
    expect(valores.get('--app-height')).toBe('420px')
    expect(valores.get('--viewport-height')).toBe('420px')
    expect(valores.get('--viewport-top')).toBe('20px')
    viewport.scale = 2
    viewport.height = 210
    viewport.dispatchEvent(new Event('resize'))
    expect(valores.get('--app-height')).toBe('420px')
    viewport.scale = 1
    viewport.height = 812
    viewport.offsetTop = 0
    viewport.dispatchEvent(new Event('resize'))
    expect(valores.get('--app-height')).toBe('812px')
    expect(valores.get('--viewport-top')).toBe('0px')
    limpiar()
    viewport.height = 300
    viewport.dispatchEvent(new Event('resize'))
    expect(valores.get('--app-height')).toBe('812px')
  })

  it('sigue resize también en navegadores sin visualViewport', () => {
    const { ventana, valores } = entorno(false)
    const limpiar = initViewport()
    ventana.innerHeight = 360
    ventana.dispatchEvent(new Event('resize'))
    expect(valores.get('--app-height')).toBe('360px')
    expect(valores.get('--viewport-top')).toBe('0px')
    limpiar()
  })
})
