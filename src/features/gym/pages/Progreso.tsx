import { claveComparacion, contextoSerie } from '../lib/ejecucion'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import * as exercisesRepo from '../data/exercisesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import { datosProgreso } from '../lib/progreso'
import { MODOS_CARGA, modoCarga } from '../lib/carga'
import type { ModoCarga } from '../../../shared/db/types'
import ChartVisibility from '../../../shared/components/ChartVisibility'
import { chartAxis, chartColors, chartGrid, chartTooltip, escalaAjustada } from '../../../shared/design/chart'
import { formatDiaMes, formatFechaHora } from '../../../shared/lib/dates'
import { Select } from '../../../shared/components/Input'
import Metric from '../../../shared/components/Metric'
import SectionHeader from '../../../shared/components/SectionHeader'
import { formatCompact, formatInt, formatNumber } from '../../../shared/lib/format'
import Card from '../../../shared/components/Card'
import Disclosure from '../../../shared/components/Disclosure'
import { EmptyState } from '../../../shared/components/StateMessage'

/** Rótulo del último punto de una serie, a su derecha: dónde estás sin tener que leer el eje. */
function rotuloFinal(total: number, color: string, formato: (v: number) => string) {
  return function Rotulo({ x, y, index, value }: { x?: number | string; y?: number | string; index?: number; value?: number | string }) {
    if (index !== total - 1 || value === undefined) return <g />
    return <text x={Number(x) + 8} y={Number(y)} dy={4} fill={color} fontSize={12} fontWeight={700}>{formato(Number(value))}</text>
  }
}

type Metrica = 'pesoMax' | 'oneRM' | 'volumen' | 'reps' | 'asistencia'
const SELECCION_INICIAL: Metrica[] = ['pesoMax', 'oneRM', 'volumen', 'reps', 'asistencia']

