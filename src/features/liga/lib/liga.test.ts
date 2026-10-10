import { describe, expect, it } from 'vitest'
import type { Exercise, Pausa, SetEntry, Workout } from '../../../shared/db/types'
import { addDays, parseISODate } from '../../../shared/lib/dates'
import { normalizeName } from '../../../shared/lib/text'
import { CATALOGO_POR_ID } from '../../gym/lib/catalogoEjercicios'
import { avisarElite, BASICOS, esBasico } from './basicos'
import { ascensosDeEntreno, calcularLigas, ciclosCompletados, divisionDe, PASO_ELITE, type DatosLiga, type LigaEjercicio } from './liga'

/** Lunes de la semana 1. */
const LUNES = '2026-01-05'
const semana = (n: number, dia = 0) => addDays(LUNES, (n - 1) * 7 + dia)

let id = 1
type OpcionesSerie = Partial<Pick<SetEntry, 'tipo' | 'realizada' | 'reps' | 'ejecucion' | 'agarre'>>
function entreno(fecha: string, exerciseIds: number[], opciones: { terminado?: boolean; serie?: OpcionesSerie; hora?: number } = {}) {
  const inicio = parseISODate(fecha).getTime() + (opciones.hora ?? 18) * 3_600_000
  const workout: Workout = { id: id++, inicio, ...(opciones.terminado === false ? {} : { fin: inicio + 3_600_000 }) }
  const sets: SetEntry[] = exerciseIds.map((exerciseId, i) => ({ id: id++, workoutId: workout.id, exerciseId, orden: i, reps: 8, peso: 40, createdAt: inicio + i, ...opciones.serie }))
  return { workout, sets }
}
/** Datos con un entreno del ejercicio en cada semana indicada (el miércoles). */
function datos(hoy: string, entrenos: ReturnType<typeof entreno>[], pausas?: Pausa[]): DatosLiga {
  return { hoy, workouts: entrenos.map((e) => e.workout), sets: entrenos.flatMap((e) => e.sets), pausas }
}
const semanas = (exerciseId: number, ns: number[]) => ns.map((n) => entreno(semana(n, 2), [exerciseId]))
const rango = (desde: number, hasta: number) => Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i)
const ligaDe = (d: DatosLiga, exerciseId = 1): LigaEjercicio => {
  const liga = calcularLigas(d).find((l) => l.exerciseId === exerciseId)
  if (!liga) throw new Error('sin liga')
  return liga
}

describe('divisiones', () => {
  it('5 ligas de 3 divisiones y Élite a las 16 semanas', () => {
    expect(PASO_ELITE).toBe(16)
    expect([0, 1, 2, 3, 4, 7, 10, 13, 15, 16, 30, -2].map((p) => divisionDe(p).nombre)).toEqual([
      'Sin liga', 'Bronce III', 'Bronce II', 'Bronce I', 'Plata III', 'Oro III', 'Platino III', 'Diamante III', 'Diamante I', 'Élite', 'Élite', 'Sin liga',
    ])
    expect(divisionDe(16)).toMatchObject({ liga: 'Élite', elite: true })
    expect(divisionDe(8)).toMatchObject({ liga: 'Oro', elite: false })
  })
})

describe('subir', () => {
  it('una división por semana con el ejercicio; varias sesiones en la misma semana cuentan una', () => {
    const l = ligaDe(datos(semana(3, 6), [...semanas(1, [1, 2, 3]), entreno(semana(3, 4), [1])]))
    expect(l.division.nombre).toBe('Bronce I')
    expect(l.semanasSeguidas).toBe(3)
    expect(l.ultimaFecha).toBe(semana(3, 4))
  })

  it('Élite a las 16 semanas y se queda ahí; el ciclo se apunta una vez', () => {
    const l = ligaDe(datos(semana(18, 6), semanas(1, rango(1, 18))))
    expect(l.division.elite).toBe(true)
    expect(l.semanasSeguidas).toBe(18)
    expect(l.ciclos.map((c) => c.fecha)).toEqual([semana(16, 2)])
  })

  it('la semana en curso sube en cuanto se hace el ejercicio', () => {
    expect(ligaDe(datos(semana(2, 0), semanas(1, [1]))).division.paso).toBe(1)
    expect(ligaDe(datos(semana(2, 2), semanas(1, [1, 2]))).division.paso).toBe(2)
  })
})

