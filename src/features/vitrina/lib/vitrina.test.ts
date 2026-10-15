import { describe, expect, it } from 'vitest'
import type { Exercise, SetEntry, Workout } from '../../../shared/db/types'
import { addDays, parseISODate } from '../../../shared/lib/dates'
import { calcularExperiencia } from '../../experiencia/lib/experiencia'
import { ZONAS_MUSCULARES } from '../../gym/lib/musculos'
import { calcularAtlas } from './atlas'
import { calcularLogros, conseguido, logrosDeEntreno, nivelDe, nombreConNivel, recuentoPiezas, siguienteUmbral, UMBRALES } from './logros'
import type { EventoXp } from '../../experiencia/lib/experiencia'
import { calcularCumbres, empezar } from '../../cumbres/lib/cumbres'
import { calcularCaminos } from '../../caminos/lib/caminos'
import { MONTANAS } from '../../cumbres/lib/montanas'
import { describirMarca, muroRecords } from './muro'
import { calcularVitrina } from './vitrina'

let id = 1
/** Ejercicio propio que trabaja una zona como principal (nombre inventado: no casa con el catálogo). */
const ejercicio = (zona: string): Exercise => ({ id: id++, nombre: `Zzz ${zona}`, nombreNorm: `zzz ${zona}`, grupo: zona, primaryMuscles: [zona] })

function entreno(fecha: string, series: { exerciseId: number; peso: number; reps?: number; modoCarga?: SetEntry['modoCarga'] }[], hora = 18) {
  const inicio = parseISODate(fecha).getTime() + hora * 3_600_000
  const workout: Workout = { id: id++, inicio, fin: inicio + 3_600_000 }
  const sets: SetEntry[] = series.map((s, i) => ({ id: id++, workoutId: workout.id, exerciseId: s.exerciseId, orden: i, reps: s.reps ?? 8, peso: s.peso, createdAt: inicio + i, ...(s.modoCarga ? { modoCarga: s.modoCarga } : {}) }))
  return { workout, sets }
}
const seis = (exerciseId: number, peso: number) => Array.from({ length: 6 }, () => ({ exerciseId, peso }))
const porWorkout = (es: ReturnType<typeof entreno>[]) => new Map(es.map((e) => [e.workout.id, e.sets]))

describe('atlas', () => {
  it('semana completa con los 12 grupos y ejercicios dominados con 3 sesiones', () => {
    const ejercicios = ZONAS_MUSCULARES.map(ejercicio)
    const mitad = ejercicios.slice(0, 6).map((e) => ({ exerciseId: e.id, peso: 20 }))
    const resto = ejercicios.slice(6).map((e) => ({ exerciseId: e.id, peso: 20 }))
    const es = [entreno('2026-10-05', mitad), entreno('2026-10-07', resto), entreno('2026-10-12', mitad), entreno('2026-10-14', mitad)]
    const atlas = calcularAtlas(es.map((e) => e.workout), porWorkout(es), ejercicios)
    expect(atlas.semanas[0].completa).toEqual({ workoutId: es[1].workout.id, fecha: '2026-10-07' })
    expect(atlas.semanas[1]).toMatchObject({ completa: null })
    expect(atlas.desdeSiempre.size).toBe(12)
    expect(atlas.dominados.map((d) => d.sesiones)).toEqual([3, 3, 3, 3, 3, 3])
  })
})

describe('muro de récords', () => {
  it('mejor marca vigente con el día en que se logró por primera vez', () => {
    const banca = ejercicio('pecho').id
    const fondos = ejercicio('triceps').id
    const es = [
      entreno('2026-10-01', [{ exerciseId: banca, peso: 80, reps: 5 }, { exerciseId: fondos, peso: 0, reps: 10, modoCarga: 'corporal' }]),
      entreno('2026-10-05', [{ exerciseId: banca, peso: 80, reps: 8 }, { exerciseId: fondos, peso: 0, reps: 14, modoCarga: 'corporal' }]),
    ]
    const muro = muroRecords(es.map((e) => e.workout), es.flatMap((e) => e.sets))
    const b = muro.find((m) => m.exerciseId === banca)!
    expect(b.marcas).toEqual([{ tipo: 'peso', valor: 80, fecha: '2026-10-01' }, { tipo: '1rm', valor: 101.3, fecha: '2026-10-05' }])
    expect(muro.find((m) => m.exerciseId === fondos)!.marcas).toEqual([{ tipo: 'reps', valor: 14, fecha: '2026-10-05' }])
    expect(describirMarca(b.marcas[0], b.modo)).toMatchObject({ nombre: 'Peso máximo', valor: '80 kg' })
  })
})

