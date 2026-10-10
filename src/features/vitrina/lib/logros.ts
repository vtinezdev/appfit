// Logros de la Vitrina (gaming.md, ADR 029): pocas piezas con significado, con niveles, repetibles u ocultos. Se derivan
// del historial con su fecha real (retroactivos): nada se guarda, así que borrar un registro puede retirar una pieza.
import { diasEntre, startOfWeek } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import type { ResultadoAtributos } from '../../atributos/lib/atributos'
import { PLANTAS_SEMANA, type SemanaHerbario } from '../../nutricion/lib/herbario'
import { HITOS_SEMANAS } from '../../ritmo/lib/ritmo'
import type { Atlas } from './atlas'

export type GrupoLogro = 'entreno' | 'constancia' | 'nutricion' | 'oculto'

export const GRUPOS_LOGRO: Record<GrupoLogro, string> = {
  entreno: 'Entreno',
  constancia: 'Constancia',
  nutricion: 'Nutrición',
  oculto: 'Ocultos',
}

export const NUMERALES = ['I', 'II', 'III', 'IV', 'V'] as const

export interface Conseguido {
  fecha: string
  /** Entreno con el que se consiguió, si lo hubo (para mostrarlo al terminar). */
  workoutId?: number
}

export interface Logro {
  id: string
  nombre: string
  grupo: GrupoLogro
  /** Qué hay que hacer, en una frase (con el umbral del siguiente nivel si tiene niveles). */
  descripcion: string
  /** Logros con niveles: umbrales y cuándo se alcanzó cada uno. */
  umbrales?: readonly number[]
  niveles: (Conseguido | null)[]
  /** Repetibles: cada vez que se consigue. */
  veces?: Conseguido[]
  /** Valor actual (entrenos, semanas…) para el progreso hacia el siguiente nivel. */
  progreso?: number
  unidad?: string
  oculto?: boolean
  /** Qué pide un nivel concreto («50 entrenos de 6 series efectivas o más»). */
  textoNivel?: (umbral: number) => string
}

/** Niveles alcanzados (0 si ninguno). */
export function nivelDe(l: Logro): number {
  return l.niveles.filter(Boolean).length
}

/** ¿Se ha conseguido al menos una vez? */
export function conseguido(l: Logro): boolean {
  return nivelDe(l) > 0 || (l.veces?.length ?? 0) > 0
}

/** Fecha de la última vez que se consiguió algo de este logro. */
export function ultimaVez(l: Logro): string | null {
  const fechas = [...l.niveles.filter((n): n is Conseguido => n !== null), ...(l.veces ?? [])].map((c) => c.fecha)
  return fechas.length ? fechas.sort()[fechas.length - 1] : null
}

/** Siguiente umbral de un logro con niveles, o `null` si ya está completo. */
export function siguienteUmbral(l: Logro): number | null {
  return l.umbrales?.[nivelDe(l)] ?? null
}

/** Nivel n-ésimo (umbral) de una lista ordenada de logros parciales: cuándo se llegó a cada umbral. */
function porUmbral(umbrales: readonly number[], hechos: readonly Conseguido[]): (Conseguido | null)[] {
  return umbrales.map((u) => hechos[u - 1] ?? null)
}

export interface DatosLogros {
  hoy: string
  atributos: ResultadoAtributos
  atlas: Atlas
  herbario: readonly SemanaHerbario[]
  conNutricion: boolean
}

export const UMBRALES = {
  entrenos: [10, 50, 100, 250],
  semanas: HITOS_SEMANAS,
  hilo: [4, 12, 26, 52],
  records: [5, 15, 30],
  dias: [30, 100, 200, 365],
  proteina: [30, 100, 200],
} as const

/** Entrenos antes de las 8:00 para «Madrugador», días sin entrenar para «Vuelta al ruedo» y descansos para «Descanso bien llevado». */
export const MADRUGADOR = { entrenos: 5, hora: 8 }
export const DIAS_VUELTA_AL_RUEDO = 14
export const DESCANSOS_BIEN_LLEVADOS = 3

