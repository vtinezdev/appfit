import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import * as catalogRepo from '../data/catalogRepo'
import { aCatalogFoods, validarManifest, validarPaquete } from '../lib/catalogo/paquete'
import { emparejar } from '../lib/interprete/emparejar'
import { preferidoDe } from '../lib/catalogo/preferidos'
import { normalizeName, tokensConsulta } from '../../../shared/lib/text'
import { buscarCatalogo, CANDIDATOS } from './buscarCatalogo'

const leer = (archivo: string): unknown => JSON.parse(readFileSync(`public/catalogo/${archivo}`, 'utf8'))
const catalogo = validarManifest(leer('manifest.json')).fuentes.flatMap((f) => aCatalogFoods(validarPaquete(leer(f.archivo)), 0))
const porId = new Map(catalogo.map((f) => [f.id, f]))
afterAll(() => catalogRepo.borrarCatalogo())

describe('búsqueda real con CIQUAL y Open Food Facts', () => {
  beforeAll(() => catalogRepo.guardarLote(catalogo))

  it.each([
    ['pollo', 'ciqual:36017'], ['pechuga', 'ciqual:36017'], ['pechuga de pollo', 'ciqual:36017'],
    ['huevo', 'ciqual:22000'], ['arroz', 'ciqual:9100'], ['leche', 'ciqual:19033'],
    ['pasta', 'ciqual:9810'], ['macarrones', 'ciqual:9810'], ['yogur', 'ciqual:19593'],
    ['pan', 'ciqual:7001'], ['atún', 'ciqual:26039'], ['aceite', 'ciqual:17270'],
    ['tomates', 'ciqual:20276'], ['nueces', 'ciqual:15005'], ['café con leche', 'ciqual:18151'],
    ['jamón york', 'ciqual:28900'], ['tostadas', 'ciqual:7004'],
  ])('buscador e intérprete eligen el mismo básico para «%s»', async (q, id) => {
    const r = await buscarCatalogo(q)
    expect(r.foods[0]?.id).toBe(id)
    const elegido = emparejar({ consulta: tokensConsulta(r.consulta).join(' '), propios: [], catalogo: r.foods, preferido: preferidoDe(r.consulta) })
    expect(elegido.mejor?.ref).toEqual({ tipo: 'catalog', id })
    expect(new Set(r.foods.map((f) => f.id)).size).toBe(r.foods.length)
  })

  it.each([
    ['pechuga de pato', /^Pato, pechuga/],
    ['pollo con piel', /^Pollo,.*(?:con|y) piel/],
    ['pechuga de pollo con piel', /^Pollo, pechuga, carne y piel/],
    ['pechuga de pollo a la plancha', /^Pollo, pechuga sin piel a la plancha/],
    ['huevo frito', /^Huevo frito/], ['huevo en polvo', /^Huevo, en polvo/],
    ['arroz cocido', /^Arroz.*cocido/], ['arroz integral', /^Arroz integral/],
    ['leche entera', /^Leche entera/], ['yogur griego', /^Yogur al estilo griego/],
    ['pollo ecológico', /^Pollo,.*ecológico/],
  ])('respeta la petición concreta «%s»', async (q, nombre) => {
    const r = await buscarCatalogo(q)
    expect(r.foods[0]?.nombre).toMatch(nombre)
    if (q === 'arroz cocido') expect(r.foods[0].nombre).not.toMatch(/crud[oa]/)
    const elegido = emparejar({ consulta: tokensConsulta(q).join(' '), propios: [], catalogo: r.foods, preferido: preferidoDe(q) })
    expect(elegido.mejor?.nombre).toBe(r.foods[0].nombre)
  })

  it('conserva los productos de una marca solicitada', async () => {
    const r = await buscarCatalogo('yogur hacendado')
    expect(r.foods.length).toBeGreaterThan(0)
    expect(r.foods.every((f) => f.tipo === 'marca' && /hacendado/i.test(f.marca ?? ''))).toBe(true)
  })

  it('mantiene el básico primero y personaliza las alternativas compatibles', async () => {
    const inicial = await buscarCatalogo('pollo')
    const alternativas = inicial.foods.filter((f) => f.id !== 'ciqual:36017')
    const preferenciaPersonal = alternativas.find((f) => f.id === 'ciqual:36022')!
    const r = await buscarCatalogo('pollo', new Set([preferenciaPersonal.id]))
    expect(r.foods[0].id).toBe('ciqual:36017')
    expect(r.foods[1].id).toBe(preferenciaPersonal.id)
  })

  it('el alimento propio con coincidencia fuerte sigue ganando al básico', async () => {
    const r = await buscarCatalogo('pollo')
    const propio = { id: 42, nombre: 'Pollo asado de casa', nombreNorm: normalizeName('Pollo asado de casa'), kcal100: 150, prot100: 20, carb100: 0, grasa100: 7, fuente: 'manual' as const, updatedAt: 0 }
    const elegido = emparejar({ consulta: 'pollo', propios: [propio], catalogo: r.foods, preferido: preferidoDe('pollo') })
    expect(elegido.mejor?.ref).toEqual({ tipo: 'user', id: 42 })
  })
})

describe('recuperación del preferido fuera del índice', () => {
  beforeEach(() => catalogRepo.borrarCatalogo())

  it('recupera el básico por id cuando los primeros 600 candidatos no lo incluyen', async () => {
    const arroz = porId.get('ciqual:9100')!
    const otros = Array.from({ length: CANDIDATOS }, (_, i) => ({ ...arroz, id: `ciqual:000${String(i).padStart(4, '0')}`, nombre: `Arroz de prueba ${i}` }))
    await catalogRepo.guardarLote([...otros, arroz])
    expect((await catalogRepo.buscar('arroz', CANDIDATOS)).some((f) => f.id === arroz.id)).toBe(false)
    const r = await buscarCatalogo('arroz')
    expect(r.foods[0].id).toBe(arroz.id)
    expect(r.foods).toHaveLength(CANDIDATOS + 1)
  })

  it.each(['ausente', 'oculto', 'incompatible'] as const)('no rescata un preferido %s', async (caso) => {
    const pasta = porId.get('ciqual:9810')!
    const alternativa = porId.get('ciqual:9821')!
    await catalogRepo.guardarLote([alternativa])
    if (caso !== 'ausente') await catalogRepo.guardarLote([{ ...pasta, tok: caso === 'oculto' ? [] : ['azucar'] }])
    const r = await buscarCatalogo('pasta')
    expect(r.foods.map((f) => f.id)).toEqual([alternativa.id])
  })

  it('una errata corregida también usa el básico compartido', async () => {
    await catalogRepo.guardarLote([porId.get('ciqual:13005')!])
    const r = await buscarCatalogo('platno')
    expect(r.corregida).toBe('plátano')
    expect(r.foods[0].id).toBe('ciqual:13005')
  })
})
