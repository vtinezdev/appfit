import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../shared/db/db'
import * as exercisesRepo from './exercisesRepo'
import * as routinesRepo from './routinesRepo'
import * as setsRepo from './setsRepo'
import * as workoutsRepo from './workoutsRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('exercisesRepo.obtenerOCrear', () => {
  it('crea el ejercicio si no existe', async () => {
    const id = await exercisesRepo.obtenerOCrear('  Press banca ')
    expect(await db.exercises.get(id)).toMatchObject({ nombre: 'Press banca', grupo: 'General' })
  })

  it('devuelve el existente comparando el nombre normalizado', async () => {
    const id = await exercisesRepo.obtenerOCrear('Press banca')
    expect(await exercisesRepo.obtenerOCrear('press BANCA')).toBe(id)
    expect(await db.exercises.count()).toBe(1)
  })

  it('dos llamadas simultáneas con el mismo nombre crean un solo ejercicio', async () => {
    const [a, b] = await Promise.all([exercisesRepo.obtenerOCrear('Remo'), exercisesRepo.obtenerOCrear('remo')])
    expect(a).toBe(b)
    expect(await db.exercises.count()).toBe(1)
  })
})

describe('routinesRepo', () => {
  it('guardar crea y después actualiza la misma rutina', async () => {
    const id = await routinesRepo.guardar({ nombre: 'Pierna', exerciseIds: [1] })
    expect(await routinesRepo.guardar({ id, nombre: 'Pierna A', exerciseIds: [1, 2] })).toBe(id)
    expect(await routinesRepo.listar()).toEqual([{ id, nombre: 'Pierna A', exerciseIds: [1, 2] }])
  })

  it('borrar elimina la rutina', async () => {
    const id = await routinesRepo.guardar({ nombre: 'Pierna', exerciseIds: [] })
    await routinesRepo.borrar(id)
    expect(await routinesRepo.obtener(id)).toBeUndefined()
  })
})

describe('workoutsRepo', () => {
  it('empezar crea un entreno activo, con rutina opcional', async () => {
    const id = await workoutsRepo.empezar(7)
    expect(await workoutsRepo.activo()).toMatchObject({ id, routineId: 7 })
  })

  it('empezar sin rutina no guarda routineId', async () => {
    const id = await workoutsRepo.empezar()
    expect(await db.workouts.get(id)).not.toHaveProperty('routineId')
  })

  it('un doble toque no crea dos entrenos activos', async () => {
    const [a, b] = await Promise.all([workoutsRepo.empezar(), workoutsRepo.empezar()])
    expect(a).toBe(b)
    expect(await db.workouts.count()).toBe(1)
  })

  it('con un entreno en curso, empezar devuelve ese', async () => {
    const id = await workoutsRepo.empezar()
    expect(await workoutsRepo.empezar(3)).toBe(id)
    expect(await db.workouts.count()).toBe(1)
  })

  it('terminar cierra el entreno y permite empezar otro', async () => {
    const id = await workoutsRepo.empezar()
    await workoutsRepo.terminar(id)
    expect(await workoutsRepo.activo()).toBeUndefined()
    expect(await workoutsRepo.terminados()).toHaveLength(1)
    expect(await workoutsRepo.empezar()).not.toBe(id)
  })
})

describe('workoutsRepo.terminados', () => {
  it('devuelve los terminados del más reciente al más antiguo, sin el activo', async () => {
    await db.workouts.bulkAdd([{ id: 1, inicio: 100, fin: 200 }, { id: 2, inicio: 300, fin: 400 }, { id: 3, inicio: 50, fin: 90 }, { id: 4, inicio: 500 }])
    expect((await workoutsRepo.terminados()).map(w => w.id)).toEqual([2, 1, 3])
  })
})

