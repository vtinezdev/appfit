// Acceso a la tabla `actividades`. Las funciones de lectura no escriben: se pueden usar en un useLiveQuery.
import { db } from '../../../shared/db/db'
import type { Actividad, PuntoRecorrido, TipoActividad } from '../../../shared/db/types'
import { fechaDe, validarActividad } from '../lib/actividad'
import { desnivelPositivo, simplificarRecorrido } from '../lib/geo'
import { segundosEnMarcha, type EstadoGrabacion } from '../lib/grabacion'

export class ActividadInvalida extends Error {}

/** Actividades terminadas, de la más reciente a la más antigua. */
export function terminadas(): Promise<Actividad[]> {
  return db.actividades.orderBy('inicio').reverse().filter((a) => !a.enCurso).toArray()
}

/** Actividades terminadas con fecha entre `desde` y `hasta` (YYYY-MM-DD, ambas incluidas). */
export function entreFechas(desde: string, hasta: string): Promise<Actividad[]> {
  return db.actividades.where('fecha').between(desde, hasta, true, true).filter((a) => !a.enCurso).toArray()
}

/** La grabación con GPS sin terminar, si hay una. */
export function enCurso(): Promise<Actividad | undefined> {
  return db.actividades.filter((a) => a.enCurso === true).first()
}

export function obtener(id: number): Promise<Actividad | undefined> {
  return db.actividades.get(id)
}

export type NuevaActividad = Pick<Actividad, 'tipo' | 'inicio' | 'duracionSeg' | 'distanciaM' | 'origen'> & Partial<Pick<Actividad, 'desnivelM' | 'nombre' | 'notas' | 'recorrido'>>

function limpiarTexto(s: string | undefined): string | undefined {
  const t = s?.trim()
  return t ? t : undefined
}

/** Guarda una actividad ya terminada (a mano o importada). El recorrido se simplifica antes de guardarlo. */
export async function crear(datos: NuevaActividad, ahora = Date.now()): Promise<number> {
  const error = validarActividad(datos, ahora)
  if (error) throw new ActividadInvalida(error)
  const nombre = limpiarTexto(datos.nombre)
  const notas = limpiarTexto(datos.notas)
  const recorrido = datos.recorrido ? simplificarRecorrido(datos.recorrido) : []
  const actividad: Omit<Actividad, 'id'> = {
    tipo: datos.tipo,
    fecha: fechaDe(datos.inicio),
    inicio: datos.inicio,
    duracionSeg: Math.round(datos.duracionSeg),
    distanciaM: Math.round(datos.distanciaM),
    origen: datos.origen,
    createdAt: ahora,
    ...(datos.desnivelM !== undefined ? { desnivelM: Math.round(datos.desnivelM) } : {}),
    ...(nombre ? { nombre } : {}),
    ...(notas ? { notas } : {}),
    ...(recorrido.length ? { recorrido } : {}),
  }
  return db.actividades.add(actividad as Actividad)
}

export type CambiosActividad = Partial<Pick<Actividad, 'tipo' | 'inicio' | 'duracionSeg' | 'distanciaM' | 'desnivelM' | 'nombre' | 'notas'>>

/** Cambia los datos de una actividad terminada. Un `desnivelM`, `nombre` o `notas` vacío se quita. */
export function actualizar(id: number, cambios: CambiosActividad, ahora = Date.now()): Promise<void> {
  return db.transaction('rw', db.actividades, async () => {
    const a = await db.actividades.get(id)
    if (!a || a.enCurso) throw new ActividadInvalida('La actividad ya no está disponible.')
    const siguiente: Actividad = { ...a, ...cambios }
    const error = validarActividad(siguiente, ahora)
    if (error) throw new ActividadInvalida(error)
    siguiente.fecha = fechaDe(siguiente.inicio)
    siguiente.duracionSeg = Math.round(siguiente.duracionSeg)
    siguiente.distanciaM = Math.round(siguiente.distanciaM)
    if (siguiente.desnivelM === undefined || !Number.isFinite(siguiente.desnivelM)) delete siguiente.desnivelM
    else siguiente.desnivelM = Math.round(siguiente.desnivelM)
    const nombre = limpiarTexto(siguiente.nombre)
    const notas = limpiarTexto(siguiente.notas)
    if (nombre) siguiente.nombre = nombre
    else delete siguiente.nombre
    if (notas) siguiente.notas = notas
    else delete siguiente.notas
    await db.actividades.put(siguiente)
  })
}

