// Compatibilidad de la actualización CIQUAL 2025-es1 → 2025-es2 (+ selección de OFF España) con los datos que el
// usuario ya tiene: entradas, plantillas, frecuentes y productos escaneados. Usa los repos reales (fake-indexeddb),
// una muestra del paquete antiguo (`src/test/fixtures`) y los paquetes reales que se publican en `public/catalogo/`.
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../../shared/db/db'
import type { CatalogFood } from '../../../../shared/db/types'
import { normalizeName, tokenizar } from '../../../../shared/lib/text'
import * as catalogRepo from '../../data/catalogRepo'
import * as foodsRepo from '../../data/foodsRepo'
import { crearSincronizador } from './sincronizar'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

type FilaEs1 = [string, string, string, string, number, number, number, number, Record<string, number>?, string[]?]
const es1 = JSON.parse(readFileSync('src/test/fixtures/ciqual-2025-es1-muestra.json', 'utf8')) as { version: string; filas: FilaEs1[] }

/** La conversión de la app antigua (formato 1): id, tok de nombre + alias, sin alias/ml/secundario guardados. */
function foodsEs1(): CatalogFood[] {
  return es1.filas.map(([id, nombre, original, categoria, kcal, prot, carb, grasa, nutrientes, alias]) => ({
    id: `ciqual:${id}`,
    fuente: 'ciqual',
    idExterno: id,
    nombre,
    nombreOriginal: original,
    nombreNorm: normalizeName(nombre),
    tok: tokenizar([nombre, ...(alias ?? [])].join(' ')),
    tipo: 'generico' as const,
    categoria,
    kcal100: kcal,
    prot100: prot,
    carb100: carb,
    grasa100: grasa,
    ...(nutrientes && Object.keys(nutrientes).length ? { nutrientes } : {}),
    completitud: (4 + Object.keys(nutrientes ?? {}).length) / 8,
    version: es1.version,
    importadoAt: 1,
  }))
}

const publicado = (ruta: string): unknown => JSON.parse(readFileSync(`public${ruta}`, 'utf8'))
const sincronizar = crearSincronizador({
  fetchJson: async (url) => publicado(url),
  fuentesInstaladas: catalogRepo.fuentes,
  importarFuente: catalogRepo.importarFuente,
  ahora: () => 5000,
})

async function instalarEs1() {
  await catalogRepo.importarFuente(
    { id: 'ciqual', version: es1.version, importadoAt: 1, licencia: 'Licence Ouverte Etalab 2.0', atribucion: 'ANSES', filas: es1.filas.length },
    foodsEs1(),
  )
}

