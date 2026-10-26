import { describe, expect, it } from 'vitest'
import { ejerciciosDelPoster, hitoDeEntrenos, partesRecord, pastillaSerie, recordsPorEjercicio, restoRecords, resumenEjercicio, seriesConRecord, seriesPublicables, textoDesde } from './fichaEntreno'
import type { RecordEjercicio } from './records'
import type { SetEntry } from '../../../shared/db/types'

const record = (r: Partial<RecordEjercicio>): RecordEjercicio => ({ exerciseId: 1, tipo: 'peso', valor: 82.5, anterior: 80, ...r })

describe('recordsPorEjercicio', () => {
  it('agrupa por ejercicio en el orden de aparición', () => {
    const grupos = recordsPorEjercicio([record({ exerciseId: 2 }), record({ exerciseId: 1 }), record({ exerciseId: 2, tipo: '1rm' })])
    expect(grupos.map(g => [g.exerciseId, g.records.map(r => r.tipo)])).toEqual([[2, ['peso', '1rm']], [1, ['peso']]])
  })
})

describe('seriesConRecord', () => {
  it('reúne las series que marcan récord e ignora los que no la traen', () => {
    expect([...seriesConRecord([record({ setId: 7 }), record({ tipo: '1rm', setId: 7 }), record({ tipo: 'reps' })])]).toEqual([7])
  })
})

describe('partesRecord', () => {
  it('peso y 1RM en kg con la mejora', () => {
    expect(partesRecord(record({}))).toEqual({ rotulo: 'Peso máximo', valor: '82,5 kg', mejora: '+2,5 kg' })
    expect(partesRecord(record({ tipo: '1rm', valor: 101.75, anterior: 98.6666 }))).toEqual({ rotulo: '1RM estimado', valor: '101,75 kg', mejora: '+3,08 kg' })
  })
  it('repeticiones con el peso en el rótulo, en singular y plural', () => {
    expect(partesRecord(record({ tipo: 'reps', valor: 10, anterior: 9, peso: 60 }))).toEqual({ rotulo: 'Reps con 60 kg', valor: '10 reps', mejora: '+1 rep' })
    expect(partesRecord(record({ tipo: 'reps', valor: 12, anterior: 8, peso: 0, modoCarga: 'corporal' })).rotulo).toBe('Reps con peso corporal')
    expect(partesRecord(record({ tipo: 'reps', valor: 8, anterior: 6, peso: 10, modoCarga: 'lastre' }))).toMatchObject({ rotulo: 'Reps con +10 kg', mejora: '+2 reps' })
    expect(partesRecord(record({ tipo: 'reps', valor: 8, anterior: 6, peso: 20, modoCarga: 'asistencia' })).rotulo).toBe('Reps con 20 kg de asistencia')
  })
  it('lastre, asistencia y variante', () => {
    expect(partesRecord(record({ valor: 15, anterior: 10, modoCarga: 'lastre' }))).toEqual({ rotulo: 'Lastre máximo', valor: '+15 kg', mejora: '+5 kg' })
    expect(partesRecord(record({ tipo: 'asistencia', valor: 10, anterior: 20, modoCarga: 'asistencia' }))).toEqual({ rotulo: 'Menos asistencia', valor: '10 kg', mejora: '−10 kg' })
    expect(partesRecord(record({ variante: 'Agarre prono' })).variante).toBe('Agarre prono')
  })
})

