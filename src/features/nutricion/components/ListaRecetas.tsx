import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import { EmptyState } from '../../../shared/components/StateMessage'
import * as recetasRepo from '../data/recetasRepo'
import { por100DeReceta, valoresPorRacion } from '../lib/recetas'
import EditorReceta from './EditorReceta'
import FichaReceta from './FichaReceta'
import FilaReceta from './FilaReceta'

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
  const recetas = useLiveQuery(() => recetasRepo.listarConCategoria(), [])
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
            const p = por100DeReceta(r.ingredientes, r.pesoCocinadoG)
            const aporte = conRaciones ? valoresPorRacion(r) : { kcal: p.kcal100, prot: p.prot100, carb: p.carb100, grasa: p.grasa100 }
            return <li key={r.id}><FilaReceta nombre={r.nombre} categoria={r.categoria} aporte={aporte} porRacion={conRaciones} raciones={r.raciones} tiempoMin={r.tiempoMin}
              pesoG={conRaciones ? undefined : r.pesoCocinadoG} onClick={() => setAbierta(r.id)} /></li>
          })}
        </ListGroup>
      )}
      {abierta !== null && <FichaReceta key={abierta} recetaId={abierta} onClose={() => setAbierta(null)} />}
      {creando && <EditorReceta onClose={() => setCreando(false)} />}
    </div>
  )
}
