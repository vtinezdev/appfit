import { describe, expect, it } from 'vitest'
import type { SetEntry, Workout } from '../../../shared/db/types'
import { addDays, parseISODate } from '../../../shared/lib/dates'
import { agruparPorLiga, calcularLigas, divisionDe, type LigaEjercicio } from './liga'
import { ascensoDestacado, fechaCorta, resumenLiga, textoAscenso, textoAvisoElite, textoPico, textoProgreso, textoSemanas, textoSiguiente } from './textos'

const LUNES = '2026-01-05'
const semana = (n: number, dia = 0) => addDays(LUNES, (n - 1) * 7 + dia)
let id = 1
/** Ligas con un entreno del ejercicio el miércoles de cada semana indicada. */
function ligas(hoy: string, porEjercicio: Record<number, number[]>): LigaEjercicio[] {
  const workouts: Workout[] = []
  const sets: SetEntry[] = []
  for (const [exerciseId, ns] of Object.entries(porEjercicio)) {
    for (const n of ns) {
      const inicio = parseISODate(semana(n, 2)).getTime() + 18 * 3_600_000
      const w: Workout = { id: id++, inicio, fin: inicio + 3_600_000 }
      workouts.push(w)
      sets.push({ id: id++, workoutId: w.id, exerciseId: Number(exerciseId), orden: 0, reps: 8, peso: 40, createdAt: inicio })
    }
  }
  return calcularLigas({ hoy, workouts, sets })
}
const una = (hoy: string, ns: number[]) => ligas(hoy, { 1: ns })[0]
const rango = (desde: number, hasta: number) => Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i)

describe('estado de la semana', () => {
  it('hecha esta semana y semanas cerradas sin el ejercicio', () => {
    expect(una(semana(3, 4), [1, 2, 3])).toMatchObject({ hechaEstaSemana: true, semanasSin: 0 })
    expect(una(semana(4, 4), [1, 2, 3])).toMatchObject({ hechaEstaSemana: false, semanasSin: 0 })
    expect(una(semana(6, 0), [1, 2, 3])).toMatchObject({ hechaEstaSemana: false, semanasSin: 2 })
  })
})

describe('textos', () => {
  it('semanas y fechas', () => {
    expect(textoSemanas(1)).toBe('1 semana')
    expect(textoSemanas(18)).toBe('18 semanas')
    expect(fechaCorta('2026-10-07', '2026-10-10')).toBe('7 oct')
    expect(fechaCorta('2025-03-03', '2026-10-10')).toBe('3 mar de 2025')
  })

  it('qué pasa ahora, según el estado', () => {
    const hoy = semana(3, 4)
    expect(textoSiguiente(una(hoy, [1, 2, 3]), hoy)).toBe('Esta semana ya cuenta. La próxima semana que lo hagas, Plata III.')
    expect(textoSiguiente(una(semana(4, 1), [1, 2, 3]), semana(4, 1))).toBe('Si lo haces esta semana, sube a Plata III.')
    expect(textoSiguiente(una(semana(5, 1), [1, 2, 3]), semana(5, 1))).toBe('Si lo haces esta semana, sube a Plata III.') // la de gracia
    expect(textoSiguiente(una(semana(6, 1), [1, 2, 3]), semana(6, 1))).toBe(`Sin hacerlo desde el ${fechaCorta(semana(3, 2), semana(6, 1))}: baja una división por semana. Si vuelves, sube desde aquí.`)
    expect(textoSiguiente(una(semana(12, 1), [1, 2]), semana(12, 1))).toBe(`Sin hacerlo desde el ${fechaCorta(semana(2, 2), semana(12, 1))}. Si vuelves, empieza en Bronce III.`)
  })

  it('Élite sugiere variar salvo en los básicos', () => {
    const hoy = semana(18, 4)
    const elite = una(hoy, rango(1, 18))
    expect(textoSiguiente(elite, hoy)).toBe('Llevas mucho tiempo con este ejercicio. Si te apetece variar, puede ser buen momento; si no, puedes seguir con él.')
    expect(textoSiguiente(elite, hoy, { sinRecords: 5 })).toBe('Llevas mucho tiempo con este ejercicio y no hay récords en sus últimas 5 sesiones. Si te apetece variar, puede ser buen momento; si no, puedes seguir con él.')
    expect(textoSiguiente(elite, hoy, { sinRecords: 3 })).toBe(textoSiguiente(elite, hoy))
    expect(textoSiguiente(elite, hoy, { mantenido: true, sinRecords: 5 })).toBe('Lo mantienes en Élite: no te avisa durante el entreno.')
    expect(textoSiguiente(elite, hoy, { basico: true, sinRecords: 5 })).toBe('Es un ejercicio básico: es habitual mantenerlo mucho tiempo.')
    expect(textoProgreso(elite)).toBe('16 de 16 semanas: la cima de la liga')
    expect(resumenLiga(elite, hoy)).toBe('18 semanas seguidas')
    expect(resumenLiga(una(hoy, [18]), hoy)).toBe('1 semana seguida')
  })

  it('progreso, resumen de la lista y fantasma', () => {
    const hoy = semana(8, 4)
    const l = una(hoy, rango(1, 8))
    expect(textoProgreso(l)).toBe('8 de 16 semanas hacia Élite')
    expect(resumenLiga(l, hoy)).toBe('8 semanas seguidas')
    const rota = una(semana(12, 0), [1, 2, 3, 4])
    expect(resumenLiga(rota, semana(12, 0))).toBe(`Sin hacerlo desde el ${fechaCorta(semana(4, 2), semana(12, 0))}`)
    expect(textoPico(rota.pico!, semana(12, 0))).toBe(`Plata III · ${fechaCorta(semana(4, 2), semana(12, 0))}`)
  })
})

describe('entreno activo y fin de sesión', () => {
  it('aviso de Élite', () => {
    expect(textoAvisoElite(una(semana(18, 4), rango(1, 18)))).toBe('Élite: llevas 18 semanas seguidas con este ejercicio')
  })

  it('ascensos: entrar, subir de división, cambiar de liga y llegar a Élite', () => {
    const a = (de: number, aPaso: number) => ({ exerciseId: 1, de: divisionDe(de), a: divisionDe(aPaso) })
    expect([a(0, 1), a(1, 2), a(3, 4), a(15, 16)].map(textoAscenso)).toEqual([
      'Entra en la liga: Bronce III', 'Sube de Bronce III a Bronce II', 'Sube de Bronce I a Plata III', 'Llega a Élite: ciclo completado',
    ])
    expect([a(0, 1), a(1, 2), a(3, 4), a(15, 16)].map(ascensoDestacado)).toEqual([true, false, true, true])
  })
})

describe('agrupar por liga', () => {
  it('de Élite a Bronce y aparte los que están sin liga', () => {
    const hoy = semana(20, 4)
    const { grupos, sinLiga } = agruparPorLiga(ligas(hoy, { 1: rango(1, 20), 2: rango(15, 20), 3: [19, 20], 4: [20], 5: [1, 2] }))
    expect(grupos.map((g) => [g.liga, g.ligas.map((l) => l.exerciseId)])).toEqual([['Élite', [1]], ['Plata', [2]], ['Bronce', [3, 4]]])
    expect(sinLiga.map((l) => l.exerciseId)).toEqual([5])
  })
})
