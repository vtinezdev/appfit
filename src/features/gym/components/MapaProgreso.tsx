import { useRef, useState } from 'react'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Disclosure from '../../../shared/components/Disclosure'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import Metric from '../../../shared/components/Metric'
import ProgressBar from '../../../shared/components/ProgressBar'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { LoadingState } from '../../../shared/components/StateMessage'
import { todayISO } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { useAportesMusculares } from '../hooks/useAportesMusculares'
import { useFiguraMapa } from '../hooks/useFiguraMapa'
import {
  MAXIMO_PROGRESO, nivelesDeProgreso, nombreNivel, PROGRESO_MUSCULAR, progresoMuscular, resumenProgreso, textoEstado,
  type NivelProgreso, type ProgresoMuscular, type ProgresoMusculo,
} from '../lib/progresoMuscular'
import { MUSCULOS, ZONAS_MUSCULARES, type ZonaMuscular } from '../lib/musculos'
import { CuerpoMuscular, EscalaProgreso } from './MapaMuscular'

const series = (n: number) => `${formatNumber(n, 1)} ${n === 1 ? 'serie' : 'series'}`
function nivelTexto(m: ProgresoMusculo) {
  if (m.huella) return `Nivel perdido · llegó a ${nombreNivel(m.nivelMaximo)}`
  const extra = m.estado === 'bajando' ? ' · bajando' : m.estado === 'en-pausa' ? ' · en pausa' : m.memoria ? ' · recuperando' : ''
  return nombreNivel(m.nivel) + extra
}
function cuando(dias: number | null) {
  if (dias === null) return 'Nunca'
  return dias === 0 ? 'Hoy' : dias === 1 ? 'Ayer' : `Hace ${formatInt(dias)} días`
}

/**
 * Mapa muscular de progreso (ADR 051), arriba de Progreso: una vista del cuerpo con Frontal/Trasera, los grupos más avanzados
 * y los que más pueden crecer y, en una hoja, el detalle de cada grupo (tocando la figura o desde «Ver detalle por músculo»).
 */
export default function MapaProgreso() {
  const datos = useAportesMusculares()
  const figura = useFiguraMapa()
  const [vista, setVista] = useState<'frontal' | 'trasera'>('frontal')
  const [hoja, setHoja] = useState<{ abierta: boolean; musculo: ZonaMuscular | null }>({ abierta: false, musculo: null })
  const cabecera = <div className="flex items-baseline justify-between gap-3">
    <h2 id="mapa-progreso" className="text-heading text-fg">Mapa muscular</h2>
    <span className="text-caption text-fg-muted">Progreso</span>
  </div>
  if (!datos) return <section aria-labelledby="mapa-progreso" className="space-y-stack">{cabecera}<LoadingState /></section>

  const progreso = progresoMuscular(datos.aportes, todayISO(), datos.sinClasificar, datos.pausas)
  const { levels, huella } = nivelesDeProgreso(progreso)
  const { masAvanzados, porDesarrollar } = resumenProgreso(progreso)
  const abrir = (musculo: ZonaMuscular | null) => setHoja({ abierta: true, musculo })
  const nombres = (ms: ZonaMuscular[]) => ms.map(m => MUSCULOS[m]).join(' · ')

  return <section aria-labelledby="mapa-progreso" className="space-y-stack">
    {cabecera}
    <Card className="space-y-stack">
      <SegmentedControl label="Vista del cuerpo" size="sm" valor={vista} onChange={setVista}
        opciones={[{ valor: 'frontal', label: 'Frontal' }, { valor: 'trasera', label: 'Trasera' }]} />
      <CuerpoMuscular vista={vista} levels={levels} huella={huella} figura={figura} onZona={progreso.conDatos ? abrir : undefined} />
      <EscalaProgreso huella={Object.values(huella).some(Boolean)} />
      {!progreso.conDatos ? <p className="text-center text-body-sm text-fg-muted">Tu mapa empieza en blanco. Cada semana que trabajes un músculo lo acerca al siguiente nivel; llegar a Avanzado III lleva en torno a un año.</p> : <>
        <dl className="space-y-2 border-t border-line pt-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><dt className="min-w-0 break-words text-rotulo text-fg-muted">Más avanzado</dt><dd className="min-w-0 flex-1 break-words text-right text-body-sm font-semibold text-fg">{nombres(masAvanzados) || '—'}</dd></div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><dt className="min-w-0 break-words text-rotulo text-fg-muted">Por desarrollar</dt><dd className="min-w-0 flex-1 break-words text-right text-body-sm font-semibold text-fg">{nombres(porDesarrollar) || '—'}</dd></div>
        </dl>
        <Button variant="secondary" block onClick={() => abrir(null)} aria-haspopup="dialog">Ver detalle por músculo<Icon name="chevron-right" size={18} /></Button>
      </>}
    </Card>
    <Sheet open={hoja.abierta} onClose={() => setHoja(h => ({ ...h, abierta: false }))} title={hoja.musculo ? MUSCULOS[hoja.musculo] : 'Por grupo muscular'}>
      <ContenidoHoja progreso={progreso} musculo={hoja.musculo} onMusculo={musculo => setHoja({ abierta: true, musculo })} />
    </Sheet>
  </section>
}

