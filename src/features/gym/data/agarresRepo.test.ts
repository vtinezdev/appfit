import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../shared/db/db'
import * as exercisesRepo from './exercisesRepo'
import * as routinesRepo from './routinesRepo'
import * as workoutsRepo from './workoutsRepo'
import * as setsRepo from './setsRepo'
import { exportarBackup, importarBackup } from '../../../shared/lib/backup'
import { generarPlan } from '../lib/creadorRutinas'
const seleccion = { tipo: 'catalogo', catalogId: 'appfit:jalon-pecho' } as const
const prono = { orientacion: 'prono', anchura: 'ancho', accesorio: 'barra' } as const
const supino = { orientacion: 'supino', anchura: 'medio', accesorio: 'barra' } as const
beforeEach(async () => { await Promise.all(db.tables.map(t => t.clear())) })

describe('agarres por selección, rutina y sesión', () => {
  it('elige el agarre antes de la primera serie y solo precarga valores de esa variante', async () => {
    const id = await exercisesRepo.resolverSeleccion(seleccion)
    const antiguo = await workoutsRepo.empezar()
    const anterior = await setsRepo.agregarSeleccion(antiguo, { ...seleccion, agarre: supino })
    await setsRepo.actualizar(anterior, { reps: 12, peso: 65 })
    await setsRepo.confirmar(anterior, true)
    await db.workouts.update(antiguo, { fin: Date.now() })
    const captura = await db.sets.get(anterior)
    const nuevo = await workoutsRepo.empezar()
    const a = await setsRepo.agregarSeleccion(nuevo, { ...seleccion, agarre: prono })
    expect(await db.sets.get(a)).toMatchObject({ exerciseId: id, agarre: prono, reps: 8, peso: 20 })
    const b = await setsRepo.agregarSeleccion(nuevo, { ...seleccion, agarre: supino })
    expect(await db.sets.get(b)).toMatchObject({ agarre: supino, reps: 12, peso: 65, orden: 1 })
    expect((await db.sets.get(a))?.agarre).toEqual(prono)
    expect(await db.sets.get(anterior)).toEqual(captura)
    expect((await db.exercises.get(id))?.ejecucionHabitual).toBeUndefined()
  })
  it('dos rutinas conservan agarres independientes y el habitual no cambia', async () => {
    const id = await exercisesRepo.resolverSeleccion(seleccion)
    const habitual = { ejecucion: 'bilateral' as const, agarre: { orientacion: 'neutro' as const } }
    await db.exercises.update(id, { ejecucionHabitual: habitual })
    const objetivo = { [id]: { series: 2, repsMin: 8, repsMax: 10 } }
    const ra = await routinesRepo.guardar({ nombre: 'A', exerciseIds: [id], agarres: { [id]: prono }, objetivos: objetivo })
    const rb = await routinesRepo.guardar({ nombre: 'B', exerciseIds: [id], agarres: { [id]: supino } })
    const wa = await workoutsRepo.empezar(ra)
    expect((await setsRepo.delWorkout(wa)).map(s => s.agarre)).toEqual([prono, prono])
    await db.workouts.update(wa, { fin: Date.now() })
    const wb = await workoutsRepo.empezar(rb)
    expect((await db.workouts.get(wb))?.ejecucionesEjercicios?.[id].agarre).toEqual(supino)
    const sb = await setsRepo.agregar(wb, id)
    expect((await db.sets.get(sb))?.agarre).toEqual(supino)
    expect((await routinesRepo.obtener(ra))?.agarres?.[id]).toEqual(prono)
    expect((await db.exercises.get(id))?.ejecucionHabitual).toEqual(habitual)
  })
  it('sin especificar anula el habitual para esa rutina, también sin series objetivo', async () => {
    const id = await exercisesRepo.resolverSeleccion(seleccion)
    await db.exercises.update(id, { ejecucionHabitual: { ejecucion: 'lados', agarre: prono } })
    const r = await routinesRepo.guardar({ nombre: 'Sin agarre', exerciseIds: [id], agarres: { [id]: null } })
    const w = await workoutsRepo.empezar(r)
    const s = await setsRepo.agregar(w, id)
    expect(await db.sets.get(s)).toMatchObject({ ejecucion: 'lados' })
    expect((await db.sets.get(s))?.agarre).toBeUndefined()
    expect((await db.exercises.get(id))?.ejecucionHabitual?.agarre).toEqual(prono)
  })
  it('la rutina fija bilateral o unilateral; precarga de la última vez con esa ejecución y no toca el habitual', async () => {
    const id = await exercisesRepo.resolverSeleccion({ tipo: 'catalogo', catalogId: 'appfit:remo-mancuerna' })
    const objetivo = { [id]: { series: 1, repsMin: 8, repsMax: 10 } }
    const terminar = (w: number) => db.workouts.update(w, { fin: Date.now() })
    // Historial: una sesión por lados con 22 kg y, después, una bilateral con 30 kg.
    const w1 = await workoutsRepo.empezar()
    await workoutsRepo.configurarEjecucion(w1, id, { ejecucion: 'lados' }, false)
    const s1 = await setsRepo.agregar(w1, id)
    await setsRepo.actualizar(s1, { lados: { izquierda: { reps: 10, peso: 22 }, derecha: { reps: 9, peso: 22 } } })
    await setsRepo.confirmar(s1, true)
    await terminar(w1)
    const w2 = await workoutsRepo.empezar()
    await workoutsRepo.configurarEjecucion(w2, id, { ejecucion: 'bilateral' }, false)
    const s2 = await setsRepo.agregar(w2, id)
    await setsRepo.actualizar(s2, { reps: 8, peso: 30 })
    await setsRepo.confirmar(s2, true)
    await terminar(w2)

    const uni = await routinesRepo.guardar({ nombre: 'Uni', exerciseIds: [id], objetivos: objetivo, ejecuciones: { [id]: 'lados' } })
    const wu = await workoutsRepo.empezar(uni)
    expect((await db.workouts.get(wu))?.ejecucionesEjercicios?.[id]).toEqual({ ejecucion: 'lados' })
    expect(await setsRepo.delWorkout(wu)).toMatchObject([{ ejecucion: 'lados', lados: { izquierda: { reps: 10, peso: 22 }, derecha: { reps: 9, peso: 22 } } }])
    expect((await db.sets.get(await setsRepo.agregar(wu, id)))?.ejecucion).toBe('lados')
    await terminar(wu)

    const bi = await routinesRepo.guardar({ nombre: 'Bi', exerciseIds: [id], objetivos: objetivo, ejecuciones: { [id]: 'bilateral' } })
    const wb = await workoutsRepo.empezar(bi)
    const [sb] = await setsRepo.delWorkout(wb)
    expect(sb).toMatchObject({ reps: 8, peso: 30 })
    expect(sb.ejecucion).toBeUndefined()
    expect((await db.exercises.get(id))?.ejecucionHabitual).toBeUndefined()
  })
  it('una ejecución que nunca se hizo así empieza vacía; guardar filtra y valida las ejecuciones', async () => {
    const id = await exercisesRepo.resolverSeleccion(seleccion)
    const w1 = await workoutsRepo.empezar()
    await setsRepo.actualizar(await setsRepo.agregar(w1, id), { reps: 8, peso: 50 })
    await db.workouts.update(w1, { fin: Date.now() })
    const objetivos = { [id]: { series: 1, repsMin: 8, repsMax: 10 } }
    const r = await routinesRepo.guardar({ nombre: 'Uni', exerciseIds: [id], objetivos, ejecuciones: { [id]: 'lados', 999: 'lados' } })
    expect((await routinesRepo.obtener(r))?.ejecuciones).toEqual({ [id]: 'lados' })
    await routinesRepo.guardar({ id: r, nombre: 'Renombrada', exerciseIds: [id], objetivos })
    expect((await routinesRepo.obtener(r))?.ejecuciones).toEqual({ [id]: 'lados' })
    const [s] = await setsRepo.delWorkout(await workoutsRepo.empezar(r))
    expect(s).toMatchObject({ ejecucion: 'lados', reps: 0, peso: 0 })
    await expect(routinesRepo.guardar({ nombre: 'Mala', exerciseIds: [id], ejecuciones: { [id]: 'unilateral' as never } })).rejects.toThrow()
  })
  it('guardar y sustituir limpia agarres de ejercicios retirados sin heredarlos al movimiento nuevo', async () => {
    const id = await exercisesRepo.resolverSeleccion(seleccion)
    const otro = await exercisesRepo.resolverSeleccion({ tipo: 'catalogo', catalogId: 'appfit:remo-barra' })
    const r = await routinesRepo.guardar({ nombre: 'Mi rutina', exerciseIds: [id], agarres: { [id]: prono, [otro]: supino } })
    expect((await routinesRepo.obtener(r))?.agarres).toEqual({ [id]: prono })
    await routinesRepo.guardar({ id: r, nombre: 'Renombrada', exerciseIds: [id] })
    expect((await routinesRepo.obtener(r))?.agarres).toEqual({ [id]: prono })
    const agarreRemo = { orientacion: 'supino' as const, anchura: 'medio' as const }
    const antes = await routinesRepo.sustituirEjercicio(r, id, { tipo: 'local', id: otro, agarre: agarreRemo })
    expect(antes.agarres).toEqual({ [id]: prono })
    expect((await routinesRepo.obtener(r))?.agarres).toEqual({ [otro]: agarreRemo })
  })
  it('el asistente conserva el agarre elegido al cambiar un ejercicio en su plan', async () => {
    const plan = generarPlan({ dias: 4, duracion: 60, material: 'gimnasio', objetivo: 'hipertrofia', prioridad: [] }, 0)
    const elegido = plan.dias.flatMap(d => d.ejercicios).find(e => e.catalogId === 'appfit:press-banca')!
    expect(elegido).toBeDefined()
    elegido.seleccion = { tipo: 'catalogo', catalogId: 'appfit:press-banca', agarre: { orientacion: 'prono', anchura: 'medio' } }
    const ids = await routinesRepo.guardarPlan(plan)
    const press = (await db.exercises.toArray()).find(e => e.catalogId === 'appfit:press-banca')!
    expect((await Promise.all(ids.map(id => routinesRepo.obtener(id)))).some(r => r?.agarres?.[press.id]?.anchura === 'medio')).toBe(true)
  })
  it('un fallo al añadir la serie revierte el ejercicio y la configuración de sesión', async () => {
    const w = await workoutsRepo.empezar()
    const antes = await db.workouts.get(w)
    const spy = vi.spyOn(db.sets, 'add').mockRejectedValueOnce(new Error('fallo'))
    await expect(setsRepo.agregarSeleccion(w, { ...seleccion, agarre: prono })).rejects.toThrow('fallo')
    spy.mockRestore()
    expect(await db.workouts.get(w)).toEqual(antes)
    expect(await db.exercises.count()).toBe(0)
    expect(await db.sets.count()).toBe(0)
  })
  it('rechaza una elección incompatible y el backup conserva nuevas opciones y valores sin especificar', async () => {
    await expect(exercisesRepo.resolverSeleccion({ ...seleccion, agarre: { accesorio: 'cuerda', orientacion: 'supino' } })).rejects.toThrow('compatible')
    expect(await db.exercises.count()).toBe(0)
    const id = await exercisesRepo.resolverSeleccion(seleccion)
    const r = await routinesRepo.guardar({ nombre: 'Agarres', exerciseIds: [id], agarres: { [id]: null } })
    const w = await workoutsRepo.empezar(r)
    await setsRepo.agregarSeleccion(w, { ...seleccion, agarre: { accesorio: 'barra-v', orientacion: 'neutro', anchura: 'estrecho' } })
    const before = await exportarBackup()
    await importarBackup(JSON.stringify(before))
    const after = await exportarBackup()
    expect(after.routines).toEqual(before.routines)
    expect(after.workouts).toEqual(before.workouts)
    expect(after.sets).toEqual(before.sets)
    expect(after.version).toBe(3)
    expect(db.verno).toBe(15)
  })
})