describe('actualización CIQUAL es1 → es2 con datos de usuario', () => {
  it('la muestra del paquete antiguo incluye los ids que luego se ocultan', () => {
    const ids = es1.filas.map((f) => f[0])
    expect(ids).toEqual(expect.arrayContaining(['19023', '19041', '19042', '19051', '18009', '22000']))
  })

  it('conserva todos los ids (también los ocultos), entradas, plantillas, frecuentes y escaneados', async () => {
    await instalarEs1()
    // Datos del usuario que referencian el catálogo: una entrada de un alimento que luego se oculta, otra normal,
    // una plantilla, un alimento propio y un producto escaneado con Open Food Facts en directo.
    const idFrecuente = await db.entries.add({ fecha: '2026-09-29', comida: 'desayuno', catalogId: 'ciqual:19023', nombre: 'Leche entera, UHT', gramos: 200, kcal: 129, prot: 7, carb: 9.6, grasa: 7.2, createdAt: 2 })
    await db.entries.add({ fecha: '2026-09-29', comida: 'desayuno', catalogId: 'ciqual:22000', nombre: 'Huevo crudo', gramos: 120, kcal: 150, prot: 13, carb: 0.3, grasa: 10, createdAt: 3 })
    const mealId = await db.meals.add({
      nombre: 'Desayuno de siempre',
      comida: 'desayuno',
      items: [{ catalogId: 'ciqual:19041', nombre: 'Leche semidesnatada, UHT', gramos: 250, kcal: 119, prot: 8.8, carb: 12.5, grasa: 4, }],
      usos: 3,
      usadoAt: 9,
      createdAt: 1,
    })
    const propio = await db.foods.add({ nombre: 'Mi granola', nombreNorm: 'mi granola', kcal100: 400, prot100: 10, carb100: 60, grasa100: 12, fuente: 'manual', createdAt: 1 } as never)
    await catalogRepo.guardarProductoOff({
      id: 'off:8410000000000', fuente: 'off', idExterno: '8410000000000', nombre: 'Yogur escaneado', nombreNorm: 'yogur escaneado', tok: ['yogur', 'escaneado'], tipo: 'marca',
      gtin: '8410000000000', kcal100: 60, prot100: 4, carb100: 5, grasa100: 3, version: 'live', importadoAt: 10,
    })
    const antes = {
      entries: await db.entries.toArray(),
      meals: await db.meals.toArray(),
      foods: await db.foods.toArray(),
    }
    expect((await catalogRepo.buscar('leche entera')).map((f) => f.id)).toContain('ciqual:19023')

    // Actualización: descarga los paquetes publicados (CIQUAL es2 y OFF España) y los importa.
    const r = await sincronizar()
    expect(r.actualizadas.map((a) => a.id).sort()).toEqual(['ciqual', 'offes'])

    // 1. Ningún id de la versión anterior desapareció, y ya son de la versión nueva.
    const porId = await catalogRepo.porIds(es1.filas.map((f) => `ciqual:${f[0]}`))
    expect([...porId.keys()].sort()).toEqual(es1.filas.map((f) => `ciqual:${f[0]}`).sort())
    expect([...porId.values()].every((f) => f.version === '2025-es2')).toBe(true)
    expect(await db.catalogFoods.where('fuente').equals('ciqual').and((f) => f.version === '2025-es1').count()).toBe(0)

    // 2. Los ocultos se resuelven por id pero ya no se buscan.
    expect(porId.get('ciqual:19023')?.tok).toEqual([])
    expect((await catalogRepo.buscar('leche entera')).map((f) => f.id)).not.toContain('ciqual:19023')
    expect((await catalogRepo.buscar('leche entera')).map((f) => f.id)).toContain('ciqual:19016')

    // 3. Los datos del usuario no cambian ni un byte (snapshot en entradas y plantillas).
    expect(await db.entries.toArray()).toEqual(antes.entries)
    expect(await db.meals.toArray()).toEqual(antes.meals)
    expect(await db.foods.toArray()).toEqual(antes.foods)
    expect(propio).toBeDefined()
    expect(mealId).toBeDefined()

    // 4. Los frecuentes siguen resolviéndose, incluido el que ahora está oculto.
    const frec = await foodsRepo.frecuentes({ comida: 'desayuno', hoy: '2026-09-30' })
    expect(frec.map((a) => a.nombre)).toEqual(expect.arrayContaining(['Leche entera, UHT', 'Huevo crudo']))
    expect(idFrecuente).toBeDefined()

    // 5. Los escaneados en directo (fuente `off`) sobreviven a la importación de `offes`.
    expect((await catalogRepo.obtener('off:8410000000000'))?.nombre).toBe('Yogur escaneado')
    expect((await catalogRepo.fuentes()).map((f) => f.id).sort()).toEqual(['ciqual', 'off', 'offes'])

    // 6. Un producto de la selección offline se encuentra por su código de barras.
    const uno = (await db.catalogFoods.where('fuente').equals('offes').first())!
    expect((await catalogRepo.buscarPorGtin(uno.gtin!)).map((f) => f.id)).toEqual([uno.id])
    expect(uno.tipo).toBe('marca')

    // 7. Una segunda sincronización no vuelve a importar nada.
    expect((await sincronizar()).actualizadas).toEqual([])
  }, 120000)

  it('el alias nuevo se puede buscar (banana → Plátano) y el vocabulario se refresca', async () => {
    await instalarEs1()
    expect((await catalogRepo.buscar('banana')).map((f) => f.nombre)).not.toContain('Plátano, pulpa sin piel, cruda')
    await sincronizar()
    const r = await catalogRepo.buscar('banana')
    expect(r.map((f) => f.nombre)).toContain('Plátano, pulpa sin piel, cruda')
    expect(r.find((f) => f.id === 'ciqual:13005')?.alias).toContain('banana')
    expect((await catalogRepo.vocabulario()).palabras).toContain('banana')
  }, 120000)
})
