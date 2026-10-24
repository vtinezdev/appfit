import { describe, expect, it } from 'vitest'
import type { Entry, SetEntry, Workout } from '../../../shared/db/types'
import { cifrasPeriodo, lineaTarjeta, periodoAResumir, periodoMes, resumirPeriodo } from './tuPeriodo'

const ts = (iso: string) => new Date(`${iso}T10:00:00`).getTime()
const w = (id: number, iso: string): Workout => ({ id, inicio: ts(iso), fin: ts(iso) + 3600000 })
const s = (id: number, workoutId: number, peso: number, reps = 10): SetEntry => ({ id, workoutId, exerciseId: 1, orden: 0, reps, peso, createdAt: id })
const e = (fecha: string, kcal: number): Entry => ({ id: kcal, fecha, comida: 'comida', nombre: 'Tomate', gramos: 100, kcal, prot: 1, carb: 3, grasa: 0, createdAt: 1, foodId: 1 })

describe('«Tu mes» y «Tu año» (B15)', () => {
  it('del 1 al 7, el mes anterior; en enero, el año anterior; nada si ya se cerró', () => {
    expect(periodoAResumir('2026-11-03')).toMatchObject({ tipo: 'mes', clave: '2026-10', titulo: 'Tu octubre', subtitulo: 'octubre de 2026', desde: '2026-10-01', hasta: '2026-10-31' })
    expect(periodoAResumir('2027-01-07')).toMatchObject({ tipo: 'ano', clave: '2026', titulo: 'Tu 2026', desde: '2026-01-01', hasta: '2026-12-31' })
    expect(periodoAResumir('2026-11-08')).toBeNull()
    expect(periodoAResumir('2026-11-02', '2026-10')).toBeNull()
  })

  it('cifras del periodo: entrenos, toneladas, récords, metros, km, días registrados, plantas y el grupo más trabajado', () => {
    const workouts = [w(1, '2026-09-28'), w(2, '2026-10-05'), w(3, '2026-10-20'), { id: 4, inicio: ts('2026-10-25') }]
    const sets = [s(1, 1, 50), s(2, 2, 55), s(3, 3, 60)]
    const r = resumirPeriodo(periodoMes('2026-10'), {
      workouts, sets, exercises: [{ id: 1, nombre: 'Press banca', nombreNorm: 'press banca', grupo: 'Pecho', primaryMuscles: ['pecho'] }],
      actividades: [{ fecha: '2026-10-02', distanciaM: 10_400 }, { fecha: '2026-11-01', distanciaM: 5000 }, { fecha: '2026-10-09', distanciaM: 5000, enCurso: true }],
      entries: [e('2026-10-01', 500), e('2026-10-01', 300), e('2026-10-03', 400), e('2026-09-30', 500)],
      categorias: new Map([['user:1', 'Verduras y hortalizas']]),
      tramos: [{ fecha: '2026-10-05', metros: 150 } as never, { fecha: '2026-09-30', metros: 90 } as never],
    })
    expect(r).toMatchObject({ entrenos: 2, toneladas: 1.2, metros: 150, km: 10, diasRegistrados: 2, plantas: 1, grupo: 'Pecho' })
    // El 5 y el 20 superan al del 28 de septiembre: récord de peso y de 1RM estimado en cada uno.
    expect(r.records).toBe(4)
  })

  it('cifras según los módulos y la línea de la tarjeta', () => {
    const r = { entrenos: 14, toneladas: 38, records: 9, metros: 2140, km: 61, diasRegistrados: 27, plantas: 43, grupo: 'Pecho' }
    const todas = cifrasPeriodo(r, { gym: true, actividades: true, nutricion: true })
    expect(todas.map((c) => c.rotulo)).toEqual(['Entrenos', 'Toneladas', 'Récords', 'Metros subidos', 'Km', 'Días registrados', 'Plantas distintas'])
    expect(lineaTarjeta(todas)).toBe('14 entrenos · 38 t · 9 récords · 2.140 m')
    expect(cifrasPeriodo({ ...r, metros: null }, { gym: false, actividades: true, nutricion: false }).map((c) => c.rotulo)).toEqual(['Km'])
  })
})

describe('imagen de «Tu mes»', async () => {
  const { svgTuPeriodo, nombreArchivoTuPeriodo } = await import('./imagenTuPeriodo')
  it('título, periodo y cifras, escapados, y nombre de archivo', () => {
    const svg = svgTuPeriodo({ titulo: 'Tu octubre', subtitulo: 'octubre de 2026', cifras: [{ rotulo: 'Entrenos', valor: '14' }, { rotulo: 'Km', valor: '61', unidad: 'km' }], grupo: 'Pecho & hombro' },
      { fondo: '0 0 0', texto: '255 255 255', tenue: '200 200 200', filete: '80 80 80' })
    expect(svg).toContain('Tu octubre')
    expect(svg).toContain('APPFIT · OCTUBRE DE 2026')
    expect(svg).toContain('Lo más trabajado: Pecho &amp; hombro')
    expect(svg).toContain('>61</tspan>')
    expect(nombreArchivoTuPeriodo('2026-10', 'Tu octubre')).toBe('appfit-tu-octubre-2026.png')
    expect(nombreArchivoTuPeriodo('2026', 'Tu 2026')).toBe('appfit-tu-2026.png')
  })
})
