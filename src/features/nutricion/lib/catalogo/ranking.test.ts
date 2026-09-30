import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { CatalogFood } from '../../../../shared/db/types'
import { normalizeName, tokenizar, tokensConsulta } from '../../../../shared/lib/text'
import { aCatalogFoods, validarManifest, validarPaquete } from './paquete'
import { rankCatalogo } from './ranking'

function food(id: string, nombre: string, extra: Partial<CatalogFood> = {}): CatalogFood {
  return {
    id: `ciqual:${id}`, fuente: 'ciqual', idExterno: id, nombre, nombreNorm: normalizeName(nombre), tok: tokenizar(nombre),
    tipo: 'generico', kcal100: 100, prot100: 1, carb100: 1, grasa100: 1, completitud: 1, version: '1', importadoAt: 0, ...extra,
  }
}

const nombres = (foods: CatalogFood[]) => foods.map((f) => f.nombre)

describe('rankCatalogo', () => {
  it('pone primero el alimento («Pollo, …»), después los platos que empiezan igual y luego el resto', () => {
    const foods = [
      food('1', 'Nuggets de pollo, envasado'),
      food('2', 'Pollo, pechuga sin piel, cruda'),
      food('3', 'Grasa de pollo'),
      food('4', 'Pollo, muslo, asado'),
      food('5', 'Pollo a la vasca, envasado'),
    ]
    expect(nombres(rankCatalogo(foods, 'pollo'))).toEqual([
      'Pollo, muslo, asado',
      'Pollo, pechuga sin piel, cruda',
      'Pollo a la vasca, envasado',
      'Grasa de pollo',
      'Nuggets de pollo, envasado',
    ])
  })

  it('el nombre exacto gana a todo', () => {
    const foods = [food('1', 'Arroz blanco, cocido'), food('2', 'Arroz')]
    expect(nombres(rankCatalogo(foods, 'ARROZ'))[0]).toBe('Arroz')
  })

  it('una palabra entera gana a un simple prefijo («pan» antes que «panceta»)', () => {
    const foods = [food('1', 'Panceta ahumada'), food('2', 'Pan de pueblo'), food('3', 'Panecillo')]
    expect(nombres(rankCatalogo(foods, 'pan'))[0]).toBe('Pan de pueblo')
  })

  it('con varias palabras, prefiere las coincidencias al principio e ignora las palabras vacías', () => {
    const foods = [food('1', 'Jamón de pollo o pechuga de pollo en loncha'), food('2', 'Pollo, pechuga sin piel, cruda')]
    expect(nombres(rankCatalogo(foods, 'pechuga de pollo'))[0]).toBe('Pollo, pechuga sin piel, cruda')
  })

  it('una coincidencia solo por alias parcial va detrás de las que están en el nombre', () => {
    const foods = [food('1', 'Plátano, crudo', { tok: tokenizar('Plátano, crudo banana') }), food('2', 'Banana split')]
    expect(nombres(rankCatalogo(foods, 'banana'))).toEqual(['Banana split', 'Plátano, crudo'])
  })

  it('un alias exacto cuenta como nombre exacto («banana» → Plátano)', () => {
    const foods = [
      food('1', 'Banana split'),
      food('2', 'Plátano, pulpa sin piel, cruda', { alias: ['banana'], tok: tokenizar('Plátano, pulpa sin piel, cruda banana') }),
    ]
    expect(nombres(rankCatalogo(foods, 'banana'))[0]).toBe('Plátano, pulpa sin piel, cruda')
    expect(nombres(rankCatalogo(foods, 'BANANA'))[0]).toBe('Plátano, pulpa sin piel, cruda')
  })

  it('un alias de varias palabras también es exacto («jamón york»)', () => {
    const foods = [
      food('1', 'Jamón curado'),
      food('2', 'Jamón cocido, superior', { alias: ['jamón york', 'jamón dulce'], tok: tokenizar('Jamón cocido, superior jamón york jamón dulce') }),
    ]
    expect(nombres(rankCatalogo(foods, 'jamon york'))[0]).toBe('Jamón cocido, superior')
  })

  it('los frecuentes van justo detrás del nombre exacto y de «empieza por»', () => {
    const foods = [food('1', 'Yogur natural'), food('2', 'Yogur griego'), food('3', 'Yogur de soja')]
    expect(nombres(rankCatalogo(foods, 'yogur')).at(0)).toBe('Yogur de soja') // sin frecuentes: orden alfabético final
    expect(nombres(rankCatalogo(foods, 'yogur', new Set(['ciqual:2'])))[0]).toBe('Yogur griego')
    // Un frecuente no supera a un nombre exacto.
    const con = [food('1', 'Arroz'), food('2', 'Arroz blanco, cocido')]
    expect(nombres(rankCatalogo(con, 'arroz', new Set(['ciqual:2'])))[0]).toBe('Arroz')
  })

  it('genérico antes que marca a igual coincidencia', () => {
    const foods = [
      food('1', 'Yogur natural', { id: 'offes:1', fuente: 'offes', tipo: 'marca', marca: 'Hacendado' }),
      food('2', 'Yogur natural'),
    ]
    expect(foods.length).toBe(2)
    expect(rankCatalogo(foods, 'yogur natural').map((f) => f.id)).toEqual(['ciqual:2', 'offes:1'])
  })

  it('el genérico gana a la marca aunque la marca se llame exactamente como la consulta o sea más completa', () => {
    const foods = [
      food('1', 'Leche', { id: 'offes:1', fuente: 'offes', tipo: 'marca', marca: 'X', completitud: 1 }),
      food('2', 'Leche entera, cruda', { completitud: 0.5 }),
    ]
    expect(nombres(rankCatalogo(foods, 'leche'))[0]).toBe('Leche entera, cruda')
  })

  it('una marca que el usuario ya usa no se hunde detrás de los genéricos', () => {
    const foods = [
      food('1', 'Yogur natural', { id: 'offes:1', fuente: 'offes', tipo: 'marca', marca: 'Hacendado' }),
      food('2', 'Yogur o leche fermentada, natural'),
    ]
    expect(rankCatalogo(foods, 'yogur natural').map((f) => f.id)).toEqual(['ciqual:2', 'offes:1'])
    expect(rankCatalogo(foods, 'yogur natural', new Set(['offes:1'])).map((f) => f.id)).toEqual(['offes:1', 'ciqual:2'])
  })

  it('los secundarios (Martinica/Reunión, infantiles) van detrás de los demás con la misma coincidencia', () => {
    const foods = [food('1', 'Mango, pulpa, cruda', { secundario: true }), food('2', 'Mango, pulpa sin piel, cruda')]
    expect(nombres(rankCatalogo(foods, 'mango'))).toEqual(['Mango, pulpa sin piel, cruda', 'Mango, pulpa, cruda'])
  })

  it('desempata por completitud y después por fuente (ciqual, usda, offes, off)', () => {
    const foods = [
      food('1', 'Leche entera', { completitud: 0.5 }),
      { ...food('2', 'Leche entera'), id: 'usda:2', fuente: 'usda' },
      food('3', 'Leche entera'),
    ]
    expect(rankCatalogo(foods, 'leche entera').map((f) => f.id)).toEqual(['ciqual:3', 'usda:2', 'ciqual:1'])
    const fuentes = ['off', 'offes', 'usda', 'ciqual'].map((fu) => ({ ...food('9', 'Sal'), id: `${fu}:9`, fuente: fu }))
    expect(rankCatalogo(fuentes, 'sal').map((f) => f.fuente)).toEqual(['ciqual', 'usda', 'offes', 'off'])
  })

  it('consulta vacía → nada', () => {
    expect(rankCatalogo([food('1', 'Arroz')], '  ')).toEqual([])
  })
})