describe('bajar', () => {
  it('la primera semana sin el ejercicio no cuenta: una semana sí y otra no sube a la mitad de ritmo', () => {
    const l = ligaDe(datos(semana(5, 6), semanas(1, [1, 3, 5])))
    expect(l.division.paso).toBe(3)
    expect(l.semanasSeguidas).toBe(3)
  })

  it('la semana en curso no baja hasta que acaba', () => {
    const d = (hoy: string) => ligaDe(datos(hoy, semanas(1, [1, 2, 3])))
    expect(d(semana(4, 6)).division.paso).toBe(3) // en curso
    expect(d(semana(5, 6)).division.paso).toBe(3) // la 4, de gracia
    expect(d(semana(6, 0)).division.paso).toBe(2) // la 5, segunda seguida sin él
    expect(d(semana(6, 0)).semanasSeguidas).toBe(0)
  })

  it('baja una división por semana desde la segunda y vuelve a subir desde donde quedó', () => {
    const elite = semanas(1, rango(1, 16))
    const fuera = ligaDe(datos(semana(23, 0), elite))
    expect(fuera.division.nombre).toBe('Platino II') // 6 semanas sin él: 5 bajadas
    expect(fuera.pico).toEqual({ paso: 16, fecha: semana(16, 2) })

    const vuelta = ligaDe(datos(semana(27, 6), [...elite, ...semanas(1, rango(23, 27))]))
    expect(vuelta.division.elite).toBe(true)
    expect(vuelta.semanasSeguidas).toBe(5)
    expect(vuelta.ciclos.map((c) => c.fecha)).toEqual([semana(16, 2), semana(27, 2)])
  })

  it('no baja de «Sin liga»', () => {
    const l = ligaDe(datos(semana(30, 0), semanas(1, [1, 2])))
    expect(l.division).toMatchObject({ paso: 0, nombre: 'Sin liga' })
  })

  it('una semana en pausa de Ritmo (total o de entreno) se congela', () => {
    const pausas: Pausa[] = [
      { id: 'a', desde: semana(5, 0), hasta: semana(6, 6), tipo: 'total', motivo: 'vacaciones' },
      { id: 'b', desde: semana(7, 0), hasta: semana(8, 6), tipo: 'entreno', motivo: 'lesion' },
    ]
    const l = ligaDe(datos(semana(9, 6), semanas(1, [1, 2, 3, 4]), pausas))
    expect(l.division.paso).toBe(4)
    expect(l.semanas.filter((s) => s.congelada).map((s) => s.lunes)).toEqual([semana(5), semana(6), semana(7), semana(8)])
    // La semana sin él antes de la pausa y la de después siguen seguidas: la segunda ya baja.
    const conHueco = ligaDe(datos(semana(10, 0), semanas(1, [1, 2, 3, 4]), [{ id: 'c', desde: semana(6, 0), hasta: semana(8, 6), tipo: 'total', motivo: 'viaje' }]))
    expect(conHueco.division.paso).toBe(3)
  })

  it('hacer el ejercicio durante una pausa sí sube', () => {
    const pausas: Pausa[] = [{ id: 'a', desde: semana(2, 0), tipo: 'total', motivo: 'viaje' }]
    expect(ligaDe(datos(semana(3, 6), semanas(1, [1, 2, 3]), pausas)).division.paso).toBe(3)
  })
})

describe('qué cuenta', () => {
  it('solo series efectivas con repeticiones en entrenos terminados hasta hoy', () => {
    const l = calcularLigas(datos(semana(6, 6), [
      entreno(semana(1, 2), [1]),
      entreno(semana(2, 2), [1], { serie: { tipo: 'calentamiento' } }),
      entreno(semana(3, 2), [1], { serie: { realizada: false } }),
      entreno(semana(4, 2), [1], { serie: { reps: 0 } }),
      entreno(semana(5, 2), [1], { terminado: false }),
      entreno(semana(7, 2), [1]),
    ]))
    expect(l).toHaveLength(1)
    expect(l[0].semanas.filter((s) => s.sesion).map((s) => s.lunes)).toEqual([semana(1)])
  })

  it('las variantes cuentan como el mismo ejercicio', () => {
    const l = ligaDe(datos(semana(3, 6), [
      entreno(semana(1, 2), [1]),
      entreno(semana(2, 2), [1], { serie: { ejecucion: 'unilateral' } }),
      entreno(semana(3, 2), [1], { serie: { agarre: { orientacion: 'supino' } } }),
    ]))
    expect(l.division.paso).toBe(3)
  })

  it('un ejercicio que nunca se hizo no tiene liga', () => {
    expect(calcularLigas(datos(semana(3, 6), semanas(1, [1])))).toHaveLength(1)
    expect(calcularLigas(datos(semana(3, 6), []))).toEqual([])
  })
})

