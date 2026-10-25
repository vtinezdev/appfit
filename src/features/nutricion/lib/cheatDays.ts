// Cheat days: días enteros marcados a mano que quedan fuera de las medias, la adherencia y la XP de proteína, pero no
// rompen la racha de registro. Funciones puras; las marcas viven en `cheatDaysRepo`.
import { startOfWeek } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'

/** Cuántos cheat days hay en la semana (lunes a domingo) de `fecha`. */
export function cheatDaysDeSemana(fecha: string, cheatDays: Iterable<string>): number {
  const lunes = startOfWeek(fecha)
  return new Set([...cheatDays].filter((f) => startOfWeek(f) === lunes)).size
}

/**
 * Aviso al marcar `fecha` como cheat day, con las marcas que ya había. Desde el 2.º de la misma semana lo dice, sin
 * bloquear («Es tu 2.º cheat day esta semana»).
 */
export function avisoAlMarcar(fecha: string, cheatDaysAntes: Iterable<string>): string {
  const n = cheatDaysDeSemana(fecha, [...cheatDaysAntes, fecha])
  return n >= 2 ? `Es tu ${formatInt(n)}.º cheat day esta semana` : 'Día marcado como cheat day'
}

/** Cheat days del periodo hasta `hoy` (los que se quitan de las medias). */
export function cheatDaysEnPeriodo(fechas: readonly string[], hoy: string, cheatDays: ReadonlySet<string>): number {
  return fechas.filter((f) => f <= hoy && cheatDays.has(f)).length
}

/** «1 cheat day fuera de la media», «3 cheat days fuera de la media»; `null` sin ninguno. */
export function notaCheatDays(n: number): string | null {
  if (n <= 0) return null
  return `${formatInt(n)} ${n === 1 ? 'cheat day' : 'cheat days'} fuera de la media`
}

/** Fechas que cuentan para la racha de registro: las que tienen comidas y los cheat days (aunque estén vacíos). */
export function fechasDeRacha(conRegistro: Iterable<string>, cheatDays: Iterable<string>): Set<string> {
  return new Set([...conRegistro, ...cheatDays])
}
