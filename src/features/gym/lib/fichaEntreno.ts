import type { SetEntry, Workout } from '../../../shared/db/types'
import { formatDiaMes } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { modoCarga } from './carga'
import { describirReps, type SerieEjecucion } from './ejecucion'
import type { RecordEjercicio } from './records'
import { efectivas, ordenEjerciciosSesion, volumenSets } from './workout'

/**
 * Presentación de la ficha de un entreno terminado (detalle del historial y fin de sesión): récords agrupados por
 * ejercicio en cifras sueltas y cada serie como una pastilla «80 kg × 8».
 */

const kg = (n: number) => formatNumber(n, 2)
const plural = (n: number, uno: string, varios: string) => `${formatInt(n)} ${n === 1 ? uno : varios}`

/** Récords agrupados por ejercicio, en el orden en que aparecen. */
export function recordsPorEjercicio(records: RecordEjercicio[]): { exerciseId: number; records: RecordEjercicio[] }[] {
  const grupos = new Map<number, RecordEjercicio[]>()
  for (const r of records) grupos.set(r.exerciseId, [...(grupos.get(r.exerciseId) ?? []), r])
  return [...grupos].map(([exerciseId, rs]) => ({ exerciseId, records: rs }))
}

/** Ids de las series que marcan algún récord. */
export function seriesConRecord(records: RecordEjercicio[]): Set<number> {
  return new Set(records.flatMap(r => (r.setId !== undefined ? [r.setId] : [])))
}

export interface PartesRecord {
  /** Qué se ha batido: «Peso máximo», «Reps con 60 kg»… */
  rotulo: string
  /** La cifra nueva: «82,5 kg», «10 reps». */
  valor: string
  /** Cuánto mejora a la anterior: «+2,5 kg», «+1 rep», «−5 kg» de asistencia. */
  mejora: string
  variante?: string
}

/** Un récord en tres piezas (rótulo, cifra y mejora) para mostrarlo como cifra en lugar de frase. */
export function partesRecord(r: RecordEjercicio): PartesRecord {
  const diferencia = Math.abs(r.valor - r.anterior)
  const variante = r.variante ? { variante: r.variante } : {}
  if (r.tipo === 'asistencia') return { rotulo: 'Menos asistencia', valor: `${kg(r.valor)} kg`, mejora: `−${kg(diferencia)} kg`, ...variante }
  if (r.tipo === 'reps') {
    const peso = r.peso ?? 0
    const rotulo = r.modoCarga === 'corporal' ? 'Reps con peso corporal'
      : r.modoCarga === 'lastre' ? `Reps con +${kg(peso)} kg`
        : r.modoCarga === 'asistencia' ? `Reps con ${kg(peso)} kg de asistencia`
          : `Reps con ${kg(peso)} kg`
    return { rotulo, valor: plural(r.valor, 'rep', 'reps'), mejora: `+${plural(diferencia, 'rep', 'reps')}`, ...variante }
  }
  if (r.tipo === '1rm') return { rotulo: '1RM estimado', valor: `${kg(r.valor)} kg`, mejora: `+${kg(diferencia)} kg`, ...variante }
  if (r.modoCarga === 'lastre') return { rotulo: 'Lastre máximo', valor: `+${kg(r.valor)} kg`, mejora: `+${kg(diferencia)} kg`, ...variante }
  return { rotulo: 'Peso máximo', valor: `${kg(r.valor)} kg`, mejora: `+${kg(diferencia)} kg`, ...variante }
}

/** Carga en pocas palabras para una pastilla; el detalle completo (masa corporal de ese día) va en la tabla. */
function cargaCorta(s: SerieEjecucion): string {
  const modo = modoCarga(s)
  if (modo === 'corporal') return 'Corporal'
  if (modo === 'lastre') return `+${kg(s.peso)} kg`
  if (modo === 'asistencia') return `Asistencia ${kg(s.peso)} kg`
  return `${kg(s.peso)} kg`
}

export interface PastillaSerie {
  id: number
  /** «80 kg × 8»; por lados, «I 30 kg × 10 · D 30 kg × 9». */
  texto: string
  calentamiento: boolean
  /** Marcada como no hecha al terminar (`realizada: false`). Sin confirmar (datos antiguos) no cuenta como pendiente. */
  pendiente: boolean
  bajadas: number
}