describe('fantasma', () => {
  it('el pico de las rachas anteriores, con el último día en que se alcanzó', () => {
    // Racha 1: 6 semanas (Plata I); fuera 8 semanas (baja a 0); racha 2: 3 semanas.
    const l = ligaDe(datos(semana(17, 6), semanas(1, [...rango(1, 6), ...rango(15, 17)])))
    expect(l.division.nombre).toBe('Bronce I')
    expect(l.semanasSeguidas).toBe(3)
    expect(l.pico).toEqual({ paso: 6, fecha: semana(6, 2) })
  })

  it('sin rachas anteriores no hay fantasma; la de gracia no rompe la racha', () => {
    expect(ligaDe(datos(semana(5, 6), semanas(1, [1, 2, 4, 5]))).pico).toBeNull()
  })

  it('con la racha rota, su pico pasa a ser el fantasma', () => {
    expect(ligaDe(datos(semana(10, 0), semanas(1, [1, 2, 3, 4]))).pico).toEqual({ paso: 4, fecha: semana(4, 2) })
  })
})

describe('ascensos, orden y ciclos', () => {
  it('sube la primera sesión de la semana con cada ejercicio; en Élite no hay ascenso', () => {
    const previos = semanas(1, rango(1, 15))
    const lunes = entreno(semana(16, 0), [1, 2])
    const jueves = entreno(semana(16, 3), [1, 2, 3])
    const ligas = calcularLigas(datos(semana(16, 6), [...previos, ...semanas(2, [15]), lunes, jueves]))
    expect(ascensosDeEntreno(ligas, lunes.workout.id).map((a) => [a.exerciseId, a.de.nombre, a.a.nombre])).toEqual([
      [1, 'Diamante I', 'Élite'],
      [2, 'Bronce III', 'Bronce II'],
    ])
    expect(ascensosDeEntreno(ligas, jueves.workout.id).map((a) => [a.exerciseId, a.a.nombre])).toEqual([[3, 'Bronce III']])
    const siguiente = entreno(semana(17, 2), [1])
    expect(ascensosDeEntreno(calcularLigas(datos(semana(17, 6), [...previos, lunes, siguiente])), siguiente.workout.id)).toEqual([])
  })

  it('una sesión registrada después pero más temprana en la semana pasa a ser la que sube', () => {
    const tarde = entreno(semana(1, 3), [1])
    const antes = entreno(semana(1, 1), [1])
    const ligas = calcularLigas(datos(semana(1, 6), [tarde, antes]))
    expect(ascensosDeEntreno(ligas, antes.workout.id)).toHaveLength(1)
    expect(ascensosDeEntreno(ligas, tarde.workout.id)).toEqual([])
  })

  it('de la división más alta a la más baja y, a igualdad, la más reciente; ciclos en orden de fecha', () => {
    const ligas = calcularLigas(datos(semana(20, 6), [
      ...semanas(3, rango(1, 16)),
      ...semanas(1, rango(3, 20)),
      ...semanas(2, [19]),
      ...semanas(4, [20]),
    ]))
    expect(ligas.map((l) => l.exerciseId)).toEqual([1, 3, 4, 2])
    expect(ciclosCompletados(ligas).map(({ exerciseId, fecha }) => ({ exerciseId, fecha }))).toEqual([{ exerciseId: 3, fecha: semana(16, 2) }, { exerciseId: 1, fecha: semana(18, 2) }])
  })
})

describe('básicos', () => {
  const ej = (e: Partial<Exercise> & { nombre: string }): Exercise => ({ id: id++, nombreNorm: normalizeName(e.nombre), grupo: 'pecho', ...e })
  const elite = (exerciseId: number) => ligaDe(datos(semana(16, 6), semanas(exerciseId, rango(1, 16))), exerciseId)

  it('la lista existe en el catálogo', () => {
    for (const idCatalogo of BASICOS) expect(CATALOGO_POR_ID.has(idCatalogo), idCatalogo).toBe(true)
  })

  it('por id del catálogo o por nombre exacto de un registro antiguo', () => {
    expect(esBasico(ej({ nombre: 'Mi banca', catalogId: 'appfit:press-banca' }))).toBe(true)
    expect(esBasico(ej({ nombre: 'Sentadilla' }))).toBe(true)
    expect(esBasico(ej({ nombre: 'Curl de bíceps con barra' }))).toBe(false)
    expect(esBasico(ej({ nombre: 'Sentadilla', primaryMuscles: ['cuadriceps'] }))).toBe(false) // personalizado
  })

  it('Élite avisa salvo en los básicos y en los mantenidos', () => {
    const curl = ej({ nombre: 'Zzz curl' })
    const banca = ej({ nombre: 'Banca', catalogId: 'appfit:press-banca' })
    expect(avisarElite(elite(curl.id), curl)).toBe(true)
    expect(avisarElite(elite(curl.id), curl, [curl.id])).toBe(false)
    expect(avisarElite(elite(banca.id), banca)).toBe(false)
    expect(avisarElite(ligaDe(datos(semana(3, 6), semanas(curl.id, [1, 2, 3])), curl.id), curl)).toBe(false)
  })
})
