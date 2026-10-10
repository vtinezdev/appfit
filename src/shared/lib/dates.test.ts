import { describe, expect, it } from 'vitest'
import {
  addDays,
  comidaPorHora,
  diasEntre,
  desplazarPeriodo,
  esPeriodoActual,
  etiquetaPeriodo,
  fechasPeriodo,
  formatDiaMes,
  formatFechaHora,
  formatFechaHoraConDia,
  formatShort,
  monthDates,
  startOfMonth,
  startOfWeek,
  toISODate,
  todayISO,
  weekDates,
} from './dates'

describe('addDays', () => {
  it('cruza el cambio de mes y de año', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })
})

describe('diasEntre', () => {
  it('cuenta días naturales, también al cruzar el cambio de hora y hacia atrás', () => {
    expect(diasEntre('2026-10-10', '2026-10-10')).toBe(0)
    expect(diasEntre('2026-10-24', '2026-10-27')).toBe(3) // cambio de hora el 25 de octubre
    expect(diasEntre('2026-03-28', '2026-03-30')).toBe(2) // cambio de hora el 29 de marzo
    expect(diasEntre('2026-10-10', '2026-10-01')).toBe(-9)
  })
})

describe('startOfWeek / weekDates', () => {
  it('el domingo pertenece a la semana que empezó el lunes anterior', () => {
    expect(startOfWeek('2026-10-04')).toBe('2026-09-28') // domingo
    expect(startOfWeek('2026-09-28')).toBe('2026-09-28') // lunes
  })

  it('devuelve 7 días de lunes a domingo, aunque crucen de mes', () => {
    expect(weekDates('2026-10-01')).toEqual([
      '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
    ])
  })
})

describe('monthDates / startOfMonth', () => {
  it('febrero bisiesto tiene 29 días', () => {
    const fechas = monthDates('2028-02-10')
    expect(fechas).toHaveLength(29)
    expect(fechas[28]).toBe('2028-02-29')
  })

  it('startOfMonth devuelve el día 1', () => {
    expect(startOfMonth('2026-09-28')).toBe('2026-09-01')
  })
})

describe('formato', () => {
  it('toISODate usa la fecha local', () => {
    expect(toISODate(new Date(2026, 8, 5, 23, 30))).toBe('2026-09-05')
  })

  it('formatShort', () => {
    expect(formatShort('2026-09-28')).toBe('lun 28')
  })

  it('una sola forma de fecha corta: día y mes abreviado, hora con dos cifras', () => {
    const ts = new Date(2026, 8, 19, 8, 6).getTime()
    expect(formatDiaMes(new Date(2026, 9, 3, 8, 21).getTime())).toBe('3 oct')
    expect(formatFechaHora(ts)).toBe('19 sep · 08:06')
    expect(formatFechaHoraConDia(ts)).toBe('sáb 19 sep · 08:06')
  })
})

describe('comidaPorHora', () => {
  it('asigna la comida según la franja horaria', () => {
    expect(comidaPorHora(new Date(2026, 8, 28, 8))).toBe('desayuno')
    expect(comidaPorHora(new Date(2026, 8, 28, 14))).toBe('comida')
    expect(comidaPorHora(new Date(2026, 8, 28, 18))).toBe('snack')
    expect(comidaPorHora(new Date(2026, 8, 28, 21))).toBe('cena')
    expect(comidaPorHora(new Date(2026, 8, 28, 0, 30))).toBe('cena')
  })
})

describe('fechasPeriodo (D1)', () => {
  it('semana devuelve weekDates y mes devuelve monthDates', () => {
    expect(fechasPeriodo('semana', '2026-10-01')).toEqual(weekDates('2026-10-01'))
    expect(fechasPeriodo('mes', '2026-10-01')).toEqual(monthDates('2026-10-01'))
  })
})

describe('desplazarPeriodo (D1)', () => {
  it('semana: se desplaza en bloques de 7 días exactos, cruzando de mes y de año', () => {
    expect(desplazarPeriodo('semana', '2026-09-28', 1)).toBe('2026-10-05')
    expect(desplazarPeriodo('semana', '2026-01-01', -1)).toBe('2025-12-25')
  })

  it('mes: cambia de mes desde el día 31 sin saltarse un mes corto (enero 31 + 1 = febrero, no marzo)', () => {
    const siguiente = desplazarPeriodo('mes', '2026-01-31', 1)
    expect(fechasPeriodo('mes', siguiente)).toEqual(monthDates('2026-02-01'))
    expect(fechasPeriodo('mes', siguiente)).toHaveLength(28) // 2026 no es bisiesto
  })

  it('mes: retroceder desde el día 31 de marzo cae en febrero, no en enero', () => {
    const anterior = desplazarPeriodo('mes', '2026-03-31', -1)
    expect(fechasPeriodo('mes', anterior)[0]).toBe('2026-02-01')
  })

  it('mes: diciembre → enero cruza de año', () => {
    const siguiente = desplazarPeriodo('mes', '2026-12-15', 1)
    expect(fechasPeriodo('mes', siguiente)[0]).toBe('2027-01-01')
    expect(fechasPeriodo('mes', siguiente)).toHaveLength(31)
  })

  it('mes: enero → diciembre del año anterior', () => {
    const anterior = desplazarPeriodo('mes', '2027-01-15', -1)
    expect(fechasPeriodo('mes', anterior)[0]).toBe('2026-12-01')
    expect(fechasPeriodo('mes', anterior)).toHaveLength(31)
  })
})

describe('etiquetaPeriodo (D1)', () => {
  it('mes: nombre del mes en minúscula y el año', () => {
    expect(etiquetaPeriodo('mes', '2026-09-15')).toBe('septiembre 2026')
  })

  it('semana dentro del mismo mes: "21–27 sep"', () => {
    expect(etiquetaPeriodo('semana', '2026-09-23')).toBe('21–27 sep')
  })

  it('semana que cruza de mes (mismo año): "28 sep – 4 oct"', () => {
    expect(etiquetaPeriodo('semana', '2026-10-01')).toBe('28 sep – 4 oct')
  })

  it('semana que cruza de año: "28 dic – 3 ene" (sin mostrar el año)', () => {
    expect(etiquetaPeriodo('semana', '2026-12-30')).toBe('28 dic – 3 ene')
  })
})

describe('esPeriodoActual (D1): no se puede avanzar más allá del periodo de hoy', () => {
  it('es true para la semana y el mes que contienen hoy', () => {
    expect(esPeriodoActual('semana', todayISO())).toBe(true)
    expect(esPeriodoActual('mes', todayISO())).toBe(true)
  })

  it('es false para periodos pasados', () => {
    expect(esPeriodoActual('semana', addDays(todayISO(), -7))).toBe(false)
    expect(esPeriodoActual('mes', desplazarPeriodo('mes', todayISO(), -1))).toBe(false)
  })
})
