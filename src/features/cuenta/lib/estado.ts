import { formatFechaHora } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { textoSinCopia } from '../../../shared/lib/recordatorioBackup'
import type { EstadoCuenta, FaseCuenta } from '../copiaNube'

const MIN_MS = 60_000

/** «ahora mismo», «hace 5 min», «hoy a las 08:21» o «3 oct · 08:21». */
export function haceCuanto(ts: number, ahora: number): string {
  const diferencia = Math.max(0, ahora - ts)
  if (diferencia < MIN_MS) return 'ahora mismo'
  if (diferencia < 60 * MIN_MS) return `hace ${formatInt(Math.floor(diferencia / MIN_MS))} min`
  const d = new Date(ts)
  if (d.toDateString() === new Date(ahora).toDateString()) {
    return `hoy a las ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return formatFechaHora(ts)
}

export interface LineaEstado {
  texto: string
  tono: 'normal' | 'aviso' | 'error'
}

/** Línea de estado de la copia en Ajustes, con la cuenta abierta en este dispositivo. */
export function lineaEstado(estado: EstadoCuenta, ahora: number): LineaEstado {
  const ultima = estado.ultimaCopia !== undefined ? `Última copia: ${haceCuanto(estado.ultimaCopia, ahora)}.` : ''
  switch (estado.fase) {
    case 'subiendo':
      return { texto: 'Guardando la copia…', tono: 'normal' }
    case 'pendiente':
      return { texto: `Hay cambios que se guardarán en unos segundos. ${ultima}`.trim(), tono: 'normal' }
    case 'sin-conexion':
      return { texto: `Sin conexión: los cambios se guardarán al volver a tenerla. ${ultima}`.trim(), tono: 'aviso' }
    case 'error':
      return { texto: `${estado.error ?? 'No se ha podido guardar la copia.'} ${ultima}`.trim(), tono: 'error' }
    case 'conflicto':
      return { texto: 'Hay una copia más reciente de otro dispositivo y también cambios aquí. Elige cuál se queda.', tono: 'aviso' }
    case 'perdida':
      return { texto: 'La copia de la nube ya no está: se empezó de cero desde otro dispositivo. Vuelve a entrar.', tono: 'error' }
    default:
      return { texto: estado.ultimaCopia !== undefined ? `Copia guardada ${haceCuanto(estado.ultimaCopia, ahora)}.` : 'Copia al día.', tono: 'normal' }
  }
}

const VINCULADAS: FaseCuenta[] = ['al-dia', 'pendiente', 'subiendo', 'sin-conexion', 'error', 'conflicto', 'perdida']

/** La persona usa la cuenta en este dispositivo (también si la sesión caducó): el aviso de exportar ya no aplica. */
export function cuentaEnUso(estado: EstadoCuenta): boolean {
  return VINCULADAS.includes(estado.fase) || (estado.fase === 'sin-sesion' && estado.error !== undefined)
}

export interface AvisoCuenta {
  titulo: string
  /** Solo el de «días sin copia» se puede posponer; elegir copia o volver a entrar, no. */
  posponible: boolean
}

/**
 * Aviso de Inicio con la cuenta en uso: lo que la persona tiene que resolver (elegir copia, volver a entrar) o que la
 * copia lleve tantos días sin guardarse como el recordatorio de exportar (`recordatorio`, ya calculado con la
 * última copia de la nube).
 */
export function avisoCuenta(estado: EstadoCuenta, recordatorio: boolean, ahora: number): AvisoCuenta | null {
  if (estado.fase === 'conflicto') return { titulo: 'Elige qué copia se queda', posponible: false }
  if (estado.fase === 'perdida' || estado.fase === 'sin-sesion') return { titulo: 'Vuelve a entrar en tu cuenta', posponible: false }
  if (recordatorio) return { titulo: textoSinCopia(estado.ultimaCopia, ahora), posponible: true }
  return null
}
