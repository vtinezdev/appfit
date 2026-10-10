import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import { todayISO } from '../../../shared/lib/dates'
import { useVitrina } from '../hooks/useVitrina'
import { logrosDeEntreno, NUMERALES } from '../lib/logros'

/** Al terminar un entreno: las piezas de la Vitrina que se consiguieron con él. Nada si no hay ninguna. */
export default function NuevosLogros({ workoutId }: { workoutId: number }) {
  const estado = useVitrina(todayISO())
  if (!estado?.visible) return null
  const nuevos = logrosDeEntreno(estado.vitrina.logros, workoutId)
  if (!nuevos.length) return null
  return <section aria-label="Nuevo en la Vitrina" className="space-y-2">
    <h2 className="flex items-center gap-2 text-heading text-fg"><Icon name="trophy" size={22} className="text-fg" />Nuevo en la Vitrina</h2>
    <ListGroup aria-label="Logros conseguidos con este entreno">
      {nuevos.map(({ logro, nivel }) => <li key={`${logro.id}-${nivel ?? 'vez'}`} className="py-3">
        <p className="break-words text-body font-semibold text-fg">{logro.nombre}{nivel !== null && logro.umbrales && logro.umbrales.length > 1 ? ` ${NUMERALES[nivel - 1]}` : ''}</p>
        <p className="break-words text-body-sm text-fg-muted">{nivel !== null && logro.umbrales && logro.textoNivel ? logro.textoNivel(logro.umbrales[nivel - 1]) : logro.descripcion}</p>
      </li>)}
    </ListGroup>
  </section>
}
