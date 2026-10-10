import { claveComparacion, contextoSerie } from '../lib/ejecucion'
import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import * as exercisesRepo from '../data/exercisesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import * as routinesRepo from '../data/routinesRepo'
import { cifrasClave, datosProgreso, textoMejorSerie, type MetricaProgreso } from '../lib/progreso'
import { MODOS_CARGA, modoCarga } from '../lib/carga'
import type { ModoCarga } from '../../../shared/db/types'
import { chartAxis, chartColors, chartGrid, chartTooltip, escalaAjustada } from '../../../shared/design/chart'
import { formatDiaMes, formatFechaHora, todayISO } from '../../../shared/lib/dates'
import { Select } from '../../../shared/components/Input'
import ListGroup from '../../../shared/components/ListGroup'
import Metric from '../../../shared/components/Metric'
import SectionHeader from '../../../shared/components/SectionHeader'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import { formatCompact, formatInt, formatNumber } from '../../../shared/lib/format'
import Card from '../../../shared/components/Card'
import { EmptyState } from '../../../shared/components/StateMessage'
import MiniaturaEjercicio from '../components/MiniaturaEjercicio'
import BloqueLiga from '../../liga/components/BloqueLiga'
import LigasLista from '../../liga/components/LigasLista'
import { useLigas } from '../../liga/hooks/useLigas'
import { alternativas } from '../../liga/lib/alternativas'
import { sesionesSinRecord } from '../../liga/lib/estancamiento'

/** Rótulo del último punto de una serie, a su derecha: dónde estás sin tener que leer el eje. */
function rotuloFinal(total: number, color: string, formato: (v: number) => string) {
  return function Rotulo({ x, y, index, value }: { x?: number | string; y?: number | string; index?: number; value?: number | string }) {
    if (index !== total - 1 || value === undefined) return <g />
    return <text x={Number(x) + 8} y={Number(y)} dy={4} fill={color} fontSize={12} fontWeight={700}>{formato(Number(value))}</text>
  }
}

