import { describe, expect, it } from 'vitest'
import { aplicarConfiguracionCarga, cargaExterna, formatearCarga, validarConfiguracionCarga } from './carga'
import { detectarRecords } from './records'
import { calcularCargaEjercicio } from './cargaMuscular'
import { formatUltimaVez, mejorSet, valoresNuevaSerie, volumenSets } from './workout'
import type { ModoCarga } from '../../../shared/db/types'

const serie = (modoCarga?: ModoCarga, peso = 20, reps = 8) => ({ exerciseId: 1, reps, peso, ...(modoCarga ? { modoCarga } : {}) })
describe('semántica de carga', () => {
  it('kg antiguos siguen externos; asistencia y cuerpo no son tonelaje externo', () => {
    expect(volumenSets([serie(), serie('lastre'), serie('corporal'), serie('asistencia')])).toBe(320)
    expect(volumenSets([{ ...serie('lastre'), tipo: 'calentamiento' }])).toBe(0)
    expect(cargaExterna(serie(undefined, Infinity))).toBe(0)
    expect(cargaExterna(serie(undefined, -10))).toBe(0)
  })
  it('el cambio de significado empieza en cero y corregir masa conserva lastre', () => {
    expect(aplicarConfiguracionCarga(serie(), { modo: 'asistencia', pesoCorporal: 75 })).toEqual({ modoCarga: 'asistencia', peso: 0, pesoCorporal: 75 })
    expect(aplicarConfiguracionCarga(serie('lastre', 10), { modo: 'lastre', pesoCorporal: 80 }).peso).toBe(10)
    expect(aplicarConfiguracionCarga(serie('asistencia', 40), { modo: 'corporal' }).peso).toBe(0)
    expect(aplicarConfiguracionCarga(serie('lastre'), { modo: 'externa' })).toEqual({ modoCarga: undefined, pesoCorporal: undefined, peso: 0 })
  })
  it('el peso corporal es opcional, positivo y finito cuando existe', () => {
    expect(() => validarConfiguracionCarga({ modo: 'corporal' })).not.toThrow()
    for (const pesoCorporal of [0, -1, Infinity, NaN, 1001]) expect(() => validarConfiguracionCarga({ modo: 'corporal', pesoCorporal })).toThrow()
    expect(() => validarConfiguracionCarga({ modo: 'toString' as ModoCarga })).toThrow()
  })
  it('la precarga y Última vez conservan el tipo sin fingir kg externos o pesaje', () => {
    expect(valoresNuevaSerie(serie('asistencia', 30))).toMatchObject({ modoCarga: 'asistencia', peso: 30, reps: 8 })
    expect(formatearCarga(serie('corporal'))).toContain('sin pesaje')
    expect(formatUltimaVez([serie('lastre', 10), serie('asistencia', 10)])).toContain('Lastre +10 kg')
    expect(formatUltimaVez([serie('lastre', 10), serie('asistencia', 10)])).toContain('Asistencia 10 kg')
    expect(mejorSet([serie('lastre', 200), serie(undefined, 20)])).toMatchObject({ peso: 20 })
  })
  it('el mapa cuenta series/reps corporales sin confundir más asistencia con más trabajo', () => {
    const baja = calcularCargaEjercicio([serie('asistencia', 10)])
    const alta = calcularCargaEjercicio([serie('asistencia', 70)])
    expect(baja).toEqual(alta)
    expect(alta.externalVolume).toBe(0)
    expect(calcularCargaEjercicio([serie('lastre', 10)]).externalVolume).toBe(80)
    expect(calcularCargaEjercicio([serie('corporal', 0)]).stimulus).toBeGreaterThan(0)
  })
})

describe('récords comparables', () => {
  it('no compara modos y no convierte antiguos cero kg en corporal', () => {
    expect(detectarRecords([serie('lastre', 30)], [serie(undefined, 20)])).toEqual([])
    expect(detectarRecords([serie('corporal', 0, 12)], [serie(undefined, 0, 8)])).toEqual([])
  })
  it('récord de reps corporal y lastre sin Epley', () => {
    expect(detectarRecords([serie('corporal', 0, 12)], [serie('corporal', 0, 8)])).toEqual([{ exerciseId: 1, tipo: 'reps', valor: 12, anterior: 8, peso: 0, modoCarga: 'corporal' }])
    const records = detectarRecords([serie('lastre', 15)], [serie('lastre', 10)])
    expect(records.some(r => r.tipo === 'peso' && r.modoCarga === 'lastre')).toBe(true)
    expect(records.some(r => r.tipo === '1rm')).toBe(false)
  })
  it('menos asistencia exige al menos las reps anteriores; más ayuda nunca es un récord de peso', () => {
    expect(detectarRecords([serie('asistencia', 10, 8)], [serie('asistencia', 20, 8)])).toContainEqual({ exerciseId: 1, tipo: 'asistencia', valor: 10, anterior: 20, modoCarga: 'asistencia' })
    expect(detectarRecords([serie('asistencia', 10, 3)], [serie('asistencia', 20, 8)])).toEqual([])
    expect(detectarRecords([serie('asistencia', 40, 8)], [serie('asistencia', 20, 8)])).toEqual([])
  })
})