describe('logros', () => {
  const banca = ejercicio('pecho').id
  /** 10 entrenos (lunes, miércoles y viernes desde el 7 de septiembre), con el peso subiendo. */
  const es = Array.from({ length: 10 }, (_, i) => entreno(addDays('2026-09-07', Math.floor(i / 3) * 7 + (i % 3) * 2), seis(banca, 40 + i), i === 9 ? 7 : 18))
  const experiencia = calcularExperiencia({ hoy: '2026-10-10', workouts: es.map((e) => e.workout), sets: es.flatMap((e) => e.sets), entries: [], protObjetivo: new Map(), conNutricion: false })
  const logros = calcularLogros({ hoy: '2026-10-10', experiencia, atlas: calcularAtlas([], new Map(), []), herbario: [], conNutricion: false })
  const de = (idLogro: string) => logros.find((l) => l.id === idLogro)!

  it('niveles con su fecha real y el progreso hacia el siguiente', () => {
    const entrenos = de('entrenos')
    expect(nivelDe(entrenos)).toBe(1)
    expect(entrenos.niveles[0]).toEqual({ fecha: '2026-09-28', workoutId: es[9].workout.id })
    expect(siguienteUmbral(entrenos)).toBe(50)
    expect(entrenos.descripcion).toBe('50 entrenos de 5 series efectivas o más')
  })

  it('sin nutrición, sus logros no aparecen; los ocultos se cuentan como piezas', () => {
    expect(logros.some((l) => l.grupo === 'nutricion')).toBe(false)
    expect(conseguido(de('madrugador'))).toBe(false)
    expect(de('madrugador').progreso).toBe(1)
    // Entrenos I, Récords batidos I, Hilo I (4 semanas seguidas) y Descanso bien llevado (repetible: una pieza). Entreno:
    // 34 piezas; Constancia: 13; Cumbres sin empezar: 22, sin conseguir; Caminos sin actividades: 36; ocultos: 16.
    expect(recuentoPiezas(logros)).toEqual({ conseguidas: 4, total: 34 + 13 + 22 + 36 + 16 })
    expect(nivelDe(de('records-batidos'))).toBe(1)
  })

  it('semanas cumplidas y logros del entreno con el que se consiguieron', () => {
    expect(de('semanas').progreso).toBe(3) // tres semanas con tres entrenos (sin nutrición)
    expect(logrosDeEntreno(logros, es[9].workout.id).map((n) => [n.logro.id, n.nivel])).toEqual([['entrenos', 1]])
    // Con varios niveles, el nombre lleva su numeral (lo que se publica en Amigos).
    const [nuevo] = logrosDeEntreno(logros, es[9].workout.id)
    expect(nombreConNivel(nuevo)).toBe(`${nuevo.logro.nombre} I`)
  })

  it('ciclos completados: la primera llegada a Élite de cada ejercicio, con su entreno', () => {
    // 16 semanas seguidas con dos ejercicios; el segundo, una semana más tarde.
    const remo = ejercicio('espalda').id
    const semanas = Array.from({ length: 17 }, (_, k) => entreno(addDays('2026-05-04', 7 * k), [...seis(banca, 40).slice(0, 3), ...(k > 0 ? seis(remo, 40).slice(0, 3) : [])]))
    const v = calcularVitrina({ hoy: '2026-10-10', experiencia: calcularExperiencia({ hoy: '2026-10-10', workouts: semanas.map((e) => e.workout), sets: semanas.flatMap((e) => e.sets), entries: [], protObjetivo: new Map(), conNutricion: false }),
      workouts: semanas.map((e) => e.workout), sets: semanas.flatMap((e) => e.sets), exercises: [], entries: [], categorias: new Map(), conNutricion: false })
    const ciclos = v.logros.find((l) => l.id === 'ciclos')!
    expect(nivelDe(ciclos)).toBe(1)
    expect(ciclos.niveles[0]).toEqual({ fecha: '2026-08-17', workoutId: semanas[15].workout.id })
    expect(ciclos.progreso).toBe(2)
    expect(ciclos.descripcion).toBe('Llegar a Élite de la Liga con 5 ejercicios distintos')
  })

  it('cumbres: niveles, metros, Techo de España y paso firme, con su fecha real', () => {
    const ev = (fecha: string, xp: number, workoutId?: number): EventoXp => workoutId === undefined
      ? { tipo: 'registro', fecha, xp, comidas: 2 }
      : { tipo: 'entreno', fecha, xp, workoutId, series: 6 }
    const cumbres = calcularCumbres([ev('2026-09-14', 3404), ev('2026-09-21', 3479, 999), ev('2026-09-28', 3715)], empezar('2026-09-07', 'aneto'))
    const l = calcularLogros({ hoy: '2026-10-10', experiencia, atlas: calcularAtlas([], new Map(), []), herbario: [], conNutricion: false, cumbres })
    const x = (idLogro: string) => l.find((y) => y.id === idLogro)!
    expect(x('cumbres').niveles.slice(0, 2)).toEqual([{ fecha: '2026-09-14' }, { fecha: '2026-09-28' }])
    expect(x('cumbres').descripcion).toBe('Hacer 6 cumbres (repetir una montaña también cuenta)')
    expect(x('metros').niveles).toEqual([{ fecha: '2026-09-28' }, null, null, null, null])
    expect(x('metros').progreso).toBe(10_598)
    expect(x('techo-espana').niveles).toEqual([{ fecha: '2026-09-28' }])
    expect(x('siete-cumbres').progreso).toBe(0)
    expect(conseguido(x('techo-mundo'))).toBe(false)
    expect(x('paso-firme').veces).toHaveLength(3)
    expect(logrosDeEntreno(l, 999).map((n) => n.logro.id)).toEqual(['paso-firme'])
    expect(logrosDeEntreno(l, 999).map(nombreConNivel)).toEqual([x('paso-firme').nombre])
    expect(UMBRALES.cumbres[UMBRALES.cumbres.length - 1]).toBe(MONTANAS.length)
    expect(x('repetir').progreso).toBe(1)
    expect(x('alpes').progreso).toBe(0)
  })

  it('repetir montaña: otra vez arriba, más rápido y las colecciones cuentan montañas distintas', () => {
    const ev = (fecha: string, xp: number): EventoXp => ({ tipo: 'registro', fecha, xp, comidas: 2 })
    // Aneto en 8 días, otra vez en 3 días (más rápido) y una tercera en 5 (más lento que la anterior).
    const cumbres = calcularCumbres([ev('2026-09-08', 3404), ev('2026-09-10', 3404), ev('2026-09-14', 3404)], { inicio: '2026-09-01', ruta: ['aneto', 'aneto', 'aneto'] })
    const l = calcularLogros({ hoy: '2026-10-10', experiencia, atlas: calcularAtlas([], new Map(), []), herbario: [], conNutricion: false, cumbres })
    const x = (idLogro: string) => l.find((y) => y.id === idLogro)!
    expect(x('repetir').niveles).toEqual([{ fecha: '2026-09-10' }, { fecha: '2026-09-14' }, null, null])
    expect(x('repetir').progreso).toBe(3)
    expect(x('repetir').descripcion).toBe('Hacer cumbre 5 veces en la misma montaña')
    expect(x('mas-rapido').veces).toEqual([{ fecha: '2026-09-10' }])
    expect(x('cumbres').progreso).toBe(3)
    expect(x('techo-espana').progreso).toBe(1) // el Aneto tres veces es una montaña de la colección
  })

  it('vuelta al ruedo tras 14 días o más sin entrenar', () => {
    const dos = [entreno('2026-09-01', seis(banca, 40)), entreno('2026-09-20', seis(banca, 40))]
    const a = calcularExperiencia({ hoy: '2026-10-10', workouts: dos.map((e) => e.workout), sets: dos.flatMap((e) => e.sets), entries: [], protObjetivo: new Map(), conNutricion: false })
    const l = calcularLogros({ hoy: '2026-10-10', experiencia: a, atlas: calcularAtlas([], new Map(), []), herbario: [], conNutricion: false })
    expect(l.find((x) => x.id === 'vuelta')!.veces).toEqual([{ fecha: '2026-09-20', workoutId: dos[1].workout.id }])
  })
})

