import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import { EmptyState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'
import * as recetasRepo from '../data/recetasRepo'
import { por100DeReceta, valoresPorRacion } from '../lib/recetas'
import DatosReceta from './DatosReceta'
import EditorReceta from './EditorReceta'
import FichaReceta from './FichaReceta'

interface Props {
  /** Quien crea la receta está fuera (el «+» de la cabecera de Recetas): la lista no pone su botón «Nueva receta». */
  sinBotonNueva?: boolean
  /** Estado vacío propio; sin él, uno genérico. */
  vacio?: ReactNode
}

/**
 * Las recetas de la persona: tocar una abre su ficha de lectura; «Nueva receta», el editor. Se usa en el destino
 * Recetas y en Alimentos › Recetas.
 */
export default function ListaRecetas({ sinBotonNueva = false, vacio }: Props) {
  const recetas = useLiveQuery(() => recetasRepo.listar(), [])
  const [abierta, setAbierta] = useState<number | null>(null)
  const [creando, setCreando] = useState(false)

  return (
    <div className="space-y-stack">
      {!sinBotonNueva && <Button variant="secondary" block onClick={() => setCreando(true)}><Icon name="plus" size={18} />Nueva receta</Button>}
      {recetas?.length === 0 && (vacio ?? <EmptyState icon="recetario" title="Aún no tienes recetas">Guarda tus platos y regístralos por raciones.</EmptyState>)}
      {recetas && recetas.length > 0 && (
        <ListGroup aria-label="Tus recetas">
          {recetas.map((r) => {
            // Las recetas sin raciones (anteriores a la preparación) siguen mostrando su valor por 100 g.
            const conRaciones = r.raciones !== undefined
            const kcal = conRaciones ? valoresPorRacion(r).kcal : por100DeReceta(r.ingredientes, r.pesoCocinadoG).kcal100
            return (
              <li key={r.id}>
                <ListRow onClick={() => setAbierta(r.id)} className="flex-wrap">
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="break-words text-body font-medium text-fg">{r.nombre}</p>
                    <DatosReceta raciones={r.raciones} tiempoMin={r.tiempoMin} pesoG={conRaciones ? undefined : r.pesoCocinadoG} />
                  </div>
                  <p className="tabular shrink-0 text-right text-fg"><span className="text-body font-semibold">{formatInt(kcal)}</span> <span className="text-caption text-fg-muted">{conRaciones ? 'kcal/rac.' : 'kcal/100 g'}</span></p>
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
