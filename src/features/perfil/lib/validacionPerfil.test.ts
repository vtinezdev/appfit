import { describe, expect, it } from 'vitest'
import {
  ALTURA_MAX, ALTURA_MIN, camposPendientes, edadEn, esFechaISO, listaCampos, normalizarPerfil, perfilVacio, validarAltura, validarFechaNacimiento,
} from './validacionPerfil'

describe('fechas', () => {
  it('detecta fechas inexistentes', () => {
    expect(esFechaISO('2026-02-30')).toBe(false)
    expect(esFechaISO('2026-13-01')).toBe(false)
    expect(esFechaISO('26-01-01')).toBe(false)
    expect(esFechaISO(20260101)).toBe(false)
    expect(esFechaISO('2024-02-29')).toBe(true)
  })
  it('la edad cambia exactamente el día del cumpleaños', () => {
    expect(edadEn('1996-10-07', '2026-10-06')).toBe(29)
    expect(edadEn('1996-10-06', '2026-10-06')).toBe(30)
    expect(edadEn('1996-10-05', '2026-10-06')).toBe(30)
  })
  it('quien nació un 29 de febrero cumple en marzo los años no bisiestos', () => {
    expect(edadEn('2000-02-29', '2025-02-28')).toBe(24)
    expect(edadEn('2000-02-29', '2025-03-01')).toBe(25)
  })
  it('límites de edad 18 y 100, futuras e inválidas', () => {
    const hoy = '2026-10-06'
    expect(validarFechaNacimiento('2008-10-06', hoy)).toMatchObject({ ok: true, edad: 18 })
    expect(validarFechaNacimiento('2008-10-07', hoy)).toMatchObject({ ok: false })
    expect(validarFechaNacimiento('1926-10-06', hoy)).toMatchObject({ ok: true, edad: 100 })
    expect(validarFechaNacimiento('1925-10-06', hoy)).toMatchObject({ ok: false })
    expect(validarFechaNacimiento('2027-01-01', hoy)).toMatchObject({ ok: false })
    expect(validarFechaNacimiento('', hoy)).toMatchObject({ ok: false })
    expect(validarFechaNacimiento('2026-02-31', hoy)).toMatchObject({ ok: false })
  })
  it('avisa por encima de 78 años', () => {
    expect(validarFechaNacimiento('1948-10-06', '2026-10-06')).toMatchObject({ ok: true, edad: 78 })
    expect((validarFechaNacimiento('1948-10-06', '2026-10-06') as { aviso?: string }).aviso).toBeUndefined()
    expect((validarFechaNacimiento('1947-10-06', '2026-10-06') as { aviso?: string }).aviso).toBeTruthy()
  })
})

describe('altura', () => {
  it('acepta 120–230 cm con un decimal y rechaza el resto', () => {
    expect(validarAltura(ALTURA_MIN)).toBe(120)
    expect(validarAltura(ALTURA_MAX)).toBe(230)
    expect(validarAltura(175.54)).toBe(175.5)
    expect(validarAltura(119.9)).toBeNull()
    expect(validarAltura(230.1)).toBeNull()
    expect(validarAltura(1.8)).toBeNull()
    expect(validarAltura(NaN)).toBeNull()
    expect(validarAltura(Infinity)).toBeNull()
  })
})

describe('normalizarPerfil', () => {
  it('conserva lo válido y descarta la basura sin lanzar', () => {
    const p = normalizarPerfil({ sexo: 'mujer', fechaNacimiento: '1990-05-05', alturaCm: 170.04, actividad: 'activo', objetivo: 'volumen', intensidadKcal: 300, extra: 1 })
    expect(p).toEqual({ sexo: 'mujer', fechaNacimiento: '1990-05-05', alturaCm: 170, actividad: 'activo', objetivo: 'volumen', intensidadKcal: 300 })
    expect(normalizarPerfil({ sexo: 'otro', fechaNacimiento: '2026-02-30', alturaCm: 'alto', actividad: 'extremo', objetivo: 'x', intensidadKcal: 250 })).toEqual({})
    expect(normalizarPerfil({ alturaCm: 1000 })).toEqual({})
    expect(normalizarPerfil({ intensidadKcal: 700 })).toEqual({})
  })
  it.each([null, undefined, 5, 'texto', [], true])('entrada no objeto %s da perfil vacío', (x) => {
    expect(normalizarPerfil(x)).toEqual({})
    expect(perfilVacio(x as never)).toBe(true)
  })
})

describe('camposPendientes', () => {
  it('orden estable; el objetivo no cuenta', () => {
    expect(camposPendientes({}, undefined)).toEqual(['sexo', 'fechaNacimiento', 'alturaCm', 'peso', 'actividad'])
    expect(camposPendientes({ sexo: 'hombre', fechaNacimiento: '1990-01-01', alturaCm: 180, actividad: 'ligero' }, 80)).toEqual([])
    expect(camposPendientes({ sexo: 'hombre', fechaNacimiento: '1990-01-01', alturaCm: 180, actividad: 'ligero' }, 10)).toEqual(['peso'])
  })
  it('lista legible', () => {
    expect(listaCampos(['alturaCm', 'actividad'])).toBe('altura y actividad')
    expect(listaCampos(['sexo', 'alturaCm', 'peso'])).toBe('sexo, altura y peso')
    expect(listaCampos(['peso'])).toBe('peso')
  })
})
