import { useId, useState, type ReactNode } from 'react'
import Card from '../../../shared/components/Card'
import Icon, { type IconName } from '../../../shared/components/Icon'
import type { ColeccionRuta } from '../lib/rutas'

/** Icono de cada tipo de camino. */
export const ICONO_COLECCION: Record<ColeccionRuta, IconName> = { propia: 'route', santiago: 'flag', mundo: 'mountain', literatura: 'copy', fantasia: 'sparkles' }

export interface GrupoCaminos {
  id: string
  icono: IconName
  nombre: string
  /** «6 rutas · de 113,8 a 970,4 km». */
  resumen: string
  contenido: ReactNode
}

function Grupo({ g }: { g: GrupoCaminos }) {
  const [abierto, setAbierto] = useState(false)
  const id = useId()
  return <li>
    <button type="button" aria-expanded={abierto} aria-controls={id} onClick={() => setAbierto(!abierto)}
      className="app-button flex min-h-touch w-full items-center gap-3 px-card py-3 text-left">
      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg"><Icon name={g.icono} size={18} /></span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-body font-semibold text-fg">{g.nombre}</span>
        <span className="tabular block break-words text-caption text-fg-muted">{g.resumen}</span>
      </span>
      <Icon name="chevron-down" size={18} className={`shrink-0 text-fg-subtle transition-transform duration-short motion-reduce:transition-none ${abierto ? 'rotate-180' : ''}`} />
    </button>
    <div id={id} hidden={!abierto} className="px-card pb-3">{g.contenido}</div>
  </li>
}

/**
 * Caminos por grupos (punto 6, opción A): una fila por grupo con su icono, su nombre y un resumen; cerradas al empezar y,
 * al tocar una, su lista debajo. Para que «Por hacer» y «Terminados» no sean una lista enorme.
 */
export default function GruposCaminos({ grupos, label }: { grupos: GrupoCaminos[]; label: string }) {
  return <Card padded={false} className="overflow-hidden">
    <ul aria-label={label} className="divide-y divide-line">{grupos.map((g) => <Grupo key={g.id} g={g} />)}</ul>
  </Card>
}
