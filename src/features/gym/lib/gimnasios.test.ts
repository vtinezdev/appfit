import { describe, expect, it } from 'vitest'
import type { SetEntry } from '../../../shared/db/types'
import { dependeDeMaquina, enGimnasio, gimnasioDeSerie, nombresGimnasios, notaPrimeraVez, primeraVez, sinKg, textoGimnasio, validarNombreGimnasio, validarNombreHabitual } from './gimnasios'

describe('dependeDeMaquina', () => {
  it('máquina, polea y smith dependen del gimnasio; barra, mancuernas y corporal no', () => {
    expect(dependeDeMaquina({ equipment: ['maquina'] })).toBe(true)
    expect(dependeDeMaquina({ equipment: ['polea'] })).toBe(true)
    expect(dependeDeMaquina({ equipment: ['smith'] })).toBe(true)
    expect(dependeDeMaquina({ equipment: ['corporal', 'maquina'] })).toBe(true)
    expect(dependeDeMaquina({ equipment: ['barra'] })).toBe(false)
    expect(dependeDeMaquina({ equipment: ['mancuernas'] })).toBe(false)
    expect(dependeDeMaquina({ equipment: ['corporal'] })).toBe(false)
  })
  it('un ejercicio propio sin equipo se trata como máquina', () => {
    expect(dependeDeMaquina({})).toBe(true)
    expect(dependeDeMaquina({ equipment: [] })).toBe(true)
    expect(dependeDeMaquina(undefined)).toBe(true)
  })
})

describe('gimnasioDeSerie y enGimnasio', () => {
  it('solo estampa el gimnasio en ejercicios de máquina fuera del habitual', () => {
    expect(gimnasioDeSerie(3, { equipment: ['maquina'] })).toBe(3)
    expect(gimnasioDeSerie(3, { equipment: ['barra'] })).toBeUndefined()
    expect(gimnasioDeSerie(undefined, { equipment: ['maquina'] })).toBeUndefined()
  })
  it('sin gimnasio es el habitual', () => {
    expect(enGimnasio({}, undefined)).toBe(true)
    expect(enGimnasio({ gimnasioId: 2 }, undefined)).toBe(false)
    expect(enGimnasio({ gimnasioId: 2 }, 2)).toBe(true)
    expect(enGimnasio({}, 2)).toBe(false)
  })
})

describe('nombre del habitual', () => {
  it('se muestra si se puso; vacío vuelve a «Gimnasio habitual»', () => {
    expect(textoGimnasio(undefined, new Map(), 'Basic-Fit Centro')).toBe('Basic-Fit Centro')
    expect(textoGimnasio(undefined, new Map(), '  ')).toBe('Gimnasio habitual')
    expect(textoGimnasio(2, new Map([[2, 'Gym Playa']]), 'Basic-Fit Centro')).toBe('Gym Playa')
  })
  it('no repite el nombre de otro gimnasio, ni otro gimnasio el suyo', () => {
    expect(validarNombreHabitual('  Basic-Fit   Centro ', [])).toBe('Basic-Fit Centro')
    expect(validarNombreHabitual('   ', [])).toBeUndefined()
    expect(() => validarNombreHabitual('gym playa', [{ nombreNorm: 'gym playa' }])).toThrow('otro gimnasio')
    expect(() => validarNombreHabitual('x'.repeat(41), [])).toThrow('40')
    expect(() => validarNombreGimnasio('BASIC-FIT centro', [], undefined, 'Basic-Fit Centro')).toThrow('habitual')
  })
})

