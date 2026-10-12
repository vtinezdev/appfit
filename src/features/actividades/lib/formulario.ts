// Formulario de una actividad (a mano, revisión de un GPX y edición): valores tal como se editan y su conversión.
import type { Actividad, TipoActividad } from '../../../shared/db/types'
import { toISODate } from '../../../shared/lib/dates'
import { combinarFechaHora, formatHora } from '../../gym/lib/workout'
import type { DatosActividad } from './actividad'

export interface ValoresActividad {
  tipo: TipoActividad
  /** YYYY-MM-DD y HH:MM, como los dan los campos nativos. */
  fecha: string
  hora: string
  horas: number
  minutos: number
  /** Segundos sueltos de una duración importada; se pierden al tocar horas o minutos. */
  segundos: number
  km: number | undefined
  desnivel: number | undefined
  nombre: string
}

/** Valores para el formulario: de una actividad existente o importada, o por defecto (hace una hora, 45 min). */
export function valoresIniciales(a: Partial<Pick<Actividad, 'tipo' | 'inicio' | 'duracionSeg' | 'distanciaM' | 'desnivelM' | 'nombre'>> = {}, ahora = Date.now()): ValoresActividad {
  const inicio = a.inicio ?? ahora - 3_600_000
  const duracion = Math.max(0, Math.round(a.duracionSeg ?? 45 * 60))
  return {
    tipo: a.tipo ?? 'caminar',
    fecha: toISODate(new Date(inicio)),
    hora: formatHora(inicio),
    horas: Math.floor(duracion / 3600),
    minutos: Math.floor((duracion % 3600) / 60),
    segundos: duracion % 60,
    km: a.distanciaM === undefined ? undefined : Math.round(a.distanciaM / 10) / 100,
    desnivel: a.desnivelM,
    nombre: a.nombre ?? '',
  }
}

export type ResultadoFormulario = { ok: true; datos: DatosActividad & { nombre?: string } } | { ok: false; error: string }

/** Convierte lo editado en datos de la actividad. La validación de rangos es la de `validarActividad` (la hace el repo). */
export function leerValores(v: ValoresActividad): ResultadoFormulario {
  const inicio = combinarFechaHora(v.fecha, v.hora)
  if (inicio === null) return { ok: false, error: 'Indica una fecha y una hora válidas.' }
  if (v.km === undefined || !(v.km > 0)) return { ok: false, error: 'Indica la distancia.' }
  const duracionSeg = Math.max(0, Math.round(v.horas)) * 3600 + Math.max(0, Math.round(v.minutos)) * 60 + v.segundos
  if (!(duracionSeg > 0)) return { ok: false, error: 'Indica la duración.' }
  const nombre = v.nombre.trim()
  return {
    ok: true,
    datos: {
      tipo: v.tipo,
      inicio,
      duracionSeg,
      distanciaM: Math.round(v.km * 1000),
      ...(v.desnivel !== undefined ? { desnivelM: Math.round(v.desnivel) } : {}),
      ...(nombre ? { nombre } : {}),
    },
  }
}
