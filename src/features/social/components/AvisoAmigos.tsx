import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { useCuenta } from '../../cuenta/useCuenta'
import { useConsulta } from '../hooks/useConsulta'
import { resumenAvisos } from '../lib/feed'
import { cargarSocial, socialDisponible } from '../servicio'

interface Props {
  onIrAAmigos: () => void
  onIrASocial: () => void
}

/**
 * Banda de Inicio cuando hay algo pendiente: reacciones o comentarios nuevos (lleva a Social) o solo solicitudes
 * (lleva a Amigos). Sin cuenta configurada, sin sesión, sin perfil o sin conexión no aparece.
 */
export default function AvisoAmigos(props: Props) {
  const { fase, email } = useCuenta()
  if (!socialDisponible || fase === 'cargando' || fase === 'sin-sesion') return null
  return <Banda key={email} {...props} />
}

function Banda({ onIrAAmigos, onIrASocial }: Props) {
  const avisos = useConsulta(async () => (await cargarSocial()).avisos(), 0)
  const texto = avisos.estado === 'listo' ? resumenAvisos(avisos.datos) : null
  if (avisos.estado !== 'listo' || !texto) return null
  const aSocial = avisos.datos.nuevos > 0
  return (
    <div role="region" aria-label={aSocial ? 'Novedades en Social' : 'Solicitudes en Amigos'} className="flex items-center gap-2 rounded-lg bg-surface-muted py-1 pl-3 pr-2">
      <Icon name={aSocial ? 'comentario' : 'users'} size={20} className="shrink-0 text-fg-muted" />
      <p className="min-w-0 flex-1">
        <span className="block text-body-sm font-semibold text-fg">{aSocial ? 'Novedades en Social' : 'Solicitudes en Amigos'}</span>
        <span className="block text-caption text-fg-muted">{texto}</span>
      </p>
      <Button variant="secondary" size="sm" onClick={aSocial ? onIrASocial : onIrAAmigos}>Ver</Button>
    </div>
  )
}