/** Anota (o quita, con `undefined`) el id de la publicación de la actividad en Amigos. */
export async function marcarPublicacion(id: number, publicacion: string | undefined): Promise<void> {
  await db.actividades.update(id, { publicacion })
}

/** Borra una actividad y la devuelve, para «Deshacer». */
export function borrar(id: number): Promise<Actividad | undefined> {
  return db.transaction('rw', db.actividades, async () => {
    const a = await db.actividades.get(id)
    if (a) await db.actividades.delete(id)
    return a
  })
}

/** Vuelve a poner una actividad borrada, con su id. */
export async function restaurar(a: Actividad): Promise<void> {
  await db.actividades.put(a)
}

// ── Grabación con GPS ──

/**
 * Empieza a grabar y devuelve el id. Si ya hay una grabación en curso devuelve esa: comprobar y crear van en la misma
 * transacción, así que un doble toque no deja dos.
 */
export function empezarGrabacion(tipo: TipoActividad, ahora = Date.now()): Promise<number> {
  return db.transaction('rw', db.actividades, async () => {
    const actual = await db.actividades.filter((a) => a.enCurso === true).first()
    if (actual) return actual.id
    const nueva: Omit<Actividad, 'id'> = {
      tipo, fecha: fechaDe(ahora), inicio: ahora, duracionSeg: 0, distanciaM: 0, origen: 'gps', recorrido: [[]], enCurso: true, reanudadaEn: ahora, createdAt: ahora,
    }
    return db.actividades.add(nueva as Actividad)
  })
}

/** Estado de la grabación guardado en la actividad en curso. */
export function estadoDe(a: Actividad): EstadoGrabacion {
  return { tramos: a.recorrido?.length ? a.recorrido : [[]], distanciaM: a.distanciaM, segundosCerrados: a.duracionSeg, reanudadaEn: a.reanudadaEn }
}

/** Guarda el estado de la grabación (puntos, distancia, tiempo y pausa). */
export async function guardarGrabacion(id: number, e: EstadoGrabacion): Promise<void> {
  await db.transaction('rw', db.actividades, async () => {
    const a = await db.actividades.get(id)
    if (!a?.enCurso) return
    const siguiente: Actividad = { ...a, recorrido: e.tramos, distanciaM: e.distanciaM, duracionSeg: e.segundosCerrados }
    if (e.reanudadaEn === undefined) delete siguiente.reanudadaEn
    else siguiente.reanudadaEn = e.reanudadaEn
    await db.actividades.put(siguiente)
  })
}

/** Umbral del desnivel con la altitud del GPS del móvil, más ruidosa que la de un archivo. */
const UMBRAL_DESNIVEL_GPS = 10

/**
 * Termina la grabación con el estado final: cierra el tiempo, calcula el desnivel y simplifica el recorrido. Lanza
 * `ActividadInvalida` si no se puede guardar (p. ej., sin distancia); entonces la grabación sigue en curso.
 */
export function terminarGrabacion(id: number, e: EstadoGrabacion, datos: { tipo: TipoActividad; nombre?: string }, ahora = Date.now()): Promise<void> {
  return db.transaction('rw', db.actividades, async () => {
    const a = await db.actividades.get(id)
    if (!a?.enCurso) throw new ActividadInvalida('La grabación ya no está disponible.')
    const tramos: PuntoRecorrido[][] = e.tramos.filter((t) => t.length > 0)
    const terminada: Actividad = {
      ...a,
      tipo: datos.tipo,
      duracionSeg: Math.round(segundosEnMarcha(e, ahora)),
      distanciaM: Math.round(e.distanciaM),
    }
    delete terminada.enCurso
    delete terminada.reanudadaEn
    const error = validarActividad(terminada, ahora)
    if (error) throw new ActividadInvalida(error)
    const desnivel = desnivelPositivo(tramos, UMBRAL_DESNIVEL_GPS)
    if (desnivel !== undefined) terminada.desnivelM = desnivel
    const recorrido = simplificarRecorrido(tramos)
    if (recorrido.length) terminada.recorrido = recorrido
    else delete terminada.recorrido
    const nombre = limpiarTexto(datos.nombre)
    if (nombre) terminada.nombre = nombre
    await db.actividades.put(terminada)
  })
}

/** Descarta la grabación en curso, sin guardar nada. */
export async function descartarGrabacion(id: number): Promise<void> {
  await db.actividades.delete(id)
}
