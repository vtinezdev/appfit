import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import { normalizeName } from '../../../shared/lib/text'
import { cambiarEjercicio, generarPlan, type RespuestasCreador } from '../lib/creadorRutinas'
import * as routinesRepo from './routinesRepo'
import * as workoutsRepo from './workoutsRepo'

const respuestas: RespuestasCreador = { dias: 2, duracion: 45, material: 'gimnasio', objetivo: 'fuerza', prioridad: [] }

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('routinesRepo.guardarPlan', () => {
  it('guarda una rutina normal por día, con sus ejercicios del catálogo y sus objetivos', async () => {
    const plan = generarPlan(respuestas, 0)
    const ids = await routinesRepo.guardarPlan(plan)
    expect(ids).toHaveLength(2)
    const rutinas = await routinesRepo.listar()
    expect(rutinas.map((r) => r.nombre)).toEqual(['Cuerpo completo A', 'Cuerpo completo B'])
    const ejercicios = new Map((await db.exercises.toArray()).map((e) => [e.id, e]))
    for (const [i, r] of rutinas.entries()) {
      expect(r.exerciseIds.map((id) => ejercicios.get(id)?.catalogId)).toEqual(plan.dias[i].ejercicios.map((e) => e.catalogId))
      expect(r.exerciseIds.map((id) => r.objetivos?.[id])).toEqual(plan.dias[i].ejercicios.map((e) => e.objetivo))
    }
  })

  it('reutiliza los ejercicios ya guardados y da un nombre libre si ya existe la rutina', async () => {
    const banca = await db.exercises.add({ nombre: 'Press banca', nombreNorm: normalizeName('Press banca'), grupo: 'Pecho', catalogId: 'appfit:press-banca' })
    await routinesRepo.guardar({ nombre: 'Cuerpo completo A', exerciseIds: [] })
    const plan = cambiarEjercicio(generarPlan(respuestas, 0), 0, 1, { seleccion: { tipo: 'local', id: banca }, nombre: 'Press banca' }, 'fuerza')
    await routinesRepo.guardarPlan(plan)
    const nueva = (await routinesRepo.listar()).find((r) => r.nombre === 'Cuerpo completo A (2)')!
    expect(nueva.exerciseIds).toContain(banca)
    expect((await db.exercises.toArray()).filter((e) => e.catalogId === 'appfit:press-banca')).toHaveLength(1)
  })

  it('un ejercicio repetido en la rutina se guarda una vez', async () => {
    const plan = generarPlan(respuestas, 0)
    const primero = plan.dias[0].ejercicios[0]
    const conRepetido = cambiarEjercicio(plan, 0, 1, { seleccion: primero.seleccion, nombre: primero.nombre, catalogId: primero.catalogId }, 'fuerza')
    await routinesRepo.guardarPlan(conRepetido)
    const r = (await routinesRepo.listar())[0]
    expect(r.exerciseIds).toHaveLength(plan.dias[0].ejercicios.length - 1)
  })

  it('un fallo no deja nada a medias', async () => {
    const plan = cambiarEjercicio(generarPlan(respuestas, 0), 1, 0, { seleccion: { tipo: 'catalogo', catalogId: 'appfit:no-existe' }, nombre: 'No existe' }, 'fuerza')
    await expect(routinesRepo.guardarPlan(plan)).rejects.toThrow()
    expect(await db.routines.count()).toBe(0)
    expect(await db.exercises.count()).toBe(0)
  })

  it('un entreno desde una rutina generada empieza con las series objetivo', async () => {
    const plan = generarPlan(respuestas, 0)
    const [id] = await routinesRepo.guardarPlan(plan)
    const workoutId = await workoutsRepo.empezar(id)
    const series = await db.sets.where('workoutId').equals(workoutId).toArray()
    expect(series.length).toBe(plan.dias[0].ejercicios.reduce((n, e) => n + e.objetivo.series, 0))
  })
})
