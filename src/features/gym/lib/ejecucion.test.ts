import { describe, expect, it } from 'vitest'
import { aplicarEjecucion, claveComparacion, convencional, opcionesAgarre, partesTramo, repsEstimulo, validarSerie, volumenSerie } from './ejecucion'
import { detectarRecords } from './records'
import { datosProgreso } from './progreso'
import { calcularCargaEjercicio } from './cargaMuscular'
import { volumenSets } from './workout'
import type { SetEntry } from '../../../shared/db/types'
const serie = (patch: Partial<SetEntry> = {}): SetEntry => ({ id: 1, workoutId: 1, exerciseId: 1, orden: 0, reps: 10, peso: 20, createdAt: 1, ...patch })
describe('ejecución semántica', () => {
  it('suma ambos lados una vez y distingue kg totales de kg por lado', () => {
    expect(volumenSerie(serie())).toBe(200)
    expect(volumenSerie(serie({ ejecucion: 'unilateral' }))).toBe(400)
    expect(volumenSerie(serie({ ejecucion: 'unilateral', kgUnilateral: 'total' }))).toBe(200)
    expect(repsEstimulo(serie({ ejecucion: 'unilateral' }))).toBe(10)
  })
  it('suma solo lados registrados y permite asimetría sin inventar el otro', () => {
    const s = serie({ ejecucion: 'lados', lados: { izquierda: { reps: 8, peso: 20 }, derecha: { reps: 6, peso: 15 } } })
    expect(volumenSerie(s)).toBe(250)
    expect(repsEstimulo(s)).toBe(7)
    expect(volumenSerie({ ...s, lados: { izquierda: s.lados!.izquierda } })).toBe(160)
    expect(repsEstimulo({ ...s, lados: { izquierda: s.lados!.izquierda } })).toBe(4)
  })
  it('dropsets suman tramos una vez y siguen siendo una sola serie muscular', () => {
    const s = serie({ bajadas: [{ id: 'b', reps: 8, peso: 15 }, { id: 'c', reps: 6, peso: 10 }] })
    expect(volumenSets([s])).toBe(380)
    expect(calcularCargaEjercicio([s]).sets).toBe(1)
    expect(repsEstimulo(s)).toBe(24)
    expect(convencional(s)).toBe(false)
    expect(repsEstimulo({ ...s, bajadas: [{ id: 'x', reps: 1000, peso: 1 }] })).toBe(30)
  })
  it('corporal/asistencia nunca aportan tonelaje, ni con lados o bajadas', () => {
    for (const modoCarga of ['corporal', 'asistencia'] as const) expect(volumenSerie(serie({ modoCarga, ejecucion: 'unilateral', bajadas: [{ id: 'x', reps: 8, peso: 15 }] }))).toBe(0)
  })
  it('separa orientación, anchura, accesorio, ejecución y tempo con clave estable', () => {
    expect(claveComparacion(serie())).not.toBe(claveComparacion(serie({ ejecucion: 'unilateral' })))
    expect(claveComparacion(serie({ agarre: { orientacion: 'prono', anchura: 'medio' } }))).toBe(claveComparacion(serie({ agarre: { anchura: 'medio', orientacion: 'prono' } })))
    expect(claveComparacion(serie({ soloNegativas: true }))).not.toBe(claveComparacion(serie()))
    expect(claveComparacion(serie({ excentricaSeg: 3 }))).not.toBe(claveComparacion(serie()))
    expect(claveComparacion(serie({ ejecucion: 'lados', lados: { izquierda: { reps: 8, peso: 10 } } }))).not.toBe(claveComparacion(serie({ ejecucion: 'lados', lados: { derecha: { reps: 8, peso: 10 } } })))
  })
  it('no reinterpreta kg al cambiar ejecución y conserva datos al cambiar solo agarre', () => {
    expect(aplicarEjecucion(serie(), { ejecucion: 'unilateral' })).toMatchObject({ reps: 0, peso: 0, lados: undefined, bajadas: undefined })
    expect(aplicarEjecucion(serie(), { ejecucion: 'bilateral', agarre: { orientacion: 'neutro' } })).not.toHaveProperty('peso')
  })
  it('solo ofrece agarres relevantes y respeta ejercicios oficiales ya diferenciados', () => {
    const ex = (id: string) => ({ id: 1, nombre: 'Ejercicio', nombreNorm: 'ejercicio', grupo: 'General', catalogId: id })
    expect(opcionesAgarre(ex('appfit:sentadilla')).orientacion).toBe(false)
    expect(opcionesAgarre(ex('appfit:jalon-pecho')).orientacion).toBe(true)
    expect(opcionesAgarre(ex('appfit:jalon-neutro')).orientacion).toBe(false)
    expect(opcionesAgarre(ex('appfit:extension-triceps-cuerda')).accesorio).toBe(false)
  })
  it('negativas/dropsets no crean récords ni curvas convencionales', () => {
    const anterior = serie({ peso: 10 })
    for (const especial of [{ soloNegativas: true }, { bajadas: [{ id: 'b', reps: 10, peso: 5 }] }]) {
      const s = serie(especial)
      expect(detectarRecords([s], [anterior])).toEqual([])
      expect(datosProgreso([s], [{ id: 1, inicio: 1, fin: 2 }], 'externa')).toEqual([])
    }
  })
  it('variantes no generan récord frente a bilateral ni estiman 1RM unilateral', () => {
    const s = serie({ ejecucion: 'unilateral', peso: 30 })
    expect(detectarRecords([s], [serie()])).toEqual([])
    expect(detectarRecords([s], [serie({ ejecucion: 'unilateral' })]).some(r => r.tipo === '1rm')).toBe(false)
  })
  it('realización falsa no aporta volumen/mapa; desconocida conserva histórico', () => {
    expect(volumenSets([serie({ realizada: false })])).toBe(0)
    expect(calcularCargaEjercicio([serie({ realizada: false })]).sets).toBe(0)
    expect(volumenSets([serie()])).toBe(200)
  })
  it('rechaza valores extremos, tiempos y ids duplicados sin aceptar negativos', () => {
    expect(() => validarSerie(serie({ peso: Infinity }))).toThrow()
    expect(() => validarSerie(serie({ excentricaSeg: -2 }))).toThrow()
    expect(() => validarSerie(serie({ lados: { izquierda: { reps: -1, peso: 10 } } }))).toThrow()
    expect(() => validarSerie(serie({ bajadas: [{ id: 'x', peso: 10, reps: 8 }, { id: 'x', peso: 5, reps: 6 }] }))).toThrow()
    expect(partesTramo(serie({ ejecucion: 'lados' }))).toEqual([])
  })
})
