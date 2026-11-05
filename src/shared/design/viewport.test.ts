import { afterEach, describe, expect, it, vi } from 'vitest'
import { abreTeclado, altoVisible, initViewport, margenInferiorMinimo } from './viewport'

afterEach(() => vi.unstubAllGlobals())

describe('altoVisible', () => {
  const iphone = { ancho: 393, alto: 852 }
  it('en la PWA de iOS sin teclado ocupa la pantalla entera aunque iOS informe de menos', () => {
    expect(altoVisible({ alto: 793, standaloneIOS: true, pantalla: iphone, horizontal: false, teclado: false })).toBe(852)
    expect(altoVisible({ alto: 340, standaloneIOS: true, pantalla: iphone, horizontal: true, teclado: false })).toBe(393)
  })
  it('con el teclado abierto conserva el alto visible', () => {
    expect(altoVisible({ alto: 500, standaloneIOS: true, pantalla: iphone, horizontal: false, teclado: true })).toBe(500)
  })
  it('sin campo enfocado no hay teclado: ocupa la pantalla entera aunque falte mucho alto', () => {
    expect(altoVisible({ alto: 500, standaloneIOS: true, pantalla: iphone, horizontal: false, teclado: false })).toBe(852)
  })
  it('fuera de la PWA de iOS no toca el alto', () => {
    expect(altoVisible({ alto: 793, standaloneIOS: false, pantalla: iphone, horizontal: false, teclado: false })).toBe(793)
  })
  it('nunca encoge un alto mayor que la pantalla', () => {
    expect(altoVisible({ alto: 900, standaloneIOS: true, pantalla: iphone, horizontal: false, teclado: false })).toBe(900)
  })
})

describe('margenInferiorMinimo', () => {
  const base = { standaloneIOS: true, pantalla: { ancho: 430, alto: 932 }, horizontal: false, teclado: false }
  it('en la PWA de un iPhone con barra de inicio garantiza su margen, también si iOS informa de 0', () => {
    expect(margenInferiorMinimo(base)).toBe(34)
    expect(margenInferiorMinimo({ ...base, horizontal: true })).toBe(21)
  })
  it('nada con teclado, fuera de la PWA de iOS, en iPhone con botón de inicio ni en iPad', () => {
    expect(margenInferiorMinimo({ ...base, teclado: true })).toBe(0)
    expect(margenInferiorMinimo({ ...base, standaloneIOS: false })).toBe(0)
    expect(margenInferiorMinimo({ ...base, pantalla: { ancho: 375, alto: 667 } })).toBe(0)
    expect(margenInferiorMinimo({ ...base, pantalla: { ancho: 820, alto: 1180 } })).toBe(0)
  })
})

describe('abreTeclado', () => {
  it('solo los campos de texto y los editables', () => {
    expect(abreTeclado({ tagName: 'INPUT', type: 'text' })).toBe(true)
    expect(abreTeclado({ tagName: 'INPUT', type: 'number' })).toBe(true)
    expect(abreTeclado({ tagName: 'TEXTAREA' })).toBe(true)
    expect(abreTeclado({ tagName: 'DIV', isContentEditable: true })).toBe(true)
    expect(abreTeclado({ tagName: 'INPUT', type: 'checkbox' })).toBe(false)
    expect(abreTeclado({ tagName: 'BUTTON' })).toBe(false)
    expect(abreTeclado(null)).toBe(false)
  })
})

describe('zona visible de la app', () => {
  function entorno(conViewport = true) {
    const viewport = Object.assign(new EventTarget(), { height: 812, offsetTop: 0, scale: 1 })
    const ventana = Object.assign(new EventTarget(), { innerHeight: 812, visualViewport: conViewport ? viewport : null })
    const valores = new Map<string, string>()
    vi.stubGlobal('window', ventana)
    const doc = { activeElement: null as { tagName: string } | null, documentElement: { style: { setProperty: (key: string, value: string) => valores.set(key, value) } } }
    vi.stubGlobal('document', doc)
    return { viewport, ventana, valores, doc }
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

  it('en la PWA de iOS sin teclado ocupa la pantalla y queda arriba aunque iOS informe de menos alto o de desplazamiento', () => {
    const { viewport, ventana, valores, doc } = entorno()
    Object.assign(ventana, { innerWidth: 430, navigator: { standalone: true }, screen: { width: 430, height: 932 } })
    viewport.height = 868
    viewport.offsetTop = -64
    const limpiar = initViewport()
    expect(valores.get('--app-height')).toBe('932px')
    expect(valores.get('--viewport-top')).toBe('0px')
    expect(valores.get('--safe-bottom-min')).toBe('34px')
    doc.activeElement = { tagName: 'INPUT' }
    viewport.height = 500
    viewport.offsetTop = 30
    ventana.dispatchEvent(new Event('focusin'))
    expect(valores.get('--app-height')).toBe('500px')
    expect(valores.get('--viewport-top')).toBe('30px')
    expect(valores.get('--safe-bottom-min')).toBe('0px')
    limpiar()
  })
})