describe('rankCatalogo con el catálogo publicado (regresión de relevancia)', () => {
  const leer = (archivo: string): unknown => JSON.parse(readFileSync(new URL(`../../../../../public/catalogo/${archivo}`, import.meta.url), 'utf8'))
  // Todas las fuentes publicadas (CIQUAL + selección de OFF España), como en el dispositivo.
  const catalogo = validarManifest(leer('manifest.json')).fuentes.flatMap((f) => aCatalogFoods(validarPaquete(leer(f.archivo)), 0))
  // Mismo filtro que `catalogRepo.buscar` (todas las palabras útiles, por prefijo), sin base de datos.
  const buscar = (q: string, frecuentes?: ReadonlySet<string>) => {
    const tokens = tokensConsulta(q)
    return rankCatalogo(catalogo.filter((f) => tokens.every((t) => f.tok.some((w) => w.startsWith(t)))), q, frecuentes)
  }

  it.each([
    ['pollo', /^Pollo/],
    ['arroz', /^Arroz/],
    ['platano', /^Plátano/],
    ['plátano', /^Plátano/],
    ['banana', /^Plátano/],
    ['palta', /^Aguacate/],
    ['leche semi', /^Leche semidesnatada/],
    ['leche semidesnatada', /^Leche semidesnatada/],
    ['yogur natural', /^Yogur/],
    ['huevo', /^Huevo/],
    ['pechuga de pollo', /^Pollo, pechuga/],
    ['pan', /^Pan\b/],
    ['lentejas', /^Lenteja/],
    ['huevos', /^Huevo/],
    ['jamon york', /^Jamón cocido/],
    ['patatas', /^Patata/],
  ])('«%s» → el primer resultado es el alimento básico', (q, esperado) => {
    expect(buscar(q)[0]?.nombre).toMatch(esperado)
  })

  it('un genérico va antes que un producto de marca para «yogur natural» y «leche entera»', () => {
    for (const q of ['yogur natural', 'leche entera', 'queso fresco']) {
      const primero = buscar(q)[0]
      expect(primero.tipo, q).toBe('generico')
    }
  })

  it('productos españoles típicos de marca aparecen (manchego no está en CIQUAL ni en la selección: sin inventar)', () => {
    expect(buscar('fuet').some((f) => f.tipo === 'marca' && /fuet/i.test(f.nombre))).toBe(true)
    expect(buscar('sobrasada').some((f) => f.tipo === 'marca')).toBe(true)
    expect(buscar('salmorejo').some((f) => f.tipo === 'marca')).toBe(true)
    expect(buscar('horchata').some((f) => f.tipo === 'marca')).toBe(true)
    expect(buscar('queso de burgos').some((f) => f.tipo === 'marca')).toBe(true)
  })

  it('un producto de OFF lleva marca, gtin y categoría', () => {
    const p = buscar('sobrasada').find((f) => f.fuente === 'offes')!
    expect(p.id).toMatch(/^offes:\d{13}$/)
    expect(p.gtin).toBe(p.idExterno)
    expect(p.marca).toBeTruthy()
    expect(p.categoria).toBe('Embutidos y fiambres')
  })

  it('un frecuente sube a igualdad de coincidencia', () => {
    const base = buscar('yogur natural')
    const otro = base.find((f) => f.id !== base[0].id && f.tipo === 'generico' && f.nombre.startsWith('Yogur'))!
    expect(buscar('yogur natural', new Set([otro.id]))[0].id).toBe(otro.id)
  })

  it('los ocultos no se buscan (tok vacío): «Leche entera, UHT» no aparece, «Leche entera (promedio)» sí', () => {
    const r = nombres(buscar('leche entera'))
    expect(r).not.toContain('Leche entera, UHT')
    expect(r).toContain('Leche entera (promedio)')
  })

  it('con la búsqueda más pesada (600 candidatos) el ranking es rápido', () => {
    const tokens = tokensConsulta('queso')
    const candidatos = catalogo.filter((f) => tokens.every((t) => f.tok.some((w) => w.startsWith(t)))).slice(0, 600)
    const t0 = performance.now()
    for (let i = 0; i < 20; i++) rankCatalogo(candidatos, 'queso')
    const media = (performance.now() - t0) / 20
    expect(candidatos.length).toBeGreaterThan(300)
    expect(media).toBeLessThan(50)
  })
})