/** Todos los logros con su estado. Sin la nutrición, sus logros no aparecen. */
export function calcularLogros(d: DatosLogros): Logro[] {
  const { atributos: a, atlas } = d
  const r = a.ritmo
  const logros: Logro[] = []
  const conNiveles = (base: Omit<Logro, 'niveles' | 'descripcion'>, umbrales: readonly number[], hechos: Conseguido[], texto: (n: number) => string) => {
    const niveles = porUmbral(umbrales, hechos)
    const siguiente = umbrales[niveles.filter(Boolean).length]
    logros.push({ ...base, umbrales, niveles, progreso: hechos.length, descripcion: texto(siguiente ?? umbrales[umbrales.length - 1]), textoNivel: texto })
  }

  // ── Entreno ──
  conNiveles({ id: 'entrenos', nombre: 'Entrenos', grupo: 'entreno', unidad: 'entrenos' }, UMBRALES.entrenos,
    a.entrenos.map((e) => ({ fecha: e.fecha, workoutId: e.workoutId })), (n) => `${formatInt(n)} entrenos de 6 series efectivas o más`)
  const ejerciciosConRecord: Conseguido[] = []
  const vistos = new Set<number>()
  for (const rec of a.records) {
    if (vistos.has(rec.record.exerciseId)) continue
    vistos.add(rec.record.exerciseId)
    ejerciciosConRecord.push({ fecha: rec.fecha, workoutId: rec.workoutId })
  }
  conNiveles({ id: 'records', nombre: 'Coleccionista de récords', grupo: 'entreno', unidad: 'ejercicios' }, UMBRALES.records, ejerciciosConRecord,
    (n) => `Récord personal en ${formatInt(n)} ejercicios distintos`)
  logros.push({
    id: 'atlas', nombre: 'Atlas completo', grupo: 'entreno', niveles: [],
    descripcion: 'Los 12 grupos musculares trabajados como principal en una misma semana',
    veces: atlas.semanas.flatMap((s) => (s.completa ? [s.completa] : [])),
  })

  // ── Constancia ──
  conNiveles({ id: 'semanas', nombre: 'Semanas cumplidas', grupo: 'constancia', unidad: 'semanas' }, UMBRALES.semanas,
    r.semanas.flatMap((s) => (s.cumplidaEl ? [{ fecha: s.cumplidaEl }] : [])), (n) => `${formatInt(n)} semanas cumplidas`)
  const hilo: Conseguido[] = []
  for (const s of r.semanas) if (s.hilo > hilo.length && s.presenteEl && !s.comodin && !s.congelada) hilo.push({ fecha: s.presenteEl })
  conNiveles({ id: 'hilo', nombre: 'Hilo', grupo: 'constancia', unidad: 'semanas seguidas' }, UMBRALES.hilo, hilo,
    (n) => `${formatInt(n)} semanas seguidas con presencia`)

  // ── Nutrición ──
  if (d.conNutricion) {
    conNiveles({ id: 'dias', nombre: 'Días registrados', grupo: 'nutricion', unidad: 'días' }, UMBRALES.dias,
      [...a.diasRegistro].sort().map((fecha) => ({ fecha })), (n) => `${formatInt(n)} días con comidas registradas`)
    conNiveles({ id: 'proteina', nombre: 'Proteína', grupo: 'nutricion', unidad: 'días' }, UMBRALES.proteina,
      a.eventos.flatMap((e) => (e.tipo === 'proteina' ? [{ fecha: e.fecha }] : [])), (n) => `${formatInt(n)} días con la proteína al 90 % del objetivo`)
    logros.push({
      id: 'herbario', nombre: `Herbario ${formatInt(PLANTAS_SEMANA)}`, grupo: 'nutricion', niveles: [],
      descripcion: `${formatInt(PLANTAS_SEMANA)} plantas distintas en una misma semana`,
      veces: d.herbario.flatMap((s) => (s.treintaEl ? [{ fecha: s.treintaEl }] : [])),
    })
  }

  // ── Ocultos ──
  const madrugadas = a.entrenos.filter((e) => new Date(e.inicio).getHours() < MADRUGADOR.hora)
  logros.push({
    id: 'madrugador', nombre: 'Madrugador', grupo: 'oculto', oculto: true, umbrales: [MADRUGADOR.entrenos],
    niveles: porUmbral([MADRUGADOR.entrenos], madrugadas.map((e) => ({ fecha: e.fecha, workoutId: e.workoutId }))),
    progreso: madrugadas.length, unidad: 'entrenos',
    descripcion: `${formatInt(MADRUGADOR.entrenos)} entrenos empezados antes de las ${formatInt(MADRUGADOR.hora)}:00`,
  })
  const vueltas: Conseguido[] = []
  for (let i = 1; i < a.entrenos.length; i++) {
    if (diasEntre(a.entrenos[i - 1].fecha, a.entrenos[i].fecha) - 1 >= DIAS_VUELTA_AL_RUEDO) vueltas.push({ fecha: a.entrenos[i].fecha, workoutId: a.entrenos[i].workoutId })
  }
  logros.push({ id: 'vuelta', nombre: 'Vuelta al ruedo', grupo: 'oculto', oculto: true, niveles: [], veces: vueltas,
    descripcion: `Volver a entrenar tras ${formatInt(DIAS_VUELTA_AL_RUEDO)} días o más sin hacerlo` })
  const diasEntrenoPorSemana = new Map<string, number>()
  for (const f of a.diasEntreno) diasEntrenoPorSemana.set(startOfWeek(f), (diasEntrenoPorSemana.get(startOfWeek(f)) ?? 0) + 1)
  logros.push({
    id: 'descanso', nombre: 'Descanso bien llevado', grupo: 'oculto', oculto: true, niveles: [],
    descripcion: `Semana cumplida con ${formatInt(DESCANSOS_BIEN_LLEVADOS)} días de descanso o más`,
    veces: r.semanas.flatMap((s) => (s.cerrada && s.cumplidaEl && 7 - (diasEntrenoPorSemana.get(s.lunes) ?? 0) >= DESCANSOS_BIEN_LLEVADOS ? [{ fecha: s.cumplidaEl }] : [])),
  })
  return logros
}

/** Piezas conseguidas (niveles alcanzados más una por cada logro repetible conseguido) y piezas posibles (con un repetible = 1). */
export function recuentoPiezas(logros: readonly Logro[]): { conseguidas: number; total: number } {
  let conseguidas = 0
  let total = 0
  for (const l of logros) {
    if (l.umbrales) { total += l.umbrales.length; conseguidas += nivelDe(l) } else { total += 1; conseguidas += l.veces?.length ? 1 : 0 }
  }
  return { conseguidas, total }
}

export interface NuevoLogro {
  logro: Logro
  /** Nivel conseguido (1…) o `null` en un repetible. */
  nivel: number | null
}

/** Lo que se consiguió con un entreno concreto (para el fin de sesión). */
export function logrosDeEntreno(logros: readonly Logro[], workoutId: number): NuevoLogro[] {
  return logros.flatMap((l) => [
    ...l.niveles.flatMap((n, i) => (n?.workoutId === workoutId ? [{ logro: l, nivel: i + 1 }] : [])),
    ...(l.veces ?? []).flatMap((v) => (v.workoutId === workoutId ? [{ logro: l, nivel: null }] : [])),
  ])
}