describe('pastillaSerie', () => {
  it('carga × reps y su estado', () => {
    expect(pastillaSerie({ id: 1, peso: 82.5, reps: 7 })).toEqual({ id: 1, texto: '82,5 kg × 7', calentamiento: false, pendiente: false, bajadas: 0 })
    expect(pastillaSerie({ id: 2, peso: 40, reps: 10, tipo: 'calentamiento' }).calentamiento).toBe(true)
    expect(pastillaSerie({ id: 3, peso: 55, reps: 10, realizada: false }).pendiente).toBe(true)
    expect(pastillaSerie({ id: 4, peso: 55, reps: 10 }).pendiente).toBe(false)
    expect(pastillaSerie({ id: 5, peso: 30, reps: 10, bajadas: [{ id: 'a', reps: 6, peso: 20 }] }).bajadas).toBe(1)
  })
  it('carga corta según el modo', () => {
    expect(pastillaSerie({ id: 1, peso: 0, reps: 12, modoCarga: 'corporal', pesoCorporal: 75 }).texto).toBe('Corporal × 12')
    expect(pastillaSerie({ id: 1, peso: 10, reps: 8, modoCarga: 'lastre', pesoCorporal: 75 }).texto).toBe('+10 kg × 8')
    expect(pastillaSerie({ id: 1, peso: 20, reps: 8, modoCarga: 'asistencia' }).texto).toBe('Asistencia 20 kg × 8')
  })
  it('cada lado con su carga y sus reps', () => {
    expect(pastillaSerie({ id: 1, peso: 0, reps: 0, ejecucion: 'lados', lados: { izquierda: { reps: 10, peso: 30 }, derecha: { reps: 9, peso: 30 } } }).texto).toBe('I 30 kg × 10 · D 30 kg × 9')
    expect(pastillaSerie({ id: 1, peso: 0, reps: 0, ejecucion: 'lados', lados: { derecha: { reps: 9, peso: 30 } } }).texto).toBe('D 30 kg × 9')
    expect(pastillaSerie({ id: 1, peso: 0, reps: 0, ejecucion: 'lados' }).texto).toBe('Sin registrar')
  })
})

describe('resumenEjercicio', () => {
  it('series efectivas y volumen, sin contar calentamientos', () => {
    expect(resumenEjercicio([{ peso: 40, reps: 10, tipo: 'calentamiento' }, { peso: 80, reps: 8 }, { peso: 80, reps: 8 }, { peso: 82.5, reps: 7 }])).toBe('3 series · 1.858 kg')
  })
  it('con pendientes, cuántas se hicieron', () => {
    expect(resumenEjercicio([{ peso: 55, reps: 12 }, { peso: 55, reps: 10, realizada: false }])).toBe('1 de 2 series · 660 kg')
  })
  it('sin volumen, solo las series; sin efectivas, lo que hay', () => {
    expect(resumenEjercicio([{ peso: 0, reps: 12, modoCarga: 'corporal' }])).toBe('1 serie')
    expect(resumenEjercicio([{ peso: 20, reps: 10, tipo: 'calentamiento' }])).toBe('Solo calentamiento')
    expect(resumenEjercicio([])).toBe('Sin series')
  })
})

describe('seriesPublicables', () => {
  it('series hechas en su orden, sin calentamientos ni pendientes', () => {
    const series = [
      { id: 3, orden: 2, peso: 82.5, reps: 7 },
      { id: 1, orden: 0, peso: 40, reps: 10, tipo: 'calentamiento' as const },
      { id: 2, orden: 1, peso: 80, reps: 8 },
      { id: 4, orden: 3, peso: 82.5, reps: 6, realizada: false },
    ]
    expect(seriesPublicables(series, [])).toEqual({ series: ['80 kg × 8', '82,5 kg × 7'], records: [] })
  })
  it('marca la serie del récord de carga; las reps y el 1RM no', () => {
    const series = [{ id: 1, orden: 0, peso: 80, reps: 8 }, { id: 2, orden: 1, peso: 82.5, reps: 7 }, { id: 3, orden: 2, peso: 20, reps: 8, modoCarga: 'asistencia' as const }]
    expect(seriesPublicables(series, [
      record({ setId: 1, tipo: 'reps', valor: 8, anterior: 6, peso: 80 }),
      record({ setId: 2, tipo: '1rm', valor: 102, anterior: 100 }),
      record({ setId: 2 }),
      record({ setId: 3, tipo: 'asistencia', valor: 20, anterior: 25, modoCarga: 'asistencia' }),
    ]).records).toEqual([{ serie: 1, mejora: '+2,5 kg' }, { serie: 2, mejora: '−5 kg de asistencia' }])
  })
})

