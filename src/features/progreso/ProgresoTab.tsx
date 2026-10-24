import { lazy, Suspense, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Card from '../../shared/components/Card'
import PageHeader from '../../shared/components/PageHeader'
import { LoadingState } from '../../shared/components/StateMessage'
import ViewTabs from '../../shared/components/ViewTabs'
import { getSettings } from '../../shared/db/settings'
import { startOfWeek, todayISO } from '../../shared/lib/dates'
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

const NOMBRES: Record<VistaProgreso, string> = { semana: 'Semana', cumbres: 'Cumbres', caminos: 'Caminos', vitrina: 'Vitrina' }

interface Props {
  vistaInicial?: VistaProgreso
  /** «‹ Inicio» cuando se entra desde una tesela de Inicio; desde la media luna no hay. */
  onVolver?: () => void
  onIrAAjustes: () => void
  onIrAActividades: () => void
}

/** Lo de esta semana en las tres secciones, encima de Ritmo en la pestaña Semana. */
function EstaSemana() {
  const hoy = todayISO()
  const estado = useVitrina(hoy)
  if (!estado?.visible) return null
  const lunes = startOfWeek(hoy)
  const caminos = estado.caminos?.visible ? estado.caminos.caminos : null
  const lineas = [
    estado.cumbres && textoMetrosSemana(metrosSubidos(estado.cumbres.tramos, lunes, hoy)),
    caminos && textoKmSemana(metrosRecorridos(caminos.tramos, lunes, hoy)),
    textoPiezasSemana(piezasDesde(estado.vitrina.logros, lunes)),
  ].filter(Boolean)
  if (!lineas.length) return null
  return <Card tone="muted" className="space-y-1">
    <p className="text-label text-fg-muted">Cumbres, Caminos y Vitrina esta semana</p>
    <ul className="space-y-1">{lineas.map((l) => <li key={l as string} className="tabular break-words text-body-sm text-fg">{l}</li>)}</ul>
  </Card>
}

/**
 * Progreso (B12, ADR 058): un solo destino con pestañas Semana · Cumbres · Caminos · Vitrina. La pestaña Semana reúne lo de
 * esta semana, las metas (B13) y Ritmo (con su calendario, que abre las revisiones). Las páginas de siempre se montan como vistas
 * (`incrustada`). Sin Actividades (B9), Caminos no sale.
 */
export default function ProgresoTab({ vistaInicial = 'semana', onVolver, onIrAAjustes, onIrAActividades }: Props) {
  const settings = useLiveQuery(() => getSettings(), [])
  const vistas = vistasProgreso({ actividades: moduloActivo(settings, 'actividades') })
  const [elegida, setVista] = useState<VistaProgreso>(vistaInicial)
  const vista = vistas.includes(elegida) ? elegida : 'semana'

  return (
    <div className="space-y-3 px-page pt-5">
      <PageHeader title="Progreso" volver={onVolver ? { etiqueta: 'Inicio', onVolver } : undefined} />
      <ViewTabs label="Vistas de progreso" opciones={vistas.map((v) => ({ valor: v, label: NOMBRES[v] }))} valor={vista} onChange={setVista}>
        <Suspense fallback={<LoadingState />}>
          {vista === 'semana' && <div className="space-y-section"><EstaSemana /><MetasVista /><RitmoTab incrustada onIrAAjustes={onIrAAjustes} /></div>}
          {vista === 'cumbres' && <CumbresTab incrustada onIrAAjustes={onIrAAjustes} />}
          {vista === 'caminos' && <CaminosTab incrustada onIrAAjustes={onIrAAjustes} onIrAActividades={onIrAActividades} />}
          {vista === 'vitrina' && <VitrinaTab incrustada onIrAAjustes={onIrAAjustes} />}
        </Suspense>
      </ViewTabs>
    </div>
  )
}
