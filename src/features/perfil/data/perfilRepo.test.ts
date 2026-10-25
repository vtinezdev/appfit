import { beforeEach, describe, expect, it, vi } from 'vitest'
import backupV1 from '../../../test/fixtures/backup-v1.json?raw'
import { db } from '../../../shared/db/db'
import { DEFAULT_OBJETIVOS, ensureSettings } from '../../../shared/db/settings'
import { borrarTodosLosDatos, exportarBackup, importarBackup } from '../../../shared/lib/backup'
import * as pesosRepo from '../../inicio/data/pesosRepo'
import * as perfilRepo from './perfilRepo'

const HOY = '2026-10-06'
const COMPLETO = { sexo: 'hombre', fechaNacimiento: '1996-10-06', alturaCm: 180, actividad: 'moderado', objetivo: 'definicion' } as const

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('guardado del perfil', () => {
  it('guarda por partes y fusiona con lo anterior', async () => {
    await perfilRepo.guardarPerfil({ sexo: 'mujer' })
    await perfilRepo.guardarPerfil({ alturaCm: 165.04 })
    expect(await perfilRepo.getPerfil()).toEqual({ sexo: 'mujer', alturaCm: 165 })
    expect((await db.settings.get(1))?.objetivos).toEqual(DEFAULT_OBJETIVOS)
  })
  it('un campo undefined en el parche lo borra y un perfil vacío se elimina de settings', async () => {
    await perfilRepo.guardarPerfil({ sexo: 'mujer', alturaCm: 170 })
    await perfilRepo.guardarPerfil({ alturaCm: undefined })
    expect(await perfilRepo.getPerfil()).toEqual({ sexo: 'mujer' })
    await perfilRepo.guardarPerfil({ sexo: undefined })
    expect((await db.settings.get(1))).not.toHaveProperty('perfil')
  })
  it('descarta valores inválidos en el guardado', async () => {
    await perfilRepo.guardarPerfil({ alturaCm: 1.8, sexo: 'hombre' })
    expect(await perfilRepo.getPerfil()).toEqual({ sexo: 'hombre' })
  })
  it('borrar devuelve lo anterior, no toca los pesajes y se puede restaurar', async () => {
    await pesosRepo.registrar('2026-10-01', 80)
    await perfilRepo.guardarPerfil(COMPLETO)
    const anterior = await perfilRepo.borrarPerfil()
    expect(anterior).toEqual(COMPLETO)
    expect(await perfilRepo.getPerfil()).toEqual({})
    expect(await db.pesos.count()).toBe(1)
    await perfilRepo.restaurarPerfil(anterior)
    expect(await perfilRepo.getPerfil()).toEqual(COMPLETO)
  })
  it('un perfil corrupto guardado se sanea al leer sin escribir', async () => {
    await db.settings.put({ id: 1, objetivos: DEFAULT_OBJETIVOS, perfil: { sexo: 'x', alturaCm: 'mucha', actividad: 'activo' } } as never)
    const antes = await db.settings.get(1)
    expect(await perfilRepo.getPerfil()).toEqual({ actividad: 'activo' })
    expect(await db.settings.get(1)).toEqual(antes)
  })
})

describe('lecturas', () => {
  it('no escriben nada (instalación vacía)', async () => {
    const put = vi.spyOn(db.settings, 'put')
    await perfilRepo.getPerfil()
    await perfilRepo.estadoEnergetico(HOY)
    await perfilRepo.objetivosVigentes(HOY)
    expect(put).not.toHaveBeenCalled()
    expect(await db.settings.count()).toBe(0)
    expect(await db.pesos.count()).toBe(0)
    put.mockRestore()
  })
  it('usa el último pesaje ≤ hoy e ignora los futuros', async () => {
    await pesosRepo.registrar('2026-09-01', 82)
    await pesosRepo.registrar('2026-10-05', 80)
    await pesosRepo.registrar('2026-10-20', 70)
    await perfilRepo.guardarPerfil(COMPLETO)
    const e = await perfilRepo.estadoEnergetico(HOY)
    expect(e.peso).toMatchObject({ fecha: '2026-10-05', kg: 80 })
    expect(e.energia.estado).toBe('ok')
    expect(await pesosRepo.ultimoHasta('2026-08-01')).toBeUndefined()
  })
  it('sin pesaje el perfil queda incompleto y mandan los objetivos manuales', async () => {
    await perfilRepo.guardarPerfil(COMPLETO)
    expect((await perfilRepo.estadoEnergetico(HOY)).energia).toEqual({ estado: 'incompleto', faltan: ['peso'] })
    expect(await perfilRepo.objetivosVigentes(HOY)).toEqual({ ...DEFAULT_OBJETIVOS, origen: 'manual' })
  })
  it('con perfil y peso mandan los del perfil y un pesaje nuevo los cambia al instante', async () => {
    await perfilRepo.guardarPerfil(COMPLETO)
    await pesosRepo.registrar('2026-10-05', 80)
    const a = await perfilRepo.objetivosVigentes(HOY)
    expect(a.origen).toBe('perfil')
    await pesosRepo.registrar('2026-10-06', 90)
    const b = await perfilRepo.objetivosVigentes(HOY)
    expect(b.kcal).toBeGreaterThan(a.kcal)
    // lo guardado en Ajustes no cambia: se deriva al leer
    expect((await db.settings.get(1))?.objetivos).toEqual(DEFAULT_OBJETIVOS)
  })
})

describe('backup y borrado con perfil', () => {
  it('el perfil viaja en el backup y se restaura', async () => {
    await perfilRepo.guardarPerfil(COMPLETO)
    const copia = JSON.stringify(await exportarBackup())
    await Promise.all(db.tables.map((t) => t.clear()))
    await importarBackup(copia)
    expect(await perfilRepo.getPerfil()).toEqual(COMPLETO)
  })
  it('un backup antiguo (v1) importa sin perfil', async () => {
    await importarBackup(backupV1)
    expect(await perfilRepo.getPerfil()).toEqual({})
    expect((await db.settings.get(1))).not.toHaveProperty('perfil')
  })
  it('«borrar todos los datos» elimina el perfil', async () => {
    await perfilRepo.guardarPerfil(COMPLETO)
    await borrarTodosLosDatos()
    await ensureSettings()
    expect(await perfilRepo.getPerfil()).toEqual({})
  })
})
