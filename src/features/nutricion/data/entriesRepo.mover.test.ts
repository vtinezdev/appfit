import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import type { Comida } from '../../../shared/db/types'
import * as repo from './entriesRepo'

beforeEach(async () => { await Promise.all(db.tables.map(t => t.clear())) })

async function preparar() {
  const ids = await repo.guardarComida({
    fecha: '2026-10-04', comida: 'cena', nombrePlato: 'Arroz con pollo',
    items: [
      { nombre: 'Arroz', gramos: 150, kcal100: 130, prot100: 3, carb100: 28, grasa100: 0.3, nutrientes: { fibra: 1, sal: 0 }, catalogId: 'ciqual:1', fuenteSiNuevo: 'manual', categoria: 'Otros' },
      { nombre: 'Pollo', gramos: 100, kcal100: 165, prot100: 31, carb100: 0, grasa100: 3.6, nutrientes: { agSat: 1 }, fuenteSiNuevo: 'manual', categoria: 'Otros' },
    ],
  })
  const antes = await db.entries.toArray()
  const input: repo.MoverPlatoInput = { fecha: antes[0].fecha, origen: 'cena', destino: 'snack', platoId: antes[0].platoId!, idsEsperados: ids }
  return { antes, input }
}

describe('movimiento del plato completo', () => {
  it('mueve los mismos ids preservando fecha, snapshots, referencias y alimentos', async () => {
    const { antes, input } = await preparar()
    const alimentos = await db.foods.toArray()
    const ajena = await repo.anadirRapida({ fecha: input.fecha, comida: 'snack', nombre: 'Otra entrada', kcal: 100, prot: 0, carb: 0, grasa: 0 })
    const otra = await db.entries.get(ajena)
    const movimiento = await repo.moverPlato(input)
    expect(movimiento).toMatchObject({ ids: input.idsEsperados, origen: 'cena', destino: 'snack', platoId: input.platoId })
    expect(await db.entries.bulkGet(input.idsEsperados)).toEqual(antes.map(e => ({ ...e, comida: 'snack' })))
    expect(await db.entries.get(ajena)).toEqual(otra)
    expect(await db.foods.toArray()).toEqual(alimentos)
  })

  it('soltar en la misma comida no escribe', async () => {
    const { antes, input } = await preparar()
    expect(await repo.moverPlato({ ...input, destino: 'cena' })).toBeNull()
    expect(await db.entries.toArray()).toEqual(antes)
  })

  it.each(['otra fecha', 'otro origen', 'otro id', 'vacío', 'destino inválido', 'ids parciales', 'ids duplicados'])(
    'rechaza %s sin modificar nada', async caso => {
      const { antes, input } = await preparar()
      const cambios = {
        'otra fecha': { fecha: '2026-10-03' }, 'otro origen': { origen: 'comida' as Comida },
        'otro id': { platoId: 'no-existe' }, vacío: { platoId: '' },
        'destino inválido': { destino: 'inventada' as Comida },
        'ids parciales': { idsEsperados: input.idsEsperados.slice(0, 1) },
        'ids duplicados': { idsEsperados: [input.idsEsperados[0], input.idsEsperados[0]] },
      }[caso]
      await expect(repo.moverPlato({ ...input, ...cambios })).rejects.toThrow()
      expect(await db.entries.toArray()).toEqual(antes)
    },
  )

  it('un fallo durante la segunda escritura revierte también la primera', async () => {
    const { antes, input } = await preparar()
    const fallarSegunda = (_changes: unknown, id: number) => {
      if (id === input.idsEsperados[1]) throw new Error('Escritura fallida')
    }
    db.entries.hook('updating', fallarSegunda)
    try { await expect(repo.moverPlato(input)).rejects.toThrow('Escritura fallida') }
    finally { db.entries.hook('updating').unsubscribe(fallarSegunda) }
    expect(await db.entries.toArray()).toEqual(antes)
  })

  it('no fusiona dos grupos que compartían un id en distintas comidas', async () => {
    const { antes, input } = await preparar()
    const idsDestino = await db.entries.bulkAdd(antes.map(({ id: _id, ...e }) => ({ ...e, comida: 'snack' as const })), { allKeys: true })
    const ajenas = await db.entries.bulkGet(idsDestino)
    const movimiento = (await repo.moverPlato(input))!
    expect(movimiento.platoId).not.toBe(input.platoId)
    expect(await db.entries.bulkGet(idsDestino)).toEqual(ajenas)
    expect(await db.entries.bulkGet(input.idsEsperados)).toEqual(antes.map(e => ({ ...e, comida: 'snack', platoId: movimiento.platoId })))
    await repo.deshacerMovimientoPlato(movimiento)
    expect((await db.entries.bulkGet(input.idsEsperados)).map(e => e?.comida)).toEqual(['cena', 'cena'])
    expect(await db.entries.bulkGet(idsDestino)).toEqual(ajenas)
  })

  it('deshacer conserva las ediciones posteriores y nunca restaura un borrado', async () => {
    const { input } = await preparar()
    const movimiento = (await repo.moverPlato(input))!
    await db.entries.update(input.idsEsperados[0], { gramos: 70, kcal: 91, nutrientes: { fibra: 0.7 } })
    const actual = (await db.entries.get(input.idsEsperados[0]))!
    await repo.deshacerMovimientoPlato(movimiento)
    expect(await db.entries.get(actual.id)).toEqual({ ...actual, comida: 'cena' })
    const segundo = (await repo.moverPlato(input))!
    await repo.borrar(input.idsEsperados[1])
    const trasBorrado = await db.entries.toArray()
    await expect(repo.deshacerMovimientoPlato(segundo)).rejects.toThrow(/ha cambiado/)
    expect(await db.entries.toArray()).toEqual(trasBorrado)
  })

  it('si se añaden ingredientes durante el gesto exige volver a elegir el plato', async () => {
    const { input } = await preparar()
    await repo.guardarComida({ fecha: input.fecha, comida: input.origen, platoDestinoId: input.platoId, items: [{ nombre: 'Tomate', gramos: 50, kcal100: 20, prot100: 1, carb100: 4, grasa100: 0, fuenteSiNuevo: 'manual', categoria: 'Otros' }] })
    const antes = await db.entries.toArray()
    await expect(repo.moverPlato(input)).rejects.toThrow(/ha cambiado/)
    expect(await db.entries.toArray()).toEqual(antes)
  })
})