describe('setsRepo', () => {
  async function preparar() {
    const workoutId = await workoutsRepo.empezar()
    const exerciseId = await exercisesRepo.obtenerOCrear('Sentadilla')
    return { workoutId, exerciseId }
  }

  it('la primera serie usa 8 × 20 kg y orden 0', async () => {
    const { workoutId, exerciseId } = await preparar()
    const id = await setsRepo.agregar(workoutId, exerciseId)
    expect(await db.sets.get(id)).toMatchObject({ workoutId, exerciseId, orden: 0, reps: 8, peso: 20 })
  })

  it('una serie nueva repite la última del ejercicio, también de entrenos anteriores', async () => {
    const { workoutId, exerciseId } = await preparar()
    const id = await setsRepo.agregar(workoutId, exerciseId)
    await setsRepo.actualizar(id, { reps: 5, peso: 100 })
    await workoutsRepo.terminar(workoutId)
    const otro = await workoutsRepo.empezar()
    const nueva = await setsRepo.agregar(otro, exerciseId)
    expect(await db.sets.get(nueva)).toMatchObject({ workoutId: otro, orden: 0, reps: 5, peso: 100 })
  })

  it('dos toques seguidos dan dos series con orden distinto', async () => {
    const { workoutId, exerciseId } = await preparar()
    await Promise.all([setsRepo.agregar(workoutId, exerciseId), setsRepo.agregar(workoutId, exerciseId)])
    const ordenes = (await setsRepo.delWorkout(workoutId)).map((s) => s.orden).sort()
    expect(ordenes).toEqual([0, 1])
  })

  it('tras borrar una serie intermedia, la siguiente no repite orden', async () => {
    const { workoutId, exerciseId } = await preparar()
    await setsRepo.agregar(workoutId, exerciseId)
    const segunda = await setsRepo.agregar(workoutId, exerciseId)
    await setsRepo.agregar(workoutId, exerciseId)
    await setsRepo.borrar(segunda)
    await setsRepo.agregar(workoutId, exerciseId)
    const ordenes = (await setsRepo.delWorkout(workoutId)).map((s) => s.orden).sort()
    expect(ordenes).toEqual([0, 2, 3])
  })

  it('agregarConEjercicio crea el ejercicio y su primera serie', async () => {
    const workoutId = await workoutsRepo.empezar()
    const id = await setsRepo.agregarConEjercicio(workoutId, 'Dominadas')
    const set = await db.sets.get(id)
    expect((await db.exercises.get(set!.exerciseId))?.nombre).toBe('Dominadas')
  })

  it('agregarConEjercicio reutiliza el ejercicio si ya existe', async () => {
    const { workoutId, exerciseId } = await preparar()
    const id = await setsRepo.agregarConEjercicio(workoutId, 'sentadilla')
    expect((await db.sets.get(id))?.exerciseId).toBe(exerciseId)
    expect(await db.exercises.count()).toBe(1)
  })

  it('borrar devuelve la serie y restaurar la recupera con el mismo id', async () => {
    const { workoutId, exerciseId } = await preparar()
    const id = await setsRepo.agregar(workoutId, exerciseId)
    const original = await db.sets.get(id)
    const borrada = await setsRepo.borrar(id)
    expect(borrada).toEqual(original)
    expect(await db.sets.get(id)).toBeUndefined()
    await setsRepo.restaurar([borrada!])
    expect(await db.sets.get(id)).toEqual(original)
  })

  it('borrar una serie que no existe devuelve undefined', async () => {
    expect(await setsRepo.borrar(999)).toBeUndefined()
  })
})

