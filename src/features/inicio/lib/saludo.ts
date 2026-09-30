/** Saludo de la pantalla de Inicio según la hora local: días de 6 a 14 h, tardes hasta las 21 h y noches el resto. */
export function saludoPorHora(fecha: Date = new Date()): string {
  const h = fecha.getHours()
  if (h >= 6 && h < 14) return 'Buenos días'
  if (h >= 14 && h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}
