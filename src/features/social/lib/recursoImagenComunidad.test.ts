/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { CATALOGO_IMAGENES_COMUNIDAD } from './imagenComunidad'
import { recursoImagenComunidad } from './recursoImagenComunidad'

const carpeta = 'src/features/social/assets/comunidades'

describe('recursos locales del catálogo de comunidades', () => {
  it('cada opción tiene exactamente su archivo y coincide con el manifiesto de originales', () => {
    const archivos = readdirSync(carpeta).sort()
    expect(archivos).toEqual(CATALOGO_IMAGENES_COMUNIDAD.map(e => `${e.id.slice('lugar.'.length)}.webp`).sort())
    const fuentes = JSON.parse(readFileSync('scripts/comunidades/fuentes.json', 'utf8')) as { lotes: { elementos: { id: string }[] }[] }
    expect(fuentes.lotes.flatMap(l => l.elementos.map(e => e.id))).toEqual(CATALOGO_IMAGENES_COMUNIDAD.map(e => e.id))
    for (const e of CATALOGO_IMAGENES_COMUNIDAD) expect(recursoImagenComunidad(e.id)).toBeTruthy()
  })

  it('los WebP se decodifican completos, son cuadrados y caben en el presupuesto de recursos', async () => {
    let total = 0
    for (const e of CATALOGO_IMAGENES_COMUNIDAD) {
      const ruta = `${carpeta}/${e.id.slice('lugar.'.length)}.webp`
      const imagen = sharp(ruta)
      const metadatos = await imagen.metadata()
      expect(metadatos.format).toBe('webp')
      expect([metadatos.width, metadatos.height]).toEqual([256, 256])
      await expect(imagen.raw().toBuffer()).resolves.toBeInstanceOf(Buffer)
      total += statSync(ruta).size
    }
    expect(total).toBeLessThan(350 * 1024)
  })

  it.each([null, undefined, 'lugar.inventado', '../avatares/tinez', 'https://ejemplo.com/foto.webp', 'data:image/png;base64,AAAA'])('no resuelve URLs ni archivos ajenos: %s', x => {
    expect(recursoImagenComunidad(x)).toBeUndefined()
  })
})
