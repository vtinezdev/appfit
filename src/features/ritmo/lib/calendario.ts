import { addDays, startOfWeek } from '../../../shared/lib/dates'

/** Lunes de las semanas que empiezan en `anio` (52 o 53). */
export function semanasDelAnio(anio: number): string[] {
  let lunes = startOfWeek(`${anio}-01-01`)
  if (lunes < `${anio}-01-01`) lunes = addDays(lunes, 7)
  const res: string[] = []
  for (; lunes.startsWith(String(anio)); lunes = addDays(lunes, 7)) res.push(lunes)
  return res
}

/**
 * Las semanas de un año agrupadas por el mes de su lunes (punto 19: una fila por mes). En el año en curso, solo hasta el
 * mes de `hoy`, para no pintar filas vacías por delante.
 */
export function mesesDelAnio(anio: number, hoy: string): { mes: number; semanas: string[] }[] {
  const hasta = hoy.startsWith(String(anio)) ? Number(hoy.slice(5, 7)) - 1 : 11
  const meses = Array.from({ length: hasta + 1 }, (_, mes) => ({ mes, semanas: [] as string[] }))
  for (const lunes of semanasDelAnio(anio)) {
    const mes = Number(lunes.slice(5, 7)) - 1
    if (mes <= hasta) meses[mes].semanas.push(lunes)
  }
  return meses
}