describe('logros de Caminos', () => {
  it('km acumulados, salidas, rutas, Compostela y los ocultos', () => {
    const experiencia = calcularExperiencia({ hoy: '2026-12-31', workouts: [], sets: [], entries: [], protObjetivo: new Map(), conNutricion: false })
    const actividades = [
      { id: 1, tipo: 'caminar' as const, fecha: '2026-10-05', inicio: 1, distanciaM: 30_000, duracionSeg: 6 * 3600, desnivelM: 400 },
      { id: 2, tipo: 'correr' as const, fecha: '2026-10-06', inicio: 2, distanciaM: 45_000, duracionSeg: 4 * 3600 },
      { id: 3, tipo: 'senderismo' as const, fecha: '2026-10-07', inicio: 3, distanciaM: 40_000, duracionSeg: 9 * 3600, desnivelM: 1200 },
    ]
    const caminos = calcularCaminos(actividades, { inicio: '2026-10-05', ruta: ['ingles', 'fisterra'] }, '2026-12-31')
    const logros = calcularLogros({ hoy: '2026-12-31', experiencia, atlas: calcularAtlas([], new Map(), []), herbario: [], conNutricion: false, actividades, caminos })
    const de = (idLogro: string) => logros.find((l) => l.id === idLogro)!
    expect(de('km').niveles[0]).toEqual({ fecha: '2026-10-06' }) // 75 km pasan de 50
    expect(de('km').progreso).toBe(115)
    expect(nivelDe(de('salidas'))).toBe(0)
    expect(de('rutas').niveles[0]).toEqual({ fecha: '2026-10-07' }) // el Inglés (111,5 km) se termina con la tercera
    expect(de('compostela').niveles[0]).toEqual({ fecha: '2026-10-07' })
    expect(conseguido(de('todos-santiago'))).toBe(false)
    expect(de('maraton').veces).toEqual([{ fecha: '2026-10-06' }])
    expect(conseguido(de('fin-del-mundo'))).toBe(false)
    expect(de('km-corriendo')).toMatchObject({ progreso: 45, niveles: [{ fecha: '2026-10-06' }, null, null, null, null] })
    expect(de('desnivel')).toMatchObject({ progreso: 1600, niveles: [{ fecha: '2026-10-07' }, null, null, null] })
    expect(de('horas')).toMatchObject({ progreso: 19, niveles: [{ fecha: '2026-10-06' }, null, null, null] })
    expect(de('distancia').niveles).toEqual([{ fecha: '2026-10-05' }, { fecha: '2026-10-05' }, { fecha: '2026-10-05' }, { fecha: '2026-10-05' }])
    expect(de('distancia').descripcion).toBe('Una salida de 30 km o más')
    expect(de('km-vertical').veces).toEqual([{ fecha: '2026-10-07' }])
    expect(de('rutas-mundo')).toMatchObject({ progreso: 0, descripcion: 'Terminar Camino Inca, Milford Track, Kumano Kodo y West Highland Way' })
  })
})