export default function Progreso() {
  const [exerciseId, setExerciseId] = useState<number | null>(null)
  const [modoElegido, setModoElegido] = useState<ModoCarga | null>(null)
  const [varianteElegida, setVarianteElegida] = useState<string | null>(null)
  const [visibles, setVisibles] = useState<Metrica[]>(SELECCION_INICIAL)
  const exercises = useLiveQuery(() => exercisesRepo.listar(), [])
  const sets = useLiveQuery(() => exerciseId ? setsRepo.delEjercicio(exerciseId) : [], [exerciseId])
  const workouts = useLiveQuery(() => workoutsRepo.listar(), [])
  const modos = [...new Set((sets ?? []).map(modoCarga))]
  const modo = modoElegido && modos.includes(modoElegido) ? modoElegido : modos[0] ?? 'externa'
  const variantes = [...new Map((sets ?? []).filter(s => modoCarga(s) === modo && !s.bajadas?.length).map(s => [claveComparacion(s), s])).entries()]
  const variante = varianteElegida && variantes.some(([key]) => key === varianteElegida) ? varianteElegida : variantes[0]?.[0]
  const permiteRM = variantes.find(([key]) => key === variante)?.[1]
  const rm = !permiteRM?.ejecucion && !permiteRM?.excentricaSeg && !permiteRM?.soloNegativas && modo === 'externa'
  const datos = datosProgreso(sets ?? [], workouts ?? [], modo, variante).map(d => ({ ...d, fecha: formatDiaMes(d.inicio) }))
  const ultimo = datos.at(-1)
  const opciones: Partial<Record<Metrica, string>> = modo === 'externa'
    ? { pesoMax: permiteRM?.ejecucion ? 'Peso por lado' : permiteRM?.soloNegativas ? 'Carga de negativas' : 'Peso máximo', ...(rm ? { oneRM: '1RM estimado' } : {}), volumen: 'Volumen externo', reps: 'Repeticiones' }
    : modo === 'lastre' ? { pesoMax: 'Lastre máximo', volumen: 'Volumen de lastre', reps: 'Repeticiones' }
    : modo === 'corporal' ? { reps: 'Repeticiones' } : { asistencia: 'Asistencia mínima', reps: 'Repeticiones' }
  const grupos = [
    { titulo: modo === 'asistencia' ? 'Asistencia por sesión' : 'Fuerza por sesión', unidad: 'kg', keys: ['pesoMax', 'oneRM', 'asistencia'] as Metrica[] },
    { titulo: 'Repeticiones por sesión', unidad: 'reps', keys: ['reps'] as Metrica[] },
    { titulo: modo === 'lastre' ? 'Volumen de lastre por sesión' : 'Volumen externo por sesión', unidad: 'kg', keys: ['volumen'] as Metrica[] },
  ]
  const principal: Metrica = modo === 'corporal' ? 'reps' : modo === 'asistencia' ? 'asistencia' : 'pesoMax'
  return <div className="space-y-section">
    <div className="space-y-2"><SectionHeader variant="section">Gráficas por ejercicio</SectionHeader><p className="text-body-sm text-fg-muted">Consulta carga, repeticiones y volumen. Las métricas disponibles dependen del tipo de ejercicio.</p></div>
    <label className="block space-y-2"><span className="text-label text-fg-muted">Ejercicio</span>
      <Select tone="surface" aria-label="Ejercicio" value={exerciseId ?? ''} onChange={e => {
        setExerciseId(e.target.value ? Number(e.target.value) : null); setModoElegido(null); setVarianteElegida(null); setVisibles(SELECCION_INICIAL)
      }}><option value="">Elige un ejercicio…</option>{exercises?.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</Select>
    </label>
    {!!exerciseId && modos.length > 0 && <label className="block space-y-2"><span className="text-label text-fg-muted">Comparar el mismo tipo de carga</span>
      <Select aria-label="Tipo de carga en Progreso" value={modo} onChange={e => { setModoElegido(e.target.value as ModoCarga); setVarianteElegida(null) }}>
        {modos.map(id => <option key={id} value={id}>{MODOS_CARGA[id]}</option>)}
      </Select></label>}
    {!!exerciseId && variantes.length > 1 && <label className="block space-y-2"><span className="text-label text-fg-muted">Ejecución, agarre y tempo</span><Select aria-label="Variante en Progreso" value={variante} onChange={e => setVarianteElegida(e.target.value)}>{variantes.map(([key, s]) => <option key={key} value={key}>{contextoSerie(s) || 'Bilateral · sin agarre ni tempo especificados'}</option>)}</Select></label>}
    {!exerciseId && <EmptyState icon="dumbbell" title="Sigue tu evolución">Elige un ejercicio para comparar tus sesiones.</EmptyState>}
    {!!exerciseId && !ultimo && <EmptyState title="Aún sin sesiones terminadas">Termina un entreno con este tipo de carga para comparar resultados.</EmptyState>}
    {!!exerciseId && ultimo && <>
      <ChartVisibility label="Mostrar u ocultar gráficas" opciones={opciones as Record<Metrica, string>} seleccion={visibles} onChange={setVisibles} />
      {!Object.keys(opciones).some(key => visibles.includes(key as Metrica)) ? <EmptyState title="Selecciona una métrica">Activa una opción para ver su tendencia.</EmptyState>
        : datos.length < 2 ? <p className="text-body-sm text-fg-muted">Las gráficas aparecen a partir de dos sesiones terminadas con el mismo tipo de carga y variante. De momento puedes consultar los datos de tu última sesión.</p>
        : grupos.map(g => {
          const keys = g.keys.filter(key => opciones[key] && visibles.includes(key))
          if (!keys.length) return null
          const escala = escalaAjustada(datos.flatMap(d => keys.map(key => d[key] ?? 0)))
          const margen = Math.max(40, ...keys.map(key => 12 + 7 * formatNumber(ultimo[key] ?? 0, 1).length))
          return <section key={g.titulo} aria-label={g.titulo} className="space-y-stack">
            <SectionHeader variant="section">{g.titulo}</SectionHeader>
            <Card className="space-y-3">
              <p className="text-caption text-fg-muted">{keys.map(key => opciones[key]).join(' · ')} ({g.unidad})</p>
              <div role="img" aria-label={`${keys.map(key => opciones[key]).join(' y ')} por sesión. Datos disponibles debajo.`}>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={datos} margin={{ left: 0, right: margen, top: 8, bottom: 0 }}>
                    <CartesianGrid {...chartGrid} /><XAxis dataKey="fecha" {...chartAxis} minTickGap={20} />
                    <YAxis {...chartAxis} width={56} tickFormatter={formatCompact} domain={escala.dominio} ticks={escala.marcas} />
                    <Tooltip {...chartTooltip} formatter={v => `${formatNumber(Number(v), 1)} ${g.unidad}`} />
                    {keys.map(key => <Line key={key} type="linear" dataKey={key} name={opciones[key]} stroke={key === 'oneRM' ? chartColors.seriesSecondary : key === 'volumen' ? chartColors.seriesTertiary : chartColors.seriesPrimary} strokeWidth={2}
                      strokeDasharray={key === 'oneRM' ? '4 3' : undefined} dot={datos.length < 15 ? { r: 3 } : false} isAnimationActive={false}
                      label={rotuloFinal(datos.length, key === 'oneRM' ? chartColors.seriesSecondary : chartColors.seriesPrimaryText, v => formatNumber(v, 1))} />)}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {escala.dominio[0] > 0 && <p className="tabular text-caption text-fg-muted">El eje empieza en {formatNumber(escala.dominio[0])} {g.unidad}.</p>}
            </Card>
          </section>
        })}
      <Card><section aria-label="Última sesión" className="space-y-4">
        <Metric size="hero" label={`${opciones[principal]} · última sesión`} valor={formatNumber(ultimo[principal] ?? 0, 1)} unidad={principal === 'reps' ? 'reps' : 'kg'} caption={ultimo.fecha} />
        {(modo === 'externa' || modo === 'lastre') && <div className="grid grid-cols-2 gap-4 border-y border-line py-4">
          {rm && <Metric size="title" label="1RM estimado" valor={formatNumber(ultimo.oneRM ?? 0, 1)} unidad="kg" />}
          <Metric size="title" label={opciones.volumen} valor={formatInt(ultimo.volumen)} unidad="kg" />
        </div>}
        <p className="text-caption text-fg-muted">{modo === 'externa' ? (rm ? '1RM estima el peso para una repetición. El volumen suma kg externos × repeticiones.' : 'Las variantes unilaterales o con tempo se comparan por separado, sin estimar 1RM. Volumen suma los lados registrados.') : modo === 'lastre' ? 'El volumen cuenta solo el lastre. No se estima 1RM con peso corporal.' : modo === 'asistencia' ? 'Menos asistencia significa menos ayuda. Compara también las repeticiones; no equivale a una medida exacta de carga efectiva.' : 'Se comparan las repeticiones. No se convierte la masa corporal en volumen ni en 1RM.'}</p>
      </section></Card>
      <Disclosure title={`Ver ${datos.length} ${datos.length === 1 ? 'sesión' : 'sesiones'}`}>
        <ul className="divide-y divide-line text-body-sm">{datos.map(d => <li key={d.workoutId} className="space-y-1 py-3">
          <p className="tabular font-semibold text-fg">{formatFechaHora(d.inicio)}</p>
          <p className="tabular break-words text-fg-muted">{Object.entries(opciones).map(([key, label]) => `${label}: ${formatNumber(d[key as Metrica] ?? 0, 1)} ${key === 'reps' ? 'reps' : 'kg'}`).join(' · ')}</p>
        </li>)}</ul>
      </Disclosure>
    </>}
  </div>
}
