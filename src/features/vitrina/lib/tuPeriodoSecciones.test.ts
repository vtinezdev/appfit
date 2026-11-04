import { describe, expect, it } from 'vitest'
import type { Actividad, Entry, Exercise, Objetivos, SetEntry, Workout } from '../../../shared/db/types'
import type { ResultadoCaminos } from '../../caminos/lib/caminos'
import type { ResultadoCumbres } from '../../cumbres/lib/cumbres'
import type { Logro } from './logros'
import { periodoAno, periodoMes } from './tuPeriodo'
import {
  actividadesDelPeriodo, calendarioPeriodo, caminosDelPeriodo, cumbresDelPeriodo, entrenoDelPeriodo, frasePeriodo, lineaMomentos,
  logrosDelPeriodo, nutricionDelPeriodo, recordsDelPeriodo, cifraRecord, cifrasImagen, momentosImagen,
} from './tuPeriodoSecciones'

const octubre = periodoMes('2026-10')
const ts = (iso: string, h = 10) => new Date(`${iso}T${String(h).padStart(2, '0')}:00:00`).getTime()
const w = (id: number, iso: string, minutos = 60): Workout => ({ id, inicio: ts(iso), fin: ts(iso) + minutos * 60000 })
let idSet = 0
const s = (workoutId: number, exerciseId: number, peso: number, reps = 5, extra: Partial<SetEntry> = {}): SetEntry =>
  ({ id: ++idSet, workoutId, exerciseId, orden: 0, reps, peso, createdAt: idSet, ...extra })
const ex = (id: number, nombre: string): Exercise => ({ id, nombre, nombreNorm: nombre.toLowerCase(), grupo: 'Pecho', primaryMuscles: ['pecho'] })
const e = (fecha: string, kcal: number, prot = 0, carb = 0, grasa = 0): Entry =>
  ({ id: Math.random(), fecha, comida: 'comida', nombre: 'Algo', gramos: 100, kcal, prot, carb, grasa, createdAt: 1, foodId: 1 })
const act = (id: number, fecha: string, km: number, extra: Partial<Actividad> = {}): Actividad =>
  ({ id, tipo: 'correr', fecha, inicio: ts(fecha), duracionSeg: km * 300, distanciaM: km * 1000, origen: 'manual', createdAt: 1, ...extra })

describe('calendario del mes', () => {
  it('empieza en lunes y marca entrenos, actividades y comidas de cada día', () => {
    const c = calendarioPeriodo(octubre, {
      workouts: [w(1, '2026-10-01'), { id: 2, inicio: ts('2026-10-02') }],
      actividades: [{ fecha: '2026-10-04' }, { fecha: '2026-10-05', enCurso: true }],
      entries: [e('2026-10-01', 400), e('2026-10-03', 0)],
    })!
    expect(c.hueco).toBe(3) // el 1 de octubre de 2026 es jueves
    expect(c.dias).toHaveLength(31)
    expect(c.dias[0]).toEqual({ fecha: '2026-10-01', dia: 1, entreno: true, actividad: false, comidas: true })
    expect(c.dias[1].entreno).toBe(false) // sin terminar
    expect(c.dias[2].comidas).toBe(false) // 0 kcal
    expect(c.dias[3].actividad).toBe(true)
    expect(c.dias[4].actividad).toBe(false)
    expect(calendarioPeriodo(periodoAno(2026), { workouts: [], actividades: [], entries: [] })).toBeNull()
  })
})

