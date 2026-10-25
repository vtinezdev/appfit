import { afterEach, describe, expect, it, vi } from 'vitest'
import { initInstalacion, instalacionDisponible, instalarApp, subscribeInstalacion } from './instalacion'

afterEach(() => vi.unstubAllGlobals())

describe('instalación de la PWA', () => {
  it.each(['accepted', 'dismissed'])('conserva el evento hasta pulsar y lo consume una sola vez: %s', async outcome => {
    const ventana = new EventTarget()
    vi.stubGlobal('window', ventana)
    const limpiar = initInstalacion()
    const cambio = vi.fn()
    const desuscribir = subscribeInstalacion(cambio)
    const prompt = vi.fn().mockResolvedValue(undefined)
    const evento = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome }) })
    ventana.dispatchEvent(evento)
    expect(evento.defaultPrevented).toBe(true)
    expect(instalacionDisponible()).toBe(true)
    expect(prompt).not.toHaveBeenCalled()
    await Promise.all([instalarApp(), instalarApp()])
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(instalacionDisponible()).toBe(false)
    expect(cambio).toHaveBeenCalledTimes(2)
    desuscribir()
    limpiar()
  })

  it('retira la oferta cuando se instala desde el menú del navegador', () => {
    const ventana = new EventTarget()
    vi.stubGlobal('window', ventana)
    const limpiar = initInstalacion()
    ventana.dispatchEvent(new Event('beforeinstallprompt'))
    ventana.dispatchEvent(new Event('appinstalled'))
    expect(instalacionDisponible()).toBe(false)
    limpiar()
  })
})
