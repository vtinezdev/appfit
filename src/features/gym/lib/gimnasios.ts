import type { Exercise, Gimnasio, SetEntry, Workout } from '../../../shared/db/types'
import { normalizeName } from '../../../shared/lib/text'
import { formatInt } from '../../../shared/lib/format'
import { textoAnterior } from './anterior'

/**
 * Gimnasios (ADR 054). El habitual no tiene fila: es la ausencia de `gimnasioId`. Solo los ejercicios cuya carga
 * depende de la máquina llevan historial por gimnasio; barra, mancuernas o peso corporal pesan igual en todas partes.
 */
const EQUIPO_DE_MAQUINA = new Set(['maquina', 'polea', 'smith'])
export const LONGITUD_MAXIMA_NOMBRE = 40
export const RIR_PRIMERA_VEZ = 2

/** Sin equipo indicado (ejercicios propios) se trata como máquina: separar de más no mezcla cargas distintas. */
export function dependeDeMaquina(e: Pick<Exercise, 'equipment'> | undefined): boolean {
  return !e?.equipment?.length || e.equipment.some(q => EQUIPO_DE_MAQUINA.has(q))
}

/** El `gimnasioId` que se estampa en una serie del ejercicio en una sesión de ese gimnasio (o ninguno). */
export function gimnasioDeSerie(gimnasioId: number | undefined, e: Pick<Exercise, 'equipment'> | undefined): number | undefined {
  return gimnasioId !== undefined && dependeDeMaquina(e) ? gimnasioId : undefined
}

/** ¿La serie es del gimnasio indicado? `undefined` = habitual (o compartida). */
export function enGimnasio(s: Pick<SetEntry, 'gimnasioId'>, gimnasioId: number | undefined): boolean {
  return (s.gimnasioId ?? undefined) === gimnasioId
}

/** Nombre de un gimnasio: el del habitual si se le puso (`Settings.nombreGimnasioHabitual`), o «Otro gimnasio» si se borró. */
export function textoGimnasio(id: number | undefined, nombres?: ReadonlyMap<number, string>, habitual?: string): string {
  if (id === undefined) return habitual?.trim() || 'Gimnasio habitual'
  return nombres?.get(id) ?? 'Otro gimnasio'
}

export function nombresGimnasios(gimnasios: readonly Pick<Gimnasio, 'id' | 'nombre'>[] | undefined): Map<number, string> {
  return new Map((gimnasios ?? []).map(g => [g.id, g.nombre]))
}

/** Nombre limpio y su forma normalizada. Lanza con un mensaje para la persona si no vale o ya existe otro igual. */
export function validarNombreGimnasio(nombre: string, existentes: readonly Pick<Gimnasio, 'id' | 'nombreNorm'>[], propio?: number, habitual?: string): { nombre: string; nombreNorm: string } {
  const limpio = nombre.trim().replace(/\s+/g, ' ')
  if (!limpio) throw new Error('Escribe un nombre para el gimnasio.')
  if (limpio.length > LONGITUD_MAXIMA_NOMBRE) throw new Error(`El nombre admite hasta ${LONGITUD_MAXIMA_NOMBRE} caracteres.`)
  const nombreNorm = normalizeName(limpio)
  if (nombreNorm === normalizeName('habitual') || nombreNorm === normalizeName('gimnasio habitual')) throw new Error('«Habitual» ya es tu gimnasio de siempre.')
  if (habitual && normalizeName(habitual) === nombreNorm) throw new Error('Ese es el nombre de tu gimnasio habitual.')
  if (existentes.some(g => g.nombreNorm === nombreNorm && g.id !== propio)) throw new Error('Ya tienes un gimnasio con ese nombre.')
  return { nombre: limpio, nombreNorm }
}

/** Nombre limpio del habitual, o undefined si se deja vacío (vuelve a «Gimnasio habitual»). No puede repetir el de otro gimnasio. */
export function validarNombreHabitual(nombre: string, otros: readonly Pick<Gimnasio, 'nombreNorm'>[]): string | undefined {
  const limpio = nombre.trim().replace(/\s+/g, ' ')
  if (!limpio) return undefined
  if (limpio.length > LONGITUD_MAXIMA_NOMBRE) throw new Error(`El nombre admite hasta ${LONGITUD_MAXIMA_NOMBRE} caracteres.`)
  if (otros.some(g => g.nombreNorm === normalizeName(limpio))) throw new Error('Ya tienes otro gimnasio con ese nombre.')
  return limpio
}

/**
 * ¿Toca la nota de primera vez? Si el ejercicio depende de la máquina, la sesión es de otro gimnasio y en ninguna otra sesión
 * se hizo allí, devuelve la última efectiva realizada del habitual (`habitual` vacío si tampoco hay). Si no toca, undefined.
 */
export function primeraVez(todas: readonly SetEntry[], ejercicio: Pick<Exercise, 'id' | 'equipment'>, workout: Pick<Workout, 'id' | 'gimnasioId'>): { habitual?: SetEntry } | undefined {
  if (workout.gimnasioId === undefined || !dependeDeMaquina(ejercicio)) return undefined
  const otras = todas.filter(s => s.exerciseId === ejercicio.id && s.workoutId !== workout.id && s.realizada !== false && s.tipo !== 'calentamiento')
  if (otras.some(s => enGimnasio(s, workout.gimnasioId))) return undefined
  const habitual = otras.filter(s => enGimnasio(s, undefined) && !s.soloNegativas && !s.bajadas?.length).sort((a, b) => a.createdAt - b.createdAt).at(-1)
  return habitual ? { habitual } : {}
}

type ValoresSerie = Pick<SetEntry, 'peso'> & Partial<Pick<SetEntry, 'lados'>>

/** Los mismos valores sin kg: en una máquina nueva el peso de otra no sirve de propuesta. Reps y lados se conservan. */
export function sinKg<T extends ValoresSerie>(v: T): T {
  return { ...v, peso: 0, ...(v.lados ? { lados: Object.fromEntries(Object.entries(v.lados).map(([lado, p]) => [lado, p && { ...p, peso: 0 }])) } : {}) }
}

/**
 * Nota para la primera vez de un ejercicio de máquina en un gimnasio: qué buscar (RIR y reps de la última vez en el
 * habitual) y, como referencia, lo que se movió allí. Sin historial en el habitual, solo el RIR.
 */
export function notaPrimeraVez(nombreGimnasio: string, habitual: Pick<SetEntry, 'reps' | 'peso' | 'rir' | 'modoCarga' | 'ejecucion' | 'lados'> | undefined): string {
  if (!habitual) return `Primera vez en ${nombreGimnasio}: elige un peso con el que te queden unas ${RIR_PRIMERA_VEZ} repeticiones en reserva.`
  const lado = habitual.ejecucion === 'lados' ? habitual.lados?.izquierda ?? habitual.lados?.derecha : undefined
  const reps = lado?.reps ?? habitual.reps, rir = lado?.rir ?? habitual.rir ?? RIR_PRIMERA_VEZ
  const referencia = textoAnterior(habitual, reps, lado?.peso ?? habitual.peso)
  return `Primera vez en ${nombreGimnasio}: busca RIR ${formatInt(rir)} en ${formatInt(reps)} ${reps === 1 ? 'repetición' : 'repeticiones'}.`
    + (referencia ? ` En tu habitual: ${referencia.etiqueta}${lado ? ' por lado' : ''}.` : '')
}
