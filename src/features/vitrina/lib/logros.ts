// Logros de la Vitrina (gaming.md, ADR 029): piezas con significado, con niveles, repetibles u ocultos. Se derivan del
// historial con su fecha real (retroactivos): nada se guarda, así que borrar un registro puede retirar una pieza.
import { addDays, diasEntre, startOfWeek } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { SERIES_MINIMAS, type ResultadoExperiencia } from '../../experiencia/lib/experiencia'
import { diasDeExpedicion, metrosTexto, type Expedicion, type ResultadoCumbres } from '../../cumbres/lib/cumbres'
import { COLECCIONES, EVEREST, K2, MONTANAS, type ColeccionMontana } from '../../cumbres/lib/montanas'
import { PLANTAS_JARDIN, PLANTAS_SEMANA, type Planta, type SemanaHerbario } from '../../nutricion/lib/herbario'
import { HITOS_SEMANAS } from '../../ritmo/lib/ritmo'
import type { Actividad } from '../../../shared/db/types'
import { kmTexto } from '../../actividades/lib/actividad'
import type { ResultadoCaminos } from '../../caminos/lib/caminos'
import { NOMBRE_COLECCION, RUTAS, type ColeccionRuta } from '../../caminos/lib/rutas'
import { LIGAS, SEMANAS_POR_LIGA, type LigaEjercicio } from '../../liga/lib/liga'
import { SESIONES_DOMINADO, type Atlas } from './atlas'

export type GrupoLogro = 'entreno' | 'constancia' | 'cumbres' | 'caminos' | 'nutricion' | 'oculto'

/** Identidades estables: al añadir un logro hay que asignar su pictograma. */
export type IdLogro = 'entrenos' | 'series' | 'toneladas' | 'records' | 'records-batidos' | 'dominados'
  | 'ligas' | 'ciclos' | 'atlas' | 'semanas' | 'racha' | 'hilo'
  | 'cumbres' | 'montanas' | 'repetir' | 'metros' | 'km' | 'km-corriendo'
  | 'desnivel' | 'horas' | 'distancia' | 'salidas' | 'rutas' | 'compostela'
  | 'todos-santiago' | 'dias' | 'semanas-enteras' | 'proteina' | 'herbario' | 'plantas'
  | 'mas-rapido' | 'techo-mundo' | 'montana-salvaje' | 'paso-firme' | 'fin-del-mundo' | 'maraton'
  | 'km-vertical' | 'madrugador' | 'noctambulo' | 'vuelta' | 'descanso' | 'comodin'
  | 'dia-records' | 'dia-redondo' | 'ano-nuevo' | 'aniversario' | 'jardin' | 'techo-espana'
  | 'siete-cumbres' | 'alpes' | 'volcanes' | 'cinco-mas-altos' | 'rutas-mundo' | 'viajes-libro'
  | 'fantasia'

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
  id: IdLogro
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

/** Lo conseguido con su entreno solo si lo hubo (sin `workoutId: undefined`). */
const marca = (fecha: string, workoutId?: number): Conseguido => (workoutId === undefined ? { fecha } : { fecha, workoutId })

/**
 * Cuándo una suma que crece en orden cronológico pasa cada umbral. `escala`: lo que vale una unidad del umbral en las de
 * `valor` (1.000 para umbrales en km y valores en metros).
 */
function marcasAcumuladas(items: readonly { marca: Conseguido; valor: number }[], umbrales: readonly number[], escala = 1): { niveles: (Conseguido | null)[]; total: number } {
  const niveles: (Conseguido | null)[] = umbrales.map(() => null)
  let total = 0
  for (const x of items) {
    const antes = total
    total += x.valor
    umbrales.forEach((u, i) => { if (antes < u * escala && total >= u * escala) niveles[i] = x.marca })
  }
  return { niveles, total }
}

/** «A, B y C». */
const enLista = (xs: readonly string[]) => new Intl.ListFormat('es', { type: 'conjunction' }).format(xs)

type ActividadLogro = Pick<Actividad, 'id' | 'tipo' | 'fecha' | 'inicio' | 'distanciaM' | 'duracionSeg' | 'desnivelM'>

