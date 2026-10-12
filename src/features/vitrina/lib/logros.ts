// Logros de la Vitrina (gaming.md, ADR 029): pocas piezas con significado, con niveles, repetibles u ocultos. Se derivan
// del historial con su fecha real (retroactivos): nada se guarda, así que borrar un registro puede retirar una pieza.
import { diasEntre, startOfWeek } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { SERIES_MINIMAS, type ResultadoExperiencia } from '../../experiencia/lib/experiencia'
import { diasDeExpedicion, metrosTexto, type Expedicion, type ResultadoCumbres } from '../../cumbres/lib/cumbres'
import { COLECCIONES, EVEREST, type ColeccionMontana } from '../../cumbres/lib/montanas'
import { PLANTAS_SEMANA, type SemanaHerbario } from '../../nutricion/lib/herbario'
import { HITOS_SEMANAS } from '../../ritmo/lib/ritmo'
import type { Actividad } from '../../../shared/db/types'
import { kmTexto } from '../../actividades/lib/actividad'
import type { ResultadoCaminos } from '../../caminos/lib/caminos'
import { RUTAS } from '../../caminos/lib/rutas'
import type { Atlas } from './atlas'

export type GrupoLogro = 'entreno' | 'constancia' | 'cumbres' | 'caminos' | 'nutricion' | 'oculto'

export const GRUPOS_LOGRO: Record<GrupoLogro, string> = {
  entreno: 'Entreno',
  constancia: 'Constancia',
  cumbres: 'Cumbres',
  caminos: 'Caminos',
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
  /** Qué pide un nivel concreto («50 entrenos de 5 series efectivas o más»). */
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
  experiencia: ResultadoExperiencia
  atlas: Atlas
  herbario: readonly SemanaHerbario[]
  conNutricion: boolean
  /** Primera llegada a Élite de la Liga de cada ejercicio, en orden (`liga/lib/liga.primerosCiclos`). */
  ciclos?: readonly Conseguido[]
  /** Cumbres (`null` o ausente si aún no se ha elegido la primera montaña: sus logros salen sin conseguir). */
  cumbres?: ResultadoCumbres | null
  /** Actividades terminadas (caminar, correr, senderismo), para los km y las salidas. */
  actividades?: readonly Pick<Actividad, 'id' | 'fecha' | 'inicio' | 'distanciaM'>[]
  /** Caminos (`null` o ausente si aún no se ha elegido la primera ruta). */
  caminos?: ResultadoCaminos | null
}

export const UMBRALES = {
  entrenos: [10, 50, 100, 250],
  semanas: HITOS_SEMANAS,
  hilo: [4, 12, 26, 52],
  records: [5, 15, 30],
  dias: [30, 100, 200, 365],
  proteina: [30, 100, 200],
  ciclos: [1, 5, 10],
  cumbres: [1, 3, 6, 11, 22],
  metros: [10_000, 25_000, 50_000, 100_000],
  /** Veces que se corona una misma montaña («Otra vez arriba»). */
  repetir: [2, 3, 5],
  /** Kilómetros de todas las actividades. */
  km: [50, 250, 1000, 2500],
  salidas: [10, 50, 100, 250],
  /** Rutas de Caminos terminadas (repetir una también cuenta). */
  rutas: [1, 3, 6, 12],
} as const

/** Distancia de una maratón (m): una actividad así o más larga es «Más allá de la maratón». */
export const METROS_MARATON = 42_195
/** Los grandes Caminos de Santiago que acaban en Santiago (Fisterra sale de allí). */
export const CAMINOS_A_SANTIAGO = RUTAS.filter((r) => r.coleccion === 'santiago' && r.id !== 'fisterra').map((r) => r.id)

/** Entrenos antes de las 8:00 para «Madrugador», días sin entrenar para «Vuelta al ruedo» y descansos para «Descanso bien llevado». */
export const MADRUGADOR = { entrenos: 5, hora: 8 }
export const DIAS_VUELTA_AL_RUEDO = 14
export const DESCANSOS_BIEN_LLEVADOS = 3

