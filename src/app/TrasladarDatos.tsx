import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../shared/components/Button'
import Card from '../shared/components/Card'
import { hayDatosGuardados } from '../shared/db/estadoDatos'
import { entornoDeApp } from '../shared/lib/almacenamiento'

/** Orienta el primer traslado Safari → pantalla de inicio, cuyos almacenes pueden estar separados en iOS. */
export default function TrasladarDatos({ onVerInstrucciones }: { onVerInstrucciones: () => void }) {
  const hayDatos = useLiveQuery(hayDatosGuardados, [])
  const { instalada, esIOS } = entornoDeApp()
  if (hayDatos === undefined || !esIOS || (instalada && hayDatos)) return null

  return (
    <section aria-label="Trasladar registros" className="px-page pt-6">
      <Card tone="muted" className="space-y-3">
        <p className="text-title font-semibold">{instalada ? '¿Primera vez abriendo AppFit?' : 'Añade AppFit a tu pantalla de inicio'}</p>
        <p className="text-body-sm text-fg-muted">
          {instalada
            ? 'Si ya registraste comidas en Safari, puedes recuperarlas aquí. Te explicamos cómo hacerlo.'
            : '¿Ya has registrado comidas? Mira cómo llevarlas al nuevo acceso sin perder tus registros.'}
        </p>
        <Button variant="secondary" block onClick={onVerInstrucciones}>Ver instrucciones</Button>
      </Card>
    </section>
  )
}
