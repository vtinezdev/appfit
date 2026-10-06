import { useState } from 'react'
import { formatCompact, formatInt } from '../../../shared/lib/format'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import * as entriesRepo from '../data/entriesRepo'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Disclosure from '../../../shared/components/Disclosure'
import { getSettings } from '../../../shared/db/settings'
import { desplazarPeriodo, esPeriodoActual, etiquetaPeriodo, fechasPeriodo, formatShort, todayISO } from '../../../shared/lib/dates'
import type { PeriodoRango } from '../../../shared/lib/dates'
import { resumenPeriodo } from '../lib/nutrition'
import { IconButton } from '../../../shared/components/Button'
import { EmptyState, LoadingState } from '../../../shared/components/StateMessage'
import { chartAxis, chartColors, chartGoalLine, chartTooltip } from '../../../shared/design/chart'
import { MACROS } from '../../../shared/design/macros'
import Metric from '../../../shared/components/Metric'
import ProgressBar from '../../../shared/components/ProgressBar'
import SectionHeader from '../../../shared/components/SectionHeader'
import FranjaMacros from '../components/FranjaMacros'

type Dato = 'kcal' | 'prot' | 'carb' | 'grasa'
const DATOS = [
  { valor: 'kcal' as const, label: 'Calorías', nombre: 'Calorías', color: chartColors.kcal, unidad: 'kcal' },
  { valor: 'prot' as const, label: 'Proteína', nombre: 'Proteína', color: chartColors.protein, unidad: 'g' },
  { valor: 'carb' as const, label: 'Hidratos', nombre: 'Carbohidratos', color: chartColors.carbs, unidad: 'g' },
  { valor: 'grasa' as const, label: 'Grasa', nombre: 'Grasa', color: chartColors.fat, unidad: 'g' },
]
export default function Resumen() {
  const [rango, setRango] = useState<PeriodoRango>('semana')
  const [fechaAncla, setFechaAncla] = useState(todayISO())
  const [dato, setDato] = useState<Dato>('kcal')
  const fechas = fechasPeriodo(rango, fechaAncla)
  const settings = useLiveQuery(() => getSettings(), [])
  const entries = useLiveQuery(() => entriesRepo.entreFechas(fechas[0], fechas[fechas.length - 1]), [fechas.join(',')])
  if (!entries || !settings) return <LoadingState />
  const { porDia, media, diasRegistrados } = resumenPeriodo(entries, fechas, todayISO())
  const objetivos = settings.objetivos
  const elegido = DATOS.find(d => d.valor === dato)!
  const diasConDatos = new Set(entries.map(e => e.fecha))
  // Un día sin registro no es una ingesta de cero: tampoco debe aparecer como cero en el tooltip.
  const chartData = fechas.map((fecha, i) => ({
    fecha, dia: formatShort(fecha), ...porDia[i],
    ...(!diasConDatos.has(fecha) ? { kcal: null, prot: null, carb: null, grasa: null } : {}),
  }))
  const medias = [
    { macro: MACROS.prot, valor: media.prot, objetivo: objetivos.prot },
    { macro: MACROS.carbs, valor: media.carb, objetivo: objetivos.carb },
    { macro: MACROS.fat, valor: media.grasa, objetivo: objetivos.grasa },
  ]
  return (
    <div className="space-y-section">
      <div className="space-y-3">
        <SegmentedControl label="Periodo" opciones={[{ valor: 'semana', label: 'Semana' }, { valor: 'mes', label: 'Mes' }]} valor={rango} onChange={nuevo => { setRango(nuevo); setFechaAncla(todayISO()) }} />
        <div className="flex items-center border-b border-line">
          <IconButton icon="chevron-left" label="Periodo anterior" variant="ghost" onClick={() => setFechaAncla(desplazarPeriodo(rango, fechaAncla, -1))} />
          <h2 aria-live="polite" className="min-w-0 flex-1 text-center text-body font-semibold capitalize text-fg">{etiquetaPeriodo(rango, fechaAncla)}</h2>
          <IconButton icon="chevron-right" label="Periodo siguiente" variant="ghost" onClick={() => setFechaAncla(desplazarPeriodo(rango, fechaAncla, 1))} disabled={esPeriodoActual(rango, fechaAncla)} />
        </div>
      </div>
      {!diasRegistrados ? <EmptyState icon="utensils" title="Un periodo por registrar">Las medias y tendencias aparecerán cuando añadas comidas en estas fechas.</EmptyState> : (
        <>
          <section aria-label="Media diaria" className="space-y-4">
            <Metric size="hero" label="Media diaria" valor={formatInt(media.kcal)} unidad="kcal" caption={`${diasRegistrados} ${diasRegistrados === 1 ? 'día registrado' : 'días registrados'} · objetivo ${formatInt(objetivos.kcal)} kcal`} />
            <ProgressBar size="lg" value={media.kcal} goal={objetivos.kcal} colorClass="bg-kcal" label="Media diaria de calorías" valueText={`${formatInt(media.kcal)} de ${formatInt(objetivos.kcal)} kcal de media`} />
            <p className="text-caption text-fg-muted">La media incluye solo los días con registros.</p>
          </section>
          <section aria-label="Macros medios" className="space-y-stack">
            <SectionHeader variant="section">Macros medios por día</SectionHeader>
            <div className="grid grid-cols-3 gap-3">
              {medias.map(({ macro, valor, objetivo }) => <div key={macro.short} className="min-w-0 space-y-2">
                <Metric size="title" label={macro === MACROS.carbs ? 'Hidratos' : macro.label} valor={formatInt(valor)} unidad="g" caption={`de ${formatInt(objetivo)} g`} />
                <ProgressBar value={valor} goal={objetivo} colorClass={macro.bg} label={macro.label} valueText={`${formatInt(valor)} de ${formatInt(objetivo)} g de media`} />
              </div>)}
            </div>
          </section>
          <section aria-label="Distribución de calorías" className="space-y-3"><SectionHeader variant="section">Reparto de macros</SectionHeader><FranjaMacros macros={media} /></section>
          <section aria-label="Tendencia nutricional" className="space-y-4">
            <SectionHeader variant="section">Día a día</SectionHeader>
            <SegmentedControl label="Métrica de la gráfica" size="sm" opciones={DATOS} valor={dato} onChange={setDato} />
            <p className="text-label text-fg-muted">{elegido.nombre} ({elegido.unidad}) · línea de objetivo {formatInt(objetivos[dato])}</p>
            <div role="img" aria-label={`${elegido.nombre} por día. Los días sin registro no tienen barra. Datos disponibles debajo.`}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ left: 0, right: 8, top: 12, bottom: 0 }}>
                  <XAxis dataKey="dia" {...chartAxis} minTickGap={18} />
                  <YAxis {...chartAxis} width={56} tickFormatter={formatCompact} domain={[0, (max: number) => Math.max(max, objetivos[dato])]} />
                  <Tooltip {...chartTooltip} formatter={(v) => [`${formatInt(Number(v))} ${elegido.unidad}`, elegido.nombre]} />
                  {objetivos[dato] > 0 && <ReferenceLine y={objetivos[dato]} {...chartGoalLine} />}
                  <Bar dataKey={dato} name={elegido.nombre} fill={elegido.color} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Disclosure title="Ver datos del periodo">
              <ul className="divide-y divide-line text-body-sm">
                {chartData.filter(d => d.fecha <= todayISO()).map(d => <li key={d.fecha} className="flex justify-between gap-3 py-2"><span>{d.dia}</span><span className="tabular text-fg-muted">{diasConDatos.has(d.fecha) ? `${formatInt(d[dato] ?? 0)} ${elegido.unidad}` : 'Sin registro'}</span></li>)}
              </ul>
            </Disclosure>
          </section>
        </>
      )}
    </div>
  )
}