export function pastillaSerie(s: SerieEjecucion & Pick<SetEntry, 'id'>): PastillaSerie {
  const texto = s.ejecucion === 'lados'
    ? (['izquierda', 'derecha'] as const).flatMap(l => {
      const p = s.lados?.[l]
      return p ? [`${l === 'izquierda' ? 'I' : 'D'} ${cargaCorta({ ...s, ...p })} × ${formatNumber(p.reps)}`] : []
    }).join(' · ') || 'Sin registrar'
    : `${cargaCorta(s)} × ${describirReps(s)}`
  return { id: s.id, texto, calentamiento: s.tipo === 'calentamiento', pendiente: s.realizada === false, bajadas: s.bajadas?.length ?? 0 }
}

/** «3 series · 1.858 kg»; con pendientes, «3 de 4 series»; sin volumen (peso corporal), solo las series. */
export function resumenEjercicio(series: SerieEjecucion[]): string {
  const total = series.filter(s => s.tipo !== 'calentamiento').length
  if (!total) return series.length ? 'Solo calentamiento' : 'Sin series'
  const hechas = efectivas(series).length
  const volumen = volumenSets(series)
  return [hechas === total ? plural(total, 'serie', 'series') : `${formatInt(hechas)} de ${plural(total, 'serie', 'series')}`,
    volumen > 0 ? `${formatInt(volumen)} kg` : ''].filter(Boolean).join(' · ')
}

export interface SeriesPublicables {
  /** Series efectivas en su orden, como en la ficha: «80 kg × 8». */
  series: string[]
  /** Las que marcan un récord de peso (o de lastre, o menos asistencia): su índice en `series` y cuánto mejora. */
  records: { serie: number; mejora: string }[]
}

/**
 * Las series de un ejercicio tal como se publican en Social: sin calentamientos ni las no hechas. Como en el mosaico de
 * la publicación, solo las subidas de carga cuentan como récord; las de repeticiones y los 1RM se quedan en la ficha.
 */
export function seriesPublicables(series: (SerieEjecucion & Pick<SetEntry, 'id' | 'orden'>)[], records: RecordEjercicio[]): SeriesPublicables {
  const hechas = efectivas([...series].sort((a, b) => a.orden - b.orden))
  return {
    series: hechas.map(s => pastillaSerie(s).texto),
    records: hechas.flatMap((s, serie) => {
      const r = records.find(r => r.setId === s.id && (r.tipo === 'peso' || r.tipo === 'asistencia'))
      return r ? [{ serie, mejora: r.tipo === 'asistencia' ? `${partesRecord(r).mejora} de asistencia` : partesRecord(r).mejora }] : []
    }),
  }
}

/** Un ejercicio en la imagen del póster: su nombre, la mejor serie como pastilla, cuántas series y la mejora de su récord. */
export interface EjercicioPoster {
  nombre: string
  /** La mejor serie como la pastilla del historial («85 kg × 8») y si marca récord. */
  mejor: { texto: string; record: boolean }
  /** «3 series». */
  series: string
  /** La mejora del récord que más cuenta (el de peso antes que el 1RM): «+5 kg», «+3 reps». */
  mejora?: string
}

/**
 * Los ejercicios de un entreno para la imagen del póster, en el orden del detalle y sin los que no tienen series
 * efectivas. De cada uno, solo la mejor serie (con 10 series no cabrían todas): la del récord de carga; si no, la de más
 * carga (menos asistencia) y más repeticiones entre las de récord y, sin récord, entre todas.
 */