describe('nombres', () => {
  it('habitual, nombre guardado u «Otro gimnasio» si ya no existe', () => {
    const nombres = nombresGimnasios([{ id: 1, nombre: 'Gym Playa' }])
    expect(textoGimnasio(undefined, nombres)).toBe('Gimnasio habitual')
    expect(textoGimnasio(1, nombres)).toBe('Gym Playa')
    expect(textoGimnasio(9, nombres)).toBe('Otro gimnasio')
    expect(textoGimnasio(1)).toBe('Otro gimnasio')
  })
  it('valida, limpia y no admite duplicados ni «habitual»', () => {
    const existentes = [{ id: 1, nombreNorm: 'gym playa' }]
    expect(validarNombreGimnasio('  Gym   Centro ', existentes)).toEqual({ nombre: 'Gym Centro', nombreNorm: 'gym centro' })
    expect(() => validarNombreGimnasio('   ', existentes)).toThrow('Escribe un nombre')
    expect(() => validarNombreGimnasio('GYM PLAYA', existentes)).toThrow('Ya tienes')
    expect(validarNombreGimnasio('Gym Playa', existentes, 1).nombre).toBe('Gym Playa')
    expect(() => validarNombreGimnasio('Habitual', existentes)).toThrow('Habitual')
    expect(() => validarNombreGimnasio('x'.repeat(41), existentes)).toThrow('40')
  })
})

describe('sinKg', () => {
  it('vacía los kg y conserva reps y lados', () => {
    expect(sinKg({ reps: 10, peso: 50 })).toEqual({ reps: 10, peso: 0 })
    expect(sinKg({ reps: 10, peso: 0, lados: { izquierda: { reps: 8, peso: 20 } } })).toEqual({ reps: 10, peso: 0, lados: { izquierda: { reps: 8, peso: 0 } } })
  })
})

describe('primeraVez', () => {
  const s = (id: number, over: Partial<SetEntry> = {}): SetEntry => ({ id, workoutId: 1, exerciseId: 1, orden: 0, reps: 10, peso: 100, createdAt: id, realizada: true, ...over })
  const prensa = { id: 1, equipment: ['maquina'] }
  it('da la última efectiva realizada del habitual solo si nunca se hizo en ese gimnasio', () => {
    const todas = [s(1, { peso: 100 }), s(2, { peso: 110 }), s(3, { peso: 200, realizada: false }), s(4, { workoutId: 9, peso: 0, gimnasioId: 5 })]
    expect(primeraVez(todas, prensa, { id: 9, gimnasioId: 5 })).toEqual({ habitual: todas[1] })
    expect(primeraVez([...todas, s(5, { workoutId: 2, gimnasioId: 5 })], prensa, { id: 9, gimnasioId: 5 })).toBeUndefined()
    expect(primeraVez([], prensa, { id: 9, gimnasioId: 5 })).toEqual({})
  })
  it('no toca en el habitual ni con barra', () => {
    expect(primeraVez([s(1)], prensa, { id: 9 })).toBeUndefined()
    expect(primeraVez([s(1)], { id: 1, equipment: ['barra'] }, { id: 9, gimnasioId: 5 })).toBeUndefined()
  })
})

describe('notaPrimeraVez', () => {
  it('RIR y reps de la última vez en el habitual, con su carga como referencia', () => {
    expect(notaPrimeraVez('Gym Playa', { reps: 10, peso: 50, rir: 1 })).toBe('Primera vez en Gym Playa: busca RIR 1 en 10 repeticiones. En tu habitual: 10 repeticiones con 50 kg.')
  })
  it('sin RIR registrado propone 2; con lados usa el izquierdo', () => {
    expect(notaPrimeraVez('Gym Playa', { reps: 12, peso: 40 })).toContain('busca RIR 2 en 12 repeticiones')
    expect(notaPrimeraVez('Gym Playa', { reps: 0, peso: 0, ejecucion: 'lados', lados: { izquierda: { reps: 8, peso: 15, rir: 3 } } })).toBe('Primera vez en Gym Playa: busca RIR 3 en 8 repeticiones. En tu habitual: 8 repeticiones con 15 kg por lado.')
  })
  it('sin historial en el habitual solo orienta con el RIR', () => {
    expect(notaPrimeraVez('Gym Playa', undefined)).toBe('Primera vez en Gym Playa: elige un peso con el que te queden unas 2 repeticiones en reserva.')
  })
})
