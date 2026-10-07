import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../shared/db/db'
import * as exercisesRepo from './exercisesRepo'
import * as setsRepo from './setsRepo'
import * as routinesRepo from './routinesRepo'
import * as workoutsRepo from './workoutsRepo'
import { exportarBackup, importarBackup } from '../../../shared/lib/backup'

const seleccion = { tipo: 'catalogo', catalogId: 'appfit:press-banca' } as const
const custom = { tipo: 'personalizado', nombre: 'Mi ejercicio', musculo: 'pecho', equipo: 'bandas' } as const
beforeEach(async () => { await Promise.all(db.tables.map(t => t.clear())) })

describe('identidad, persistencia y compatibilidad del catálogo Gym', () => {
  it('materializa solo el elegido, con catálogo/músculos secundarios y sin cambiar el esquema', async () => {
    const id = await exercisesRepo.resolverSeleccion(seleccion)
    expect(await db.exercises.get(id)).toMatchObject({ catalogId: 'appfit:press-banca', primaryMuscles: ['pecho'], secondaryMuscles: ['triceps', 'hombros'], equipment: ['barra'] })
    expect(await db.exercises.count()).toBe(1)
    expect(db.verno).toBe(7)
  })
  it('dos selecciones simultáneas reutilizan el mismo ejercicio', async () => {
    const [a, b] = await Promise.all([exercisesRepo.resolverSeleccion(seleccion), exercisesRepo.resolverSeleccion(seleccion)])
    expect(a).toBe(b)
    expect(await db.exercises.count()).toBe(1)
  })
  it('seleccionar un antiguo conserva ids, nombre, rutina, pesos, reps y orden', async () => {
    const oldId = await exercisesRepo.obtenerOCrear('PRESS BANCA')
    await routinesRepo.guardar({ nombre: 'Antigua', exerciseIds: [oldId] })
    const workout = await workoutsRepo.empezar()
    const setId = await setsRepo.agregar(workout, oldId)
    await setsRepo.actualizar(setId, { reps: 6, peso: 90 })
    const before = await exportarBackup()
    expect(await exercisesRepo.resolverSeleccion(seleccion)).toBe(oldId)
    const after = await exportarBackup()
    expect(after.routines).toEqual(before.routines)
    expect(after.sets).toEqual(before.sets)
    expect(after.workouts).toEqual(before.workouts)
    expect(after.exercises[0].nombre).toBe('PRESS BANCA')
    expect(await exercisesRepo.resolverSeleccion({ tipo: 'local', id: oldId })).toBe(oldId)
  })
  it('reutiliza un antiguo por alias exacto sin renombrarlo', async () => {
    const old = await exercisesRepo.obtenerOCrear('Bench press')
    expect(await exercisesRepo.resolverSeleccion(seleccion)).toBe(old)
    expect((await db.exercises.get(old))?.nombre).toBe('Bench press')
  })
  it('un parecido sigue separado y los personalizados no se convierten', async () => {
    const old = await exercisesRepo.obtenerOCrear('Press banca mío')
    expect(await exercisesRepo.resolverSeleccion(seleccion)).not.toBe(old)
    const id = await exercisesRepo.resolverSeleccion({ ...custom, nombre: 'Curl con barra' })
    await expect(exercisesRepo.resolverSeleccion({ tipo: 'catalogo', catalogId: 'appfit:curl-barra' })).rejects.toThrow('personalizado')
    expect(await db.exercises.get(id)).not.toHaveProperty('catalogId')
  })
  it('personalizado disponible, campos validados y duplicados no sobreescriben', async () => {
    const id = await exercisesRepo.resolverSeleccion(custom)
    const before = await db.exercises.get(id)
    await expect(exercisesRepo.resolverSeleccion({ ...custom, nombre: ' MI EJERCICIO ' })).rejects.toThrow('Ya tienes')
    await expect(exercisesRepo.resolverSeleccion({ ...custom, nombre: ' ' })).rejects.toThrow('Completa')
    expect(await db.exercises.get(id)).toEqual(before)
    expect(before).toMatchObject({ primaryMuscles: ['pecho'], equipment: ['bandas'], secondaryMuscles: [] })
  })
  it('nueva selección en sesión reutiliza valores históricos y orden', async () => {
    const workout = await workoutsRepo.empezar()
    const first = await setsRepo.agregarSeleccion(workout, seleccion)
    await setsRepo.actualizar(first, { reps: 5, peso: 85 })
    const second = await setsRepo.agregarSeleccion(workout, seleccion)
    expect(await db.sets.get(second)).toMatchObject({ orden: 1, reps: 5, peso: 85 })
  })
  it('fallo de la primera serie revierte también creación del personalizado', async () => {
    const spy = vi.spyOn(db.sets, 'add').mockRejectedValueOnce(new Error('fallo'))
    await expect(setsRepo.agregarSeleccion(1, custom)).rejects.toThrow('fallo')
    spy.mockRestore()
    expect(await db.exercises.count()).toBe(0)
    expect(await db.sets.count()).toBe(0)
  })
  it('rechaza ids que ya no existen sin crear datos', async () => {
    await expect(exercisesRepo.resolverSeleccion({ tipo: 'local', id: 999 })).rejects.toThrow('disponible')
    await expect(exercisesRepo.resolverSeleccion({ tipo: 'catalogo', catalogId: 'no-existe' })).rejects.toThrow('disponible')
    expect(await db.exercises.count()).toBe(0)
  })
  it('backup v2 conserva personalizados y vínculos del catálogo en round trip', async () => {
    const ids = [await exercisesRepo.resolverSeleccion(seleccion), await exercisesRepo.resolverSeleccion(custom), await exercisesRepo.obtenerOCrear('Antiguo')]
    await routinesRepo.guardar({ nombre: 'Mixta', exerciseIds: ids })
    const original = await exportarBackup()
    await importarBackup(JSON.stringify(original))
    const restored = await exportarBackup()
    expect(restored.exercises).toEqual(original.exercises)
    expect(restored.routines).toEqual(original.routines)
    expect(restored.version).toBe(3)
  })
})
