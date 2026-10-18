import { useRef, useState } from 'react'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Disclosure from '../../../shared/components/Disclosure'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import Metric from '../../../shared/components/Metric'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { LoadingState } from '../../../shared/components/StateMessage'
import { todayISO } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { useAportesMusculares } from '../hooks/useAportesMusculares'
import { useFiguraMapa } from '../hooks/useFiguraMapa'
import { CALOR_MUSCULAR, calorMuscular, NIVELES_CALOR, nivelesDeCalor, resumenCalor, type CalorMuscular, type CalorMusculo } from '../lib/calorMuscular'
import { MUSCULOS, ZONAS_MUSCULARES, type ZonaMuscular } from '../lib/musculos'
import { CuerpoMuscular, EscalaMuscular } from './MapaMuscular'

const series = (n: number) => `${formatNumber(n, 1)} ${n === 1 ? 'serie' : 'series'}`
const nivelTexto = (m: CalorMusculo) => (m.huella ? 'Trabajado antes · sin calor reciente' : NIVELES_CALOR[m.nivel])
function cuando(dias: number | null) {
  if (dias === null) return 'Nunca'
  return dias === 0 ? 'Hoy' : dias === 1 ? 'Ayer' : `Hace ${formatInt(dias)} días`
}

/**
 * Mapa muscular acumulado (ADR 046), arriba de Progreso: una vista del cuerpo con Frontal/Trasera, lo que tiene más y
 * menos calor y, en una hoja, el detalle de cada grupo (tocando la figura o desde «Ver detalle por músculo»).
 */
export default function MapaCalor() {
  const datos = useAportesMusculares()
  const figura = useFiguraMapa()
  const [vista, setVista] = useState<'frontal' | 'trasera'>('frontal')
  const [hoja, setHoja] = useState<{ abierta: boolean; musculo: ZonaMuscular | null }>({ abierta: false, musculo: null })
  const cabecera = <div className="flex items-baseline justify-between gap-3">
    <h2 id="mapa-calor" className="text-heading text-fg">Mapa muscular</h2>
    <span className="text-caption text-fg-muted">Ahora</span>
  </div>
  if (!datos) return <section aria-labelledby="mapa-calor" className="space-y-stack">{cabecera}<LoadingState /></section>

  const calor = calorMuscular(datos.aportes, todayISO(), datos.sinClasificar)
  const { levels, huella } = nivelesDeCalor(calor)
  const { masCalor, pocoCalor } = resumenCalor(calor)
  const abrir = (musculo: ZonaMuscular | null) => setHoja({ abierta: true, musculo })
  const nombres = (ms: ZonaMuscular[]) => ms.map(m => MUSCULOS[m]).join(' · ')

  return <section aria-labelledby="mapa-calor" className="space-y-stack">
    {cabecera}
    <Card className="space-y-stack">
      <SegmentedControl label="Vista del cuerpo" size="sm" valor={vista} onChange={setVista}
        opciones={[{ valor: 'frontal', label: 'Frontal' }, { valor: 'trasera', label: 'Trasera' }]} />
      <CuerpoMuscular vista={vista} levels={levels} huella={huella} figura={figura} onZona={calor.conDatos ? abrir : undefined} />
      <EscalaMuscular huella={Object.values(huella).some(Boolean)} />
      {!calor.conDatos ? <p className="text-center text-body-sm text-fg-muted">Tu mapa empieza en blanco. Cada entreno que termines calienta los músculos que trabajes.</p> : <>
        <dl className="space-y-2 border-t border-line pt-3">
          <div className="flex items-baseline justify-between gap-3"><dt className="shrink-0 text-rotulo text-fg-muted">Más calor</dt><dd className="min-w-0 break-words text-right text-body-sm font-semibold text-fg">{nombres(masCalor) || '—'}</dd></div>
          <div className="flex items-baseline justify-between gap-3"><dt className="shrink-0 text-rotulo text-fg-muted">Poco o ningún calor</dt><dd className="min-w-0 break-words text-right text-body-sm font-semibold text-fg">{nombres(pocoCalor) || 'Ninguno'}</dd></div>
        </dl>
        <Button variant="secondary" block onClick={() => abrir(null)} aria-haspopup="dialog">Ver detalle por músculo<Icon name="chevron-right" size={18} /></Button>
      </>}
    </Card>
    <Sheet open={hoja.abierta} onClose={() => setHoja(h => ({ ...h, abierta: false }))} title={hoja.musculo ? MUSCULOS[hoja.musculo] : 'Por grupo muscular'}>
      <ContenidoHoja calor={calor} musculo={hoja.musculo} onMusculo={musculo => setHoja({ abierta: true, musculo })} />
    </Sheet>
  </section>
}