function ContenidoHoja({ progreso, musculo, onMusculo }: { progreso: ProgresoMuscular; musculo: ZonaMuscular | null; onMusculo: (m: ZonaMuscular | null) => void }) {
  const inicio = useRef<HTMLDivElement>(null)
  // Al cambiar entre la lista y un grupo, la hoja vuelve arriba (con su título) y el foco pasa al contenido nuevo.
  const cambiar = (m: ZonaMuscular | null) => {
    onMusculo(m)
    requestAnimationFrame(() => { inicio.current?.closest('.sheet-content')?.scrollTo({ top: 0 }); inicio.current?.focus({ preventScroll: true }) })
  }
  if (musculo) return <div ref={inicio} tabIndex={-1} className="space-y-stack outline-none">
    <Button variant="ghost" size="sm" className="-ml-2" onClick={() => cambiar(null)}><Icon name="chevron-left" size={18} />Todos los grupos</Button>
    <DetalleMusculo m={progreso.musculos[musculo]} />
  </div>

  const orden = [...ZONAS_MUSCULARES].sort((a, b) => progreso.musculos[b].semanas - progreso.musculos[a].semanas || MUSCULOS[a].localeCompare(MUSCULOS[b], 'es'))
  return <div ref={inicio} tabIndex={-1} className="space-y-stack outline-none">
    <ListGroup variante="plana" aria-label="Grupos musculares por progreso">
      {orden.map(m => <li key={m}><ListRow onClick={() => cambiar(m)}>
        <span className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="muscle-swatch shrink-0" data-escala="progreso" data-level={progreso.musculos[m].nivel} data-huella={progreso.musculos[m].huella} />
          <span className="min-w-0">
            <span className="block break-words text-body font-semibold text-fg">{MUSCULOS[m]}</span>
            <span className="block break-words text-caption text-fg-muted">{nivelTexto(progreso.musculos[m])}</span>
          </span>
        </span>
        <Icon name="chevron-right" size={18} className="shrink-0 text-fg-subtle" />
      </ListRow></li>)}
    </ListGroup>
    {progreso.sinClasificar28.series > 0 && <p className="break-words text-body-sm text-fg-muted">
      {series(progreso.sinClasificar28.series)} de los últimos 28 días sin músculo clasificado no se reparten: {progreso.sinClasificar28.nombres.join(', ')}.
    </p>}
    <ComoSeCalcula />
  </div>
}