describe('entrenos: descartar, pasado, edición', () => {
  it('descartar borra el entreno y sus series, y deja empezar otro', async () => {
    const id = await workoutsRepo.empezar()
    const ex = await exercisesRepo.obtenerOCrear('Remo')
    await setsRepo.agregar(id, ex)
    await setsRepo.agregar(id, ex)
    await workoutsRepo.descartar(id)
    expect(await db.workouts.count()).toBe(0)
    expect(await db.sets.count()).toBe(0)
    expect(await workoutsRepo.empezar()).not.toBe(id)
  })

  it('borrar un entreno del historial no toca las series de otros', async () => {
    const a = await workoutsRepo.empezar()
    const ex = await exercisesRepo.obtenerOCrear('Remo')
    await setsRepo.agregar(a, ex)
    await workoutsRepo.terminar(a)
    const b = await workoutsRepo.empezar()
    await setsRepo.agregar(b, ex)
    await workoutsRepo.borrar(a)
    expect((await db.sets.toArray()).map((s) => s.workoutId)).toEqual([b])
  })

  it('crearPasado crea un entreno terminado sin interferir con el activo', async () => {
    const activo = await workoutsRepo.empezar()
    const id = await workoutsRepo.crearPasado({ inicio: 1_000, fin: 4_600_000 })
    expect(await workoutsRepo.activo()).toMatchObject({ id: activo })
    expect(await db.workouts.get(id)).toMatchObject({ inicio: 1_000, fin: 4_600_000 })
    expect((await db.workouts.get(id))?.muscleSnapshot).toBeDefined()
    expect(() => workoutsRepo.crearPasado({ inicio: 10, fin: 10 })).toThrow()
  })

  it('actualizarTiempos y recalcularSnapshot sobre un entreno terminado', async () => {
    const id = await workoutsRepo.crearPasado({ inicio: 1_000, fin: 2_000 })
    await workoutsRepo.actualizarTiempos(id, 500, 9_000)
    expect(await db.workouts.get(id)).toMatchObject({ inicio: 500, fin: 9_000 })
    const ex = await exercisesRepo.resolverSeleccion({ tipo: 'catalogo', catalogId: 'appfit:peso-muerto' })
    await setsRepo.agregar(id, ex, 500)
    await workoutsRepo.recalcularSnapshot(id)
    expect((await db.workouts.get(id))?.muscleSnapshot?.exercises.map((e) => e.exerciseId)).toEqual([ex])
  })

  it('empezar desde una rutina con objetivos crea las series objetivo precargadas', async () => {
    const ex = await exercisesRepo.obtenerOCrear('Press')
    const previo = await workoutsRepo.crearPasado({ inicio: 1, fin: 2 })
    const s = await setsRepo.agregar(previo, ex, 5)
    await setsRepo.actualizar(s, { reps: 6, peso: 50 })
    const rid = await routinesRepo.guardar({ nombre: 'Empuje', exerciseIds: [ex], objetivos: { [ex]: { series: 3, repsMin: 6, repsMax: 10 } } })
    const w = await workoutsRepo.empezar(rid)
    const sets = await setsRepo.delWorkout(w)
    expect(sets.map((x) => [x.reps, x.peso, x.orden])).toEqual([[6, 50, 0], [6, 50, 1], [6, 50, 2]])
  })

  it('una serie de calentamiento no se usa para precargar la siguiente', async () => {
    const w = await workoutsRepo.empezar()
    const ex = await exercisesRepo.obtenerOCrear('Press')
    const a = await setsRepo.agregar(w, ex)
    await setsRepo.actualizar(a, { reps: 5, peso: 80 })
    const cal = await setsRepo.agregar(w, ex)
    await setsRepo.actualizar(cal, { reps: 12, peso: 20, tipo: 'calentamiento' })
    const nueva = await setsRepo.agregar(w, ex)
    expect(await db.sets.get(nueva)).toMatchObject({ reps: 5, peso: 80 })
  })

  it('notas y orden de ejercicios se guardan; notas vacías las borran', async () => {
    const id = await workoutsRepo.empezar()
    await workoutsRepo.guardarNotas(id, 'Buen día')
    await workoutsRepo.guardarOrden(id, [3, 1])
    expect(await db.workouts.get(id)).toMatchObject({ notas: 'Buen día', ordenEjercicios: [3, 1] })
    await workoutsRepo.guardarNotas(id, '  ')
    expect((await db.workouts.get(id))?.notas).toBeUndefined()
  })
})

describe('ejercicios personalizados', () => {
  it('renombra respetando el nombre único y reclasifica', async () => {
    const a = await exercisesRepo.resolverSeleccion({ tipo: 'personalizado', nombre: 'Mi remo', musculo: 'espalda', equipo: 'polea' })
    await exercisesRepo.resolverSeleccion({ tipo: 'personalizado', nombre: 'Otro', musculo: 'pecho', equipo: 'barra' })
    await expect(exercisesRepo.editarPersonalizado(a, { nombre: 'otro', musculo: 'espalda', equipo: 'polea' })).rejects.toThrow(/Ya tienes/)
    await exercisesRepo.editarPersonalizado(a, { nombre: 'Remo mío', musculo: 'biceps', equipo: 'mancuernas' })
    expect(await db.exercises.get(a)).toMatchObject({ nombre: 'Remo mío', nombreNorm: 'remo mio', grupo: 'Bíceps', primaryMuscles: ['biceps'], equipment: ['mancuernas'] })
  })

  it('no edita ni borra los del catálogo', async () => {
    const c = await exercisesRepo.resolverSeleccion({ tipo: 'catalogo', catalogId: 'appfit:peso-muerto' })
    expect(exercisesRepo.esPersonalizado((await db.exercises.get(c))!)).toBe(false)
    await expect(exercisesRepo.editarPersonalizado(c, { nombre: 'X', musculo: 'pecho', equipo: 'barra' })).rejects.toThrow()
    await expect(exercisesRepo.borrarPersonalizado(c)).rejects.toThrow()
  })

  it('solo borra si no tiene series ni está en rutinas', async () => {
    const a = await exercisesRepo.resolverSeleccion({ tipo: 'personalizado', nombre: 'Mi remo', musculo: 'espalda', equipo: 'polea' })
    const rid = await routinesRepo.guardar({ nombre: 'R', exerciseIds: [a] })
    await expect(exercisesRepo.borrarPersonalizado(a)).rejects.toThrow(/1 rutina/)
    await routinesRepo.guardar({ id: rid, nombre: 'R', exerciseIds: [] })
    const w = await workoutsRepo.empezar()
    await setsRepo.agregar(w, a)
    await expect(exercisesRepo.borrarPersonalizado(a)).rejects.toThrow(/serie registrada/)
    await db.sets.clear()
    const borrado = await exercisesRepo.borrarPersonalizado(a)
    await exercisesRepo.restaurar(borrado)
    expect(await db.exercises.get(a)).toBeDefined()
  })
})
