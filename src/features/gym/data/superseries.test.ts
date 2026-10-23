import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import { exportarBackup, importarBackup } from '../../../shared/lib/backup'
import { superseriesDe } from '../lib/superseries'
import * as rutinas from './routinesRepo'
import * as repo from './workoutsRepo'

beforeEach(async () => { await Promise.all(db.tables.map(t => t.clear())) })

async function preparar() {
  await db.exercises.bulkPut([
    { id: 1, nombre: 'Press banca', nombreNorm: 'press banca', grupo: 'Pecho', primaryMuscles: ['pecho'], equipment: ['barra'] },
    { id: 2, nombre: 'Remo', nombreNorm: 'remo', grupo: 'Espalda', primaryMuscles: ['espalda'], equipment: ['barra'] },
    { id: 3, nombre: 'Press con mancuernas', nombreNorm: 'press con mancuernas', grupo: 'Pecho', primaryMuscles: ['pecho'], equipment: ['mancuernas'] },
  ])
  return rutinas.guardar({ nombre: 'Torso', exerciseIds: [1, 2, 3], objetivos: { 1: { series: 2, repsMin: 6, repsMax: 10 }, 2: { series: 2, repsMin: 8, repsMax: 12 } }, superseries: [[1, 2], [2, 3], [3, 1]] })
}

describe('superseries en la rutina y en la sesión (A21)', () => {
  it('la rutina guarda solo los pares que valen; sin ninguno, el campo se quita', async () => {
    const id = await preparar()
    expect(superseriesDe(await db.routines.get(id))).toEqual([[1, 2]])
    await rutinas.guardar({ id, nombre: 'Torso', exerciseIds: [2, 1, 3], superseries: [[1, 2]] })
    expect('superseries' in (await db.routines.get(id))!).toBe(false)
    // Guardar sin tocarlas (p. ej. desde otra pantalla) no las borra.
    await rutinas.guardar({ id, nombre: 'Torso', exerciseIds: [1, 2, 3], superseries: [[1, 2]] })
    await rutinas.guardar({ id, nombre: 'Torso B', exerciseIds: [1, 2, 3] })
    expect(superseriesDe(await db.routines.get(id))).toEqual([[1, 2]])
  })

  it('pasan de la rutina a la sesión, se cambian solo en la sesión y viajan en la copia', async () => {
    const rutina = await preparar()
    const w = await repo.empezar(rutina)
    expect(superseriesDe(await db.workouts.get(w))).toEqual([[1, 2]])
    await repo.guardarSuperseries(w, [])
    expect('superseries' in (await db.workouts.get(w))!).toBe(false)
    expect(superseriesDe(await db.routines.get(rutina))).toEqual([[1, 2]])
    await repo.guardarSuperseries(w, [[2, 3]])
    const copia = await exportarBackup()
    await Promise.all(db.tables.map(t => t.clear()))
    await importarBackup(JSON.stringify(copia))
    expect(superseriesDe(await db.workouts.get(w))).toEqual([[2, 3]])
  })

  it('sustituir pone al nuevo en el sitio del par; deshacer lo devuelve', async () => {
    const rutina = await preparar()
    const w = await repo.empezar(rutina)
    const c = await repo.sustituirEnSesion(w, 1, { tipo: 'local', id: 3 })
    expect(superseriesDe(await db.workouts.get(w))).toEqual([[3, 2]])
    await repo.deshacerSustitucion(c)
    expect(superseriesDe(await db.workouts.get(w))).toEqual([[1, 2]])
  })

  it('repetir un entreno conserva sus superseries; un entreno terminado no se cambia', async () => {
    const rutina = await preparar()
    const w = await repo.empezar(rutina)
    await db.sets.where('workoutId').equals(w).modify({ realizada: true })
    await db.workouts.update(w, { fin: Date.now() })
    await expect(repo.guardarSuperseries(w, [])).rejects.toThrow()
    const otro = await repo.repetir(w)
    expect(superseriesDe(await db.workouts.get(otro))).toEqual([[1, 2]])
  })
})
