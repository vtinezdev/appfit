import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../shared/db/db'
import * as notasMedidaRepo from './notasMedidaRepo'

beforeEach(async () => {
  await db.notasMedida.clear()
})

describe('notasMedidaRepo', () => {
  it('guarda la nota recortada y lista las más recientes primero', async () => {
    const ahora = vi.spyOn(Date, 'now')
    ahora.mockReturnValue(1)
    await notasMedidaRepo.crear('  tarrina de hummus ≈ 200 g ')
    ahora.mockReturnValue(2)
    await notasMedidaRepo.crear('brick de zumo')
    ahora.mockRestore()
    expect((await notasMedidaRepo.listar()).map((n) => n.texto)).toEqual(['brick de zumo', 'tarrina de hummus ≈ 200 g'])
  })

  it('una nota vacía no se guarda', async () => {
    expect(await notasMedidaRepo.crear('   ')).toBeUndefined()
    expect(await db.notasMedida.count()).toBe(0)
  })

  it('borrar devuelve la nota y restaurar la recupera igual', async () => {
    const id = (await notasMedidaRepo.crear('vasito de yogur'))!
    const borrada = await notasMedidaRepo.borrar(id)
    expect(await db.notasMedida.count()).toBe(0)
    await notasMedidaRepo.restaurar(borrada!)
    expect(await db.notasMedida.get(id)).toEqual(borrada)
    expect(await notasMedidaRepo.borrar(999)).toBeUndefined()
  })
})
