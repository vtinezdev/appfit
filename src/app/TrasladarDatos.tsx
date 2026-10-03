import { useLiveQuery } from 'dexie-react-hooks'
import ListRow from '../shared/components/ListRow'
import Icon from '../shared/components/Icon'
import { hayDatosGuardados } from '../shared/db/estadoDatos'
import { entornoDeApp } from '../shared/lib/almacenamiento'

/** Orienta el primer traslado Safari → pantalla de inicio, cuyos almacenes pueden estar separados en iOS. */
export default function TrasladarDatos({ onVerInstrucciones }: { onVerInstrucciones: () => void }) {
  const hayDatos = useLiveQuery(hayDatosGuardados, [])
  const { instalada, esIOS } = entornoDeApp()
  if (hayDatos === undefined || !esIOS || (instalada && hayDatos)) return null

  return (
    <section aria-label="Trasladar registros" className="border-y border-line">
      <ListRow tone="flat" aria-label="Ver instrucciones" onClick={onVerInstrucciones}>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block text-body-sm font-semibold">{instalada ? '¿Primera vez abriendo AppFit?' : 'Añade AppFit a tu pantalla de inicio'}</span>
        <span className="block text-caption text-fg-muted">
          {instalada
            ? 'Si ya registraste comidas en Safari, puedes recuperarlas aquí. Te explicamos cómo hacerlo.'
            : '¿Ya has registrado comidas? Mira cómo llevarlas al nuevo acceso sin perder tus registros.'}
        </span>
        <span className="block text-caption font-semibold text-accent-strong">Ver instrucciones</span>
      </span>
      <Icon name="chevron-right" size={18} className="text-fg-muted" />
      </ListRow>
    </section>
  )
}