function DetalleMusculo({ m }: { m: ProgresoMusculo }) {
  const desde = m.nivel === 0 ? 0 : PROGRESO_MUSCULAR.umbrales[m.nivel - 1]
  const { series: semana, dosis } = m.semanaActual
  return <div className="space-y-stack">
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-body font-semibold text-fg">
        <span aria-hidden="true" className="muscle-swatch shrink-0" data-escala="progreso" data-level={m.nivel} data-huella={m.huella} />{nivelTexto(m)}
      </p>
      {m.siguiente !== null ? <>
        <ProgressBar value={m.semanas - desde} goal={m.siguiente - desde} colorClass="bg-fg" label={`Hacia ${nombreNivel((m.nivel + 1) as NivelProgreso)}`}
          valueText={`${formatNumber(m.semanas, 1)} de ${formatInt(m.siguiente)} semanas completas`} />
        <p className="tabular text-caption text-fg-muted">{formatNumber(m.semanas, 1)} de {formatInt(m.siguiente)} semanas completas para {nombreNivel((m.nivel + 1) as NivelProgreso)}</p>
      </> : <p className="tabular text-caption text-fg-muted">{formatInt(MAXIMO_PROGRESO)} semanas completas: nivel máximo</p>}
      <p className="text-body-sm text-fg-muted">{textoEstado(m)}</p>
    </div>
    <div className="metric-grid gap-3">
      <Metric size="title" label="Esta semana" valor={`${formatNumber(Math.min(semana, dosis), 1)}/${formatInt(dosis)}`} unidad="series" />
      <Metric size="title" label="28 días" valor={formatNumber(m.series28, 1)} unidad={m.series28 === 1 ? 'serie' : 'series'} />
      <Metric size="title" label="Última vez" valor={cuando(m.diasDesde)} />
    </div>
    <dl className="divide-y divide-line border-y border-line">
      <div className="flex min-h-touch items-center justify-between gap-3 py-2"><dt className="text-body-sm text-fg-muted">Nivel más alto</dt><dd className="text-right text-body-sm font-semibold text-fg">{nombreNivel(m.nivelMaximo)}</dd></div>
      <div className="flex min-h-touch items-center justify-between gap-3 py-2"><dt className="text-body-sm text-fg-muted">Directas · indirectas (28 días)</dt><dd className="tabular text-right text-body-sm font-semibold text-fg">{formatNumber(m.directas28, 1)} · {formatNumber(m.indirectas28, 1)}</dd></div>
    </dl>
    {m.ejercicios.length > 0 ? <section aria-label="Lo que más aporta" className="space-y-2">
      <h3 className="text-rotulo text-fg-muted">Lo que más aporta · 28 días</h3>
      <ul className="divide-y divide-line">{m.ejercicios.map(e => <li key={`${e.exerciseId}-${e.rol}`} className="flex items-baseline justify-between gap-3 py-2">
        <span className="min-w-0 break-words text-body-sm text-fg">{e.nombre}<span className="block text-caption text-fg-muted">{e.rol === 'principal' ? 'Principal' : 'Secundario'}</span></span>
        <span className="tabular shrink-0 text-body-sm text-fg-muted">{series(e.series)}</span>
      </li>)}</ul>
    </section> : <p className="text-body-sm text-fg-muted">Sin series en las últimas 4 semanas.</p>}
    <p className="text-caption text-fg-muted">Mide la constancia con que lo entrenas: no mide crecimiento, fuerza, fatiga ni recuperación.</p>
  </div>
}

function ComoSeCalcula() {
  const P = PROGRESO_MUSCULAR
  return <Disclosure title="Cómo se calcula"><div className="space-y-2 text-body-sm text-fg-muted">
    <p>Cada músculo sube por semanas completas, de lunes a domingo. Una semana se completa con {formatInt(P.dosis.pecho)} series del grupo ({formatInt(P.dosis.biceps)} en bíceps, tríceps, antebrazo, aductores, gemelos y core); con menos cuenta la parte que hagas y con más no se adelanta. Cuentan las series efectivas de entrenos terminados: el músculo principal suma 1 y cada secundario {formatNumber(P.secundario, 1)}, pero lo indirecto completa como mucho media semana. Calentamientos, series sin hacer y el peso no cuentan.</p>
    <p>Hay nueve niveles en tres tramos, Básico, Intermedio y Avanzado, que empiezan a las {P.umbrales.map(u => formatInt(u)).join(' · ')} semanas completas. Con constancia, Avanzado III llega en torno a un año.</p>
    <p>Una semana con menos del {formatInt(P.mantenimiento * 100)} % de las series cuenta como semana sin trabajo. Las {formatInt(P.semanasDeGracia)} primeras seguidas no restan; desde la siguiente, cada una quita una semana completa. Las pausas de Ritmo no restan. Por debajo del nivel más alto al que llegaste, cada semana cuenta doble. Si lo pierdes todo, el grupo queda con un contorno discontinuo.</p>
    <p>Se usa la clasificación guardada al terminar cada entreno (o la actual en los antiguos). Mide la constancia con que entrenas cada grupo: no mide crecimiento, fuerza, fatiga ni recuperación.</p>
  </div></Disclosure>
}
