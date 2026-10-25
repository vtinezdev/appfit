import { describe, expect, it } from 'vitest'
import type { Actividad } from '../../../shared/db/types'
import { cifrasActividad, duracionTexto, formatKm, formatReloj, formatRitmo, nombreMes, porMes, resumenSemana, ritmoSegPorKm, tituloActividad, validarActividad } from './actividad'

const act = (over: Partial<Actividad>): Actividad => ({
  id: 1, tipo: 'caminar', fecha: '2026-10-12', inicio: new Date(2026, 9, 12, 8).getTime(), duracionSeg: 3600, distanciaM: 5000, origen: 'manual', createdAt: 1, ...over,
})

describe('cifras', () => {
  it('kilómetros con dos decimales por debajo de 10 y uno desde ahí', () => {
    expect(formatKm(5236)).toBe('5,24')
    expect(formatKm(12_440)).toBe('12,4')
    expect(formatKm(1_234_000)).toBe('1.234')
  })

  it('reloj de la grabación', () => {
    expect(formatReloj(65)).toBe('1:05')
    expect(formatReloj(3729)).toBe('1:02:09')
  })

  it('ritmo por kilómetro', () => {
    expect(formatRitmo(ritmoSegPorKm(1662, 5000))).toBe('5:32 /km')
    expect(ritmoSegPorKm(60, 20)).toBeNull()
    expect(formatRitmo(null)).toBe('—')
  })

  it('línea de cifras con el desnivel si lo hay', () => {
    expect(cifrasActividad({ distanciaM: 5000, duracionSeg: 2700, desnivelM: 0 })).toBe('5 km · 45 min · 9:00 /km')
    expect(cifrasActividad({ distanciaM: 12_000, duracionSeg: 14_400, desnivelM: 850 })).toBe('12 km · 4 h · 20:00 /km · +850 m')
  })

  it('duración sin actividades', () => {
    expect(duracionTexto(0)).toBe('0 min')
    expect(duracionTexto(3900)).toBe('1 h 05 min')
  })

  it('título: el nombre o el tipo', () => {
    expect(tituloActividad({ tipo: 'correr', nombre: '  ' })).toBe('Carrera')
    expect(tituloActividad({ tipo: 'senderismo', nombre: 'Pico Sagra' })).toBe('Pico Sagra')
  })
})

describe('validarActividad', () => {
  const ahora = new Date(2026, 9, 12, 12).getTime()
  const base = { tipo: 'caminar' as const, inicio: ahora - 7200_000, duracionSeg: 3600, distanciaM: 5000 }

  it('acepta una actividad normal', () => {
    expect(validarActividad(base, ahora)).toBeNull()
  })

  it.each([
    [{ inicio: ahora + 60_000 }, 'futuro'],
    [{ distanciaM: 0 }, 'distancia'],
    [{ distanciaM: 301_000 }, '300 km'],
    [{ duracionSeg: 0 }, 'duración'],
    [{ duracionSeg: 49 * 3600 }, '48 horas'],
    [{ desnivelM: -1 }, 'desnivel'],
    [{ distanciaM: 30_000, duracionSeg: 3600 }, 'km/h'],
  ])('rechaza %o', (cambio, texto) => {
    expect(validarActividad({ ...base, ...cambio }, ahora)).toContain(texto)
  })
})

describe('resúmenes', () => {
  it('la semana suma solo las terminadas de lunes a domingo', () => {
    const lista = [
      act({ fecha: '2026-10-12', distanciaM: 5000, desnivelM: 100 }),
      act({ fecha: '2026-10-18', distanciaM: 3000, duracionSeg: 1200 }),
      act({ fecha: '2026-10-11', distanciaM: 9000 }),
      act({ fecha: '2026-10-13', distanciaM: 1000, enCurso: true }),
    ]
    expect(resumenSemana(lista, '2026-10-14')).toEqual({ salidas: 2, distanciaM: 8000, duracionSeg: 4800, desnivelM: 100 })
  })

  it('agrupa por mes de la más reciente a la más antigua', () => {
    const lista = [act({ id: 1, fecha: '2026-09-30', inicio: 1 }), act({ id: 2, fecha: '2026-10-02', inicio: 3 }), act({ id: 3, fecha: '2026-10-01', inicio: 2 })]
    expect(porMes(lista).map((g) => [g.mes, g.actividades.map((a) => a.id)])).toEqual([['2026-10', [2, 3]], ['2026-09', [1]]])
    expect(nombreMes('2026-10-02')).toBe('Octubre de 2026')
  })
})