describe('logros ampliados', () => {
  const banca = ejercicio('pecho').id
  const sinNutricion = (es: ReturnType<typeof entreno>[], hoy = '2026-10-10') =>
    calcularExperiencia({ hoy, workouts: es.map((e) => e.workout), sets: es.flatMap((e) => e.sets), entries: [], protObjetivo: new Map(), conNutricion: false })

  it('entreno: series, toneladas, ejercicios dominados y subir de liga', () => {
    // Lunes, miércoles y viernes desde el 7 de septiembre: 6 series de 8 con 40…49 kg.
    const es = Array.from({ length: 10 }, (_, i) => entreno(addDays('2026-09-07', Math.floor(i / 3) * 7 + (i % 3) * 2), seis(banca, 40 + i)))
    const v = calcularVitrina({ hoy: '2026-10-10', experiencia: sinNutricion(es), workouts: es.map((e) => e.workout), sets: es.flatMap((e) => e.sets),
      exercises: [], entries: [], categorias: new Map(), conNutricion: false })
    const de = (idLogro: string) => v.logros.find((l) => l.id === idLogro)!
    expect(de('series').progreso).toBe(60)
    // 48 repeticiones por entreno: 1.920 kg el primero; los 10.000 kg llegan con el quinto.
    expect(de('toneladas')).toMatchObject({ progreso: 21, unidad: 't' })
    expect(de('toneladas').niveles[0]).toEqual({ fecha: '2026-09-16', workoutId: es[4].workout.id })
    expect(de('dominados').progreso).toBe(1)
    expect(de('ligas').niveles).toEqual([{ fecha: '2026-09-07', workoutId: es[0].workout.id }, { fecha: '2026-09-28', workoutId: es[9].workout.id }, null, null, null])
    expect(de('ligas').descripcion).toBe('Llegar a Oro en la Liga con un ejercicio')
    expect(de('racha').progreso).toBe(3) // tres semanas cumplidas seguidas; la cuarta, con un entreno, corta
  })

  it('ocultos: noctámbulo, día de récords, año nuevo, día redondo, un año después y red de seguridad', () => {
    const remo = ejercicio('espalda').id
    const prensa = ejercicio('cuadriceps').id
    const tres = (peso: number) => [...seis(banca, peso).slice(0, 2), ...seis(remo, peso).slice(0, 2), ...seis(prensa, peso).slice(0, 2)]
    const es = [
      entreno('2026-01-01', tres(40), 22), entreno('2026-01-03', tres(50), 22),
      ...Array.from({ length: 3 }, (_, i) => entreno(addDays('2026-01-05', i), tres(40), 23)),
      entreno('2027-01-01', tres(40)),
    ]
    const experiencia = sinNutricion(es, '2027-01-10')
    const l = calcularLogros({ hoy: '2027-01-10', experiencia, atlas: calcularAtlas([], new Map(), []), herbario: [], conNutricion: false,
      actividades: [{ id: 1, tipo: 'caminar', fecha: '2027-01-01', inicio: 1, distanciaM: 5000, duracionSeg: 3600 }] })
    const de = (idLogro: string) => l.find((x) => x.id === idLogro)!
    expect(de('noctambulo').niveles).toEqual([{ fecha: '2026-01-07', workoutId: es[4].workout.id }])
    expect(de('dia-records').veces).toContainEqual({ fecha: '2026-01-03', workoutId: es[1].workout.id })
    expect(de('ano-nuevo').veces).toEqual([{ fecha: '2026-01-01', workoutId: es[0].workout.id }, { fecha: '2027-01-01', workoutId: es[5].workout.id }])
    expect(de('dia-redondo').veces).toEqual([{ fecha: '2027-01-01', workoutId: es[5].workout.id }])
    expect(de('aniversario').niveles).toEqual([{ fecha: '2027-01-01' }])

    // Cuatro semanas cumplidas dan un comodín; la quinta, vacía, lo gasta.
    const semanas = Array.from({ length: 4 }, (_, k) => [0, 2, 4].map((dia) => entreno(addDays('2026-09-07', 7 * k + dia), seis(banca, 40)))).flat()
    const conComodin = calcularLogros({ hoy: '2026-10-20', experiencia: sinNutricion([...semanas, entreno('2026-10-14', seis(banca, 40))], '2026-10-20'),
      atlas: calcularAtlas([], new Map(), []), herbario: [], conNutricion: false })
    expect(conComodin.find((x) => x.id === 'comodin')!.niveles).toEqual([{ fecha: '2026-10-11' }])
    expect(conComodin.find((x) => x.id === 'racha')!.niveles[0]).toEqual({ fecha: '2026-10-02' })
  })

  it('nutrición: semanas enteras, botánica y jardín botánico', () => {
    const dias = Array.from({ length: 9 }, (_, i) => addDays('2026-10-05', i))
    const experiencia = calcularExperiencia({ hoy: '2026-10-20', workouts: [], sets: [], entries: dias.map((fecha) => ({ fecha, comida: 'comida' as const, prot: 10 })),
      protObjetivo: new Map(dias.map((f) => [f, 150])), conNutricion: true })
    const plantas = Array.from({ length: 50 }, (_, i) => ({ primera: i < 49 ? '2026-10-05' : '2026-10-09' }))
    const l = calcularLogros({ hoy: '2026-10-20', experiencia, atlas: calcularAtlas([], new Map(), []), conNutricion: true, plantas,
      herbario: [{ lunes: '2026-10-05', plantas: 50, treintaEl: '2026-10-06', cincuentaEl: '2026-10-09' }] })
    const de = (idLogro: string) => l.find((x) => x.id === idLogro)!
    expect(de('semanas-enteras').progreso).toBe(1)
    expect(de('plantas').niveles[0]).toEqual({ fecha: '2026-10-09' })
    expect(de('jardin').veces).toEqual([{ fecha: '2026-10-09' }])
    // Con nutrición: 18 piezas de Nutrición y el Jardín botánico entre los ocultos.
    expect(recuentoPiezas(l).total).toBe(34 + 13 + 22 + 36 + 16 + 18 + 1)
  })
})