export function ejerciciosDelPoster(w: Pick<Workout, 'ordenEjercicios' | 'ejerciciosOmitidos'>, sets: SetEntry[], records: RecordEjercicio[], nombres: Record<number, string>): EjercicioPoster[] {
  const ids = Array.from(new Set([...sets].sort((a, b) => a.createdAt - b.createdAt || a.id - b.id).map(s => s.exerciseId)))
  const conRecord = seriesConRecord(records)
  const signo = (s: SetEntry) => (modoCarga(s) === 'asistencia' ? -1 : 1)
  const masFuerte = (series: SetEntry[]) => [...series].sort((a, b) => signo(b) * b.peso - signo(a) * a.peso || b.reps - a.reps)[0]
  return ordenEjerciciosSesion([], ids, w.ordenEjercicios, w.ejerciciosOmitidos).flatMap(id => {
    const hechas = efectivas(sets.filter(s => s.exerciseId === id).sort((a, b) => a.orden - b.orden))
    if (!hechas.length) return []
    const propios = records.filter(r => r.exerciseId === id).sort((a, b) => PRIORIDAD_RECORD[a.tipo] - PRIORIDAD_RECORD[b.tipo])
    const deCarga = propios.find(r => (r.tipo === 'peso' || r.tipo === 'asistencia') && hechas.some(s => s.id === r.setId))
    const conMarca = hechas.filter(s => conRecord.has(s.id))
    const mejor = deCarga ? hechas.find(s => s.id === deCarga.setId)! : masFuerte(conMarca.length ? conMarca : hechas)
    return [{
      nombre: nombres[id] ?? 'Ejercicio',
      mejor: { texto: pastillaSerie(mejor).texto, record: conRecord.has(mejor.id) },
      series: plural(hechas.length, 'serie', 'series'),
      ...(propios[0] ? { mejora: partesRecord(propios[0]).mejora } : {}),
    }]
  })
}

// --- Fin de sesión ordenado por momentos (ENT-10) ---

export type TipoHito = 'record' | 'cumbre' | 'liga' | 'logro'
export interface HitoSesion { tipo: TipoHito; etiqueta: string; texto: string }
/** Lo que pasó en la sesión, ya con nombres: récords en su orden, Cumbres, cambios de liga y piezas nuevas. Los grupos que suben
 * de nivel no van aquí (decisión de Víctor): se ven en el bloque «Cuerpo» y en el muñeco. */
export interface DatosHitos {
  records: RecordEjercicio[]
  nombres: Record<number, string>
  /** Metros que sube el entreno y cimas que corona; `null` sin Cumbres (sin montaña elegida o gamificación oculta). */
  cumbre: { metros: number; cimas: string[] } | null
  /** Solo los cambios de liga destacados («Sube a Plata»). */
  ligas: { exerciseId: number; texto: string }[]
  logros: string[]
}

/** Hitos que caben en la franja «Hoy» del póster. */
export const MAX_HITOS = 3
const ETIQUETA: Record<TipoHito, string> = { record: 'Récord', cumbre: 'Cumbres', liga: 'Liga', logro: 'Vitrina' }
const PRIORIDAD_RECORD: Record<RecordEjercicio['tipo'], number> = { peso: 0, asistencia: 1, reps: 2, '1rm': 3 }

/** Récords que no caben en la franja «Hoy» del historial: «y 8 récords más», o nada si caben todos. */
export function restoRecords(n: number): string | undefined {
  return n > 0 ? `y ${formatInt(n)} ${n === 1 ? 'récord' : 'récords'} más` : undefined
}

/**
 * Hasta `MAX_HITOS` hitos para la franja «Hoy» (D9: récords, cumbre, liga y logros, en ese orden). Primero
 * uno de cada tipo en ese orden, para que tres récords no tapen una cima o una liga; si sobra sitio, más del mismo orden.
 * Los récords van de uno por ejercicio (el de peso antes que el 1RM, que suele acompañarlo) y después el resto.
 */
export function hitosDeSesion(d: DatosHitos, max = MAX_HITOS): HitoSesion[] {
  const nombre = (id: number) => d.nombres[id] ?? 'Ejercicio'
  const ordenados = [...d.records].sort((a, b) => PRIORIDAD_RECORD[a.tipo] - PRIORIDAD_RECORD[b.tipo])
  const primeros = recordsPorEjercicio(d.records).map(g => ordenados.find(r => r.exerciseId === g.exerciseId)!)
  const records = [...primeros, ...ordenados.filter(r => !primeros.includes(r))].map(r => {
    const p = partesRecord(r)
    return `${nombre(r.exerciseId)} · ${p.rotulo}: ${p.valor} (${p.mejora})`
  })
  const cumbre = !d.cumbre ? [] : d.cumbre.cimas.length ? d.cumbre.cimas.map(c => `Cumbre del ${c}`) : d.cumbre.metros > 0 ? [`+${formatInt(d.cumbre.metros)} m de subida`] : []
  const grupos: [TipoHito, string[]][] = [
    ['record', records],
    ['cumbre', cumbre],
    ['liga', d.ligas.map(l => `${nombre(l.exerciseId)} · ${l.texto}`)],
    ['logro', d.logros],
  ]
  const hitos: HitoSesion[] = []
  for (let vuelta = 0; hitos.length < max && grupos.some(([, t]) => t.length > vuelta); vuelta++) {
    for (const [tipo, textos] of grupos) {
      if (hitos.length >= max) break
      const texto = vuelta === 0 ? textos[0] : textos.slice(1)[vuelta - 1]
      if (texto) hitos.push({ tipo, etiqueta: ETIQUETA[tipo], texto })
    }
  }
  return hitos
}

