import { useState } from 'react'
import { formatCompact, formatInt } from '../../../shared/lib/format'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import * as entriesRepo from '../data/entriesRepo'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Disclosure from '../../../shared/components/Disclosure'
import AdherenciaResumen from '../components/AdherenciaResumen'
import CategoriasResumen from '../components/CategoriasResumen'
import HerbarioResumen from '../components/HerbarioResumen'
import { objetivosMediosDe } from '../../perfil/data/objetivosDiaRepo'
import { desplazarPeriodo, esPeriodoActual, etiquetaPeriodo, fechasPeriodo, formatShort, todayISO } from '../../../shared/lib/dates'
import type { PeriodoRango } from '../../../shared/lib/dates'
import { resumenPeriodo } from '../lib/nutrition'
import { IconButton } from '../../../shared/components/Button'
import { EmptyState, LoadingState } from '../../../shared/components/StateMessage'
import { chartAxis, chartColors, chartGoalLine, chartTooltip } from '../../../shared/design/chart'
import Metric from '../../../shared/components/Metric'
import ProgressBar from '../../../shared/components/ProgressBar'
import SectionHeader from '../../../shared/components/SectionHeader'
import FranjaMacros from '../components/FranjaMacros'
import MacroBar from '../components/MacroBar'
import Card from '../../../shared/components/Card'
import ChartVisibility from '../../../shared/components/ChartVisibility'

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
  const [curvas, setCurvas] = useState<('consumo' | 'objetivo')[]>(['consumo', 'objetivo'])
  const fechas = fechasPeriodo(rango, fechaAncla)
  const entries = useLiveQuery(() => entriesRepo.entreFechas(fechas[0], fechas[fechas.length - 1]), [fechas.join(',')])
  // Cada día con registros usa su objetivo congelado (o el vigente); la media se compara con la media de esos objetivos.
  const diasConRegistro = fechas.filter(f => entries?.some(e => e.fecha === f)).join(',')
  const vigentes = useLiveQuery(() => objetivosMediosDe(diasConRegistro ? diasConRegistro.split(',') : [], todayISO()), [diasConRegistro])
  if (!entries || !vigentes) return <LoadingState />
  const { porDia, media, diasRegistrados } = resumenPeriodo(entries, fechas, todayISO())
  const objetivos = vigentes
  const elegido = DATOS.find(d => d.valor === dato)!
  const diasConDatos = new Set(entries.map(e => e.fecha))
  // Un día sin registro no es una ingesta de cero: tampoco debe aparecer como cero en el tooltip.
  const chartData = fechas.map((fecha, i) => ({
    fecha, dia: formatShort(fecha), ...porDia[i],
    ...(!diasConDatos.has(fecha) ? { kcal: null, prot: null, carb: null, grasa: null } : {}),
  }))
  const maximoGrafica = Math.max(1, curvas.includes('objetivo') ? objetivos[dato] : 0, ...chartData.map(d => curvas.includes('consumo') ? d[dato] ?? 0 : 0))
  return (
    <div className="space-y-section">
      <div className="space-y-3">
        <SegmentedControl label="Periodo" opciones={[{ valor: 'semana', label: 'Semana' }, { valor: 'mes', label: 'Mes' }]} valor={rango} onChange={nuevo => { setRango(nuevo); setFechaAncla(todayISO()) }} />
        <div className="flex items-center">
          <IconButton icon="chevron-left" label="Periodo anterior" variant="ghost" onClick={() => setFechaAncla(desplazarPeriodo(rango, fechaAncla, -1))} />
          <h2 aria-live="polite" className="min-w-0 flex-1 text-center text-body font-semibold capitalize text-fg">{etiquetaPeriodo(rango, fechaAncla)}</h2>
          <IconButton icon="chevron-right" label="Periodo siguiente" variant="ghost" onClick={() => setFechaAncla(desplazarPeriodo(rango, fechaAncla, 1))} disabled={esPeriodoActual(rango, fechaAncla)} />
        </div>
      </div>
      {!diasRegistrados ? <EmptyState icon="utensils" title="Un periodo por registrar">Las medias y tendencias aparecerán cuando añadas comidas en estas fechas.</EmptyState> : (
        <>
          {/* El mismo panel que el Diario: kcal, barra y macros con las mismas piezas, en una card. */}
          <section aria-label="Media diaria">
            <Card className="space-y-3">
              <p className="text-label text-fg-muted">Media diaria</p>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <Metric size="hero" valor={formatInt(media.kcal)} unidad="kcal" />
                {objetivos.kcal > 0 && <p className="tabular pb-1 text-body-sm text-fg-muted">de <strong className="font-semibold text-fg">{formatInt(objetivos.kcal)}</strong> kcal</p>}
              </div>
              <ProgressBar size="lg" value={media.kcal} goal={objetivos.kcal} colorClass="bg-kcal" label="Media diaria de calorías" valueText={`${formatInt(media.kcal)} de ${formatInt(objetivos.kcal)} kcal de media`} />
              <p className="tabular text-body-sm text-fg-muted">{diasRegistrados === 1 ? 'Solo cuenta el día registrado' : `Solo cuentan los ${diasRegistrados} días registrados`}</p>
              <div className="grid grid-cols-3 gap-3 pt-3" aria-label="Macros medios por día" role="group">
                <MacroBar macro="prot" valor={media.prot} objetivo={objetivos.prot} />
                <MacroBar macro="carbs" valor={media.carb} objetivo={objetivos.carb} />
                <MacroBar macro="fat" valor={media.grasa} objetivo={objetivos.grasa} />
              </div>
            </Card>
          </section>
          <section aria-label="Distribución de calorías" className="space-y-3"><SectionHeader variant="section">Reparto de macros</SectionHeader><FranjaMacros macros={media} /></section>
          <AdherenciaResumen fechas={fechas} entries={entries} hoy={todayISO()} />
          <CategoriasResumen entries={entries} />
          <HerbarioResumen entries={entries} semana={rango === 'semana'} />
          <section aria-label="Tendencia nutricional" className="space-y-4">
            <SectionHeader variant="section">Día a día</SectionHeader>
            <SegmentedControl label="Métrica de la gráfica" size="sm" opciones={DATOS} valor={dato} onChange={setDato} />
            <ChartVisibility label="Series visibles" opciones={{ consumo: 'Consumo', objetivo: 'Objetivo' }} seleccion={curvas} onChange={setCurvas} />
            <p className="text-label text-fg-muted">{elegido.nombre} ({elegido.unidad}){curvas.includes('objetivo') ? ` · objetivo ${formatInt(objetivos[dato])}` : ''}</p>
            {!curvas.length ? <EmptyState title="Selecciona una métrica">Activa Consumo u Objetivo para ver la gráfica.</EmptyState> :
            <div role="img" aria-label={`${elegido.nombre} por día. Los días sin registro no tienen barra. Datos disponibles debajo.`}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ left: 0, right: 8, top: 12, bottom: 0 }}>
                  <XAxis dataKey="dia" {...chartAxis} minTickGap={18} />
                  <YAxis {...chartAxis} width={56} tickFormatter={formatCompact} domain={[0, maximoGrafica]} />
                  <Tooltip {...chartTooltip} formatter={(v) => [`${formatInt(Number(v))} ${elegido.unidad}`, elegido.nombre]} />
                  {curvas.includes('objetivo') && objetivos[dato] > 0 && <ReferenceLine y={objetivos[dato]} {...chartGoalLine} />}
                  {curvas.includes('consumo') && <Bar dataKey={dato} name={elegido.nombre} fill={elegido.color} radius={[3, 3, 0, 0]} isAnimationActive={false} />}
                </BarChart>
              </ResponsiveContainer>
            </div>}
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
