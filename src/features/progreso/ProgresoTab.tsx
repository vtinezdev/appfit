import { lazy, Suspense, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../shared/components/Button'
import Icon, { type IconName } from '../../shared/components/Icon'
import PageHeader from '../../shared/components/PageHeader'
import { LoadingState } from '../../shared/components/StateMessage'
import ViewTabs from '../../shared/components/ViewTabs'
import { getSettings } from '../../shared/db/settings'
import { startOfWeek, todayISO } from '../../shared/lib/dates'
import { formatInt } from '../../shared/lib/format'
import { formatKm } from '../actividades/lib/actividad'
import { moduloActivo } from '../../shared/lib/modulos'
import { metrosEntre as metrosRecorridos } from '../caminos/lib/caminos'
import { metrosEntre as metrosSubidos } from '../cumbres/lib/cumbres'
import { textoKmSemana, textoMetrosSemana, textoPiezasSemana } from '../inicio/lib/progresoSemana'
import { useVitrina } from '../vitrina/hooks/useVitrina'
import { piezasDesde } from '../vitrina/lib/logros'
import { vistasProgreso, type VistaProgreso } from './lib/vistas'

const CumbresTab = lazy(() => import('../cumbres/CumbresTab'))
const CaminosTab = lazy(() => import('../caminos/CaminosTab'))
const RitmoTab = lazy(() => import('../ritmo/RitmoTab'))
const VitrinaTab = lazy(() => import('../vitrina/VitrinaTab'))
const MetasVista = lazy(() => import('../vitrina/components/MetasVista'))
const CalendarioRegistros = lazy(() => import('./components/CalendarioRegistros'))

const NOMBRES: Record<VistaProgreso, string> = { semana: 'Semana', cumbres: 'Cumbres', caminos: 'Caminos', vitrina: 'Vitrina' }

interface Props {
  vistaInicial?: VistaProgreso
  /** «‹ Inicio» cuando se entra desde una tesela de Inicio; desde la rejilla de secciones no hay. */
  onVolver?: () => void
  onIrAAjustes: () => void
  onIrAActividades: () => void
  /** «Ver en Nutrición» de un día del calendario (B14). */
  onIrANutricion: (fecha: string) => void
  /** Viene de la hoja de llegada: Caminos abre la lista para elegir la próxima ruta. */
  elegirRuta?: boolean
}

/**
 * Lo de esta semana en Cumbres, Caminos y Vitrina (punto 18): una casilla por sección con su icono y su cifra, bajo la
 * semana de Ritmo; cada una lleva a su pestaña.
 */
function EstaSemana({ onIr }: { onIr: (v: VistaProgreso) => void }) {
  const hoy = todayISO()
  const estado = useVitrina(hoy)
  if (!estado?.visible) return null
  const lunes = startOfWeek(hoy)
  const caminos = estado.caminos?.visible ? estado.caminos.caminos : null
  const piezas = piezasDesde(estado.vitrina.logros, lunes)
  const casillas: { vista: VistaProgreso; icono: IconName; valor: string; unidad: string; texto: string }[] = []
  if (estado.cumbres) {
    const m = metrosSubidos(estado.cumbres.tramos, lunes, hoy)
    casillas.push({ vista: 'cumbres', icono: 'mountain', valor: `${m > 0 ? '+' : ''}${formatInt(Math.round(m))}`, unidad: 'm', texto: textoMetrosSemana(m) })
  }
  if (caminos) {
    const m = metrosRecorridos(caminos.tramos, lunes, hoy)
    casillas.push({ vista: 'caminos', icono: 'route', valor: `${m > 0 ? '+' : ''}${formatKm(m)}`, unidad: 'km', texto: textoKmSemana(m) })
  }
  casillas.push({ vista: 'vitrina', icono: 'sparkles', valor: formatInt(piezas), unidad: piezas === 1 ? 'pieza' : 'piezas', texto: textoPiezasSemana(piezas) })
  return <ul aria-label="Cumbres, Caminos y Vitrina esta semana" className="grid gap-stack" style={{ gridTemplateColumns: `repeat(${casillas.length}, minmax(0, 1fr))` }}>
    {casillas.map((c) => <li key={c.vista} className="min-w-0">
      <button type="button" onClick={() => onIr(c.vista)} aria-label={`${NOMBRES[c.vista]}: ${c.texto}`}
        className="app-card app-button flex h-full min-h-touch w-full min-w-0 flex-col items-start gap-1 rounded-lg bg-surface p-3 text-left shadow-card">
        <span className="flex items-center gap-1.5 text-fg-muted"><Icon name={c.icono} size={16} /><span className="text-caption font-semibold">{NOMBRES[c.vista]}</span></span>
        <span className="tabular break-words text-title text-fg">{c.valor} <span className="text-caption font-normal text-fg-muted">{c.unidad}</span></span>
      </button>
    </li>)}
  </ul>
}

/**
 * Progreso (B12, ADR 058): un solo destino con pestañas Semana · Cumbres · Caminos · Vitrina. La pestaña Semana reúne lo de
 * esta semana, las metas (B13) y Ritmo (con su calendario, que abre las revisiones). Las páginas de siempre se montan como vistas
 * (`incrustada`). Sin Actividades (B9), Caminos no sale.
 */
export default function ProgresoTab({ vistaInicial = 'semana', onVolver, onIrAAjustes, onIrAActividades, onIrANutricion, elegirRuta = false }: Props) {
  const [calendario, setCalendario] = useState(false)
  const settings = useLiveQuery(() => getSettings(), [])
  const vistas = vistasProgreso({ actividades: moduloActivo(settings, 'actividades') })
  const [elegida, setVista] = useState<VistaProgreso>(vistaInicial)
  const vista = vistas.includes(elegida) ? elegida : 'semana'

  return (
    <div className="space-y-3 px-page pt-5">
      <PageHeader title="Progreso" volver={onVolver ? { etiqueta: 'Inicio', onVolver } : undefined}
        action={<Button variant="secondary" size="sm" onClick={() => setCalendario(true)}><Icon name="calendar" size={16} />Calendario</Button>} />
      <ViewTabs label="Vistas de progreso" opciones={vistas.map((v) => ({ valor: v, label: NOMBRES[v] }))} valor={vista} onChange={setVista}>
        <Suspense fallback={<LoadingState />}>
          {vista === 'semana' && <RitmoTab incrustada onIrAAjustes={onIrAAjustes} debajoDeSemana={<EstaSemana onIr={setVista} />} trasSemana={<MetasVista />} />}
          {vista === 'cumbres' && <CumbresTab incrustada onIrAAjustes={onIrAAjustes} />}
          {vista === 'caminos' && <CaminosTab incrustada onIrAAjustes={onIrAAjustes} onIrAActividades={onIrAActividades} elegirAlEntrar={elegirRuta} />}
          {vista === 'vitrina' && <VitrinaTab incrustada onIrAAjustes={onIrAAjustes} />}
        </Suspense>
      </ViewTabs>
      {calendario && <Suspense fallback={null}><CalendarioRegistros onClose={() => setCalendario(false)} onIrANutricion={onIrANutricion} /></Suspense>}
    </div>
  )
}