/** «6 récords en 3 ejercicios», «1 récord en Press banca». */
export function resumenRecords(records: RecordEjercicio[], nombres: Record<number, string>): string {
  const ejercicios = recordsPorEjercicio(records)
  const cuantos = plural(records.length, 'récord', 'récords')
  return ejercicios.length === 1 ? `${cuantos} en ${nombres[ejercicios[0].exerciseId] ?? 'un ejercicio'}` : `${cuantos} en ${formatInt(ejercicios.length)} ejercicios`
}

/** «Pecho sube a Básico II», «Pecho sube a Básico II y 2 más» o, sin subidas, «5 grupos trabajados». */
export function resumenCuerpo(subidas: { musculo: string; nivel: string }[], trabajados: number): string {
  if (subidas.length) return `${subidas[0].musculo} sube a ${subidas[0].nivel}${subidas.length > 1 ? ` y ${formatInt(subidas.length - 1)} más` : ''}`
  return trabajados === 1 ? '1 grupo trabajado' : `${formatInt(trabajados)} grupos trabajados`
}

/** Una línea para «Cumbres y ligas»: lo que sube y lo que cambia de liga; sin nada, lo dice. */
export function resumenCumbresLigas(cumbre: DatosHitos['cumbre'], ligas: DatosHitos['ligas'], sumanSemana: number, nombres: Record<number, string>, conCumbres: boolean): string {
  const partes: string[] = []
  if (!conCumbres) partes.push('Elige tu primera montaña')
  else if (cumbre?.cimas.length) partes.push(`Cumbre del ${cumbre.cimas[0]}`)
  else if (cumbre && cumbre.metros > 0) partes.push(`+${formatInt(cumbre.metros)} m`)
  if (ligas.length) partes.push(ligas.length === 1 ? `${nombres[ligas[0].exerciseId] ?? 'Ejercicio'} · ${ligas[0].texto}` : `${formatInt(ligas.length)} cambios de liga`)
  else if (sumanSemana > 0) partes.push(sumanSemana === 1 ? '1 ejercicio suma una semana' : `${formatInt(sumanSemana)} ejercicios suman una semana`)
  return partes.length ? partes.join(' · ') : 'Este entreno no sube metros'
}

/** Entrenos redondos que celebra el póster al terminar (A23). */
export const HITOS_ENTRENOS = [10, 25, 50, 100, 250, 500, 1000] as const

export interface HitoEntrenos {
  /** Cuántos entrenos terminados llevas con este (10, 25, 50…). */
  numero: number
  /** Inicio del primero. */
  desde: number
}

/**
 * Si el entreno `id` es el nº 10, 25, 50, 100, 250, 500 o 1.000 de los terminados (por su inicio, y a igual inicio por
 * su id), el número y el inicio del primero; si no, `null`. Cuenta todos los terminados, como el historial.
 */
export function hitoDeEntrenos(terminados: Pick<Workout, 'id' | 'inicio'>[], id: number): HitoEntrenos | null {
  const orden = [...terminados].sort((a, b) => a.inicio - b.inicio || a.id - b.id)
  const numero = orden.findIndex(w => w.id === id) + 1
  if (!(HITOS_ENTRENOS as readonly number[]).includes(numero)) return null
  return { numero, desde: orden[0].inicio }
}

/** «Desde el 3 mar» (con el año si no es el de `ahora`: «desde el 3 mar de 2025»). */
export function textoDesde(desde: number, ahora: number): string {
  const anio = new Date(desde).getFullYear()
  return `Desde el ${formatDiaMes(desde)}${anio !== new Date(ahora).getFullYear() ? ` de ${anio}` : ''}`
}