/** Todos los logros con su estado. Sin la nutrición, sus logros no aparecen. */
export function calcularLogros(d: DatosLogros): Logro[] {
  const { experiencia: a, atlas } = d
  const r = a.ritmo
  const logros: Logro[] = []
  const conNiveles = (base: Omit<Logro, 'niveles' | 'descripcion'>, umbrales: readonly number[], hechos: Conseguido[], texto: (n: number) => string) => {
    const niveles = porUmbral(umbrales, hechos)
    const siguiente = umbrales[niveles.filter(Boolean).length]
    logros.push({ ...base, umbrales, niveles, progreso: hechos.length, descripcion: texto(siguiente ?? umbrales[umbrales.length - 1]), textoNivel: texto })
  }

  // ── Entreno ──
  conNiveles({ id: 'entrenos', nombre: 'Entrenos', grupo: 'entreno', unidad: 'entrenos' }, UMBRALES.entrenos,
    a.entrenos.map((e) => ({ fecha: e.fecha, workoutId: e.workoutId })), (n) => `${formatInt(n)} entrenos de ${formatInt(SERIES_MINIMAS)} series efectivas o más`)
  const ejerciciosConRecord: Conseguido[] = []
  const vistos = new Set<number>()
  for (const rec of a.records) {
    if (vistos.has(rec.record.exerciseId)) continue
    vistos.add(rec.record.exerciseId)
    ejerciciosConRecord.push({ fecha: rec.fecha, workoutId: rec.workoutId })
  }
  conNiveles({ id: 'records', nombre: 'Coleccionista de récords', grupo: 'entreno', unidad: 'ejercicios' }, UMBRALES.records, ejerciciosConRecord,
    (n) => `Récord personal en ${formatInt(n)} ejercicios distintos`)
  conNiveles({ id: 'ciclos', nombre: 'Ciclos completados', grupo: 'entreno', unidad: 'ejercicios' }, UMBRALES.ciclos, [...(d.ciclos ?? [])],
    (n) => n === 1 ? 'Llegar a Élite de la Liga con un ejercicio' : `Llegar a Élite de la Liga con ${formatInt(n)} ejercicios distintos`)
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

  // ── Cumbres ──
  const coronadas = d.cumbres?.coronadas ?? []
  const cumbres: Conseguido[] = coronadas.flatMap((x) => (x.cumbre ? [{ ...x.cumbre }] : []))
  conNiveles({ id: 'cumbres', nombre: 'Cumbres', grupo: 'cumbres', unidad: 'cumbres' }, UMBRALES.cumbres, cumbres,
    (n) => n === 1 ? 'Hacer cumbre en una montaña' : `Hacer ${formatInt(n)} cumbres (repetir una montaña también cuenta)`)
  logros.push({
    id: 'repetir', nombre: 'Otra vez arriba', grupo: 'cumbres', unidad: 'veces', umbrales: UMBRALES.repetir,
    niveles: marcasDeRepeticion(coronadas, UMBRALES.repetir), progreso: Math.max(0, ...[...vecesPorMontana(coronadas).values()]),
    descripcion: textoRepetir(UMBRALES.repetir.find((u) => u > Math.max(0, ...[...vecesPorMontana(coronadas).values()])) ?? UMBRALES.repetir[UMBRALES.repetir.length - 1]),
    textoNivel: textoRepetir,
  })
  logros.push({
    id: 'metros', nombre: 'Metros subidos', grupo: 'cumbres', unidad: 'm', umbrales: UMBRALES.metros,
    niveles: marcasDeMetros(d.cumbres, UMBRALES.metros), progreso: d.cumbres?.metrosTotales ?? 0,
    descripcion: textoMetros(UMBRALES.metros.find((u) => u > (d.cumbres?.metrosTotales ?? 0)) ?? UMBRALES.metros[UMBRALES.metros.length - 1]),
    textoNivel: textoMetros,
  })
  for (const [id, coleccion, descripcion] of [
    ['techo-espana', 'espana', 'Cumbre en el Aneto, el Mulhacén y el Teide'],
    ['siete-cumbres', 'siete', 'La montaña más alta de cada continente: Puncak Jaya, Vinson, Elbrus, Kilimanjaro, Denali, Aconcagua y Everest'],
    ['alpes', 'alpes', 'Cumbre en el Mont Blanc, el Jungfrau, el Cervino y el Monte Rosa'],
    ['volcanes', 'volcanes', 'Cumbre en siete volcanes: Teide, Elbrus, Kilimanjaro, Fuji, Cotopaxi, Chimborazo y Ojos del Salado'],
    ['cinco-mas-altos', 'gigantes', 'Las cinco montañas más altas del mundo: Everest, K2, Kangchenjunga, Lhotse y Makalu'],
  ] as const satisfies readonly (readonly [string, ColeccionMontana, string])[]) {
    const { nombre, montanas } = COLECCIONES[coleccion]
    // Montañas distintas de la colección, en el orden en que se coronaron por primera vez (repetir no suma).
    const hechas = coronadas.filter((x) => x.vez === 1 && montanas.includes(x.montana.id))
    const completa = hechas.length >= montanas.length ? hechas[montanas.length - 1].cumbre : null
    logros.push({ id, nombre, grupo: 'cumbres', umbrales: [montanas.length], niveles: [completa ? { ...completa } : null], progreso: hechas.length, unidad: 'cumbres', descripcion })
  }

  // ── Caminos ──
  const actividades = [...(d.actividades ?? [])].sort((x, y) => x.inicio - y.inicio)
  const marcasKm: Conseguido[] = []
  let acumulado = 0
  for (const x of actividades) {
    const antes = acumulado
    acumulado += x.distanciaM
    for (const u of UMBRALES.km) if (antes < u * 1000 && acumulado >= u * 1000) marcasKm.push({ fecha: x.fecha })
  }
  logros.push({
    id: 'km', nombre: 'Kilómetros', grupo: 'caminos', unidad: 'km', umbrales: UMBRALES.km,
    niveles: UMBRALES.km.map((_, i) => marcasKm[i] ?? null), progreso: Math.floor(acumulado / 1000),
    descripcion: textoKm(UMBRALES.km.find((u) => u * 1000 > acumulado) ?? UMBRALES.km[UMBRALES.km.length - 1]), textoNivel: textoKm,
  })
  conNiveles({ id: 'salidas', nombre: 'Salidas', grupo: 'caminos', unidad: 'actividades' }, UMBRALES.salidas,
    actividades.map((x) => ({ fecha: x.fecha })), (n) => `${formatInt(n)} caminatas, carreras o rutas`)
  const terminadas = d.caminos?.completadas ?? []
  conNiveles({ id: 'rutas', nombre: 'Rutas terminadas', grupo: 'caminos', unidad: 'rutas' }, UMBRALES.rutas,
    terminadas.flatMap((x) => (x.llegada ? [{ fecha: x.llegada.fecha }] : [])),
    (n) => n === 1 ? 'Terminar una ruta de Caminos' : `Terminar ${formatInt(n)} rutas de Caminos (repetir una también cuenta)`)
  const aSantiago = terminadas.filter((x) => x.vez === 1 && CAMINOS_A_SANTIAGO.includes(x.ruta.id))
  const compostela = aSantiago[0]?.llegada
  logros.push({ id: 'compostela', nombre: 'Compostela', grupo: 'caminos', umbrales: [1], niveles: [compostela ? { fecha: compostela.fecha } : null],
    descripcion: 'Llegar a Santiago por uno de sus Caminos' })
  const todos = aSantiago.length >= CAMINOS_A_SANTIAGO.length ? aSantiago[CAMINOS_A_SANTIAGO.length - 1].llegada : null
  logros.push({ id: 'todos-santiago', nombre: 'Todos los caminos', grupo: 'caminos', umbrales: [CAMINOS_A_SANTIAGO.length], niveles: [todos ? { fecha: todos.fecha } : null],
    progreso: aSantiago.length, unidad: 'caminos', descripcion: 'Llegar a Santiago por el Inglés, el Portugués, el Primitivo, el Francés, el del Norte y la Vía de la Plata' })

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
  const everest = coronadas.find((x) => x.montana.id === EVEREST)?.cumbre
  logros.push({ id: 'mas-rapido', nombre: 'Más rápido que la otra vez', grupo: 'oculto', oculto: true, niveles: [],
    descripcion: 'Repetir una cumbre en menos días que la vez anterior en esa montaña',
    veces: masRapidas(coronadas),
  })
  logros.push({ id: 'techo-mundo', nombre: 'Techo del mundo', grupo: 'oculto', oculto: true, umbrales: [1], niveles: [everest ? { ...everest } : null],
    descripcion: 'Hacer cumbre en el Everest' })
  logros.push({ id: 'paso-firme', nombre: 'Paso firme', grupo: 'oculto', oculto: true, niveles: [],
    descripcion: 'Hacer cumbre sin ninguna semana vacía durante la expedición (las semanas en pausa no cuentan)',
    veces: coronadas.flatMap((x) => {
      if (!x.cumbre) return []
      const desde = startOfWeek(x.desde)
      const hasta = startOfWeek(x.cumbre.fecha)
      const vacia = r.semanas.some((s) => s.lunes >= desde && s.lunes <= hasta && s.cerrada && s.estado === 'vacia' && !s.congelada)
      return vacia ? [] : [{ ...x.cumbre }]
    }),
  })
  const finDelMundo = terminadas.find((x) => x.ruta.id === 'fisterra')?.llegada
  logros.push({ id: 'fin-del-mundo', nombre: 'El fin del mundo', grupo: 'oculto', oculto: true, umbrales: [1], niveles: [finDelMundo ? { fecha: finDelMundo.fecha } : null],
    descripcion: 'Llegar a Muxía por el Camino de Fisterra' })
  logros.push({ id: 'maraton', nombre: 'Más allá de la maratón', grupo: 'oculto', oculto: true, niveles: [],
    descripcion: `Una actividad de ${kmTexto(METROS_MARATON)} o más`,
    veces: actividades.filter((x) => x.distanciaM >= METROS_MARATON).map((x) => ({ fecha: x.fecha })),
  })
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

const textoMetros = (m: number) => `${metrosTexto(m)} subidos en Cumbres`
const textoKm = (km: number) => `${formatInt(km)} km caminando, corriendo o de senderismo`
const textoRepetir = (n: number) => `Hacer cumbre ${formatInt(n)} veces en la misma montaña`

function vecesPorMontana(coronadas: readonly Expedicion[]): Map<string, number> {
  const veces = new Map<string, number>()
  for (const x of coronadas) veces.set(x.montana.id, x.vez)
  return veces
}

/** Cuándo una misma montaña se coronó por n-ésima vez por primera vez, para cada umbral. */
function marcasDeRepeticion(coronadas: readonly Expedicion[], umbrales: readonly number[]): (Conseguido | null)[] {
  return umbrales.map((u) => {
    const x = coronadas.find((c) => c.vez === u)
    return x?.cumbre ? { ...x.cumbre } : null
  })
}

/** Cumbres repetidas en menos días que la vez anterior en la misma montaña. */
function masRapidas(coronadas: readonly Expedicion[]): Conseguido[] {
  const anterior = new Map<string, number>()
  const hechas: Conseguido[] = []
  for (const x of coronadas) {
    const dias = diasDeExpedicion(x)
    if (dias === null || !x.cumbre) continue
    const antes = anterior.get(x.montana.id)
    if (antes !== undefined && dias < antes) hechas.push({ ...x.cumbre })
    anterior.set(x.montana.id, dias)
  }
  return hechas
}

/** Cuándo los metros subidos en Cumbres llegaron a cada umbral. */
function marcasDeMetros(c: ResultadoCumbres | null | undefined, umbrales: readonly number[]): (Conseguido | null)[] {
  const niveles: (Conseguido | null)[] = umbrales.map(() => null)
  let total = 0
  for (const t of c?.tramos ?? []) {
    const antes = total
    total += t.metros
    umbrales.forEach((u, i) => { if (antes < u && total >= u) niveles[i] = t.workoutId === undefined ? { fecha: t.fecha } : { fecha: t.fecha, workoutId: t.workoutId } })
  }
  return niveles
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
