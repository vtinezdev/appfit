import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import { updateSettings } from '../../../shared/db/settings'
import * as pesosRepo from '../../inicio/data/pesosRepo'
import * as objetivosDiaRepo from './objetivosDiaRepo'
import * as perfilRepo from './perfilRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

const A = { kcal: 2000, prot: 150, carb: 200, grasa: 67 }

describe('objetivosDiaRepo', () => {
  it('las lecturas no escriben: sin snapshot devuelven los vigentes de hoy', async () => {
    await updateSettings({ objetivos: A, perfil: { proteinaPorKgActiva: false } })
    const o = await objetivosDiaRepo.objetivosDe('2026-10-01', '2026-10-07')
    expect(o).toMatchObject({ ...A, congelado: false })
    expect(await db.objetivosDia.count()).toBe(0)
    expect(await objetivosDiaRepo.objetivosMediosDe(['2026-10-01'], '2026-10-07')).toEqual(A)
    expect(await db.objetivosDia.count()).toBe(0)
  })

  it('congelar crea el snapshot una sola vez y luego manda sobre los cambios de ajustes', async () => {
    await updateSettings({ objetivos: A, perfil: { proteinaPorKgActiva: false } })
    await objetivosDiaRepo.congelar('2026-10-06', '2026-10-07')
    await updateSettings({ objetivos: { ...A, kcal: 2600, carb: 330 } })
    await objetivosDiaRepo.congelar('2026-10-06', '2026-10-07')
    expect(await db.objetivosDia.count()).toBe(1)
    expect(await objetivosDiaRepo.objetivosDe('2026-10-06', '2026-10-07')).toMatchObject({ ...A, congelado: true })
    expect(await objetivosDiaRepo.objetivosDe('2026-10-05', '2026-10-07')).toMatchObject({ kcal: 2600, congelado: false })
  })

  it('actualizarHoy crea y después actualiza el objetivo de hoy sin tocar otros días', async () => {
    await updateSettings({ objetivos: A, perfil: { proteinaPorKgActiva: false } })
    await objetivosDiaRepo.congelar('2026-10-06', '2026-10-07')
    await objetivosDiaRepo.actualizarHoy('2026-10-07', 'ajustes')
    await updateSettings({ objetivos: { ...A, kcal: 2200, carb: 250 } })
    await objetivosDiaRepo.actualizarHoy('2026-10-07', 'ajustes')
    const filas = await db.objetivosDia.toArray()
    expect(filas).toHaveLength(2)
    expect(filas.find((f) => f.fecha === '2026-10-07')?.objetivos.kcal).toBe(2200)
    expect(filas.find((f) => f.fecha === '2026-10-06')?.objetivos.kcal).toBe(2000)
  })

  it('el objetivo medio de un periodo mezcla snapshots y vigentes', async () => {
    await updateSettings({ objetivos: A, perfil: { proteinaPorKgActiva: false } })
    await objetivosDiaRepo.congelar('2026-10-05', '2026-10-07')
    await updateSettings({ objetivos: { kcal: 2400, prot: 150, carb: 300, grasa: 67 } })
    const medio = await objetivosDiaRepo.objetivosMediosDe(['2026-10-05', '2026-10-06'], '2026-10-07')
    expect(medio.kcal).toBe(2200)
  })

  it('la proteína por kg (activa por defecto) usa el último pesaje en los vigentes', async () => {
    await updateSettings({ objetivos: A })
    await pesosRepo.registrar('2026-10-01', 80)
    const v = await perfilRepo.objetivosVigentes('2026-10-07')
    expect(v).toMatchObject({ prot: 144, kcal: 2000, proteinaPorKg: { gPorKg: 1.8, pesoKg: 80 } })
    await updateSettings({ perfil: { proteinaPorKgActiva: false } })
    expect(await perfilRepo.objetivosVigentes('2026-10-07')).toMatchObject({ prot: 150 })
  })

  it('actualizarObjetivoHoy / congelarObjetivoDia no lanzan nunca', async () => {
    await expect(objetivosDiaRepo.actualizarObjetivoHoy('2026-10-07', 'peso')).resolves.toBeUndefined()
    await expect(objetivosDiaRepo.congelarObjetivoDia('2026-10-07', '2026-10-07')).resolves.toBeUndefined()
  })
})

