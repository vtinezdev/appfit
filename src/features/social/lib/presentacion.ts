import { ETIQUETA_TIPO } from '../../actividades/lib/actividad'
import { MUSCULOS, ZONAS_MUSCULARES } from '../../gym/lib/musculos'
import { unir } from '../../gym/lib/presentacionEjercicio'
import { contextoPublicacion, type Comentario } from './feed'
import type { MapaCompartido, Resumen } from './publicacion'

/**
 * Cómo se presenta lo social (rediseño de Social, docs/features/social.md): textos y agrupaciones derivados de lo que
 * ya llega del servidor o del diario. Nada de esto se guarda.
 */

/**
 * Lo que es la publicación, junto a la hora: «Entreno», «Correr», «Logro» o, si la sesión fue otro día,
 * «Entreno del martes, 14 de octubre». Un texto no lleva etiqueta.
 */
export function etiquetaPublicacion(r: Resumen, fecha: number, creada?: string): string | null {
  if (r.tipo === 'texto') return null
  if (r.tipo === 'logro') return 'Logro'
  const otroDia = creada ? contextoPublicacion(r.tipo, fecha, creada) : null
  if (otroDia) return otroDia
  return r.tipo === 'entreno' ? 'Entreno' : ETIQUETA_TIPO[r.actividad]
}

/** «Cuádriceps y glúteos»: las zonas con el nivel más alto del mapa compartido (dos como mucho), o `null` si no hay. */
export function textoMasTrabajado(mapa: MapaCompartido | undefined, max = 2): string | null {
  if (!mapa) return null
  const tope = Math.max(0, ...ZONAS_MUSCULARES.map(z => mapa[z]))
  if (tope === 0) return null
  const zonas = ZONAS_MUSCULARES.filter(z => mapa[z] === tope).slice(0, max).map(z => MUSCULOS[z])
  return zonas.length === 2 ? unir(zonas[0], zonas[1]) : zonas[0]
}

export type Periodo = 'Hoy' | 'Esta semana' | 'Antes'

/** Lunes 00:00 de la semana local de `ms`. */
function inicioSemana(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

/** Agrupa (sin reordenar) en «Hoy», «Esta semana» (desde el lunes) y «Antes», omitiendo los grupos vacíos. */
export function agruparPorPeriodo<T extends { creado: number }>(items: T[], ahora: number): { periodo: Periodo; items: T[] }[] {
  const hoy = new Date(ahora).toDateString()
  const semana = inicioSemana(ahora)
  const periodo = (t: number): Periodo => new Date(t).toDateString() === hoy ? 'Hoy' : t >= semana ? 'Esta semana' : 'Antes'
  const grupos: { periodo: Periodo; items: T[] }[] = (['Hoy', 'Esta semana', 'Antes'] as const).map(p => ({ periodo: p, items: [] }))
  for (const item of items) grupos.find(g => g.periodo === periodo(item.creado))!.items.push(item)
  return grupos.filter(g => g.items.length > 0)
}

export interface Hilo {
  raiz: Comentario
  respuestas: Comentario[]
  /** Respuesta cuyo comentario original no está cargado (o ya no se ve): se pinta suelta con «Respuesta a @…». */
  suelta: boolean
}

/**
 * Los comentarios (en orden cronológico) en hilos de un nivel: cada respuesta debajo de su comentario, en su orden.
 * Una respuesta a un comentario que no está en la lista queda como hilo propio, en su sitio.
 */
export function hilosComentarios(lista: Comentario[]): Hilo[] {
  const ids = new Set(lista.map(c => c.id))
  const hilos: Hilo[] = []
  const porRaiz = new Map<string, Hilo>()
  for (const c of lista) {
    const padre = c.respuestaA && ids.has(c.respuestaA) ? porRaiz.get(c.respuestaA) : undefined
    if (padre) { padre.respuestas.push(c); continue }
    const hilo = { raiz: c, respuestas: [], suelta: Boolean(c.respuestaA) }
    hilos.push(hilo)
    porRaiz.set(c.id, hilo)
  }
  return hilos
}

const SEMANA_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Qué sugerir compartir arriba del feed: lo más reciente entre el último entreno terminado y la última actividad, si
 * no está publicado y es de los últimos siete días. Lo anterior ya no es «tu último entreno».
 */
export function sugerenciaCompartir(
  entreno: { inicio: number; publicacion?: string } | undefined,
  actividad: { inicio: number; publicacion?: string } | undefined,
  ahora: number,
): 'entreno' | 'actividad' | null {
  const ultimo = !actividad || (entreno && entreno.inicio >= actividad.inicio) ? (entreno ? 'entreno' : null) : 'actividad'
  if (!ultimo) return null
  const elegido = ultimo === 'entreno' ? entreno! : actividad!
  if (elegido.publicacion || ahora - elegido.inicio > SEMANA_MS) return null
  return ultimo
}
