import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { useCuenta } from '../../cuenta/useCuenta'
import { cuentaDisponible } from '../../cuenta/servicio'
import { caminoTraslado, direccionNueva, hayQueTrasladar, textoTraslado } from '../lib/traslado'

/** La dirección nueva del build (`VITE_DIRECCION_NUEVA`); sin ella no hay aviso. */
const NUEVA = direccionNueva(import.meta.env.VITE_DIRECCION_NUEVA)

/** Si este origen tiene que avisar del cambio de dirección. Lo usa Inicio para no repetir el aviso de copia. */
export const avisoTrasladoActivo = (): boolean => typeof location !== 'undefined' && hayQueTrasladar(location.origin, NUEVA)

const ENLACE = 'inline-flex min-h-touch items-center gap-1 text-body-sm font-semibold text-accent-strong underline'

/**
 * Aviso de cambio de dirección, arriba de Inicio y sin cerrar: los registros de esta dirección no pasan solos a la nueva.
 * Dice cómo llevárselos según la cuenta (entrar con ella o exportar e importar) y enlaza la app nueva y cómo instalarla.
 */
export default function AvisoTraslado({ onExportar, onRevisarCuenta }: { onExportar: () => void; onRevisarCuenta: () => void }) {
  const cuenta = useCuenta()
  if (!avisoTrasladoActivo() || !NUEVA || (cuentaDisponible && cuenta.fase === 'cargando')) return null
  const camino = caminoTraslado(cuentaDisponible, cuenta)

  return (
    <section aria-label="Cambio de dirección" className="space-y-2 rounded-lg border border-line-strong bg-surface-muted p-3">
      <div className="flex items-start gap-2">
        <Icon name="route" size={20} className="mt-0.5 shrink-0 text-accent-strong" />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="break-words text-body font-semibold text-fg">Cumbra Fit se muda a {NUEVA.host}</h2>
          <p className="text-body-sm text-fg-muted">{textoTraslado(camino, NUEVA.host)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {camino === 'copia' && <Button variant="secondary" size="sm" onClick={onExportar}>Exportar copia</Button>}
        {camino === 'cuenta-revisar' && <Button variant="secondary" size="sm" onClick={onRevisarCuenta}>Revisar la copia</Button>}
        <a href={`${NUEVA.origen}/`} target="_blank" rel="noopener" className={ENLACE}>Abrir {NUEVA.host}<Icon name="chevron-right" size={16} /></a>
        <a href={`${NUEVA.origen}/conoce`} target="_blank" rel="noopener" className={ENLACE}>Cómo instalarla</a>
      </div>
    </section>
  )
}