describe('récords del periodo', () => {
  it('uno por ejercicio con el peso máximo, lastre o repeticiones sin peso, y lo que mejora a la marca de antes', () => {
    idSet = 0
    const workouts = [w(1, '2026-09-20'), w(2, '2026-10-05'), w(3, '2026-10-20')]
    const sets = [
      s(1, 1, 80), s(2, 1, 82.5), s(3, 1, 85), // banca: 80 → 85
      s(1, 2, 10, 8, { modoCarga: 'lastre' }), s(3, 2, 15, 6, { modoCarga: 'lastre' }), // dominadas con lastre: +5
      s(1, 3, 0, 20, { modoCarga: 'corporal' }), s(2, 3, 0, 24, { modoCarga: 'corporal' }), // flexiones: 20 → 24 reps
      s(1, 4, 50, 5), s(2, 4, 50, 8), // solo más reps con el mismo peso: no sale
    ]
    const r = recordsDelPeriodo(octubre, { workouts, sets, exercises: [ex(1, 'Press banca'), ex(2, 'Dominadas'), ex(3, 'Flexiones'), ex(4, 'Remo')] })
    expect(r).toEqual([
      { exerciseId: 1, nombre: 'Press banca', tipo: 'peso', valor: 85, mejora: 5, fecha: '2026-10-20' },
      { exerciseId: 2, nombre: 'Dominadas', tipo: 'lastre', valor: 15, mejora: 5, fecha: '2026-10-20' },
      { exerciseId: 3, nombre: 'Flexiones', tipo: 'reps', valor: 24, mejora: 4, fecha: '2026-10-05' },
    ])
  })
})

