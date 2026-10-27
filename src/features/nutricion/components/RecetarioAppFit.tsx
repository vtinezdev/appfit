import { useDeferredValue, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import { SearchInput } from '../../../shared/components/Input'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import { EmptyState, LoadingState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'
import * as catalogRepo from '../data/catalogRepo'
import { textoRaciones, textoTiempo } from '../lib/recetas'
import { filtrarRecetario } from '../lib/variantes'
import FichaReceta from './FichaReceta'

/** Cuántas se enseñan de golpe; «Ver más» añade otras tantas. */
const TANDA = 30

/**
 * Las recetas del catálogo de típicos (solo lectura) con buscador: primero las que ya tienen pasos. Tocar una abre su
 * ficha. Vienen con el catálogo, así que hasta que se descarga no hay ninguna.
 */
export default function RecetarioAppFit() {
  const platos = useLiveQuery(() => catalogRepo.recetario(), [])
  const [busqueda, setBusqueda] = useState('')
  const consulta = useDeferredValue(busqueda)
  const [visibles, setVisibles] = useState(TANDA)
  const [abierta, setAbierta] = useState<string | null>(null)

  if (platos === undefined) return <LoadingState>Cargando el recetario…</LoadingState>
  if (platos.length === 0) return <EmptyState icon="recetario" title="El recetario aún no está descargado">Llega con el catálogo de alimentos: se descarga solo al abrir la app con conexión, o desde Ajustes › Catálogo de alimentos.</EmptyState>

  const encontradas = filtrarRecetario(platos, consulta)
  const conPasos = platos.filter((p) => p.receta?.pasos?.length).length

  return (
    <div className="space-y-stack">
      <p className="text-body-sm text-fg-muted">{formatInt(platos.length)} recetas de cocina española y de diario; {formatInt(conPasos)} ya con los pasos escritos.</p>
      <SearchInput tone="surface" aria-label="Buscar en el recetario AppFit" placeholder="Buscar receta…" value={busqueda}
        onChange={(e) => { setBusqueda(e.target.value); setVisibles(TANDA) }} />
      {encontradas.length === 0
        ? <EmptyState>Ninguna receta del recetario se llama así.</EmptyState>
        : (
          <ListGroup aria-label="Recetario AppFit">
            {encontradas.slice(0, visibles).map((p) => {
              const r = p.receta!
              const kcal = r.raciones ? (p.kcal100 * r.pesoFinalG) / r.raciones / 100 : p.kcal100
              const detalles = [r.raciones ? textoRaciones(r.raciones) : null, r.tiempoMin ? textoTiempo(r.tiempoMin) : null, r.pasos?.length ? null : 'Sin pasos todavía'].filter(Boolean).join(' · ')
              return (
                <li key={p.id}>
                  <ListRow onClick={() => setAbierta(p.id)} className="flex-wrap">
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="break-words text-body font-medium text-fg">{p.nombre}</p>
                      {detalles && <p className="tabular text-caption text-fg-muted">{detalles}</p>}
                    </div>
                    <p className="tabular shrink-0 text-right text-fg"><span className="text-body font-semibold">{formatInt(kcal)}</span> <span className="text-caption text-fg-muted">{r.raciones ? 'kcal/ración' : 'kcal/100 g'}</span></p>
                  </ListRow>
                </li>
              )
            })}
          </ListGroup>
        )}
      {encontradas.length > visibles && (
        <Button variant="secondary" block onClick={() => setVisibles(visibles + TANDA)}>Ver más ({formatInt(encontradas.length - visibles)})</Button>
      )}
      {abierta !== null && <FichaReceta key={abierta} catalogId={abierta} onClose={() => setAbierta(null)} />}
    </div>
  )
}