type Metrica = MetricaProgreso
const unidadDe = (m: Metrica) => (m === 'reps' ? 'reps' : 'kg')
const conSigno = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatNumber(Math.abs(v), 1)}`

/**
 * Un ejercicio cada vez: su liga, una métrica elegida con su gráfica, tres cifras clave y las sesiones con su mejor serie.
 * Sin ejercicio elegido, las ligas de todos (si la gamificación está visible).
 */
export default function Progreso() {
  const [exerciseId, setExerciseId] = useState<number | null>(null)
  const [modoElegido, setModoElegido] = useState<ModoCarga | null>(null)
  const [varianteElegida, setVarianteElegida] = useState<string | null>(null)
  const [metricaElegida, setMetricaElegida] = useState<Metrica | null>(null)
  const exercises = useLiveQuery(() => exercisesRepo.listar(), [])
  const sets = useLiveQuery(() => exerciseId ? setsRepo.delEjercicio(exerciseId) : [], [exerciseId])
  const workouts = useLiveQuery(() => workoutsRepo.listar(), [])
  const rutinas = useLiveQuery(() => routinesRepo.listar(), [])
  const hoy = todayISO()
  const ligas = useLigas(hoy)
  const selectorRef = useRef<HTMLSelectElement>(null)
  const modos = [...new Set((sets ?? []).map(modoCarga))]
  const modo = modoElegido && modos.includes(modoElegido) ? modoElegido : modos[0] ?? 'externa'
  const variantes = [...new Map((sets ?? []).filter(s => modoCarga(s) === modo && !s.bajadas?.length).map(s => [claveComparacion(s), s])).entries()]
  const variante = varianteElegida && variantes.some(([key]) => key === varianteElegida) ? varianteElegida : variantes[0]?.[0]
  const permiteRM = variantes.find(([key]) => key === variante)?.[1]
  const rm = !permiteRM?.ejecucion && !permiteRM?.excentricaSeg && !permiteRM?.soloNegativas && modo === 'externa'
  const datos = datosProgreso(sets ?? [], workouts ?? [], modo, variante).map(d => ({ ...d, fecha: formatDiaMes(d.inicio) }))
  const ultimo = datos.at(-1)
  // Nombre completo (títulos, lista, lector de pantalla) y corto (selector segmentado). 1RM primero cuando existe.
  const opciones: Partial<Record<Metrica, [string, string]>> = modo === 'externa'
    ? { ...(rm ? { oneRM: ['1RM estimado', '1RM est.'] as [string, string] } : {}), pesoMax: permiteRM?.ejecucion ? ['Peso por lado', 'Por lado'] : permiteRM?.soloNegativas ? ['Carga de negativas', 'Carga'] : ['Peso máximo', 'Peso máx.'], volumen: ['Volumen externo', 'Volumen'], reps: ['Repeticiones', 'Reps'] }
    : modo === 'lastre' ? { pesoMax: ['Lastre máximo', 'Lastre'], volumen: ['Volumen de lastre', 'Volumen'], reps: ['Repeticiones', 'Reps'] }
    : modo === 'corporal' ? { reps: ['Repeticiones', 'Reps'] } : { asistencia: ['Asistencia mínima', 'Ayuda mín.'], reps: ['Repeticiones', 'Reps'] }
  const disponibles = Object.keys(opciones) as Metrica[]
  const metrica = metricaElegida && disponibles.includes(metricaElegida) ? metricaElegida : disponibles[0]
  const [nombre, corto] = opciones[metrica] ?? ['', '']
  const unidad = unidadDe(metrica)
  const cifras = cifrasClave(datos, metrica, modo)
  const ejercicio = exercises?.find(e => e.id === exerciseId)
  const escala = escalaAjustada(datos.map(d => d[metrica] ?? 0))
  const valor = (d: (typeof datos)[number]) => formatNumber(d[metrica] ?? 0, 1)
  const elegir = (id: number | null) => { setExerciseId(id); setModoElegido(null); setVarianteElegida(null); setMetricaElegida(null) }
  // Elegir desde la lista o volver a ella devuelve el foco al selector, arriba: anuncia el ejercicio y sube la vista.
  const elegirYEnfocar = (id: number | null) => { elegir(id); selectorRef.current?.focus() }
  const liga = ligas?.visible && exerciseId !== null ? ligas.porEjercicio.get(exerciseId) : undefined
  const bloqueLiga = liga && ligas?.visible && <BloqueLiga liga={liga} ejercicio={ejercicio} hoy={hoy} onVerTodas={() => elegirYEnfocar(null)}
    alternativas={liga.division.elite && ejercicio && exercises ? alternativas(ejercicio, exercises, ligas.porEjercicio) : []} mantenido={ligas.mantener.includes(liga.exerciseId)}
    sinRecords={liga.division.elite ? sesionesSinRecord(liga.exerciseId, workouts ?? [], sets ?? []) : 0}
    rutinas={(rutinas ?? []).filter(r => r.exerciseIds.includes(liga.exerciseId))} />
  const conLigas = !!ligas?.visible && ligas.ligas.length > 0

  return <div className="space-y-section">
    <div className="space-y-2"><SectionHeader variant="section">Gráficas por ejercicio</SectionHeader><p className="text-body-sm text-fg-muted">Consulta carga, repeticiones y volumen. Las métricas disponibles dependen del tipo de ejercicio.</p></div>
    <label className="block space-y-2"><span className="text-label text-fg-muted">Ejercicio</span>
      <Select ref={selectorRef} tone="surface" aria-label="Ejercicio" value={exerciseId ?? ''} onChange={e => elegir(e.target.value ? Number(e.target.value) : null)}><option value="">Elige un ejercicio…</option>{exercises?.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</Select>
    </label>
    {!!exerciseId && modos.length > 0 && <label className="block space-y-2"><span className="text-label text-fg-muted">Comparar el mismo tipo de carga</span>
      <Select aria-label="Tipo de carga en Progreso" value={modo} onChange={e => { setModoElegido(e.target.value as ModoCarga); setVarianteElegida(null) }}>
        {modos.map(id => <option key={id} value={id}>{MODOS_CARGA[id]}</option>)}
      </Select></label>}
    {!!exerciseId && variantes.length > 1 && <label className="block space-y-2"><span className="text-label text-fg-muted">Ejecución, agarre y tempo</span><Select aria-label="Variante en Progreso" value={variante} onChange={e => setVarianteElegida(e.target.value)}>{variantes.map(([key, s]) => <option key={key} value={key}>{contextoSerie(s) || 'Bilateral · sin agarre ni tempo especificados'}</option>)}</Select></label>}
    {!exerciseId && conLigas && ligas.visible && exercises && <LigasLista ligas={ligas.ligas} nombres={new Map(exercises.map(e => [e.id, e.nombre]))} hoy={hoy} onElegir={elegirYEnfocar} />}
    {!exerciseId && ligas !== undefined && !conLigas && <EmptyState icon="dumbbell" title="Sigue tu evolución">Elige un ejercicio para comparar tus sesiones.</EmptyState>}
    {!!exerciseId && !ultimo && bloqueLiga}
    {!!exerciseId && !ultimo && <EmptyState title="Aún sin sesiones terminadas">Termina un entreno con este tipo de carga para comparar resultados.</EmptyState>}
    {!!exerciseId && ultimo && cifras && <>
      <div className="flex items-center gap-3">
        <MiniaturaEjercicio catalogId={ejercicio?.catalogId} />
        <div className="min-w-0"><h2 className="break-words text-heading text-fg">{ejercicio?.nombre}</h2>
          <p className="tabular text-caption text-fg-muted">{formatInt(datos.length)} {datos.length === 1 ? 'sesión' : 'sesiones'} · desde el {formatDiaMes(datos[0].inicio)}</p></div>
      </div>
      {bloqueLiga}
      {disponibles.length > 1 && <SegmentedControl label="Métrica de la gráfica" size="sm" valor={metrica} onChange={setMetricaElegida}
        opciones={disponibles.map(m => ({ valor: m, label: opciones[m]![1] }))} />}
      <Card className="space-y-3">
        <Metric size="hero" label={`${nombre} · última sesión`} valor={valor(ultimo)} unidad={unidad} caption={formatDiaMes(ultimo.inicio)} />
        {datos.length < 2 ? <p className="text-body-sm text-fg-muted">La gráfica aparece a partir de dos sesiones terminadas con el mismo tipo de carga y variante.</p> : <>
          <div role="img" aria-label={`${nombre} por sesión, de ${valor(datos[0])} a ${valor(ultimo)} ${unidad}. Datos de cada sesión debajo.`}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={datos} margin={{ left: 0, right: Math.max(40, 12 + 7 * valor(ultimo).length), top: 8, bottom: 0 }}>
                <CartesianGrid {...chartGrid} /><XAxis dataKey="fecha" {...chartAxis} minTickGap={20} />
                <YAxis {...chartAxis} width={56} tickFormatter={formatCompact} domain={escala.dominio} ticks={escala.marcas} />
                <Tooltip {...chartTooltip} formatter={v => `${formatNumber(Number(v), 1)} ${unidad}`} />
                <Area type="linear" dataKey={metrica} name={nombre} stroke={chartColors.seriesPrimary} strokeWidth={2} fill={chartColors.seriesPrimary} fillOpacity={0.12}
                  baseValue={escala.dominio[0]} dot={datos.length < 15 ? { r: 3, fill: chartColors.seriesPrimary } : false} isAnimationActive={false}
                  label={rotuloFinal(datos.length, chartColors.seriesPrimaryText, v => formatNumber(v, 1))} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {escala.dominio[0] > 0 && <p className="tabular text-caption text-fg-muted">El eje empieza en {formatNumber(escala.dominio[0])} {unidad}.</p>}
        </>}
      </Card>
      <dl aria-label="Cifras clave" className="cifras-filetes grid grid-cols-3">
        <div><dt className="text-caption text-fg-muted">Mejor serie</dt><dd className="tabular break-words text-body font-semibold text-fg">{textoMejorSerie(cifras.mejor, modo)}</dd><dd className="tabular text-caption text-fg-muted">{formatDiaMes(cifras.mejor.inicio)}</dd></div>
        <div><dt className="text-caption text-fg-muted">1RM estimado</dt><dd className="tabular break-words text-body font-semibold text-fg">{cifras.oneRM === null ? '—' : `${formatNumber(cifras.oneRM, 1)} kg`}</dd><dd className="text-caption text-fg-muted">Máximo</dd></div>
        <div><dt className="text-caption text-fg-muted">Cambio</dt><dd className="tabular break-words text-body font-semibold text-fg">{cifras.cambio === null ? '—' : `${conSigno(cifras.cambio)} ${unidad}`}</dd><dd className="text-caption text-fg-muted">{corto}</dd></div>
      </dl>
      <p className="text-caption text-fg-muted">{modo === 'externa' ? (rm ? '1RM estima el peso para una repetición (Epley). El volumen suma kg externos × repeticiones. El cambio compara la primera y la última sesión.' : 'Las variantes unilaterales o con tempo se comparan por separado, sin estimar 1RM. Volumen suma los lados registrados.') : modo === 'lastre' ? 'El volumen cuenta solo el lastre. No se estima 1RM con peso corporal.' : modo === 'asistencia' ? 'Menos asistencia significa menos ayuda. Compara también las repeticiones; no equivale a una medida exacta de carga efectiva.' : 'Se comparan las repeticiones. No se convierte la masa corporal en volumen ni en 1RM.'}</p>
      <section aria-label="Sesiones" className="space-y-stack">
        <SectionHeader variant="section">Sesiones</SectionHeader>
        <ListGroup aria-label={`Sesiones de ${ejercicio?.nombre ?? 'este ejercicio'}`}>{[...datos].reverse().map(d => <li key={d.workoutId} className="flex min-h-touch items-center justify-between gap-3 py-2">
          <span className="min-w-0"><span className="tabular block text-body font-medium text-fg">{formatFechaHora(d.inicio)}</span>
            <span className="tabular block break-words text-caption text-fg-muted">Mejor serie: {textoMejorSerie(d.mejor, modo)}</span></span>
          <span className="tabular shrink-0 text-right text-body font-semibold text-fg">{valor(d)} <span className="text-caption font-normal text-fg-muted">{unidad}</span></span>
        </li>)}</ListGroup>
      </section>
    </>}
  </div>
}
