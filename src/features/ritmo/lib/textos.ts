// Textos de Ritmo (una sola forma de decir cada cosa en Inicio, la página y la revisión). Funciones puras.
import { formatInt } from '../../../shared/lib/format'
import { ESTADOS_SEMANA, type SemanaRitmo } from './ritmo'

const plural = (n: number, uno: string, varios: string) => `${formatInt(n)} ${n === 1 ? uno : varios}`

/** «2 de 3 entrenos · 4 de 5 días registrados» (sin la parte de registro si la nutrición no cuenta). */
export function cifrasSemana(s: SemanaRitmo): string {
  const entrenos = `${formatInt(s.entrenos)} de ${formatInt(s.plan.entrenos)} entrenos`
  return s.diasRegistrados === null ? entrenos : `${entrenos} · ${formatInt(s.diasRegistrados)} de ${formatInt(s.plan.diasRegistro)} días registrados`
}

/** «Hilo de 6 semanas», «Hilo de 1 semana» o «Sin hilo todavía». */
export function textoHilo(n: number): string {
  return n === 0 ? 'Sin hilo todavía' : `Hilo de ${plural(n, 'semana', 'semanas')}`
}

/** Lo que falta para cumplir la semana en curso, o `null` si ya está cumplida. */
export function faltaParaCumplir(s: SemanaRitmo): string | null {
  if (s.cumplida) return null
  const soloNutricion = s.pausa?.tipo === 'entreno' && s.diasRegistrados !== null
  const partes = [
    !soloNutricion && s.entrenos < s.plan.entrenos ? plural(s.plan.entrenos - s.entrenos, 'entreno', 'entrenos') : null,
    s.diasRegistrados !== null && s.diasRegistrados < s.plan.diasRegistro ? plural(s.plan.diasRegistro - s.diasRegistrados, 'día registrado', 'días registrados') : null,
  ].filter(Boolean)
  return partes.length ? `Para cumplirla: ${partes.join(' y ')} más` : null
}

/** Estado de una semana en una frase: «Cumplida», «Vacía, salvada con un comodín», «En pausa»… */
export function textoEstado(s: SemanaRitmo): string {
  if (s.congelada) return 'En pausa: el hilo se congela'
  if (s.comodin) return 'Vacía, salvada con un comodín'
  if (!s.cerrada && s.estado === 'vacia') return 'En curso'
  const base = ESTADOS_SEMANA[s.estado].nombre
  return s.vuelta ? `${base} · vuelta` : base
}
