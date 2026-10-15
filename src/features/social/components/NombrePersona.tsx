import type { Persona } from '../lib/relacion'

/** Nombre (o alias) en grande y, debajo, el alias y lo que se quiera añadir (la relación, por ejemplo). */
export default function NombrePersona({ persona, detalle }: { persona: Pick<Persona, 'alias' | 'nombre'>; detalle?: string | null }) {
  const lineaAlias = persona.nombre ? `@${persona.alias}` : null
  const segunda = [lineaAlias, detalle].filter(Boolean).join(' · ')
  return (
    <span className="block min-w-0">
      <span className="block break-words text-body font-semibold text-fg">{persona.nombre ?? `@${persona.alias}`}</span>
      {segunda && <span className="block break-words text-caption text-fg-muted">{segunda}</span>}
    </span>
  )
}
