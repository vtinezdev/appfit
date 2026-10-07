import { useLiveQuery } from 'dexie-react-hooks'
import ListGroup from '../../../shared/components/ListGroup'
import Metric from '../../../shared/components/Metric'
import SectionHeader from '../../../shared/components/SectionHeader'
import type { Entry } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import { objetivosPorFecha } from '../../perfil/data/objetivosDiaRepo'
import * as entriesRepo from '../data/entriesRepo'
import * as nombresAlimentosRepo from '../data/nombresAlimentosRepo'
import { agruparAlimentos, calcularAdherencia, calcularRachas, TOLERANCIA_ADHERENCIA, topAlimentos, type AlimentoTop } from '../lib/adherencia'

interface Props {
  fechas: string[]
  entries: Entry[]
  hoy: string
}

function Top({ titulo, alimentos, unidad, campo }: { titulo: string; alimentos: AlimentoTop[]; unidad: string; campo: 'kcal' | 'prot' }) {
  return <div className="space-y-1">
    <h3 className="text-label text-fg-muted">{titulo}</h3>
    {alimentos.length === 0 ? <p className="text-body-sm text-fg-muted">Sin alimentos identificables en este periodo.</p> : (
      <ListGroup variante="plana" aria-label={titulo}>
        {alimentos.map((a, i) => <li key={a.clave} className="flex min-h-touch items-center justify-between gap-3 py-2">
          <span className="min-w-0 break-words text-body text-fg"><span className="tabular mr-2 text-caption text-fg-muted">{i + 1}</span>{a.nombre}</span>
          <span className="tabular shrink-0 text-body font-semibold text-fg">{formatInt(a[campo])} <span className="text-caption font-normal text-fg-muted">{unidad}</span></span>
        </li>)}
      </ListGroup>
    )}
  </div>
}

/** Adherencia al objetivo de kcal, rachas de registro y los 5 alimentos que más aportan en el periodo del Resumen. */
export default function AdherenciaResumen({ fechas, entries, hoy }: Props) {
  const objetivos = useLiveQuery(() => objetivosPorFecha(fechas, hoy), [fechas.join(','), hoy])
  const todasFechas = useLiveQuery(() => entriesRepo.fechasConRegistro(), [entries])
  const personales = useLiveQuery(() => nombresAlimentosRepo.paraEntradas(entries), [entries])
  if (!objetivos || !todasFechas) return null

  const kcalPorDia = new Map<string, number>()
  for (const e of entries) kcalPorDia.set(e.fecha, (kcalPorDia.get(e.fecha) ?? 0) + e.kcal)
  const adherencia = calcularAdherencia(fechas, hoy, kcalPorDia, (f) => objetivos.get(f)?.kcal ?? 0)
  const rachas = calcularRachas(todasFechas, hoy)
  const alimentos = agruparAlimentos(entries, personales ?? new Map())

  return <section aria-label="Adherencia y hábitos" className="space-y-4">
    <SectionHeader variant="section">Adherencia</SectionHeader>
    <div className="grid grid-cols-2 gap-3">
      <Metric size="title" label="Días en rango" valor={adherencia.porcentaje === null ? '—' : `${adherencia.porcentaje} %`}
        caption={adherencia.porcentaje === null ? 'Sin días registrados' : `${adherencia.diasEnRango} de ${adherencia.diasRegistrados} días registrados`} />
      <Metric size="title" label="Racha de registro" valor={rachas.actual} unidad={rachas.actual === 1 ? 'día' : 'días'} caption={`Mejor: ${formatInt(rachas.mejor)} ${rachas.mejor === 1 ? 'día' : 'días'}`} />
    </div>
    <p className="text-caption text-fg-muted">«En rango» es un día con registro cuyas kcal están a ±{formatInt(TOLERANCIA_ADHERENCIA * 100)} % de su objetivo. Los días sin registro no cuentan como fallo. La racha cuenta días seguidos con alguna comida registrada hasta hoy (o ayer, si hoy aún no has registrado).</p>
    <Top titulo="Más calorías" alimentos={topAlimentos(alimentos, 'kcal')} unidad="kcal" campo="kcal" />
    <Top titulo="Más proteína" alimentos={topAlimentos(alimentos, 'prot')} unidad="g" campo="prot" />
    <p className="text-caption text-fg-muted">Agrupado por alimento; las kcal rápidas y los registros sin alimento no entran.</p>
  </section>
}
