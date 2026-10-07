import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import { exportarBackup, importarBackup } from '../../../shared/lib/backup'
import type { CatalogFood } from '../../../shared/db/types'
import { aItemGuardado, elegibleDeCatalogo, itemDesdeElegible, por100DesdeEntrada } from '../lib/alimentos'
import * as entriesRepo from './entriesRepo'
import * as foodsRepo from './foodsRepo'
import * as mealsRepo from './mealsRepo'

beforeEach(async () => { await Promise.all(db.tables.map((t) => t.clear())) })

const catalogo: CatalogFood = {
  id: 'ciqual:1', fuente: 'ciqual', idExterno: '1', nombre: 'Prueba', nombreNorm: 'prueba', tok: ['prueba'], tipo: 'generico',
  kcal100: 100, prot100: 5, carb100: 10, grasa100: 4, nutrientes: { fibra: 2, azucares: 0, sal: 0.15, agSat: 1 }, version: '1', importadoAt: 1,
}

describe('snapshots de nutrientes adicionales', () => {
  it('las dos vías de añadido de catálogo guardan nutrientes y sobreviven al borrado del catálogo', async () => {
    await db.catalogFoods.put(catalogo)
    const rapido = await entriesRepo.anadirDesdeCatalogo({ fecha: '2026-10-03', comida: 'comida', catalogId: catalogo.id, gramos: 50 })
    const [interpretado] = await entriesRepo.guardarComida({ fecha: '2026-10-03', comida: 'cena', items: [aItemGuardado(itemDesdeElegible(elegibleDeCatalogo(catalogo), 200))] })
    await db.catalogFoods.clear()
    expect((await db.entries.get(rapido!))?.nutrientes).toEqual({ fibra: 1, azucares: 0, sal: 0.075, agSat: 0.5 })
    expect((await db.entries.get(interpretado))?.nutrientes).toEqual({ fibra: 4, azucares: 0, sal: 0.3, agSat: 2 })
    expect(await db.foods.count()).toBe(0)
  })

  it('crea/actualiza alimentos propios y editar gramos conserva el aporte; se pueden borrar datos', async () => {
    const item = { ...aItemGuardado(itemDesdeElegible(elegibleDeCatalogo(catalogo), 100)), catalogId: undefined }
    const [id] = await entriesRepo.guardarComida({ fecha: '2026-10-03', comida: 'comida', items: [item] })
    const e = (await db.entries.get(id))!
    expect((await foodsRepo.obtener(e.foodId!))?.nutrientes).toEqual(catalogo.nutrientes)
    await entriesRepo.editar(id, { nombre: e.nombre, comida: e.comida, gramos: 50, ...por100DesdeEntrada(e), aplicarAlAlimento: false })
    expect((await db.entries.get(id))?.nutrientes?.sal).toBe(0.075)
    expect((await foodsRepo.obtener(e.foodId!))?.nutrientes?.sal).toBe(0.15)
    await entriesRepo.guardarComida({ fecha: '2026-10-03', comida: 'cena', items: [{ ...item, nutrientes: { ...item.nutrientes, sal: 0.5 } }] })
    expect((await foodsRepo.obtener(e.foodId!))?.nutrientes?.sal).toBe(0.5)
    await entriesRepo.editar(id, { nombre: e.nombre, comida: e.comida, gramos: 100, ...por100DesdeEntrada(e), nutrientes: undefined, aplicarAlAlimento: true })
    expect((await db.entries.get(id))?.nutrientes).toBeUndefined()
    expect((await foodsRepo.obtener(e.foodId!))?.nutrientes).toBeUndefined()
  })

  it('copiar, guardar/aplicar plantilla y exportar/importar conservan los nutrientes', async () => {
    const [id] = await entriesRepo.guardarComida({ fecha: '2026-10-03', comida: 'comida', items: [aItemGuardado(itemDesdeElegible(elegibleDeCatalogo(catalogo), 200))] })
    const entry = (await db.entries.get(id))!
    const [copia] = await entriesRepo.copiar({ origen: { fecha: entry.fecha }, destino: { fecha: '2026-10-04' } })
    const plantilla = await mealsRepo.crearDesdeEntradas({ nombre: 'Mi comida', entries: [entry] })
    const [aplicada] = await mealsRepo.aplicar(plantilla, { fecha: '2026-10-05', comida: 'cena' })
    expect((await db.entries.get(copia))?.nutrientes).toEqual(entry.nutrientes)
    expect((await db.entries.get(aplicada))?.nutrientes).toEqual(entry.nutrientes)
    await entriesRepo.guardarComida({ fecha: '2026-10-03', comida: 'snack', items: [{ ...aItemGuardado(itemDesdeElegible(elegibleDeCatalogo(catalogo), 50)), catalogId: undefined }] })
    const antes = await exportarBackup()
    await importarBackup(JSON.stringify(antes))
    const despues = await exportarBackup()
    expect(despues.entries).toEqual(antes.entries)
    expect(despues.meals).toEqual(antes.meals)
    expect(despues.foods).toEqual(antes.foods)
    expect(despues.foods[0].nutrientes).toEqual(catalogo.nutrientes)
    expect(despues.version).toBe(3)
  })

  it('alimentos/entradas anteriores y kcal rápidas siguen con los extras desconocidos', async () => {
    const foodId = await foodsRepo.crear({ nombre: 'Antiguo', kcal100: 100, prot100: 5, carb100: 10, grasa100: 4, fuente: 'manual' })
    const id = await entriesRepo.anadirDesdeAlimento({ fecha: '2026-10-03', comida: 'cena', foodId, gramos: 100 })
    const rapido = await entriesRepo.anadirRapida({ fecha: '2026-10-03', comida: 'cena', nombre: 'Fuera', kcal: 100, prot: 0, carb: 0, grasa: 0 })
    expect((await db.entries.get(id!))?.nutrientes).toBeUndefined()
    expect((await db.entries.get(rapido))?.nutrientes).toBeUndefined()
  })
})
