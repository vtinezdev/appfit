import Button from '../../../shared/components/Button'
import ModalPage from '../../../shared/components/ModalPage'
import { ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { useConsulta } from '../hooks/useConsulta'
import { nombreVisible, type Persona } from '../lib/relacion'
import { cargarSocial } from '../servicio'
import PaginaPersona from './PaginaPersona'

interface Props { persona: Pick<Persona, 'alias' | 'nombre'>; comunidad?: string; volver?: string; onClose: () => void; onCambio?: () => void }
/** Carga a la persona (relación actual) y abre su página común desde Amigos, Social y comunidades, con su ámbito y su origen de vuelta. */
export default function PublicacionesPersona({ persona, comunidad, volver = 'Amigos', onClose, onCambio }: Props) {
  const consulta = useConsulta(async () => {
    const personas=await(await cargarSocial()).buscar(persona.alias)
    const encontrada=personas.find(p=>p.alias===persona.alias)
    if(!encontrada) throw new Error('Esta persona ya no está disponible.')
    return encontrada
  },persona.alias)
  if(!consulta.datos) return <ModalPage title={nombreVisible(persona)} onClose={onClose} closeLabel={volver}>
    {consulta.estado==='error'?<div className="space-y-stack"><ErrorState>{consulta.error}</ErrorState><Button variant="secondary" onClick={consulta.recargar}>Reintentar</Button></div>:<LoadingState />}
  </ModalPage>
  return <PaginaPersona comunidad={comunidad} volver={volver} persona={consulta.datos} onClose={onClose} onCambio={mensaje=>{onCambio?.(); if(mensaje)onClose()}} />
}
