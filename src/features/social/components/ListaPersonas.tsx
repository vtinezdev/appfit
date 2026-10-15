import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import type { ListaPersonas as Lista } from '../data/social'
import { useConsulta } from '../hooks/useConsulta'
import { textoRelacion, type Persona } from '../lib/relacion'
import { cargarSocial } from '../servicio'
import NombrePersona from './NombrePersona'

const VACIA: Record<'siguiendo' | 'seguidores', string> = {
  siguiendo: 'Aún no sigues a nadie. En «Añadir» puedes buscar a alguien por su alias o su código.',
  seguidores: 'Aún no te sigue nadie. En «Añadir» tienes tu código para pasárselo a quien quieras.',
}

interface Props {
  lista: 'siguiendo' | 'seguidores'
  /** Sube con cada cambio: la lista se vuelve a leer. */
  version: number
  onAbrir: (persona: Persona) => void
}

/** A quién sigues (con las solicitudes enviadas) o quién te sigue. */
export default function ListaPersonas({ lista, version, onAbrir }: Props) {
  const consulta = useConsulta(async () => (await cargarSocial()).personas(lista as Lista), `${lista}-${version}`)

  if (consulta.estado === 'error' && !consulta.datos) {
    return <div className="space-y-3"><ErrorState>{consulta.error}</ErrorState><Button variant="secondary" size="sm" onClick={consulta.recargar}>Reintentar</Button></div>
  }
  if (!consulta.datos) return <LoadingState />
  if (consulta.datos.length === 0) return <EmptyState>{VACIA[lista]}</EmptyState>
  return (
    <ListGroup aria-label={lista === 'siguiendo' ? 'Siguiendo' : 'Seguidores'}>
      {consulta.datos.map((p) => (
        <li key={p.alias}>
          <ListRow onClick={() => onAbrir(p)}>
            <NombrePersona persona={p} detalle={textoRelacion(p)} />
            <Icon name="chevron-right" size={18} className="text-fg-muted" />
          </ListRow>
        </li>
      ))}
    </ListGroup>
  )
}
