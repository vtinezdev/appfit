import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import { getSettings, updateSettings } from '../../../shared/db/settings'
import { marcarPistaVista, pistaPendiente } from '../../../shared/lib/pistas'
import { ultimoTerminado } from '../../gym/data/workoutsRepo'
import { useConsulta } from '../hooks/useConsulta'
import { cargarSocial } from '../servicio'

interface Props { version: number; onCodigo: () => void; onComunidades: () => void; onEntreno: (id?: number) => void; onError: (mensaje: string) => void }
export default function PrimerosPasosSocial({ version, onCodigo, onComunidades, onEntreno, onError }: Props) {
  const local = useLiveQuery(async () => ({ settings: await getSettings(), entreno: await ultimoTerminado() }), [])
  const pasos = useConsulta(async () => {
    const social = await cargarSocial()
    const [seguidores, comunidades] = await Promise.all([social.personas('seguidores'), social.comunidades('', true)])
    return { codigo: seguidores.some(p => p.meSigue === 'aceptado'), comunidad: comunidades.some(c => c.unida) }
  }, version)
  if (!local || !pistaPendiente(local.settings.pistasVistas, 'social-primeros-pasos')) return null
  const cerrar = () => updateSettings({ pistasVistas: marcarPistaVista(local.settings.pistasVistas, 'social-primeros-pasos') }).catch(() => onError('No se ha podido guardar el ajuste. Inténtalo de nuevo.'))
  return <Card className="space-y-2">
    <h2 className="text-heading text-fg">Tus primeros pasos</h2>
    <ul className="divide-y divide-line">
      <li><Button variant="subtle" block onClick={onCodigo}>{pasos.datos?.codigo ? 'Código · Ya tienes seguidores' : 'Comparte tu código'}</Button></li>
      <li><Button variant="subtle" block onClick={onComunidades}>{pasos.datos?.comunidad ? 'Comunidades · Ya eres miembro' : 'Únete a una comunidad'}</Button></li>
      <li><Button variant="subtle" block onClick={() => onEntreno(local.entreno?.id)}>{local.entreno?.publicacion ? 'Último entreno · Compartido' : 'Comparte tu último entreno'}</Button></li>
    </ul>
    <Button variant="ghost" size="sm" onClick={() => void cerrar()}>Cerrar primeros pasos</Button>
  </Card>
}
