// El intérprete local contra el paquete real de CIQUAL que se publica en `public/catalogo/`: que las palabras
// habituales den el alimento habitual y que los preferidos de la tabla de raciones sigan existiendo.
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { CatalogFood } from '../../../../shared/db/types'
import { aCatalogFoods, validarManifest, validarPaquete } from '../catalogo/paquete'
import { rankCatalogo } from '../catalogo/ranking'
import { emparejar } from './emparejar'
import { parsearParte } from './parsear'
import { idsPreferidos, racionDe } from './raciones'

const manifest = validarManifest(JSON.parse(readFileSync('public/catalogo/manifest.json', 'utf8')))
const ciqual = manifest.fuentes.find((f) => f.id === 'ciqual')!
const foods = aCatalogFoods(validarPaquete(JSON.parse(readFileSync(`public/catalogo/${ciqual.archivo}`, 'utf8'))), 0)
const porId = new Map(foods.map((f) => [f.id, f]))

/** Lo mismo que `catalogRepo.buscar` (todos los tokens por prefijo), en memoria. */
function buscar(consulta: string): CatalogFood[] {
  const tokens = consulta.split(' ')
  return foods.filter((f) => tokens.every((t) => f.tok.some((w) => w.startsWith(t))))
}

/** Lo mismo que `useInterpretarLocal`, sin tus alimentos. */
function mejor(texto: string): string | undefined {
  const parte = parsearParte(texto)!
  const preferido = racionDe(parte.consulta)?.preferido
  const candidatos = buscar(parte.consulta)
  const pref = preferido ? porId.get(preferido) : undefined
  const catalogo = rankCatalogo(pref && !candidatos.includes(pref) ? [pref, ...candidatos] : candidatos, parte.consulta)
  return emparejar({ consulta: parte.consulta, propios: [], catalogo, preferido }).mejor?.nombre
}

describe('intérprete local con CIQUAL', () => {
  it('los preferidos de la tabla de raciones existen en el paquete', () => {
    expect(idsPreferidos().filter((id) => !porId.has(id))).toEqual([])
  })

  it('ningún preferido de la tabla de raciones está oculto (un oculto no se busca)', () => {
    const ocultos = idsPreferidos().filter((id) => (porId.get(id)?.tok.length ?? 0) === 0)
    expect(ocultos).toEqual([])
  })

  it.each([
    ['200 g de arroz', 'Arroz blanco, crudo'],
    ['2 huevos', 'Huevo crudo'],
    ['un plátano', 'Plátano, pulpa sin piel, cruda'],
    ['una manzana', 'Manzana, pulpa y piel, cruda'],
    ['100 g de pasta', 'Pasta seca, estándar, cruda'],
    ['100 g de macarrones', 'Pasta seca, estándar, cruda'],
    ['2 tomates', 'Tomate redondo, crudo'],
    ['un vaso de leche', 'Leche semidesnatada (promedio)'],
    ['200 g de pechuga de pollo', 'Pollo, pechuga sin piel cruda'],
    ['150 g de pollo', 'Pollo, carne cruda'],
    ['una lata de atún', 'Atún, al natural, en conserva, escurrido'],
    ['50 g de copos de avena', 'Copos de avena'],
    ['un yogur griego', 'Yogur al estilo griego, natural'],
    ['30 g de nueces', 'Nuez, grano, deshidratada'],
    ['un kiwi', 'Kiwi, pulpa sin piel, con pepitas, cruda'],
    ['una naranja', 'Naranja, pulpa sin piel, sin pepitas, cruda'],
  ])('%s → %s', (texto, esperado) => {
    expect(mejor(texto)).toBe(esperado)
  })

  it('una frase sin coincidencia no empareja nada', () => {
    expect(mejor('200 g de arroz con pollo')).toBeUndefined()
  })
})
