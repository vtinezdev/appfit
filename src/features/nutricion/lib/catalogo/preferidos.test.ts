import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { aCatalogFoods, validarManifest, validarPaquete } from './paquete'
import { PREFERIDOS, preferidoCompatible, preferidoDe } from './preferidos'
import { rankCatalogo } from './ranking'

const leer = (archivo: string): unknown => JSON.parse(readFileSync(`public/catalogo/${archivo}`, 'utf8'))
const catalogo = validarManifest(leer('manifest.json')).fuentes.flatMap((f) => aCatalogFoods(validarPaquete(leer(f.archivo)), 0))
const porId = new Map(catalogo.map((f) => [f.id, f]))

describe('preferidos para consultas completas', () => {
  it.each([
    ['pollo', 'ciqual:36017'], ['pechuga', 'ciqual:36017'], ['PECHUGAS DE POLLO', 'ciqual:36017'],
    ['huevos', 'ciqual:22000'], ['tomates', 'ciqual:20276'], ['nueces', 'ciqual:15005'],
    [' PLÁTANOS ', 'ciqual:13005'], ['jamón york', 'ciqual:28900'], ['macarrones', 'ciqual:9810'],
  ])('%s → %s', (q, id) => expect(preferidoDe(q)).toBe(id))

  it.each([
    '', 'pech', 'pollo con piel', 'pechuga de pato', 'pollo asado', 'pollo ecológico',
    'huevo frito', 'huevo en polvo', 'arroz cocido', 'leche entera', 'yogur hacendado', 'arroz con pollo',
  ])('no impone el básico a «%s»', (q) => expect(preferidoDe(q)).toBeUndefined())

  it.each(Object.entries(PREFERIDOS))('«%s» tiene un básico real compatible y primero en el ranking', (q, id) => {
    const food = porId.get(id)!
    expect(food).toBeDefined()
    expect(preferidoCompatible(food, q)).toBe(true)
    expect(rankCatalogo(catalogo, q)[0].id).toBe(id)
  })
})
