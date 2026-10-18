import { describe, expect, it } from 'vitest'
import { agruparRecords, formatoRecord, ordenarRecords, recordsSocial } from './records'
import { conNota, leerResumen, resumenActividad, resumenEntreno, type LineaLogro } from './publicacion'

const record: LineaLogro = { ejercicio: 'Press banca', texto: 'Peso máximo: 85 kg', tipo: 'peso', modo: 'externa', valor: 85, anterior: 82.5 }
const datos = { titulo: 'Torso', inicio: 0, fin: 60000, series: 5, volumenKg: 100, ejercicios: ['Press banca'], records: [record], ligas: [], logros: [] }

describe('récords públicos', () => {
  it('deja el 1RM y las reps a pesos menores en Progreso', () => {
    const records: LineaLogro[] = [record, { ...record, tipo: '1rm' }, { ...record, tipo: 'reps', peso: 60 }, { ...record, tipo: 'reps', peso: 70 }]
    expect(recordsSocial(records).map(r => [r.tipo, r.peso])).toEqual([['peso', undefined], ['reps', 70]])
  })
  it('el corte de seis conserva antes un récord de cada ejercicio y el total real', () => {
    const records: LineaLogro[] = Array.from({ length: 7 }, (_, i) => ({ ...record, ejercicio: `Ejercicio ${i}` }))
    const resumen = resumenEntreno({ ...datos, records: [...records, { ...record, ejercicio: 'Ejercicio 0', tipo: 'reps' }] })
    expect(resumen.records).toHaveLength(6)
    expect(new Set(resumen.records.map(r => r.ejercicio)).size).toBe(6)
    expect(resumen.recordsTotal).toBe(8)
    expect(resumen.recordsEjercicios).toBe(7)
    expect(leerResumen(resumen)).toEqual(resumen)
  })
  it('prioriza el peso, conserva publicaciones antiguas sin inferir sus cifras', () => {
    expect(ordenarRecords([{ ...record, tipo: 'reps' }, record])[0].tipo).toBe('peso')
    const antigua = { ejercicio: 'Press banca', texto: 'Mi récord antiguo' }
    expect(agruparRecords([antigua, antigua])).toHaveLength(1)
    expect(formatoRecord(antigua)).toEqual({ ahora: antigua.texto, antes: '', mejora: '' })
  })
  it('formatea coma decimal, corporal, lastre y asistencia', () => {
    expect(formatoRecord(record).mejora).toBe('+2,5 kg')
    expect(formatoRecord({ ...record, tipo: 'reps', modo: 'corporal', valor: 12, anterior: 10 }).ahora).toBe('12 reps')
    expect(formatoRecord({ ...record, modo: 'lastre', valor: 20, anterior: 15 })).toMatchObject({ ahora: '+20 kg', mejora: '+5 kg' })
    expect(formatoRecord({ ...record, tipo: 'asistencia', modo: 'asistencia', valor: 20, anterior: 25 })).toMatchObject({ ahora: '20 kg de asistencia', mejora: '−5 kg' })
  })
  it('la nota es opcional, validada y propia de cada copia', () => {
    const original = resumenActividad({ tipo: 'correr', titulo: 'Carrera', duracionSeg: 60, distanciaM: 100 })
    const seguidores = conNota(original, ' Buena salida ')
    const comunidad = conNota(original, 'Con el grupo')
    expect(original).not.toHaveProperty('nota')
    expect(seguidores).toHaveProperty('nota', 'Buena salida')
    expect(comunidad).toHaveProperty('nota', 'Con el grupo')
    expect(leerResumen(seguidores)).toEqual(seguidores)
    expect(leerResumen({ ...original, nota: 'a'.repeat(281) })).toBeNull()
    expect(leerResumen({ ...original, nota: 123 })).toBeNull()
  })
})

it('el resumen máximo con metadatos y nota respeta los 8 KB del servidor', () => {
  const largo='é'.repeat(60)
  const maximo=conNota(resumenEntreno({ ...datos, titulo:largo, ejercicios:Array.from({length:15},(_,i)=>`${i}${largo}`),
    records:Array.from({length:6},(_,i)=>({...record,ejercicio:`${i}${largo}`,texto:largo,variante:largo})),
    ligas:Array.from({length:6},()=>({ejercicio:largo,texto:largo})),logros:Array.from({length:6},()=>largo),
  }),'é'.repeat(280))
  // JSONB añade un espacio tras cada separador. Estos fixtures no contienen separadores en el texto.
  expect(new TextEncoder().encode(JSON.stringify(maximo).replace(/[,:]/g,'$& ')).length).toBeLessThanOrEqual(8192)
})
