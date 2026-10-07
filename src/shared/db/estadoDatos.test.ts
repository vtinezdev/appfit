import { beforeEach, describe, expect, it } from 'vitest'
import backupV1 from '../../test/fixtures/backup-v1.json?raw'
import { db, TABLAS_USUARIO } from './db'
import { hayDatosGuardados } from './estadoDatos'
import { ensureSettings, updateSettings } from './settings'

const fixture = JSON.parse(backupV1)
const datos: Record<string, unknown[]> = {
  ...fixture,
  meals: [{ id: 1, nombre: 'Desayuno', items: [], usos: 0, usadoAt: 0, createdAt: 1 }],
  notasMedida: [{ id: 1, texto: 'Un bol son 200 g', createdAt: 1 }],
  pesos: [{ id: 1, fecha: '2026-10-01', kg: 72, createdAt: 1 }],
  nombresAlimentos: [{ id: 'catalog:ciqual:1', nombre: 'Arroz' }],
  porciones: [{ id: 1, ref: 'user:1', nombre: 'rebanada', nombreNorm: 'rebanada', gramos: 30 }],
  recetas: [{ id: 1, nombre: 'Guiso', nombreNorm: 'guiso', ingredientes: [], pesoCocinadoG: 400, foodId: 1, createdAt: 1, updatedAt: 1 }],
  agua: [{ id: 1, fecha: '2026-10-01', ml: 250 }],
  objetivosDia: [{ id: 1, fecha: '2026-10-01', objetivos: { kcal: 2000, prot: 150, carb: 200, grasa: 60 }, origen: 'test' }],
  medidas: [{ id: 1, fecha: '2026-10-01', cintura: 80 }],
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('detección de registros al abrir otro acceso', () => {
  it('una instalación nueva con ajustes por defecto sigue sin registros', async () => {
    expect(await hayDatosGuardados()).toBe(false)
    expect(await db.settings.count()).toBe(0)
    await ensureSettings()
    expect(await hayDatosGuardados()).toBe(false)
    expect(await db.settings.count()).toBe(1)
  })

  it('un catálogo descargado no oculta la ayuda para recuperar datos de Safari', async () => {
    await db.catalogSources.add({ id: 'ciqual', version: '1', importadoAt: 1, licencia: 'Etalab', atribucion: 'ANSES', filas: 1 })
    await db.catalogFoods.add({ id: 'ciqual:1', idExterno: '1', fuente: 'ciqual', nombre: 'Arroz', nombreNorm: 'arroz', tok: ['arroz'], tipo: 'generico', kcal100: 350, prot100: 7, carb100: 78, grasa100: 1, version: '1', importadoAt: 1 })
    expect(await hayDatosGuardados()).toBe(false)
  })

  it.each(TABLAS_USUARIO.filter((t) => t !== 'settings'))('detecta datos solo en %s sin modificarlos', async (tabla) => {
    await db.table(tabla).bulkAdd(datos[tabla])
    const antes = await db.table(tabla).toArray()
    expect(await hayDatosGuardados()).toBe(true)
    expect(await db.table(tabla).toArray()).toEqual(antes)
    expect(await db.settings.count()).toBe(0)
  })

  it('los objetivos personalizados también son datos que hay que conservar', async () => {
    await updateSettings({ objetivos: { kcal: 1800, prot: 140, carb: 180, grasa: 60 } })
    const antes = await db.settings.get(1)
    expect(await hayDatosGuardados()).toBe(true)
    await ensureSettings()
    expect(await db.settings.get(1)).toEqual(antes)
  })

  it('un perfil con algún campo cuenta como dato introducido; uno vacío no', async () => {
    await updateSettings({ perfil: {} })
    expect(await hayDatosGuardados()).toBe(false)
    await updateSettings({ perfil: { sexo: 'mujer' } })
    expect(await hayDatosGuardados()).toBe(true)
  })
})