describe('hitoDeEntrenos', () => {
  const DIA = 86_400_000
  const entrenos = (n: number) => Array.from({ length: n }, (_, i) => ({ id: 100 + i, inicio: 1_700_000_000_000 + i * DIA }))

  it('solo en los números redondos, contando por el inicio', () => {
    const w = entrenos(50)
    expect(hitoDeEntrenos(w, 109)).toEqual({ numero: 10, desde: w[0].inicio })
    expect(hitoDeEntrenos(w, 149)).toEqual({ numero: 50, desde: w[0].inicio })
    expect(hitoDeEntrenos(w, 110)).toBeNull()
    expect(hitoDeEntrenos(w, 999)).toBeNull()
    // Desordenados y con un entreno registrado a posteriori con fecha anterior: cuenta su lugar en el tiempo.
    const otro = [...w].reverse().concat({ id: 1, inicio: w[0].inicio - DIA })
    expect(hitoDeEntrenos(otro, 108)).toEqual({ numero: 10, desde: w[0].inicio - DIA })
    expect(hitoDeEntrenos(otro, 109)).toBeNull()
  })

  it('a igual inicio decide el id, y todos los hitos hasta 1.000', () => {
    expect(hitoDeEntrenos([...entrenos(9), { id: 99, inicio: entrenos(9)[8].inicio }], 109 - 1)).toEqual(expect.objectContaining({ numero: 10 }))
    const w = entrenos(1000)
    expect(w.filter(x => hitoDeEntrenos(w, x.id)).map(x => hitoDeEntrenos(w, x.id)!.numero)).toEqual([10, 25, 50, 100, 250, 500, 1000])
  })

  it('«Desde el…», con el año si no es este', () => {
    const marzo = new Date(2026, 2, 3, 18).getTime()
    expect(textoDesde(marzo, new Date(2026, 9, 23).getTime())).toBe('Desde el 3 mar')
    expect(textoDesde(marzo, new Date(2027, 0, 2).getTime())).toBe('Desde el 3 mar de 2026')
  })
})

describe('restoRecords', () => {
  it('cuenta los que no caben en la franja, en singular o plural', () => {
    expect(restoRecords(0)).toBeUndefined()
    expect(restoRecords(1)).toBe('y 1 récord más')
    expect(restoRecords(8)).toBe('y 8 récords más')
    expect(restoRecords(1200)).toBe('y 1.200 récords más')
  })
})

describe('ejerciciosDelPoster', () => {
  const serie = (id: number, exerciseId: number, peso: number, reps: number, extra: Partial<SetEntry> = {}): SetEntry =>
    ({ id, workoutId: 1, exerciseId, peso, reps, orden: id, createdAt: id, realizada: true, ...extra })
  const nombres = { 1: 'Press banca', 2: 'Fondos', 3: 'Curl' }

  it('en el orden del entreno, sus series efectivas como pastillas (las de récord marcadas) y la mejora del récord principal', () => {
    const sets = [
      serie(1, 1, 60, 10, { tipo: 'calentamiento' }), serie(2, 1, 80, 8), serie(3, 1, 100, 5),
      serie(4, 2, 0, 12, { modoCarga: 'corporal' }), serie(5, 3, 12, 10, { realizada: false }),
    ]
    const records: RecordEjercicio[] = [
      { exerciseId: 1, tipo: '1rm', valor: 110, anterior: 108, setId: 2 },
      { exerciseId: 1, tipo: 'peso', valor: 100, anterior: 95, setId: 3 },
    ]
    expect(ejerciciosDelPoster({ ordenEjercicios: [2, 1] }, sets, records, nombres)).toEqual([
      { nombre: 'Fondos', series: [{ texto: 'Corporal × 12', record: false }] },
      { nombre: 'Press banca', mejora: '+5 kg', series: [{ texto: '80 kg × 8', record: true }, { texto: '100 kg × 5', record: true }] },
    ])
  })

  it('omite los ejercicios ocultos', () => {
    expect(ejerciciosDelPoster({ ejerciciosOmitidos: [1] }, [serie(1, 1, 80, 8)], [], nombres)).toEqual([])
  })
})
