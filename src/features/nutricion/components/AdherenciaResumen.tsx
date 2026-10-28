import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Ayuda from '../../../shared/components/Ayuda'
import Card from '../../../shared/components/Card'
import ListGroup from '../../../shared/components/ListGroup'
import Metric from '../../../shared/components/Metric'
import ProgressBar from '../../../shared/components/ProgressBar'
import SectionHeader from '../../../shared/components/SectionHeader'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import type { Entry } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import { objetivosPorFecha } from '../../perfil/data/objetivosDiaRepo'
import * as cheatDaysRepo from '../data/cheatDaysRepo'
import * as entriesRepo from '../data/entriesRepo'
import * as nombresAlimentosRepo from '../data/nombresAlimentosRepo'
import { fechasDeRacha } from '../lib/cheatDays'
import { agruparAlimentos, calcularAdherencia, calcularRachas, TOLERANCIA_ADHERENCIA, topAlimentos } from '../lib/adherencia'

interface Props {
  fechas: string[]
  entries: Entry[]
  /** Cheat days del periodo: fuera de la adherencia. */
  cheatDays: ReadonlySet<string>
  hoy: string
}

const APORTE = { kcal: { label: 'Calorías', unidad: 'kcal', barra: 'bg-kcal' }, prot: { label: 'Proteína', unidad: 'g', barra: 'bg-protein' } } as const

/**
 * Adherencia al objetivo de kcal, rachas de registro y los 5 alimentos que más aportan en el periodo del Resumen (punto 11):
 * las dos cifras en una tarjeta, con su explicación tras la «i», y lo que más aporta en una sola lista con selector
 * (calorías o proteína), cada alimento con una barra frente al primero.
 */
export default function AdherenciaResumen({ fechas, entries, cheatDays, hoy }: Props) {
  const [campo, setCampo] = useState<'kcal' | 'prot'>('kcal')
  const objetivos = useLiveQuery(() => objetivosPorFecha(fechas, hoy), [fechas.join(','), hoy])
  const todasFechas = useLiveQuery(() => entriesRepo.fechasConRegistro(), [entries])
  const todosCheat = useLiveQuery(() => cheatDaysRepo.todas(), [cheatDays])
  const personales = useLiveQuery(() => nombresAlimentosRepo.paraEntradas(entries), [entries])
  if (!objetivos || !todasFechas || !todosCheat) return null

  const kcalPorDia = new Map<string, number>()
  for (const e of entries) kcalPorDia.set(e.fecha, (kcalPorDia.get(e.fecha) ?? 0) + e.kcal)
  const adherencia = calcularAdherencia(fechas.filter((f) => !cheatDays.has(f)), hoy, kcalPorDia, (f) => objetivos.get(f)?.kcal ?? 0)
  const rachas = calcularRachas(fechasDeRacha(todasFechas, todosCheat), hoy)
  const top = topAlimentos(agruparAlimentos(entries, personales ?? new Map()), campo)
  const aporte = APORTE[campo]

  return <section aria-label="Adherencia y hábitos" className="space-y-section">
    <div className="space-y-stack">
      <SectionHeader variant="section" action={<Ayuda titulo="Adherencia">
        <p>«En rango»: kcal a ±{formatInt(TOLERANCIA_ADHERENCIA * 100)} % del objetivo del día. Los días sin registro no cuentan como fallo.</p>
        <p>La racha cuenta días seguidos con alguna comida registrada hasta hoy (o ayer, si hoy aún no has registrado). Los cheat days no cuentan en la adherencia y mantienen la racha.</p>
      </Ayuda>}>Adherencia</SectionHeader>
      <Card className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Metric size="title" label="Días en rango" valor={adherencia.porcentaje === null ? '—' : `${adherencia.porcentaje} %`}
            caption={adherencia.porcentaje === null ? 'Sin días registrados' : `${adherencia.diasEnRango} de ${adherencia.diasRegistrados} días`} />
          {adherencia.porcentaje !== null && <ProgressBar value={adherencia.diasEnRango} goal={Math.max(1, adherencia.diasRegistrados)} label="Días en rango" />}
        </div>
        <Metric size="title" label="Racha de registro" valor={rachas.actual} unidad={rachas.actual === 1 ? 'día' : 'días'} caption={`Mejor: ${formatInt(rachas.mejor)} ${rachas.mejor === 1 ? 'día' : 'días'}`} />
      </Card>
    </div>
    <div className="space-y-stack">
      <SectionHeader variant="section">Lo que más aporta</SectionHeader>
      <SegmentedControl label="Qué aporte" valor={campo} onChange={setCampo} opciones={[{ valor: 'kcal', label: 'Calorías' }, { valor: 'prot', label: 'Proteína' }]} />
      {top.length === 0 ? <p className="px-1 text-body-sm text-fg-muted">Sin alimentos identificables en este periodo.</p> : (
        <ListGroup aria-label={`Más ${aporte.label.toLowerCase()}`} pie="Agrupado por alimento; las kcal rápidas y los registros sin alimento no entran.">
          {top.map((a, i) => <li key={a.clave} className="flex min-h-touch items-center gap-3 py-2">
            <span aria-hidden className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-surface-muted text-caption font-semibold text-fg-muted">{i + 1}</span>
            <span className="min-w-0 flex-1 break-words text-body text-fg">{a.nombre}</span>
            <span aria-hidden className="h-1.5 w-16 shrink-0 overflow-hidden rounded-pill bg-surface-muted">
              <span className={`block h-full rounded-pill ${aporte.barra}`} style={{ width: `${Math.max(6, (a[campo] / top[0][campo]) * 100)}%` }} />
            </span>
            <span className="tabular w-20 shrink-0 text-right text-body font-semibold text-fg">{formatInt(a[campo])} <span className="text-caption font-normal text-fg-muted">{aporte.unidad}</span></span>
          </li>)}
        </ListGroup>
      )}
    </div>
  </section>
}
