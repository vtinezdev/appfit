/// <reference types="node" />
// Que el manifest de la PWA, `index.html` y la configuración de la TWA de Google Play (android/twa-manifest.json) digan
// lo mismo: Bubblewrap copia sus valores al paquete Android y un desajuste solo se notaría en el móvil.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COLOR_MARCA, MANIFEST } from './manifest'
import { PAQUETE_ANDROID } from './entorno'

const raiz = join(__dirname, '../../..')
const leer = (ruta: string) => readFileSync(join(raiz, ruta), 'utf8')
const twa = JSON.parse(leer('android/twa-manifest.json'))

/** Ancho y alto de un PNG, leídos de su cabecera (IHDR). */
function medidasPng(ruta: string): string {
  const png = readFileSync(join(raiz, 'public', ruta))
  return `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`
}

const icono = (purpose: 'any' | 'maskable') => MANIFEST.icons.find((i) => i.purpose === purpose && i.sizes === '512x512')

describe('manifest de la PWA', () => {
  it('está en español y presenta la app para cualquiera', () => {
    expect(MANIFEST.lang).toBe('es')
    expect(MANIFEST.description).not.toMatch(/personal/i)
    expect(MANIFEST.description.length).toBeLessThanOrEqual(132)
  })

  it('cada icono existe con las medidas que declara, y hay uno maskable', () => {
    for (const { src, sizes } of MANIFEST.icons) expect(medidasPng(src), src).toBe(sizes)
    expect(icono('any')).toBeDefined()
    expect(icono('maskable')).toBeDefined()
  })

  it('index.html usa el mismo color y nombre', () => {
    const html = leer('index.html')
    expect(html).toContain(`<meta name="theme-color" content="${COLOR_MARCA}" />`)
    expect(html).toContain(`<meta name="apple-mobile-web-app-title" content="${MANIFEST.short_name}" />`)
    expect(html).toContain(`<title>${MANIFEST.name}</title>`)
  })
})

describe('TWA de Google Play', () => {
  const origen = `https://${twa.host}`

  it('usa el paquete decidido, que no se puede cambiar una vez publicado (ADR 063)', () => {
    expect(twa.packageId).toBe('app.cumbrafit')
    expect(PAQUETE_ANDROID, 'la app reconoce la TWA por este paquete').toBe(twa.packageId)
    expect(twa.host).toBe('cumbrafit.app')
  })

  it('repite el nombre, los colores, la orientación y las direcciones del manifest', () => {
    expect(twa.name).toBe(MANIFEST.name)
    expect(twa.launcherName).toBe(MANIFEST.short_name)
    expect(twa.display).toBe(MANIFEST.display)
    expect(twa.orientation).toBe(MANIFEST.orientation)
    expect(twa.startUrl).toBe(MANIFEST.start_url)
    expect(twa.fullScopeUrl).toBe(origen + MANIFEST.scope)
    expect(twa.webManifestUrl).toBe(`${origen}/manifest.webmanifest`)
    expect(twa.iconUrl).toBe(`${origen}/${icono('any')!.src}`)
    expect(twa.maskableIconUrl).toBe(`${origen}/${icono('maskable')!.src}`)
    for (const clave of Object.keys(twa).filter((k) => /Color/.test(k))) expect(twa[clave], clave).toBe(COLOR_MARCA)
  })

  it('delega la ubicación (GPS de Actividades) y no pide notificaciones, que la app no usa', () => {
    expect(twa.features.locationDelegation.enabled).toBe(true)
    expect(twa.enableNotifications).toBe(false)
    expect(twa.features.playBilling).toBeUndefined()
  })

  it('la clave de subida no puede acabar en el repositorio', () => {
    expect(twa.signingKey.path).toMatch(/\.jks$/)
    expect(leer('.gitignore').split('\n')).toContain('*.jks')
  })

  it('la versión visible coincide en los dos campos que usa Bubblewrap', () => {
    expect(twa.appVersionName).toBe(twa.appVersion)
    expect(Number.isInteger(twa.appVersionCode) && twa.appVersionCode >= 1).toBe(true)
  })
})
