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

export function comidaPorHora(date: Date = new Date()): 'desayuno' | 'comida' | 'cena' | 'snack' {
  const h = date.getHours()
  if (h >= 6 && h < 11) return 'desayuno'
  if (h >= 11 && h < 16) return 'comida'
  if (h >= 20 || h < 1) return 'cena'
  return 'snack'
}