export interface DatosLogros {
  hoy: string
  experiencia: ResultadoExperiencia
  atlas: Atlas
  herbario: readonly SemanaHerbario[]
  /** Plantas distintas desde siempre (con el día en que apareció cada una). */
  plantas?: readonly Pick<Planta, 'primera'>[]
  conNutricion: boolean
  /** Primera llegada a Élite de la Liga de cada ejercicio, en orden (`liga/lib/liga.primerosCiclos`). */
  ciclos?: readonly Conseguido[]
  /** La Liga de cada ejercicio (`liga/lib/liga.calcularLigas`), para «Subir de liga». */
  ligas?: readonly LigaEjercicio[]
  /** Volumen (kg × repeticiones de las series efectivas) de cada entreno terminado, en orden cronológico. */
  volumenes?: readonly { fecha: string; workoutId: number; kg: number }[]
  /** Cumbres (`null` o ausente si aún no se ha elegido la primera montaña: sus logros salen sin conseguir). */
  cumbres?: ResultadoCumbres | null
  /** Actividades terminadas (caminar, correr, senderismo), para los km, las salidas y el resto de sus logros. */
  actividades?: readonly ActividadLogro[]
  /** Caminos (`null` o ausente si aún no se ha elegido la primera ruta). */
  caminos?: ResultadoCaminos | null
}

export const UMBRALES = {
  entrenos: [10, 50, 100, 250, 500],
  /** Series efectivas de los entrenos que cuentan. */
  series: [250, 1000, 2500, 5000, 10_000],
  /** Toneladas levantadas (kg × repeticiones). */
  toneladas: [10, 100, 500, 1000],
  semanas: HITOS_SEMANAS,
  /** Semanas cumplidas seguidas («En racha»). */
  racha: [4, 8, 16, 26],
  hilo: [4, 12, 26, 52, 104],
  records: [5, 15, 30, 50],
  /** Récords batidos en total. */
  recordsBatidos: [10, 50, 100, 250],
  /** Ejercicios dominados (3 sesiones o más). */
  dominados: [5, 10, 20],
  dias: [30, 100, 200, 365, 500],
  /** Semanas con los siete días registrados. */
  semanasEnteras: [4, 12, 26, 52],
  proteina: [30, 100, 200, 365],
  /** Plantas distintas desde siempre. */
  plantas: [50, 100, 150, 200],
  ciclos: [1, 5, 10],
  cumbres: [1, 3, 6, 11, 22],
  /** Montañas distintas coronadas (la última, todas). */
  montanas: [5, 11, MONTANAS.length],
  metros: [10_000, 25_000, 50_000, 100_000, 250_000],
  /** Veces que se corona una misma montaña («Otra vez arriba»). */
  repetir: [2, 3, 5, 10],
  /** Kilómetros de todas las actividades. */
  km: [50, 250, 1000, 2500, 5000],
  /** Kilómetros corriendo. */
  kmCorriendo: [10, 50, 100, 250, 500],
  /** Metros de desnivel positivo de las actividades. */
  desnivel: [1000, 5000, 10_000, 25_000],
  /** Horas en marcha de las actividades. */
  horas: [10, 50, 100, 250],
  /** Kilómetros de una sola actividad («Larga distancia»). */
  distancia: [5, 10, 20, 30],
  salidas: [10, 50, 100, 250, 500],
  /** Rutas de Caminos terminadas (repetir una también cuenta). */
  rutas: [1, 3, 6, 12],
} as const

/** Distancia de una maratón (m): una actividad así o más larga es «Más allá de la maratón». */
export const METROS_MARATON = 42_195
/** Desnivel positivo de una sola actividad para «Kilómetro vertical» (m). */
export const METROS_KM_VERTICAL = 1000
/** Los grandes Caminos de Santiago que acaban en Santiago (Fisterra sale de allí). */
export const CAMINOS_A_SANTIAGO = RUTAS.filter((r) => r.coleccion === 'santiago' && r.id !== 'fisterra').map((r) => r.id)

