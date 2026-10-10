import { useState } from 'react'
import Button from '../../../shared/components/Button'
import ListGroup from '../../../shared/components/ListGroup'
import { EmptyState } from '../../../shared/components/StateMessage'
import { describirMarca, type MuroEjercicio } from '../lib/muro'

/** Ejercicios que se ven de entrada y en cada «Ver más». */
const POR_PAGINA = 15

/** Muro de récords: la mejor marca vigente de cada ejercicio y variante, de la más reciente a la más antigua. */
export default function RecordsVista({ muro, nombres }: { muro: MuroEjercicio[]; nombres: Readonly<Record<number, string>> }) {
  const [visibles, setVisibles] = useState(POR_PAGINA)
  if (muro.length === 0) return <EmptyState>Aún no hay marcas. Termina un entreno y aquí aparecerá lo mejor de cada ejercicio.</EmptyState>
  return <div className="space-y-stack">
    <ListGroup aria-label="Mejores marcas por ejercicio">
      {muro.slice(0, visibles).map((m) => <li key={`${m.exerciseId}-${m.modo}-${m.variante ?? ''}`} className="space-y-1 py-3">
        <p className="break-words text-body font-semibold text-fg">{nombres[m.exerciseId] ?? 'Ejercicio'}</p>
        {m.variante && <p className="break-words text-caption text-fg-muted">{m.variante}</p>}
        <ul className="space-y-0.5">
          {m.marcas.map((marca) => {
            const d = describirMarca(marca, m.modo)
            return <li key={marca.tipo} className="flex flex-wrap items-baseline justify-between gap-x-3 text-body-sm">
              <span className="text-fg-muted">{d.nombre} · <span className="tabular font-semibold text-fg">{d.valor}</span></span>
              <span className="tabular text-caption text-fg-muted">{d.fecha}</span>
            </li>
          })}
        </ul>
      </li>)}
    </ListGroup>
    {muro.length > visibles && <Button variant="subtle" block onClick={() => setVisibles((v) => v + POR_PAGINA)}>Ver más ejercicios</Button>}
    <p className="text-caption text-fg-muted">Solo series efectivas de entrenos terminados. Cada variante (ejecución, agarre, técnica) y tipo de carga tiene su propia marca; el 1RM es una estimación (Epley).</p>
  </div>
}
