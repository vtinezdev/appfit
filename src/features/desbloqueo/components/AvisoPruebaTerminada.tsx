import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { useDePago } from '../DesbloqueoContext'

/** Banda de las secciones de pago con la prueba terminada (ADR 068): se ve lo apuntado, no se añade ni se cambia. */
export default function AvisoPruebaTerminada({ seccion }: { seccion: string }) {
  const { bloqueado, pedir } = useDePago()
  if (!bloqueado) return null
  return (
    <div role="region" aria-label="Prueba terminada" className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-muted py-2 pl-3 pr-2">
      <div className="flex min-w-0 flex-1 basis-40 items-center gap-2">
        <Icon name="sparkles" size={20} className="shrink-0 text-fg-muted" />
        <p className="min-w-0 flex-1">
          <span className="block text-body-sm font-semibold text-fg">Tu mes de prueba ha terminado</span>
          <span className="block text-caption text-fg-muted">Puedes ver {seccion}; para añadir o cambiar, desbloquea Cumbra Fit.</span>
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={pedir}>Desbloquear</Button>
    </div>
  )
}
