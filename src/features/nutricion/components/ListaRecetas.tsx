import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import { formatInt } from '../../../shared/lib/format'
import * as recetasRepo from '../data/recetasRepo'
import { por100DeReceta, textoRaciones, textoTiempo, valoresPorRacion } from '../lib/recetas'
import EditorReceta from './EditorReceta'
import FichaReceta from './FichaReceta'

/**
 * Las recetas de la persona: tocar una abre su ficha de lectura; «Nueva receta», el editor. Se usa en el destino
 * Recetas y en Alimentos › Recetas.
 */
export default function ListaRecetas() {
  const recetas = useLiveQuery(() => recetasRepo.listar(), [])
  const [abierta, setAbierta] = useState<number | null>(null)
  const [creando, setCreando] = useState(false)

  return (
    <div className="space-y-stack">
      <Button variant="secondary" block onClick={() => setCreando(true)}><Icon name="plus" size={18} />Nueva receta</Button>
      {recetas?.length === 0 && <p className="text-body-sm text-fg-muted">Aún no has creado ninguna. Una receta tuya guarda sus ingredientes, su peso cocinado y cómo se prepara, y se registra como un alimento con sus valores por ración.</p>}
      {recetas && recetas.length > 0 && (
        <ListGroup aria-label="Tus recetas">
          {recetas.map((r) => {
            // Las recetas sin raciones (anteriores a la preparación) siguen mostrando su valor por 100 g.
            const conRaciones = r.raciones !== undefined
            const kcal = conRaciones ? valoresPorRacion(r).kcal : por100DeReceta(r.ingredientes, r.pesoCocinadoG).kcal100
            const detalles = [conRaciones ? textoRaciones(r.raciones!) : `${formatInt(r.pesoCocinadoG)} g cocinados`, r.tiempoMin ? textoTiempo(r.tiempoMin) : null, `${r.ingredientes.length} ingrediente${r.ingredientes.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')
            return (
              <li key={r.id}>
                <ListRow onClick={() => setAbierta(r.id)} className="flex-wrap">
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="break-words text-body font-medium text-fg">{r.nombre}</p>
                    <p className="tabular text-caption text-fg-muted">{detalles}</p>
                  </div>
                  <p className="tabular shrink-0 text-right text-fg"><span className="text-body font-semibold">{formatInt(kcal)}</span> <span className="text-caption text-fg-muted">{conRaciones ? 'kcal/ración' : 'kcal/100 g'}</span></p>
                </ListRow>
              </li>
            )
          })}
        </ListGroup>
      )}
      {abierta !== null && <FichaReceta key={abierta} recetaId={abierta} onClose={() => setAbierta(null)} />}
      {creando && <EditorReceta onClose={() => setCreando(false)} />}
    </div>
  )
}
