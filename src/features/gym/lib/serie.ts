import type { Agarre, ConfiguracionEjecucion, DatosLado, Lado, SetEntry, TramoDropset } from '../../../shared/db/types'
import { formatNumber } from '../../../shared/lib/format'
import { textoAgarre } from './ejecucion'

/** Lo que muestra el número de la serie. Los datos admiten combinaciones; la interfaz elige un solo tipo visible. */
export type TipoSerie = 'normal' | 'calentamiento' | 'dropset' | 'negativas'
export const TIPOS_SERIE: Record<TipoSerie, { letra?: string; label: string; descripcion: string }> = {
  normal: { label: 'Normal', descripcion: 'Cuenta en volumen, récords y progreso' },
  calentamiento: { letra: 'C', label: 'Calentamiento', descripcion: 'No cuenta en volumen, récords, mapa muscular ni progreso' },
  dropset: { letra: 'D', label: 'Dropset', descripcion: 'Añade bajadas de carga bajo la serie; cuenta como una sola serie' },
  negativas: { letra: 'N', label: 'Negativas', descripcion: 'Solo la fase de bajada; se compara aparte y no estima 1RM' },
}
export const SEGUNDOS_BAJADA = [2, 3, 4, 5]

export type CambiosTecnica = Partial<Pick<SetEntry, 'tipo' | 'soloNegativas' | 'bajadas'>>
type SerieTipo = Pick<SetEntry, 'reps' | 'peso'> & Partial<Pick<SetEntry, 'tipo' | 'soloNegativas' | 'bajadas' | 'ejecucion' | 'lados'>>

export function tipoSerie(s: SerieTipo): TipoSerie {
  if (s.bajadas?.length) return 'dropset'
  if (s.soloNegativas) return 'negativas'
  if (s.tipo === 'calentamiento') return 'calentamiento'
  return 'normal'
}

/** Copia la carga del último tramo, como «Añadir serie» copia la serie anterior; los lados se copian solo si existen. */
export function nuevaBajada(s: SerieTipo, id: string): TramoDropset {
  const ultimo: Pick<TramoDropset, 'reps' | 'peso' | 'lados'> = s.bajadas?.at(-1) ?? s
  return { id, reps: ultimo.reps, peso: ultimo.peso, ...(s.ejecucion === 'lados' && ultimo.lados ? { lados: structuredClone(ultimo.lados) } : {}) }
}

/** Cambiar el tipo deja una sola técnica activa; pasar a dropset conserva las bajadas que ya hubiera. */
export function cambiosTipo(s: SerieTipo, tipo: TipoSerie, id: () => string): CambiosTecnica {
  const base: CambiosTecnica = { tipo: undefined, soloNegativas: undefined, bajadas: undefined }
  if (tipo === 'calentamiento') return { ...base, tipo: 'calentamiento' }
  if (tipo === 'negativas') return { ...base, soloNegativas: true }
  if (tipo === 'dropset') return { ...base, bajadas: s.bajadas?.length ? s.bajadas : [nuevaBajada(s, id())] }
  return base
}

/** Un lado sin reps ni kg deja de estar registrado: un lado ausente nunca cuenta como realizado. */
export function conLado(lados: Partial<Record<Lado, DatosLado>> | undefined, lado: Lado, datos: Partial<DatosLado>): Partial<Record<Lado, DatosLado>> | undefined {
  const siguiente = { reps: 0, peso: 0, ...lados?.[lado], ...datos }
  const resultado = { ...lados }
  if (siguiente.reps === 0 && siguiente.peso === 0 && siguiente.rir === undefined) delete resultado[lado]
  else resultado[lado] = siguiente
  return Object.keys(resultado).length ? resultado : undefined
}

export function cambiosBajada(s: SerieTipo, id: string, datos: Partial<Pick<TramoDropset, 'reps' | 'peso' | 'lados'>>): CambiosTecnica {
  return { bajadas: (s.bajadas ?? []).map(b => b.id === id ? { ...b, ...datos } : b) }
}
export function sinBajada(s: SerieTipo, id: string): CambiosTecnica {
  const bajadas = (s.bajadas ?? []).filter(b => b.id !== id)
  return { bajadas: bajadas.length ? bajadas : undefined }
}

const mismoAgarre = (a?: Agarre, b?: Agarre) => (a?.orientacion ?? '') === (b?.orientacion ?? '') && (a?.anchura ?? '') === (b?.anchura ?? '') && (a?.accesorio ?? '') === (b?.accesorio ?? '')

/** Texto de la variante del ejercicio en la sesión, para sus botones de cabecera. */
export function textoEjecucion(c: ConfiguracionEjecucion): string {
  if (c.ejecucion === 'lados') return 'Unilateral · cada lado'
  if (c.ejecucion === 'unilateral') return `Unilateral · kg ${c.kgUnilateral === 'total' ? 'totales' : 'por lado'}`
  return 'Bilateral'
}

/**
 * Solo lo que distingue a la serie y no se lee ya en la fila ni en la cabecera: negativas y dropset tienen su letra,
 * la variante común está en los botones del ejercicio.
 */
export function etiquetasSerie(s: Partial<SetEntry>, ejercicio: ConfiguracionEjecucion): string[] {
  const etiquetas: string[] = []
  if (s.tipo === 'calentamiento' && tipoSerie({ reps: 0, peso: 0, ...s }) !== 'calentamiento') etiquetas.push('Calentamiento')
  if (s.soloNegativas && tipoSerie({ reps: 0, peso: 0, ...s }) !== 'negativas') etiquetas.push('Solo negativas')
  if (s.excentricaSeg) etiquetas.push(`Bajada ${formatNumber(s.excentricaSeg)} s`)
  if ((s.ejecucion ?? 'bilateral') !== ejercicio.ejecucion || (s.ejecucion === 'unilateral' && (s.kgUnilateral ?? 'lado') !== (ejercicio.kgUnilateral ?? 'lado'))) etiquetas.push(textoEjecucion({ ejecucion: s.ejecucion ?? 'bilateral', kgUnilateral: s.kgUnilateral }))
  if (!mismoAgarre(s.agarre, ejercicio.agarre)) etiquetas.push(textoAgarre(s.agarre) || 'Agarre sin indicar')
  return etiquetas
}

/** Datos de un lado dentro de una bajada; la bajada que ya no existe no cambia nada. */
export function cambiosLadoBajada(s: SerieTipo, id: string, lado: Lado, datos: Partial<DatosLado>): CambiosTecnica {
  const bajada = s.bajadas?.find(b => b.id === id)
  return bajada ? cambiosBajada(s, id, { lados: conLado(bajada.lados, lado, datos) }) : {}
}

/** Deshacer: devuelve la bajada a su posición si sigue sin estar (un segundo Deshacer no la duplica). */
export function conBajadaRestaurada(s: SerieTipo, bajada: TramoDropset, indice: number): CambiosTecnica {
  const bajadas = [...(s.bajadas ?? [])]
  if (bajadas.some(b => b.id === bajada.id)) return {}
  bajadas.splice(Math.min(indice, bajadas.length), 0, bajada)
  return { bajadas }
}
