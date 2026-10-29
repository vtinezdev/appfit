import { useState } from 'react'
import Button from '../../shared/components/Button'
import ComoFunciona from '../../shared/components/ComoFunciona'
import PageHeader from '../../shared/components/PageHeader'
import { EmptyState, LoadingState } from '../../shared/components/StateMessage'
import ViewTabs from '../../shared/components/ViewTabs'
import { todayISO } from '../../shared/lib/dates'
import ColeccionesVista from './components/ColeccionesVista'
import ComoFuncionaVitrina from './components/ComoFuncionaVitrina'
import LogrosVista from './components/LogrosVista'
import RecordsVista from './components/RecordsVista'
import { useVitrina } from './hooks/useVitrina'

type Vista = 'logros' | 'records' | 'colecciones'

/** Vitrina (desde Inicio): museo personal con logros, el muro de récords y las colecciones (Herbario y Atlas). */
export default function VitrinaTab({ onIrAAjustes, onVolver, incrustada = false }: { onIrAAjustes: () => void; onVolver?: () => void
  /** Como pestaña de Progreso (B12): sin márgenes de página ni título visible. */
  incrustada?: boolean }) {
  const volver = onVolver && !incrustada ? { etiqueta: 'Inicio', onVolver } : undefined
  const marco = incrustada ? '' : 'px-page pt-5'
  const hoy = todayISO()
  const estado = useVitrina(hoy)
  const [vista, setVista] = useState<Vista>('logros')

  if (!estado) return <div className={marco}><LoadingState /></div>
  if (!estado.visible) {
    return <div className={`space-y-section ${marco}`}>
      <PageHeader incrustada={incrustada} title="Vitrina" volver={volver} />
      <EmptyState title="Vitrina oculta" action={<Button variant="secondary" onClick={onIrAAjustes}>Ir a Ajustes</Button>}>
        La has ocultado en Ajustes junto con Cumbres, Caminos y Ritmo.
      </EmptyState>
    </div>
  }

  return <div className={`space-y-3 ${marco}`}>
    <PageHeader incrustada={incrustada} title="Vitrina" volver={volver} action={<ComoFunciona nombre="Vitrina"><ComoFuncionaVitrina conNutricion={estado.conNutricion} /></ComoFunciona>} />
    <ViewTabs label="Vistas de la Vitrina" valor={vista} onChange={setVista}
      opciones={[{ valor: 'logros', label: 'Logros' }, { valor: 'records', label: 'Récords' }, { valor: 'colecciones', label: 'Colecciones' }]}>
      <div className="pt-4">
        {vista === 'logros' && <LogrosVista logros={estado.vitrina.logros} />}
        {vista === 'records' && <RecordsVista muro={estado.vitrina.muro} nombres={estado.nombres} />}
        {vista === 'colecciones' && <ColeccionesVista vitrina={estado.vitrina} nombres={estado.nombres} hoy={hoy} />}
      </div>
    </ViewTabs>
  </div>
}
