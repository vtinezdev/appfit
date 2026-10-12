import { useState } from 'react'
import { SearchInput } from '../../../shared/components/Input'
import ListRow from '../../../shared/components/ListRow'
import { buscarLugares, type Lugar } from '../lib/lugares'

interface Props {
  lugares: readonly Lugar[]
  /** Nombre accesible del buscador («Buscar el lugar de salida»). */
  etiqueta: string
  placeholder?: string
  onElegir: (l: Lugar) => void
  /** Lugares que no se ofrecen (los ya elegidos). */
  excluir?: ReadonlySet<Lugar>
}

/** Buscador de pueblos: escribe y elige uno de los seis primeros (nombre y provincia). */
export default function BuscadorLugar({ lugares, etiqueta, placeholder = 'Pueblo o ciudad', onElegir, excluir }: Props) {
  const [texto, setTexto] = useState('')
  const resultados = buscarLugares(excluir?.size ? lugares.filter((l) => !excluir.has(l)) : lugares, texto)
  return (
    <div className="space-y-2">
      <SearchInput aria-label={etiqueta} placeholder={placeholder} value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" />
      {texto.trim() && (resultados.length === 0
        ? <p className="text-body-sm text-fg-muted">No hay ningún pueblo con ese nombre en la lista.</p>
        : <ul className="space-y-1" aria-label={`Resultados de ${etiqueta.toLowerCase()}`}>
          {resultados.map((l) => <li key={`${l.nombre}-${l.provincia}-${l.lat}`}>
            <ListRow tone="muted" onClick={() => { setTexto(''); onElegir(l) }}>
              <span className="min-w-0">
                <span className="block break-words text-body font-semibold text-fg">{l.nombre}</span>
                <span className="block break-words text-caption text-fg-muted">{l.provincia}</span>
              </span>
            </ListRow>
          </li>)}
        </ul>)}
    </div>
  )
}