function ContenidoHoja({ calor, musculo, onMusculo }: { calor: CalorMuscular; musculo: ZonaMuscular | null; onMusculo: (m: ZonaMuscular | null) => void }) {
  const inicio = useRef<HTMLDivElement>(null)
  // Al cambiar entre la lista y un grupo, la hoja vuelve arriba (con su título) y el foco pasa al contenido nuevo.
  const cambiar = (m: ZonaMuscular | null) => {
    onMusculo(m)
    requestAnimationFrame(() => { inicio.current?.closest('.sheet-content')?.scrollTo({ top: 0 }); inicio.current?.focus({ preventScroll: true }) })
  }
  if (musculo) return <div ref={inicio} tabIndex={-1} className="space-y-stack outline-none">
    <Button variant="ghost" size="sm" className="-ml-2" onClick={() => cambiar(null)}><Icon name="chevron-left" size={18} />Todos los grupos</Button>
    <DetalleMusculo m={calor.musculos[musculo]} />
  </div>

  const orden = [...ZONAS_MUSCULARES].sort((a, b) => calor.musculos[b].ritmo - calor.musculos[a].ritmo || MUSCULOS[a].localeCompare(MUSCULOS[b], 'es'))
  return <div ref={inicio} tabIndex={-1} className="space-y-stack outline-none">
    <ListGroup variante="plana" aria-label="Grupos musculares por calor">
      {orden.map(m => <li key={m}><ListRow onClick={() => cambiar(m)}>
        <span className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="muscle-swatch shrink-0" data-level={calor.musculos[m].nivel} data-huella={calor.musculos[m].huella} />
          <span className="min-w-0">
            <span className="block break-words text-body font-semibold text-fg">{MUSCULOS[m]}</span>
            <span className="block text-caption text-fg-muted">{nivelTexto(calor.musculos[m])}</span>
          </span>
        </span>
        <Icon name="chevron-right" size={18} className="shrink-0 text-fg-subtle" />
      </ListRow></li>)}
    </ListGroup>
    {calor.sinClasificar28.series > 0 && <p className="break-words text-body-sm text-fg-muted">
      {series(calor.sinClasificar28.series)} de los últimos 28 días sin músculo clasificado no se reparten: {calor.sinClasificar28.nombres.join(', ')}.
    </p>}
    <ComoSeCalcula />
  </div>
}

function DetalleMusculo({ m }: { m: CalorMusculo }) {
  return <div className="space-y-stack">
    <p className="flex items-center gap-2 text-body-sm text-fg-muted">
      <span aria-hidden="true" className="muscle-swatch shrink-0" data-level={m.nivel} data-huella={m.huella} />{nivelTexto(m)}
    </p>
    <div className="metric-grid gap-3">
      <Metric size="title" label="7 días" valor={formatNumber(m.series7, 1)} unidad={m.series7 === 1 ? 'serie' : 'series'} />
      <Metric size="title" label="28 días" valor={formatNumber(m.series28, 1)} unidad={m.series28 === 1 ? 'serie' : 'series'} />
      <Metric size="title" label="Última vez" valor={cuando(m.diasDesde)} />
    </div>
    <dl className="divide-y divide-line border-y border-line">
      <div className="flex min-h-touch items-center justify-between gap-3 py-2"><dt className="text-body-sm text-fg-muted">Semanas con trabajo</dt><dd className="tabular text-right text-body-sm font-semibold text-fg">{formatInt(m.semanas28)} de las últimas 4</dd></div>
      <div className="flex min-h-touch items-center justify-between gap-3 py-2"><dt className="text-body-sm text-fg-muted">Directas · indirectas (28 días)</dt><dd className="tabular text-right text-body-sm font-semibold text-fg">{formatNumber(m.directas28, 1)} · {formatNumber(m.indirectas28, 1)}</dd></div>
      <div className="flex min-h-touch items-center justify-between gap-3 py-2"><dt className="text-body-sm text-fg-muted">Ritmo equivalente</dt><dd className="tabular text-right text-body-sm font-semibold text-fg">{formatNumber(m.ritmo, 1)} series/semana</dd></div>
    </dl>
    {m.ejercicios.length > 0 ? <section aria-label="Lo que más aporta" className="space-y-2">
      <h3 className="text-rotulo text-fg-muted">Lo que más aporta · 28 días</h3>
      <ul className="divide-y divide-line">{m.ejercicios.map(e => <li key={`${e.exerciseId}-${e.rol}`} className="flex items-baseline justify-between gap-3 py-2">
        <span className="min-w-0 break-words text-body-sm text-fg">{e.nombre}<span className="block text-caption text-fg-muted">{e.rol === 'principal' ? 'Principal' : 'Secundario'}</span></span>
        <span className="tabular shrink-0 text-body-sm text-fg-muted">{series(e.series)}</span>
      </li>)}</ul>
    </section> : <p className="text-body-sm text-fg-muted">Sin series en las últimas 4 semanas.</p>}
    <p className="text-caption text-fg-muted">Estimación del trabajo registrado: no mide crecimiento, fatiga ni recuperación.</p>
  </div>
}

function ComoSeCalcula() {
  return <Disclosure title="Cómo se calcula"><div className="space-y-2 text-body-sm text-fg-muted">
    <p>Cada serie efectiva de un entreno terminado suma 1 a su músculo principal y {formatNumber(CALOR_MUSCULAR.secundario, 1)} a cada secundario; los calentamientos y las series sin hacer no cuentan, ni el peso levantado. El calor de cada serie se reduce a la mitad cada {formatInt(CALOR_MUSCULAR.vidaMediaDias)} días.</p>
    <p>En un mismo día cuentan como mucho {formatInt(CALOR_MUSCULAR.topeDia)} series por músculo: un entreno suelto llega como mucho a «Moderado»; «Alto» y «Muy alto» piden constancia. El nivel se lee como series por semana sostenidas: desde {CALOR_MUSCULAR.umbrales.map(u => formatNumber(u, 1)).join(' · ')} para cada nivel.</p>
    <p>Lo que trabajaste y ya no tiene calor se dibuja con un contorno discontinuo. Se usa la clasificación guardada al terminar cada entreno (o la actual en los antiguos). Es una estimación del trabajo registrado: no mide crecimiento, fatiga ni recuperación.</p>
  </div></Disclosure>
}