describe('entreno del periodo', () => {
  it('cifras, toneladas por semana con la mejor marcada y grupos', () => {
    idSet = 0
    const workouts = [w(1, '2026-10-01', 50), w(2, '2026-10-14', 70), w(3, '2026-11-02')]
    const sets = [s(1, 1, 100, 10), s(2, 1, 100, 10), s(2, 1, 100, 10), s(2, 1, 20, 10, { tipo: 'calentamiento' }), s(3, 1, 100, 10)]
    const r = entrenoDelPeriodo(octubre, { workouts, sets, exercises: [ex(1, 'Press banca')] })!
    expect(r).toMatchObject({ entrenos: 2, toneladas: 3, series: 3, duracionMediaMin: 60 })
    expect(r.tramos.map((t) => t.etiqueta)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5'])
    expect(r.tramos[0]).toEqual({ etiqueta: 'S1', nombre: 'del 1 al 4', toneladas: 1 })
    expect(r.tramos[4].nombre).toBe('del 26 al 31')
    expect(r.mejorTramo).toBe(2)
    expect(r.grupos[0].series).toBe(3)
    expect(entrenoDelPeriodo(octubre, { workouts: [w(3, '2026-11-02')], sets: [], exercises: [] })).toBeNull()
    expect(entrenoDelPeriodo(periodoAno(2026), { workouts, sets, exercises: [ex(1, 'Press banca')] })!.tramos.map((t) => t.etiqueta).join('')).toBe('EFMAMJJASOND')
  })
})

describe('nutrición del periodo', () => {
  const obj = (kcal: number): Objetivos => ({ kcal, prot: 150, carb: 250, grasa: 70 })
  it('días por debajo, en el objetivo (±10 %) y por encima, con el objetivo de cada día; sin cheat days', () => {
    const entries = [
      e('2026-10-01', 2000, 150, 200, 70), // en objetivo (2.000)
      e('2026-10-02', 1700), // por debajo (< 1.800)
      e('2026-10-03', 1100), e('2026-10-03', 1100), // 2.200: en el límite, en objetivo
      e('2026-10-04', 2300), // por encima
      e('2026-10-05', 3000), // cheat day: fuera
      e('2026-09-30', 2000),
    ]
    const objetivos = new Map(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'].map((f) => [f, obj(2000)]))
    const r = nutricionDelPeriodo(octubre, { entries, objetivos, cheatDays: new Set(['2026-10-05']) }, '2026-11-03')!
    expect(r).toMatchObject({ diasRegistrados: 4, diasDelPeriodo: 31, porDebajo: 1, enObjetivo: 2, porEncima: 1, franja: { min: 1800, max: 2200 } })
    expect(r.objetivo).toEqual(obj(2000))
    expect(r.media.kcal).toBe(2050)
    expect(r.reparto.prot + r.reparto.carb + r.reparto.grasa).toBe(100)
  })

  it('con objetivos distintos no hay una franja única; sin registros, nada', () => {
    const r = nutricionDelPeriodo(octubre, { entries: [e('2026-10-01', 2000), e('2026-10-02', 2000)], objetivos: new Map([['2026-10-01', obj(2000)], ['2026-10-02', obj(2400)]]), cheatDays: new Set() }, '2026-11-03')!
    expect(r.franja).toBeNull()
    expect(r.enObjetivo + r.porDebajo).toBe(2)
    expect(nutricionDelPeriodo(octubre, { entries: [], objetivos: new Map(), cheatDays: new Set() }, '2026-11-03')).toBeNull()
  })
})

describe('actividades del periodo', () => {
  it('distancia, salidas, tiempo, desnivel, reparto por tipo y la más larga', () => {
    const r = actividadesDelPeriodo(octubre, [
      act(1, '2026-10-02', 10, { desnivelM: 100 }), act(2, '2026-10-09', 21, { tipo: 'senderismo', desnivelM: 640, nombre: 'Cercedilla' }),
      act(3, '2026-10-10', 5, { tipo: 'caminar' }), act(4, '2026-10-11', 8, { enCurso: true }), act(5, '2026-11-01', 30),
    ])!
    expect(r).toMatchObject({ metros: 36000, salidas: 3, segundos: 36 * 300, desnivel: 740 })
    expect(r.porTipo.map((t) => t.tipo)).toEqual(['senderismo', 'correr', 'caminar'])
    expect(r.masLarga.id).toBe(2)
    expect(actividadesDelPeriodo(octubre, [act(5, '2026-11-01', 30)])).toBeNull()
  })
})

describe('lo mejor del periodo', () => {
  it('cumbres coronadas en el periodo y la que se sube si avanzó', () => {
    const mont = (id: string) => ({ id, nombre: id, altitud: 3000, zona: '', coleccion: 'espana' as const })
    const coronada = { montana: mont('mulhacen'), vez: 1, desde: '2026-09-01', metros: 3000, hitos: [], cumbre: { fecha: '2026-10-12' } }
    const vieja = { ...coronada, montana: mont('aneto'), cumbre: { fecha: '2026-09-10' } }
    const actual = { montana: mont('teide'), vez: 1, desde: '2026-10-12', metros: 640, hitos: [], cumbre: null }
    const r = { expediciones: [vieja, coronada, actual], coronadas: [vieja, coronada], actual, tramos: [
      { fecha: '2026-10-12', metros: 500, tipo: 'entreno', expedicion: 1 }, { fecha: '2026-10-20', metros: 640, tipo: 'entreno', expedicion: 2 },
    ] } as unknown as ResultadoCumbres
    const c = cumbresDelPeriodo(octubre, r)!
    expect(c.metros).toBe(1140)
    expect(c.coronadas.map((x) => x.montana.id)).toEqual(['mulhacen'])
    expect(c.enCurso?.montana.id).toBe('teide')
    expect(cumbresDelPeriodo(periodoMes('2026-08'), r)).toBeNull()
    expect(cumbresDelPeriodo(octubre, null)).toBeNull()
  })

  it('caminos terminados en el periodo', () => {
    const ruta = (id: string) => ({ id, nombre: id, zona: '', desde: '', coleccion: 'santiago' as const, etapas: [] })
    const hecho = { ruta: ruta('primitivo'), vez: 1, desde: '2026-08-01', metros: 1, arrastrados: 0, etapas: [], llegada: { fecha: '2026-10-25', actividadId: 1 }, sellos: [] }
    const actual = { ...hecho, ruta: ruta('norte'), llegada: null }
    const r = { expediciones: [hecho, actual], completadas: [hecho], actual, tramos: [{ fecha: '2026-10-25', metros: 2000, actividadId: 1, expedicion: 0 }] } as unknown as ResultadoCaminos
    const c = caminosDelPeriodo(octubre, r)!
    expect(c).toMatchObject({ metros: 2000, enCurso: null })
    expect(c.completados).toHaveLength(1)
  })

  it('logros: uno por logro, con su nivel más alto o cuántas veces, del más reciente al más antiguo', () => {
    const logros = [
      { id: 'entrenos', nombre: 'Entrenos', grupo: 'entreno', descripcion: '', niveles: [{ fecha: '2026-05-01' }, { fecha: '2026-10-08' }, { fecha: '2026-10-09' }] },
      { id: 'dia-redondo', nombre: 'Día redondo', grupo: 'constancia', descripcion: '', niveles: [], veces: [{ fecha: '2026-10-03' }, { fecha: '2026-10-20' }, { fecha: '2026-11-01' }] },
    ] as unknown as Logro[]
    expect(logrosDelPeriodo(octubre, logros).map((l) => [l.logro.id, l.nivel, l.veces, l.fecha])).toEqual([['dia-redondo', null, 2, '2026-10-20'], ['entrenos', 3, 2, '2026-10-09']])
    expect(logrosDelPeriodo(octubre, null)).toEqual([])
  })
})

describe('frases', () => {
  it('la frase de la portada y la línea de la tarjeta', () => {
    expect(frasePeriodo({ entrenos: 14, cumbres: 2, caminos: 1, km: 86, diasRegistrados: 26 })).toBe('14 entrenos, 2 cumbres y 1 camino terminado.')
    expect(frasePeriodo({ entrenos: null, cumbres: 0, caminos: null, km: 12, diasRegistrados: 1 })).toBe('12 km y 1 día registrado.')
    expect(frasePeriodo({ entrenos: 0, cumbres: null, caminos: null, km: null, diasRegistrados: null })).toBeNull()
    expect(lineaMomentos({ cumbres: 2, caminos: 1, records: 9, logros: 0 })).toBe('2 cumbres · 1 camino · 9 récords')
    expect(lineaMomentos({ cumbres: 0, caminos: 0, records: 0, logros: 0 })).toBeNull()
  })
})

describe('imagen: cifras y momentos', () => {
  it('cuatro cifras según lo que se usa y los momentos en orden', () => {
    const entreno = { entrenos: 13, toneladas: 53.5, records: [{ exerciseId: 1, nombre: 'Sentadilla', tipo: 'peso', valor: 125, mejora: 5, fecha: '2026-10-29' }, { exerciseId: 2, nombre: 'Flexiones', tipo: 'reps', valor: 29, mejora: 3, fecha: '2026-10-29' }] } as never
    const cumbres = { metros: 3669, coronadas: [{ montana: { nombre: 'Aneto' }, cumbre: { fecha: '2026-10-25' } }], enCurso: null } as never
    expect(cifrasImagen({ entreno, nutricion: null, actividades: null, cumbres }).map((c) => c.rotulo)).toEqual(['Entrenos', 'Volumen', 'Subidos'])
    const m = momentosImagen({ cumbres, caminos: null, entreno, logros: [{} as never, {} as never] }, (f) => f.slice(8))
    expect(m).toEqual([
      { icono: 'mountain', texto: 'Aneto', detalle: 'Cumbre · 25' },
      { icono: 'trophy', texto: 'Sentadilla · 125 kg', detalle: 'y 1 récord más' },
      { icono: 'sparkles', texto: '2 logros nuevos', detalle: 'Vitrina' },
    ])
    expect(cifraRecord({ tipo: 'lastre', valor: 15 })).toBe('+15 kg')
    expect(cifraRecord({ tipo: 'reps', valor: 29 })).toBe('29 reps')
  })
})
