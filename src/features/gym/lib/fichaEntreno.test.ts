import { describe, expect, it } from 'vitest'
import { partesRecord, pastillaSerie, recordsPorEjercicio, resumenEjercicio, seriesConRecord, seriesPublicables } from './fichaEntreno'
import type { RecordEjercicio } from './records'

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
