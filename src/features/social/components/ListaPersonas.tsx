import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import type { Consulta } from '../hooks/useConsulta'
import { useAvatares } from '../hooks/useAvatares'
import { nombreVisible, textoRelacion, type Persona } from '../lib/relacion'
import { cargarSocial } from '../servicio'
import AvatarPersona from './AvatarPersona'
import NombrePersona from './NombrePersona'

const VACIA: Record<'siguiendo' | 'seguidores', string> = {
  siguiendo: 'Aún no sigues a nadie. En «Añadir» puedes buscar a alguien por su alias o su código.',
  seguidores: 'Aún no te sigue nadie. En «Añadir» tienes tu código para pasárselo a quien quieras.',
}

interface Props {
  lista: 'siguiendo' | 'seguidores'
  /** Las leen en Amigos, que también da su recuento en las pestañas. */
  consulta: Consulta<Persona[]> & { recargar: () => void }
  onAbrir: (persona: Persona) => void
  /** Se pidió seguir desde la fila: las listas se vuelven a leer. */
  onCambio: () => void
  onError: (mensaje: string) => void
}

/** A quién sigues (con las solicitudes enviadas) o quién te sigue, con su cara y «Seguir» en la fila si aún no la sigues. */
export default function ListaPersonas({ lista, consulta, onAbrir, onCambio, onError }: Props) {
  const [ocupada, setOcupada] = useState<string | null>(null)
  const logros = useAvatares((consulta.datos ?? []).map(p => p.alias))

  async function pedir(p: Persona) {
    setOcupada(p.alias)
    try { await (await cargarSocial()).pedirSeguir(p.alias); onCambio() }
    catch (e) { onError(e instanceof Error ? e.message : 'No se ha podido pedir seguir. Inténtalo de nuevo.') }
    finally { setOcupada(null) }
  }

  if (consulta.estado === 'error' && !consulta.datos) {
    return <div className="space-y-3"><ErrorState>{consulta.error}</ErrorState><Button variant="secondary" size="sm" onClick={consulta.recargar}>Reintentar</Button></div>
  }
  if (!consulta.datos) return <LoadingState />
  if (consulta.datos.length === 0) return <EmptyState>{VACIA[lista]}</EmptyState>
  return (
    <ListGroup aria-label={lista === 'siguiendo' ? 'Siguiendo' : 'Seguidores'}>
      {consulta.datos.map((p) => (
        <li key={p.alias} className="flex flex-wrap items-center gap-x-2">
          <ListRow className="min-w-0 flex-1 basis-48" onClick={() => onAbrir(p)}>
            <span className="flex min-w-0 items-center gap-3">
              <AvatarPersona persona={p} logro={logros[p.alias]} tamano="sm" />
              <NombrePersona persona={p} detalle={textoRelacion(p)} />
            </span>
            {p.sigo !== 'no' && <Icon name="chevron-right" size={18} className="shrink-0 text-fg-subtle" />}
          </ListRow>
          {p.sigo === 'no' && <Button variant="secondary" size="sm" className="ml-auto shrink-0" loading={ocupada === p.alias} disabled={ocupada !== null}
            aria-label={`Seguir a ${nombreVisible(p)}`} onClick={() => void pedir(p)}>Seguir</Button>}
        </li>
      ))}
    </ListGroup>
  )
}
