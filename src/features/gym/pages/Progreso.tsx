import { lazy, Suspense, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import * as exercisesRepo from '../data/exercisesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import * as routinesRepo from '../data/routinesRepo'
import * as gimnasiosRepo from '../data/gimnasiosRepo'
import { nombresGimnasios, textoGimnasio } from '../lib/gimnasios'
import { MAX_LINEAS_GIMNASIO, cifrasClave, datosProgreso, resumenVariantes, filasPorGimnasio, gimnasiosConSesiones, resumenEjercicios, textoMejorSerie, trazoMini, type MetricaProgreso } from '../lib/progreso'
import { MODOS_CARGA, modoCarga } from '../lib/carga'
import { ayudaCifras } from '../lib/ayudaCifras'
import type { ModoCarga } from '../../../shared/db/types'
import { chartAxis, chartColors, chartDashGimnasios, chartGrid, chartTooltip, escalaAjustada } from '../../../shared/design/chart'
import { formatDiaMes, formatFechaHora, todayISO } from '../../../shared/lib/dates'
import { Select } from '../../../shared/components/Input'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import Icon from '../../../shared/components/Icon'
import Button, { IconButton } from '../../../shared/components/Button'
import Sheet from '../../../shared/components/Sheet'
import Metric from '../../../shared/components/Metric'
import SectionHeader from '../../../shared/components/SectionHeader'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import { formatCompact, formatInt, formatNumber } from '../../../shared/lib/format'
import Card from '../../../shared/components/Card'
import { EmptyState, LoadingState } from '../../../shared/components/StateMessage'
import MiniaturaEjercicio from '../components/MiniaturaEjercicio'
import TarjetasVariante from '../components/TarjetasVariante'
import ChipAjuste from '../components/ChipAjuste'
import BloqueLiga from '../../liga/components/BloqueLiga'
import LigasLista from '../../liga/components/LigasLista'
import { useLigas } from '../../liga/hooks/useLigas'
import { alternativas } from '../../liga/lib/alternativas'
import { sesionesSinRecord } from '../../liga/lib/estancamiento'

// Diferido: la geometría de los muñecos pesa más que el resto del mapa.
const MapaProgreso = lazy(() => import('../components/MapaProgreso'))

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

const TODOS = 'todos'
const claveGimnasio = (id: number | undefined) => (id === undefined ? 'habitual' : String(id))

/** Muestra de la línea de un gimnasio en la leyenda: su color y su trazo. */
function MuestraLinea({ i }: { i: number }) {
  return <svg viewBox="0 0 24 8" className="h-2 w-6 shrink-0" aria-hidden="true" focusable="false">
    <line x1={1} y1={4} x2={23} y2={4} stroke={chartColors.gimnasios[i]} strokeWidth={2} strokeDasharray={chartDashGimnasios[i]} strokeLinecap="round" />
  </svg>
}

/** Minigráfica de una fila de la lista: la métrica por defecto en las últimas sesiones. Decorativa (el texto da la cifra). */
function MiniLinea({ valores }: { valores: number[] }) {
  const t = trazoMini(valores, 64, 24)
  if (!t) return <span aria-hidden className="h-6 w-16 shrink-0" />
  return <svg viewBox="0 0 64 24" className="mini-grafica h-6 w-16 shrink-0" aria-hidden="true" focusable="false">
    <path d={t.d} className="mini-grafica-linea" /><circle cx={t.ultimo.x} cy={t.ultimo.y} r={2.5} className="mini-grafica-punto" />
  </svg>
}

/**
 * Sin ejercicio elegido: arriba el mapa muscular acumulado (ADR 046); después la lista de ejercicios con sesiones, cada uno con su última mejor serie y su minigráfica (E4,
 * ADR 035), y debajo las ligas (si la gamificación está visible). Elegido uno: su liga, una métrica con su gráfica, tres
 * cifras clave y las sesiones con su mejor serie.
 */
export default function Progreso() {
  const [exerciseId, setExerciseId] = useState<number | null>(null)
  const [modoElegido, setModoElegido] = useState<ModoCarga | null>(null)
  const [varianteElegida, setVarianteElegida] = useState<string | null>(null)
  const [gimnasioElegido, setGimnasioElegido] = useState<string>(TODOS)
  const [ayuda, setAyuda] = useState(false)
  const [hojaCarga, setHojaCarga] = useState(false)
  const [metricaElegida, setMetricaElegida] = useState<Metrica | null>(null)
  const exercises = useLiveQuery(() => exercisesRepo.listar(), [])
  const sets = useLiveQuery(() => exerciseId ? setsRepo.delEjercicio(exerciseId) : [], [exerciseId])
  // Todas las series solo para la lista (sin ejercicio elegido).
  const todasLasSeries = useLiveQuery(() => exerciseId ? [] : setsRepo.todas(), [exerciseId])
  const listaRef = useRef<HTMLHeadingElement>(null)
  const workouts = useLiveQuery(() => workoutsRepo.listar(), [])
  const rutinas = useLiveQuery(() => routinesRepo.listar(), [])
  const gimnasios = useLiveQuery(async () => nombresGimnasios(await gimnasiosRepo.listar()), [])
  const hoy = todayISO()
  const ligas = useLigas(hoy)
  const selectorRef = useRef<HTMLSelectElement>(null)
  const modos = [...new Set((sets ?? []).map(modoCarga))]
  const modo = modoElegido && modos.includes(modoElegido) ? modoElegido : modos[0] ?? 'externa'
  // El gimnasio no es variante: es otra dimensión de la gráfica (una línea por gimnasio, o solo uno).
  // Una tarjeta por variante con sesiones terminadas, la de más sesiones primero (abre en ella).
  const variantes = resumenVariantes(sets ?? [], workouts ?? [], modo)
  const variante = varianteElegida && variantes.some(v => v.clave === varianteElegida) ? varianteElegida : variantes[0]?.clave
  const permiteRM = variantes.find(v => v.clave === variante)?.serie
  const rm = !permiteRM?.ejecucion && !permiteRM?.excentricaSeg && !permiteRM?.soloNegativas && modo === 'externa'
  const deTodos = datosProgreso(sets ?? [], workouts ?? [], modo, variante).map(d => ({ ...d, fecha: formatDiaMes(d.inicio) }))
  // Orden fijo (habitual primero): decide el color de cada gimnasio, que no cambia al filtrar.
  const conSesiones = gimnasiosConSesiones(deTodos)
  const variosGimnasios = conSesiones.length > 1
  // El ejercicio tiene sesiones en otros gimnasios pero esta variante no: se dice, para que no parezca que falta el selector.
  const otrasVariantesEnOtroGimnasio = !variosGimnasios && variantes.some(v => v.gimnasios > 1 || gimnasiosConSesiones(datosProgreso(sets ?? [], workouts ?? [], modo, v.clave))[0] !== conSesiones[0])
  const gimnasioActual = variosGimnasios && conSesiones.some(id => claveGimnasio(id) === gimnasioElegido) ? gimnasioElegido : TODOS
  const todosLosGimnasios = variosGimnasios && gimnasioActual === TODOS
  const indiceGimnasio = conSesiones.findIndex(id => claveGimnasio(id) === gimnasioActual)
  const datos = gimnasioActual === TODOS ? deTodos : deTodos.filter(d => claveGimnasio(d.gimnasioId) === gimnasioActual)
  const lineas = todosLosGimnasios ? conSesiones.slice(0, MAX_LINEAS_GIMNASIO) : []
  const nombreGimnasio = (id: number | undefined) => textoGimnasio(id, gimnasios)
  const opcionesGimnasio = [{ valor: TODOS, label: 'Todos' }, ...conSesiones.map(id => ({ valor: claveGimnasio(id), label: id === undefined ? 'Habitual' : nombreGimnasio(id) }))]
  // Pocos gimnasios y nombres cortos: segmentos sobre la gráfica. Si no caben, un desplegable.
  const gimnasioEnSegmentos = opcionesGimnasio.length <= 3 && opcionesGimnasio.every(o => o.label.length <= 12)
  const colorUnico = indiceGimnasio > 0 && indiceGimnasio < MAX_LINEAS_GIMNASIO ? chartColors.gimnasios[indiceGimnasio] : chartColors.seriesPrimary
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
  const calculadas = cifrasClave(datos, metrica, modo)
  // Con todos los gimnasios, el cambio entre la primera y la última sesión mezclaría máquinas distintas: se pide elegir uno.
  const cifras = calculadas && todosLosGimnasios ? { ...calculadas, cambio: null } : calculadas
  const filas = todosLosGimnasios ? filasPorGimnasio(datos, metrica, lineas) : datos
  const ejercicio = exercises?.find(e => e.id === exerciseId)
  const escala = escalaAjustada(datos.filter(d => !todosLosGimnasios || lineas.includes(d.gimnasioId)).map(d => d[metrica] ?? 0))
  const valor = (d: (typeof datos)[number]) => formatNumber(d[metrica] ?? 0, 1)
  const elegir = (id: number | null) => { setExerciseId(id); setModoElegido(null); setVarianteElegida(null); setMetricaElegida(null); setGimnasioElegido(TODOS); setHojaCarga(false) }
  // Elegir desde la lista o volver a ella lleva el foco arriba (al selector o al título de la lista): anuncia y sube la vista.
  const elegirYEnfocar = (id: number | null) => { elegir(id); requestAnimationFrame(() => (id === null ? listaRef.current : selectorRef.current)?.focus()) }
  const resumenes = !exerciseId && todasLasSeries && workouts ? resumenEjercicios(todasLasSeries, workouts) : undefined
  const nombres = new Map((exercises ?? []).map(e => [e.id, e]))
  const liga = ligas?.visible && exerciseId !== null ? ligas.porEjercicio.get(exerciseId) : undefined
  const bloqueLiga = liga && ligas?.visible && <BloqueLiga liga={liga} ejercicio={ejercicio} hoy={hoy} onVerTodas={() => elegirYEnfocar(null)}
    alternativas={liga.division.elite && ejercicio && exercises ? alternativas(ejercicio, exercises, ligas.porEjercicio) : []} mantenido={ligas.mantener.includes(liga.exerciseId)}
    sinRecords={liga.division.elite ? sesionesSinRecord(liga.exerciseId, workouts ?? [], sets ?? []) : 0}
    rutinas={(rutinas ?? []).filter(r => r.exerciseIds.includes(liga.exerciseId))} />
  const conLigas = !!ligas?.visible && ligas.ligas.length > 0

  return <div className="space-y-section">
    {!exerciseId && <Suspense fallback={<LoadingState />}><MapaProgreso /></Suspense>}
    {!exerciseId && <section aria-labelledby="progreso-lista" className="space-y-stack">
      <h2 id="progreso-lista" ref={listaRef} tabIndex={-1} className="text-heading text-fg">Por ejercicio</h2>
      {resumenes && resumenes.length > 0 && <ListGroup aria-label="Ejercicios con sesiones">
        {resumenes.map(r => {
          const ex = nombres.get(r.exerciseId)
          if (!ex) return null
          return <li key={r.exerciseId}><ListRow onClick={() => elegirYEnfocar(r.exerciseId)}>
            <span className="min-w-0 flex-1">
              <span className="block break-words text-body font-semibold text-fg">{ex.nombre}</span>
              <span className="tabular block break-words text-caption text-fg-muted">{textoMejorSerie(r.ultima.mejor, r.modo)} · {formatDiaMes(r.ultima.inicio)}</span>
            </span>
            <MiniLinea valores={r.puntos} />
            <Icon name="chevron-right" size={18} className="shrink-0 text-fg-subtle" />
          </ListRow></li>
        })}
      </ListGroup>}
    </section>}
    {/* Elegido uno, el selector cambia de ejercicio; en la lista, abre cualquiera (también los que aún no tienen sesiones). */}
    <div className="space-y-stack">
      {!!exerciseId && <Button variant="ghost" size="sm" className="-ml-2" onClick={() => elegirYEnfocar(null)}><Icon name="chevron-left" size={18} />Todos los ejercicios</Button>}
      <label className="block space-y-2"><span className="text-label text-fg-muted">{exerciseId ? 'Ejercicio' : 'Otro ejercicio'}</span>
        <Select ref={selectorRef} tone="surface" aria-label="Ejercicio" value={exerciseId ?? ''} onChange={e => elegir(e.target.value ? Number(e.target.value) : null)}><option value="">{exerciseId ? 'Todos los ejercicios' : 'Elige un ejercicio…'}</option>{exercises?.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</Select>
      </label>
    </div>
    {/* Elegido uno: cabecera, chip del tipo de carga (si hay más de uno) y tarjetas de variante (si hay más de una). */}
    {!!exerciseId && ejercicio && <div className="flex items-center gap-3">
      <MiniaturaEjercicio catalogId={ejercicio.catalogId} />
      <div className="min-w-0"><h2 className="break-words text-heading text-fg">{ejercicio.nombre}</h2>
        {datos.length > 0 && <p className="tabular text-caption text-fg-muted">{formatInt(datos.length)} {datos.length === 1 ? 'sesión' : 'sesiones'} · desde el {formatDiaMes(datos[0].inicio)}</p>}</div>
    </div>}
    {!!exerciseId && modos.length > 1 && <div className="flex flex-wrap gap-2">
      <ChipAjuste label="Tipo de carga" texto={MODOS_CARGA[modo]} onClick={() => setHojaCarga(true)} />
    </div>}
    {!!exerciseId && variantes.length > 1 && <TarjetasVariante variantes={variantes} elegida={variante} onElegir={clave => { setVarianteElegida(clave); setGimnasioElegido(TODOS) }} />}
    {!exerciseId && conLigas && ligas.visible && exercises && <LigasLista ligas={ligas.ligas} nombres={new Map(exercises.map(e => [e.id, e.nombre]))} hoy={hoy} onElegir={elegirYEnfocar} />}
    {!exerciseId && resumenes?.length === 0 && <EmptyState icon="dumbbell" title="Sigue tu evolución">Termina un entreno y aquí verás cada ejercicio con su mejor serie y cómo va.</EmptyState>}
    {!!exerciseId && !ultimo && bloqueLiga}
    {!!exerciseId && !ultimo && <EmptyState title="Aún sin sesiones terminadas">Termina un entreno con este tipo de carga para comparar resultados.</EmptyState>}
    {!!exerciseId && ultimo && cifras && <>
      {bloqueLiga}
      {disponibles.length > 1 && <SegmentedControl label="Métrica de la gráfica" size="sm" valor={metrica} onChange={setMetricaElegida}
        opciones={disponibles.map(m => ({ valor: m, label: opciones[m]![1] }))} />}
      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Metric size="hero" label={`${nombre} · última sesión`} valor={valor(ultimo)} unidad={unidad} caption={`${formatDiaMes(ultimo.inicio)}${todosLosGimnasios ? ` · ${nombreGimnasio(ultimo.gimnasioId)}` : ''}`} />
          <IconButton icon="info" label="Qué significa cada cifra" variant="ghost" aria-haspopup="dialog" className="-mr-2 -mt-2" onClick={() => setAyuda(true)} />
        </div>
        {variosGimnasios && (gimnasioEnSegmentos
          ? <SegmentedControl label="Gimnasio en Progreso" size="sm" valor={gimnasioActual} onChange={setGimnasioElegido} opciones={opcionesGimnasio} />
          : <label className="block space-y-2"><span className="text-label text-fg-muted">Gimnasio</span>
            <Select aria-label="Gimnasio en Progreso" value={gimnasioActual} onChange={e => setGimnasioElegido(e.target.value)}>
              {opcionesGimnasio.map(o => <option key={o.valor} value={o.valor}>{o.valor === TODOS ? 'Todos los gimnasios' : o.valor === 'habitual' ? nombreGimnasio(undefined) : o.label}</option>)}
            </Select></label>)}
        {otrasVariantesEnOtroGimnasio && <p className="text-caption text-fg-muted">Todas las sesiones de esta variante son de {nombreGimnasio(conSesiones[0])}.</p>}
        {datos.length < 2 ? <p className="text-body-sm text-fg-muted">La gráfica aparece a partir de dos sesiones terminadas con el mismo tipo de carga y variante.</p> : todosLosGimnasios ? <>
          <div role="img" aria-label={`${nombre} por sesión en cada gimnasio: ${lineas.map(id => `${nombreGimnasio(id)}, ${valor(datos.filter(d => d.gimnasioId === id).at(-1)!)} ${unidad} en su última sesión`).join('; ')}. Datos de cada sesión debajo.`}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={filas} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid {...chartGrid} /><XAxis dataKey="fecha" {...chartAxis} minTickGap={20} />
                <YAxis {...chartAxis} width={56} tickFormatter={formatCompact} domain={escala.dominio} ticks={escala.marcas} />
                <Tooltip {...chartTooltip} formatter={v => `${formatNumber(Number(v), 1)} ${unidad}`} />
                {lineas.map((id, i) => <Line key={claveGimnasio(id)} type="linear" dataKey={`g${i}`} name={nombreGimnasio(id)} connectNulls stroke={chartColors.gimnasios[i]} strokeWidth={2}
                  strokeDasharray={chartDashGimnasios[i]} dot={datos.length < 15 ? { r: 3, fill: chartColors.gimnasios[i], strokeWidth: 0 } : false} isAnimationActive={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Leyenda con la última cifra de cada gimnasio: el color y el trazo nunca van solos. */}
          <ul aria-label="Gimnasios de la gráfica" className="space-y-1">{lineas.map((id, i) => {
            const ult = datos.filter(d => d.gimnasioId === id).at(-1)!
            return <li key={claveGimnasio(id)} className="flex min-w-0 items-center gap-2 text-caption">
              <MuestraLinea i={i} /><span className="min-w-0 flex-1 break-words text-fg">{nombreGimnasio(id)}</span>
              <span className="tabular shrink-0 text-fg-muted">{valor(ult)} {unidad} · {formatDiaMes(ult.inicio)}</span>
            </li>
          })}</ul>
          {conSesiones.length > lineas.length && <p className="text-caption text-fg-muted">La gráfica muestra {formatInt(lineas.length)} gimnasios. Elige otro en «Gimnasio» para ver su línea.</p>}
          {escala.dominio[0] > 0 && <p className="tabular text-caption text-fg-muted">El eje empieza en {formatNumber(escala.dominio[0])} {unidad}.</p>}
        </> : <>
          <div role="img" aria-label={`${nombre} por sesión, de ${valor(datos[0])} a ${valor(ultimo)} ${unidad}. Datos de cada sesión debajo.`}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={datos} margin={{ left: 0, right: Math.max(40, 12 + 7 * valor(ultimo).length), top: 8, bottom: 0 }}>
                <CartesianGrid {...chartGrid} /><XAxis dataKey="fecha" {...chartAxis} minTickGap={20} />
                <YAxis {...chartAxis} width={56} tickFormatter={formatCompact} domain={escala.dominio} ticks={escala.marcas} />
                <Tooltip {...chartTooltip} formatter={v => `${formatNumber(Number(v), 1)} ${unidad}`} />
                <Area type="linear" dataKey={metrica} name={nombre} stroke={colorUnico} strokeWidth={2} fill={colorUnico} fillOpacity={0.12}
                  baseValue={escala.dominio[0]} dot={datos.length < 15 ? { r: 3, fill: colorUnico } : false} isAnimationActive={false}
                  label={rotuloFinal(datos.length, colorUnico === chartColors.seriesPrimary ? chartColors.seriesPrimaryText : chartColors.seriesSecondary, v => formatNumber(v, 1))} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {escala.dominio[0] > 0 && <p className="tabular text-caption text-fg-muted">El eje empieza en {formatNumber(escala.dominio[0])} {unidad}.</p>}
        </>}
      </Card>
      <dl aria-label="Cifras clave" className="cifras-filetes grid grid-cols-3">
        <div><dt className="text-caption text-fg-muted">Mejor serie</dt><dd className="tabular break-words text-body font-semibold text-fg">{textoMejorSerie(cifras.mejor, modo)}</dd><dd className="tabular break-words text-caption text-fg-muted">{formatDiaMes(cifras.mejor.inicio)}{todosLosGimnasios ? ` · ${nombreGimnasio(datos.find(d => d.inicio === cifras.mejor.inicio)?.gimnasioId)}` : ''}</dd></div>
        <div><dt className="text-caption text-fg-muted">1RM estimado</dt><dd className="tabular break-words text-body font-semibold text-fg">{cifras.oneRM === null ? '—' : `${formatNumber(cifras.oneRM, 1)} kg`}</dd><dd className="text-caption text-fg-muted">Máximo</dd></div>
        <div><dt className="text-caption text-fg-muted">Cambio</dt><dd className="tabular break-words text-body font-semibold text-fg">{cifras.cambio === null ? '—' : `${conSigno(cifras.cambio)} ${unidad}`}</dd><dd className="text-caption text-fg-muted">{todosLosGimnasios ? 'Elige un gimnasio' : corto}</dd></div>
      </dl>
      <section aria-label="Sesiones" className="space-y-stack">
        <SectionHeader variant="section">Sesiones</SectionHeader>
        <ListGroup aria-label={`Sesiones de ${ejercicio?.nombre ?? 'este ejercicio'}`}>{[...datos].reverse().map(d => <li key={d.workoutId} className="flex min-h-touch items-center justify-between gap-3 py-2">
          <span className="min-w-0"><span className="tabular block text-body font-medium text-fg">{formatFechaHora(d.inicio)}</span>
            <span className="tabular block break-words text-caption text-fg-muted">Mejor serie: {textoMejorSerie(d.mejor, modo)}{todosLosGimnasios ? ` · ${nombreGimnasio(d.gimnasioId)}` : ''}</span></span>
          <span className="tabular shrink-0 text-right text-body font-semibold text-fg">{valor(d)} <span className="text-caption font-normal text-fg-muted">{unidad}</span></span>
        </li>)}</ListGroup>
      </section>
      <Sheet open={ayuda} onClose={() => setAyuda(false)} title="Qué significa cada cifra">
        <dl className="divide-y divide-line">{ayudaCifras(modo, rm).map(d => <div key={d.nombre} className="space-y-1 py-3 first:pt-0">
          <dt className="text-body-sm font-semibold text-fg">{d.nombre}</dt>
          <dd className="text-body-sm text-fg-muted">{d.texto}</dd>
        </div>)}</dl>
      </Sheet>
    </>}
    {!!exerciseId && modos.length > 1 && <Sheet open={hojaCarga} onClose={() => setHojaCarga(false)} title="Tipo de carga">
      <div className="space-y-stack">
        <SegmentedControl variante="vertical" label="Tipo de carga en Progreso" valor={modo} onChange={m => { setModoElegido(m); setVarianteElegida(null); setGimnasioElegido(TODOS); setHojaCarga(false) }}
          opciones={modos.map(m => ({ valor: m, label: MODOS_CARGA[m] }))} />
        <p className="text-body-sm text-fg-muted">Cada tipo de carga se compara por separado: sus kg no significan lo mismo.</p>
      </div>
    </Sheet>}
  </div>
}