/** Entrenos antes de las 8:00 para «Madrugador», desde las 22:00 para «Noctámbulo», días sin entrenar para «Vuelta al ruedo» y descansos para «Descanso bien llevado». */
export const MADRUGADOR = { entrenos: 5, hora: 8 }
export const NOCTAMBULO = { entrenos: 5, hora: 22 }
export const DIAS_VUELTA_AL_RUEDO = 14
export const DESCANSOS_BIEN_LLEVADOS = 3
/** Ejercicios distintos con récord en un mismo entreno para «Día de récords». */
export const RECORDS_EN_UN_DIA = 3

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
  /** Logro con niveles de una suma (km, toneladas, horas…); el progreso, en unidades del umbral. */
  const acumulado = (base: Omit<Logro, 'niveles' | 'descripcion'>, umbrales: readonly number[], items: { marca: Conseguido; valor: number }[], texto: (n: number) => string, escala = 1) => {
    const { niveles, total } = marcasAcumuladas(items, umbrales, escala)
    const siguiente = umbrales[niveles.filter(Boolean).length]
    logros.push({ ...base, umbrales, niveles, progreso: Math.floor(total / escala), descripcion: texto(siguiente ?? umbrales[umbrales.length - 1]), textoNivel: texto })
  }
  /** Una pieza que se consigue al completar una colección (montañas o rutas distintas, en el orden en que se hicieron). */
  const coleccion = (base: Omit<Logro, 'niveles' | 'umbrales' | 'progreso'>, total: number, hechas: readonly Conseguido[]) => {
    const completa = hechas.length >= total ? hechas[total - 1] : null
    logros.push({ ...base, umbrales: [total], niveles: [completa], progreso: hechas.length })
  }

  // ── Entreno ──
  conNiveles({ id: 'entrenos', nombre: 'Entrenos', grupo: 'entreno', unidad: 'entrenos' }, UMBRALES.entrenos,
    a.entrenos.map((e) => ({ fecha: e.fecha, workoutId: e.workoutId })), (n) => `${formatInt(n)} entrenos de ${formatInt(SERIES_MINIMAS)} series efectivas o más`)
  acumulado({ id: 'series', nombre: 'Series efectivas', grupo: 'entreno', unidad: 'series' }, UMBRALES.series,
    a.entrenos.map((e) => ({ marca: marca(e.fecha, e.workoutId), valor: e.series })),
    (n) => `${formatInt(n)} series efectivas en entrenos de ${formatInt(SERIES_MINIMAS)} series o más`)
  acumulado({ id: 'toneladas', nombre: 'Toneladas', grupo: 'entreno', unidad: 't' }, UMBRALES.toneladas,
    (d.volumenes ?? []).map((v) => ({ marca: marca(v.fecha, v.workoutId), valor: v.kg })),
    (n) => `${formatInt(n)} toneladas levantadas (kg por repeticiones de las series efectivas)`, 1000)
  const ejerciciosConRecord: Conseguido[] = []
  const vistos = new Set<number>()
  for (const rec of a.records) {
    if (vistos.has(rec.record.exerciseId)) continue
    vistos.add(rec.record.exerciseId)
    ejerciciosConRecord.push({ fecha: rec.fecha, workoutId: rec.workoutId })
  }
  conNiveles({ id: 'records', nombre: 'Coleccionista de récords', grupo: 'entreno', unidad: 'ejercicios' }, UMBRALES.records, ejerciciosConRecord,
    (n) => `Récord personal en ${formatInt(n)} ejercicios distintos`)
  conNiveles({ id: 'records-batidos', nombre: 'Récords batidos', grupo: 'entreno', unidad: 'récords' }, UMBRALES.recordsBatidos,
    a.records.map((x) => ({ fecha: x.fecha, workoutId: x.workoutId })), (n) => `${formatInt(n)} récords personales batidos`)
  conNiveles({ id: 'dominados', nombre: 'Ejercicios dominados', grupo: 'entreno', unidad: 'ejercicios' }, UMBRALES.dominados,
    atlas.dominados.map((x) => x.desde).sort((x, y) => x.fecha.localeCompare(y.fecha)).map((x) => marca(x.fecha, x.workoutId)),
    (n) => `${formatInt(n)} ejercicios hechos en ${formatInt(SESIONES_DOMINADO)} sesiones o más`)
  logros.push({
    id: 'ligas', nombre: 'Subir de liga', grupo: 'entreno', umbrales: LIGAS.map((_, i) => i + 1), niveles: primerasLigas(d.ligas ?? []),
    descripcion: textoLiga(Math.min(LIGAS.length, primerasLigas(d.ligas ?? []).filter(Boolean).length + 1)), textoNivel: textoLiga,
  })
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
  // Semanas cumplidas seguidas: una semana en pausa o la actual sin cumplir todavía no cortan la racha.
  const racha: Conseguido[] = []
  let seguidas = 0
  for (const s of r.semanas) {
    if (s.estado === 'cumplida' && s.cumplidaEl) {
      seguidas++
      if (seguidas > racha.length) racha.push({ fecha: s.cumplidaEl })
    } else if (s.cerrada && !s.pausa) seguidas = 0
  }
  conNiveles({ id: 'racha', nombre: 'En racha', grupo: 'constancia', unidad: 'semanas seguidas' }, UMBRALES.racha, racha,
    (n) => `${formatInt(n)} semanas cumplidas seguidas (las semanas en pausa no cortan)`)
  const hilo: Conseguido[] = []
  for (const s of r.semanas) if (s.hilo > hilo.length && s.presenteEl && !s.comodin && !s.congelada) hilo.push({ fecha: s.presenteEl })
  conNiveles({ id: 'hilo', nombre: 'Hilo', grupo: 'constancia', unidad: 'semanas seguidas' }, UMBRALES.hilo, hilo,
    (n) => `${formatInt(n)} semanas seguidas con presencia`)

  // ── Cumbres ──
  const coronadas = d.cumbres?.coronadas ?? []
  const cumbres: Conseguido[] = coronadas.flatMap((x) => (x.cumbre ? [{ ...x.cumbre }] : []))
  conNiveles({ id: 'cumbres', nombre: 'Cumbres', grupo: 'cumbres', unidad: 'cumbres' }, UMBRALES.cumbres, cumbres,
    (n) => n === 1 ? 'Hacer cumbre en una montaña' : `Hacer ${formatInt(n)} cumbres (repetir una montaña también cuenta)`)
  conNiveles({ id: 'montanas', nombre: 'Montañas distintas', grupo: 'cumbres', unidad: 'montañas' }, UMBRALES.montanas,
    coronadas.flatMap((x) => (x.vez === 1 && x.cumbre ? [{ ...x.cumbre }] : [])),
    (n) => n === MONTANAS.length ? `Hacer cumbre en las ${formatInt(n)} montañas` : `Hacer cumbre en ${formatInt(n)} montañas distintas`)
  logros.push({
    id: 'repetir', nombre: 'Otra vez arriba', grupo: 'cumbres', unidad: 'veces', umbrales: UMBRALES.repetir,
    niveles: marcasDeRepeticion(coronadas, UMBRALES.repetir), progreso: Math.max(0, ...[...vecesPorMontana(coronadas).values()]),
    descripcion: textoRepetir(UMBRALES.repetir.find((u) => u > Math.max(0, ...[...vecesPorMontana(coronadas).values()])) ?? UMBRALES.repetir[UMBRALES.repetir.length - 1]),
    textoNivel: textoRepetir,
  })
  acumulado({ id: 'metros', nombre: 'Metros subidos', grupo: 'cumbres', unidad: 'm' }, UMBRALES.metros,
    (d.cumbres?.tramos ?? []).map((t) => ({ marca: marca(t.fecha, t.workoutId), valor: t.metros })), textoMetros)
  for (const [id, clave, descripcion] of [
    ['techo-espana', 'espana', 'Cumbre en el Aneto, el Mulhacén y el Teide'],
    ['siete-cumbres', 'siete', 'La montaña más alta de cada continente: Puncak Jaya, Vinson, Elbrus, Kilimanjaro, Denali, Aconcagua y Everest'],
    ['alpes', 'alpes', 'Cumbre en el Mont Blanc, el Jungfrau, el Cervino y el Monte Rosa'],
    ['volcanes', 'volcanes', 'Cumbre en siete volcanes: Teide, Elbrus, Kilimanjaro, Fuji, Cotopaxi, Chimborazo y Ojos del Salado'],
    ['cinco-mas-altos', 'gigantes', 'Las cinco montañas más altas del mundo: Everest, K2, Kangchenjunga, Lhotse y Makalu'],
  ] as const satisfies readonly (readonly [string, ColeccionMontana, string])[]) {
    const { nombre, montanas } = COLECCIONES[clave]
    // Montañas distintas de la colección, en el orden en que se coronaron por primera vez (repetir no suma).
    coleccion({ id, nombre, grupo: 'cumbres', unidad: 'cumbres', descripcion }, montanas.length,
      coronadas.flatMap((x) => (x.vez === 1 && x.cumbre && montanas.includes(x.montana.id) ? [{ ...x.cumbre }] : [])))
  }

  // ── Caminos ──
  const actividades = [...(d.actividades ?? [])].sort((x, y) => x.inicio - y.inicio)
  acumulado({ id: 'km', nombre: 'Kilómetros', grupo: 'caminos', unidad: 'km' }, UMBRALES.km,
    actividades.map((x) => ({ marca: { fecha: x.fecha }, valor: x.distanciaM })), textoKm, 1000)
  acumulado({ id: 'km-corriendo', nombre: 'Kilómetros corriendo', grupo: 'caminos', unidad: 'km' }, UMBRALES.kmCorriendo,
    actividades.filter((x) => x.tipo === 'correr').map((x) => ({ marca: { fecha: x.fecha }, valor: x.distanciaM })),
    (n) => `${formatInt(n)} km corriendo`, 1000)
  acumulado({ id: 'desnivel', nombre: 'Desnivel positivo', grupo: 'caminos', unidad: 'm' }, UMBRALES.desnivel,
    actividades.map((x) => ({ marca: { fecha: x.fecha }, valor: x.desnivelM ?? 0 })),
    (n) => `${metrosTexto(n)} de desnivel positivo caminando, corriendo o de senderismo`)
  acumulado({ id: 'horas', nombre: 'Horas en marcha', grupo: 'caminos', unidad: 'h' }, UMBRALES.horas,
    actividades.map((x) => ({ marca: { fecha: x.fecha }, valor: x.duracionSeg })),
    (n) => `${formatInt(n)} horas en marcha caminando, corriendo o de senderismo`, 3600)
  logros.push({
    id: 'distancia', nombre: 'Larga distancia', grupo: 'caminos', unidad: 'km', umbrales: UMBRALES.distancia,
    niveles: UMBRALES.distancia.map((u) => {
      const x = actividades.find((y) => y.distanciaM >= u * 1000)
      return x ? { fecha: x.fecha } : null
    }),
    progreso: Math.floor(Math.max(0, ...actividades.map((x) => x.distanciaM)) / 1000),
    descripcion: textoDistancia(UMBRALES.distancia.find((u) => !actividades.some((x) => x.distanciaM >= u * 1000)) ?? UMBRALES.distancia[UMBRALES.distancia.length - 1]),
    textoNivel: textoDistancia,
  })
  conNiveles({ id: 'salidas', nombre: 'Salidas', grupo: 'caminos', unidad: 'actividades' }, UMBRALES.salidas,
    actividades.map((x) => ({ fecha: x.fecha })), (n) => `${formatInt(n)} caminatas, carreras o rutas`)
  const terminadas = d.caminos?.completadas ?? []
  conNiveles({ id: 'rutas', nombre: 'Rutas terminadas', grupo: 'caminos', unidad: 'rutas' }, UMBRALES.rutas,
    terminadas.flatMap((x) => (x.llegada ? [{ fecha: x.llegada.fecha }] : [])),
    (n) => n === 1 ? 'Terminar una ruta de Caminos' : `Terminar ${formatInt(n)} rutas de Caminos (repetir una también cuenta)`)
  /** Rutas distintas de una lista terminadas, en el orden en que se terminaron por primera vez (repetir no suma). */
  const distintas = (ids: readonly string[]) => terminadas.flatMap((x) => (x.vez === 1 && x.llegada && ids.includes(x.ruta.id) ? [{ fecha: x.llegada.fecha }] : []))
  const aSantiago = distintas(CAMINOS_A_SANTIAGO)
  logros.push({ id: 'compostela', nombre: 'Compostela', grupo: 'caminos', umbrales: [1], niveles: [aSantiago[0] ?? null],
    descripcion: 'Llegar a Santiago por uno de sus Caminos' })
  coleccion({ id: 'todos-santiago', nombre: 'Todos los caminos', grupo: 'caminos', unidad: 'caminos',
    descripcion: 'Llegar a Santiago por el Inglés, el Portugués, el Primitivo, el Francés, el del Norte y la Vía de la Plata' }, CAMINOS_A_SANTIAGO.length, aSantiago)
  for (const [id, clave] of [['rutas-mundo', 'mundo'], ['viajes-libro', 'literatura'], ['fantasia', 'fantasia']] as const satisfies readonly (readonly [string, ColeccionRuta])[]) {
    const rutas = RUTAS.filter((x) => x.coleccion === clave)
    coleccion({ id, nombre: NOMBRE_COLECCION[clave], grupo: 'caminos', unidad: 'rutas', descripcion: `Terminar ${enLista(rutas.map((x) => x.nombre))}` },
      rutas.length, distintas(rutas.map((x) => x.id)))
  }

  // ── Nutrición ──
  if (d.conNutricion) {
    const diasRegistro = [...a.diasRegistro].sort()
    conNiveles({ id: 'dias', nombre: 'Días registrados', grupo: 'nutricion', unidad: 'días' }, UMBRALES.dias,
      diasRegistro.map((fecha) => ({ fecha })), (n) => `${formatInt(n)} días con comidas registradas`)
    const porSemana = new Map<string, number>()
    const enteras: Conseguido[] = []
    for (const f of diasRegistro) {
      const n = (porSemana.get(startOfWeek(f)) ?? 0) + 1
      porSemana.set(startOfWeek(f), n)
      if (n === 7) enteras.push({ fecha: f })
    }
    conNiveles({ id: 'semanas-enteras', nombre: 'Semanas enteras', grupo: 'nutricion', unidad: 'semanas' }, UMBRALES.semanasEnteras, enteras,
      (n) => `${formatInt(n)} semanas con comidas registradas los siete días`)
    conNiveles({ id: 'proteina', nombre: 'Proteína', grupo: 'nutricion', unidad: 'días' }, UMBRALES.proteina,
      a.eventos.flatMap((e) => (e.tipo === 'proteina' ? [{ fecha: e.fecha }] : [])), (n) => `${formatInt(n)} días con la proteína al 90 % del objetivo`)
    logros.push({
      id: 'herbario', nombre: `Herbario ${formatInt(PLANTAS_SEMANA)}`, grupo: 'nutricion', niveles: [],
      descripcion: `${formatInt(PLANTAS_SEMANA)} plantas distintas en una misma semana`,
      veces: d.herbario.flatMap((s) => (s.treintaEl ? [{ fecha: s.treintaEl }] : [])),
    })
    conNiveles({ id: 'plantas', nombre: 'Botánica', grupo: 'nutricion', unidad: 'plantas' }, UMBRALES.plantas,
      (d.plantas ?? []).map((p) => p.primera).sort().map((fecha) => ({ fecha })), (n) => `${formatInt(n)} plantas distintas desde siempre`)
  }

  // ── Ocultos ──
  const everest = coronadas.find((x) => x.montana.id === EVEREST)?.cumbre
  logros.push({ id: 'mas-rapido', nombre: 'Más rápido que la otra vez', grupo: 'oculto', oculto: true, niveles: [],
    descripcion: 'Repetir una cumbre en menos días que la vez anterior en esa montaña',
    veces: masRapidas(coronadas),
  })
  logros.push({ id: 'techo-mundo', nombre: 'Techo del mundo', grupo: 'oculto', oculto: true, umbrales: [1], niveles: [everest ? { ...everest } : null],
    descripcion: 'Hacer cumbre en el Everest' })
  const k2 = coronadas.find((x) => x.montana.id === K2)?.cumbre
  logros.push({ id: 'montana-salvaje', nombre: 'La montaña salvaje', grupo: 'oculto', oculto: true, umbrales: [1], niveles: [k2 ? { ...k2 } : null],
    descripcion: 'Hacer cumbre en el K2' })
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
  logros.push({ id: 'km-vertical', nombre: 'Kilómetro vertical', grupo: 'oculto', oculto: true, niveles: [],
    descripcion: `Una actividad con ${metrosTexto(METROS_KM_VERTICAL)} de desnivel positivo o más`,
    veces: actividades.filter((x) => (x.desnivelM ?? 0) >= METROS_KM_VERTICAL).map((x) => ({ fecha: x.fecha })),
  })
  const madrugadas = a.entrenos.filter((e) => new Date(e.inicio).getHours() < MADRUGADOR.hora)
  logros.push({
    id: 'madrugador', nombre: 'Madrugador', grupo: 'oculto', oculto: true, umbrales: [MADRUGADOR.entrenos],
    niveles: porUmbral([MADRUGADOR.entrenos], madrugadas.map((e) => ({ fecha: e.fecha, workoutId: e.workoutId }))),
    progreso: madrugadas.length, unidad: 'entrenos',
    descripcion: `${formatInt(MADRUGADOR.entrenos)} entrenos empezados antes de las ${formatInt(MADRUGADOR.hora)}:00`,
  })
  const nocturnos = a.entrenos.filter((e) => new Date(e.inicio).getHours() >= NOCTAMBULO.hora)
  logros.push({
    id: 'noctambulo', nombre: 'Noctámbulo', grupo: 'oculto', oculto: true, umbrales: [NOCTAMBULO.entrenos],
    niveles: porUmbral([NOCTAMBULO.entrenos], nocturnos.map((e) => ({ fecha: e.fecha, workoutId: e.workoutId }))),
    progreso: nocturnos.length, unidad: 'entrenos',
    descripcion: `${formatInt(NOCTAMBULO.entrenos)} entrenos empezados a las ${formatInt(NOCTAMBULO.hora)}:00 o más tarde`,
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
  const conComodin = r.semanas.find((s) => s.comodin)
  logros.push({ id: 'comodin', nombre: 'Red de seguridad', grupo: 'oculto', oculto: true, umbrales: [1],
    niveles: [conComodin ? { fecha: addDays(conComodin.lunes, 6) } : null], descripcion: 'Salvar el hilo con un comodín' })
  const conRecords = new Map<number, Set<number>>()
  const diasDeRecords: Conseguido[] = []
  for (const x of a.records) {
    const ejercicios = conRecords.get(x.workoutId) ?? new Set<number>()
    conRecords.set(x.workoutId, ejercicios)
    if (ejercicios.has(x.record.exerciseId)) continue
    ejercicios.add(x.record.exerciseId)
    if (ejercicios.size === RECORDS_EN_UN_DIA) diasDeRecords.push({ fecha: x.fecha, workoutId: x.workoutId })
  }
  logros.push({ id: 'dia-records', nombre: 'Día de récords', grupo: 'oculto', oculto: true, niveles: [], veces: diasDeRecords,
    descripcion: `Récord personal en ${formatInt(RECORDS_EN_UN_DIA)} ejercicios distintos en un mismo entreno` })
  // Un día con entreno y actividad (y comidas registradas, si la nutrición cuenta).
  const diasActividad = new Set(actividades.map((x) => x.fecha))
  logros.push({ id: 'dia-redondo', nombre: 'Día redondo', grupo: 'oculto', oculto: true, niveles: [],
    descripcion: d.conNutricion ? 'Entrenar, salir a caminar o correr y registrar las comidas el mismo día' : 'Entrenar y salir a caminar o correr el mismo día',
    veces: diasConEntreno(a).flatMap((e) => (diasActividad.has(e.fecha) && (!d.conNutricion || a.diasRegistro.has(e.fecha)) ? [e] : [])),
  })
  const entrenosPorDia = new Map(diasConEntreno(a).map((e) => [e.fecha, e]))
  logros.push({ id: 'ano-nuevo', nombre: 'Año nuevo', grupo: 'oculto', oculto: true, niveles: [],
    descripcion: 'Entrenar o salir a caminar o correr el 1 de enero',
    veces: [...new Set([...entrenosPorDia.keys(), ...diasActividad])].filter((f) => f.endsWith('-01-01')).sort()
      .map((f) => entrenosPorDia.get(f) ?? { fecha: f }),
  })
  // Seguir aquí un año después del primer registro: el primer día con algo (entreno, comidas o actividad) desde entonces.
  const diasConAlgo = [...new Set([...a.diasEntreno, ...a.diasRegistro, ...diasActividad])].sort()
  const aniversario = diasConAlgo.length ? diasConAlgo.find((f) => f >= unAnoDespues(diasConAlgo[0])) : undefined
  logros.push({ id: 'aniversario', nombre: 'Un año después', grupo: 'oculto', oculto: true, umbrales: [1],
    niveles: [aniversario ? { fecha: aniversario } : null], descripcion: 'Seguir registrando un año después del primer día' })
  if (d.conNutricion) {
    logros.push({ id: 'jardin', nombre: 'Jardín botánico', grupo: 'oculto', oculto: true, niveles: [],
      descripcion: `${formatInt(PLANTAS_JARDIN)} plantas distintas en una misma semana`,
      veces: d.herbario.flatMap((s) => (s.cincuentaEl ? [{ fecha: s.cincuentaEl }] : [])),
    })
  }
  return logros
}

const textoMetros = (m: number) => `${metrosTexto(m)} subidos en Cumbres`
const textoKm = (km: number) => `${formatInt(km)} km caminando, corriendo o de senderismo`
const textoRepetir = (n: number) => `Hacer cumbre ${formatInt(n)} veces en la misma montaña`
const textoDistancia = (km: number) => `Una salida de ${formatInt(km)} km o más`
const textoLiga = (n: number) => `Llegar a ${LIGAS[n - 1]} en la Liga con un ejercicio`

/** El mismo día un año más tarde («2027-02-29» compara bien como texto aunque no exista). */
const unAnoDespues = (fecha: string) => `${Number(fecha.slice(0, 4)) + 1}${fecha.slice(4)}`

/** El primer entreno que cuenta de cada día, en orden. */
function diasConEntreno(a: ResultadoExperiencia): Conseguido[] {
  const vistos = new Set<string>()
  return a.entrenos.flatMap((e) => {
    if (vistos.has(e.fecha)) return []
    vistos.add(e.fecha)
    return [{ fecha: e.fecha, workoutId: e.workoutId }]
  })
}

/** Primera vez que un ejercicio entró en cada liga (Bronce, Plata…): la primera sesión de esa semana. */
function primerasLigas(ligas: readonly LigaEjercicio[]): (Conseguido | null)[] {
  return LIGAS.map((_, i) => {
    const paso = i * SEMANAS_POR_LIGA + 1
    let primera: Conseguido | null = null
    for (const l of ligas) {
      const s = l.semanas.find((x) => x.despues >= paso && x.sesion)?.sesion
      if (s && (!primera || s.fecha < primera.fecha)) primera = { fecha: s.fecha, workoutId: s.workoutId }
    }
    return primera
  })
}

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
/** «Constancia II»: el nombre con el numeral del nivel si el logro tiene varios. */
export function nombreConNivel({ logro, nivel }: NuevoLogro): string {
  return nivel !== null && logro.umbrales && logro.umbrales.length > 1 ? `${logro.nombre} ${NUMERALES[nivel - 1]}` : logro.nombre
}

export function logrosDeEntreno(logros: readonly Logro[], workoutId: number): NuevoLogro[] {
  return logros.flatMap((l) => [
    ...l.niveles.flatMap((n, i) => (n?.workoutId === workoutId ? [{ logro: l, nivel: i + 1 }] : [])),
    ...(l.veces ?? []).flatMap((v) => (v.workoutId === workoutId ? [{ logro: l, nivel: null }] : [])),
  ])
}
