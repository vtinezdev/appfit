/** Helpers de fecha en horario local (sin líos de UTC), formato YYYY-MM-DD. */

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Lunes de la semana que contiene `iso` (semana lunes-domingo). */
export function startOfWeek(iso: string): string {
  const d = parseISODate(iso)
  const day = d.getDay() // 0=domingo..6=sabado
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toISODate(d)
}

export function weekDates(iso: string): string[] {
  const monday = startOfWeek(iso)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

export function startOfMonth(iso: string): string {
  const d = parseISODate(iso)
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function monthDates(iso: string): string[] {
  const d = parseISODate(iso)
  const year = d.getFullYear()
  const month = d.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => toISODate(new Date(year, month, i + 1)))
}

const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const MESES_ABREV = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function formatFriendly(iso: string): string {
  const d = parseISODate(iso)
  const hoy = todayISO()
  const ayer = addDays(hoy, -1)
  if (iso === hoy) return 'Hoy'
  if (iso === ayer) return 'Ayer'
  return `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`
}

export function formatShort(iso: string): string {
  const d = parseISODate(iso)
  return `${DIAS_SEMANA[d.getDay()]} ${d.getDate()}`
}

const dosCifras = (n: number) => String(n).padStart(2, '0')

/** Día y mes de un instante, sin año: «7 oct» (ejes, «hace más de una semana»). Una sola forma de fecha corta en la app. */
export function formatDiaMes(ts: number): string {
  const d = new Date(ts)
  return `${d.getDate()} ${MESES_ABREV[d.getMonth()]}`
}

/** Un momento concreto en una lista: «3 oct · 08:21» (historial de entrenos, sesiones de un ejercicio). */
export function formatFechaHora(ts: number): string {
  const d = new Date(ts)
  return `${formatDiaMes(ts)} · ${dosCifras(d.getHours())}:${dosCifras(d.getMinutes())}`
}

/** El mismo momento con el día de la semana, para el título de un entreno: «sáb 19 sep · 08:16». */
export function formatFechaHoraConDia(ts: number): string {
  return `${DIAS_SEMANA[new Date(ts).getDay()]} ${formatFechaHora(ts)}`
}

/** Periodo del Resumen (D1): una semana (lunes-domingo) o un mes natural. */
export type PeriodoRango = 'semana' | 'mes'

/** Los días del periodo (semana o mes) que contiene `iso`. */
export function fechasPeriodo(rango: PeriodoRango, iso: string): string[] {
  return rango === 'semana' ? weekDates(iso) : monthDates(iso)
}

/**
 * Fecha (dentro del periodo resultante) tras desplazar `delta` periodos hacia el pasado (negativo)
 * o el futuro (positivo). En «mes» siempre ancla en el día 1, para no depender de qué día era `iso`:
 * desplazar desde el día 31 no debe saltarse un mes corto como febrero (`new Date` con día 31 en un
 * mes de 28 días se desborda al mes siguiente si no se fija el día a 1 antes de cambiar el mes).
 */
export function desplazarPeriodo(rango: PeriodoRango, iso: string, delta: number): string {
  if (rango === 'semana') return addDays(iso, delta * 7)
  const d = parseISODate(iso)
  return toISODate(new Date(d.getFullYear(), d.getMonth() + delta, 1))
}

/** «22–28 sep», «28 sep – 4 oct» (cruza de mes o de año) o «septiembre 2026». La semana nunca muestra el año. */
export function etiquetaPeriodo(rango: PeriodoRango, iso: string): string {
  if (rango === 'mes') {
    const d = parseISODate(iso)
    return `${MESES[d.getMonth()]} ${d.getFullYear()}`
  }
  const fechas = weekDates(iso)
  const inicio = parseISODate(fechas[0])
  const fin = parseISODate(fechas[fechas.length - 1])
  if (inicio.getMonth() === fin.getMonth()) {
    return `${inicio.getDate()}–${fin.getDate()} ${MESES_ABREV[fin.getMonth()]}`
  }
  return `${inicio.getDate()} ${MESES_ABREV[inicio.getMonth()]} – ${fin.getDate()} ${MESES_ABREV[fin.getMonth()]}`
}

/** El periodo (semana o mes) que contiene `iso` es el que contiene también hoy: no se puede avanzar más allá. */
export function esPeriodoActual(rango: PeriodoRango, iso: string): boolean {
  return fechasPeriodo(rango, iso).includes(todayISO())
}

export function comidaPorHora(date: Date = new Date()): 'desayuno' | 'comida' | 'cena' | 'snack' {
  const h = date.getHours()
  if (h >= 6 && h < 11) return 'desayuno'
  if (h >= 11 && h < 16) return 'comida'
  if (h >= 20 || h < 1) return 'cena'
  return 'snack'
}
