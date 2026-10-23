import { describe, expect, it } from 'vitest'
import { hitosDeSesion, MAX_HITOS, resumenCuerpo, resumenCumbresLigas, resumenRecords, type DatosHitos } from './fichaEntreno'
import type { RecordEjercicio } from './records'

const rec = (exerciseId: number, tipo: RecordEjercicio['tipo'], valor: number, anterior: number, peso?: number): RecordEjercicio => ({ exerciseId, tipo, valor, anterior, ...(peso ? { peso } : {}) })
const nombres = { 1: 'Press banca', 2: 'Sentadilla', 3: 'Remo' }
const vacio: DatosHitos = { records: [], nombres, subidas: [], cumbre: null, ligas: [], logros: [] }

describe('franja «Hoy» del fin de sesión', () => {
  it('sin nada que contar, ningún hito', () => {
    expect(hitosDeSesion(vacio)).toEqual([])
    expect(hitosDeSesion({ ...vacio, cumbre: { metros: 0, cimas: [] } })).toEqual([])
  })

  it('primero uno de cada tipo en el orden de D9; tres récords no tapan la cima ni la liga', () => {
    const h = hitosDeSesion({ ...vacio,
      records: [rec(1, '1rm', 104.5, 98.2), rec(1, 'peso', 82.5, 77.5), rec(2, 'peso', 120, 117.5), rec(3, 'reps', 10, 8, 70)],
      cumbre: { metros: 120, cimas: ['Teide'] }, ligas: [{ exerciseId: 3, texto: 'Sube a Plata' }], logros: ['Constancia II'] })
    expect(h).toHaveLength(MAX_HITOS)
    expect(h.map(x => x.tipo)).toEqual(['record', 'cumbre', 'liga'])
    // De cada ejercicio, el récord de peso antes que el 1RM.
    expect(h[0]).toEqual({ tipo: 'record', etiqueta: 'Récord', texto: 'Press banca · Peso máximo: 82,5 kg (+5 kg)' })
    expect(h[1].texto).toBe('Cumbre del Teide')
    expect(h[2].texto).toBe('Remo · Sube a Plata')
  })

  it('con sitio de sobra, más récords (uno por ejercicio antes que repetir)', () => {
    const h = hitosDeSesion({ ...vacio, records: [rec(1, '1rm', 104.5, 98.2), rec(1, 'peso', 82.5, 77.5), rec(2, 'peso', 120, 117.5)], subidas: [{ musculo: 'Pecho', nivel: 'Básico III' }] })
    expect(h.map(x => x.texto)).toEqual(['Press banca · Peso máximo: 82,5 kg (+5 kg)', 'Pecho sube a Básico III', 'Sentadilla · Peso máximo: 120 kg (+2,5 kg)'])
  })

  it('metros sin cima y logros; nunca más de tres', () => {
    const h = hitosDeSesion({ ...vacio, cumbre: { metros: 85, cimas: [] }, logros: ['Constancia II', 'Madrugador', 'Vuelta al ruedo', 'Otro'] })
    expect(h.map(x => `${x.etiqueta}: ${x.texto}`)).toEqual(['Cumbres: +85 m de subida', 'Vitrina: Constancia II', 'Vitrina: Madrugador'])
  })
})

describe('resúmenes de los bloques plegables', () => {
  it('récords, cuerpo y cumbres y ligas en una línea', () => {
    expect(resumenRecords([rec(1, 'peso', 82.5, 77.5), rec(1, '1rm', 104.5, 98.2), rec(2, 'peso', 120, 117.5)], nombres)).toBe('3 récords en 2 ejercicios')
    expect(resumenRecords([rec(1, 'peso', 82.5, 77.5)], nombres)).toBe('1 récord en Press banca')
    expect(resumenCuerpo([{ musculo: 'Pecho', nivel: 'Básico II' }, { musculo: 'Bíceps', nivel: 'Básico I' }], 5)).toBe('Pecho sube a Básico II y 1 más')
    expect(resumenCuerpo([], 5)).toBe('5 grupos trabajados')
    expect(resumenCumbresLigas({ metros: 120, cimas: [] }, [{ exerciseId: 3, texto: 'Sube a Plata' }], 0, nombres, true)).toBe('+120 m · Remo · Sube a Plata')
    expect(resumenCumbresLigas({ metros: 0, cimas: [] }, [], 2, nombres, true)).toBe('2 ejercicios suman una semana')
    expect(resumenCumbresLigas(null, [], 0, nombres, false)).toBe('Elige tu primera montaña')
    expect(resumenCumbresLigas({ metros: 0, cimas: [] }, [], 0, nombres, true)).toBe('Este entreno no sube metros')
  })
})
