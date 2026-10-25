import { todayISO } from './dates'

const oyentes = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | undefined

export const leerDiaActual = () => todayISO()

function comprobar() {
  oyentes.forEach(fn => fn())
  programar()
}

function programar() {
  clearTimeout(timer)
  const ahora = new Date()
  // Medianoche local, incluidos los días de 23/25 horas por el cambio de horario.
  const manana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1)
  timer = setTimeout(comprobar, manana.getTime() - ahora.getTime())
}

/** Un reloj compartido: vuelve a comprobar al reanudar, sin depender de una escritura o render incidental. */
export function observarDiaActual(fn: () => void) {
  oyentes.add(fn)
  if (oyentes.size === 1) {
    window.addEventListener('focus', comprobar)
    window.addEventListener('pageshow', comprobar)
    document.addEventListener('visibilitychange', comprobar)
    programar()
  }
  return () => {
    oyentes.delete(fn)
    if (oyentes.size) return
    clearTimeout(timer)
    window.removeEventListener('focus', comprobar)
    window.removeEventListener('pageshow', comprobar)
    document.removeEventListener('visibilitychange', comprobar)
  }
}