describe('objetivosPorFecha', () => {
  it('devuelve el snapshot de cada día o los vigentes, sin escribir', async () => {
    await updateSettings({ objetivos: A, perfil: { proteinaPorKgActiva: false } })
    await objetivosDiaRepo.congelar('2026-10-05', '2026-10-07')
    await updateSettings({ objetivos: { ...A, kcal: 2400, carb: 300 } })
    const m = await objetivosDiaRepo.objetivosPorFecha(['2026-10-05', '2026-10-06'], '2026-10-07')
    expect(m.get('2026-10-05')?.kcal).toBe(2000)
    expect(m.get('2026-10-06')?.kcal).toBe(2400)
    expect(await db.objetivosDia.count()).toBe(1)
  })
})

describe('hoy se calcula siempre en vivo', () => {
  it('objetivosDe, objetivosPorFecha y objetivosMediosDe ignoran el snapshot de hoy pero respetan el de fechas pasadas', async () => {
    await updateSettings({ objetivos: A, perfil: { proteinaPorKgActiva: false } })
    await objetivosDiaRepo.congelar('2026-10-06', '2026-10-07')
    await objetivosDiaRepo.congelar('2026-10-07', '2026-10-07')
    await updateSettings({ objetivos: { ...A, kcal: 2600, carb: 360 } })
    expect(await objetivosDiaRepo.objetivosDe('2026-10-07', '2026-10-07')).toMatchObject({ kcal: 2600, congelado: false })
    expect(await objetivosDiaRepo.objetivosDe('2026-10-06', '2026-10-07')).toMatchObject({ kcal: 2000, congelado: true })
    const m = await objetivosDiaRepo.objetivosPorFecha(['2026-10-06', '2026-10-07'], '2026-10-07')
    expect([m.get('2026-10-06')?.kcal, m.get('2026-10-07')?.kcal]).toEqual([2000, 2600])
    expect((await objetivosDiaRepo.objetivosMediosDe(['2026-10-06', '2026-10-07'], '2026-10-07')).kcal).toBe(2300)
  })

  it('congelar hoy hace upsert; con fecha pasada solo la primera vez', async () => {
    await updateSettings({ objetivos: A, perfil: { proteinaPorKgActiva: false } })
    await objetivosDiaRepo.congelar('2026-10-07', '2026-10-07')
    await objetivosDiaRepo.congelar('2026-10-06', '2026-10-07')
    await updateSettings({ objetivos: { ...A, kcal: 2200, carb: 250 } })
    await objetivosDiaRepo.congelar('2026-10-07', '2026-10-07')
    await objetivosDiaRepo.congelar('2026-10-06', '2026-10-07')
    const filas = await db.objetivosDia.toArray()
    expect(filas).toHaveLength(2)
    expect(filas.find((f) => f.fecha === '2026-10-07')?.objetivos.kcal).toBe(2200)
    expect(filas.find((f) => f.fecha === '2026-10-06')?.objetivos.kcal).toBe(2000)
  })

  it('cambiar el peso o la proteína por kg se refleja en hoy sin pasar por actualizarHoy', async () => {
    await updateSettings({ objetivos: A })
    await pesosRepo.registrar('2026-10-01', 80)
    expect((await objetivosDiaRepo.objetivosDe('2026-10-07', '2026-10-07')).prot).toBe(144)
    await pesosRepo.registrar('2026-10-02', 90)
    expect((await objetivosDiaRepo.objetivosDe('2026-10-07', '2026-10-07')).prot).toBe(162)
    const p = await db.pesos.where('fecha').equals('2026-10-02').first()
    await pesosRepo.borrar(p!.id)
    expect((await objetivosDiaRepo.objetivosDe('2026-10-07', '2026-10-07')).prot).toBe(144)
  })
})
