import { afterEach, describe, expect, it, vi } from 'vitest'
import { abreTeclado, initViewport, lineasMedidas } from './viewport'

afterEach(() => vi.unstubAllGlobals())

describe('lineasMedidas', () => {
  it('redondea y marca lo que falta', () => {
    const lineas = lineasMedidas({ pantalla: { ancho: 430, alto: 932 }, ventana: { ancho: 430, alto: 868.4 }, visible: null, documento: 868, app: { arriba: 0, alto: 868 }, margenes: { arriba: 59, abajo: 0 }, instalada: true })
    expect(Object.fromEntries(lineas)).toMatchObject({ Ventana: '430 × 868', 'Zona visible': 'Sin datos', App: '868 desde 0', 'Margen arriba': '59', 'Margen abajo': '0', 'Pantalla completa en iPhone': 'Sí' })
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

  it('en la PWA de iOS sin teclado usa el alto que da iOS (aunque sea menos que la pantalla) y queda arriba', () => {
    const { viewport, ventana, valores, doc } = entorno()
    Object.assign(ventana, { innerWidth: 430, navigator: { standalone: true }, screen: { width: 430, height: 932 } })
    viewport.height = 868
    viewport.offsetTop = -64
    const limpiar = initViewport()
    expect(valores.get('--app-height')).toBe('868px')
    expect(valores.get('--viewport-top')).toBe('0px')
    doc.activeElement = { tagName: 'INPUT' }
    viewport.height = 500
    viewport.offsetTop = 30
    ventana.dispatchEvent(new Event('focusin'))
    expect(valores.get('--app-height')).toBe('500px')
    expect(valores.get('--viewport-top')).toBe('30px')
    limpiar()
  })
})
