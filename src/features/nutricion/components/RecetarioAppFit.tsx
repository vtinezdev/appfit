import { useDeferredValue, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import { SearchInput } from '../../../shared/components/Input'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import { EmptyState, LoadingState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'
import * as catalogRepo from '../data/catalogRepo'
import { filtrarRecetario } from '../lib/variantes'
import DatosReceta from './DatosReceta'
import FichaReceta from './FichaReceta'

/** Cuántas se enseñan de golpe; «Ver más» añade otras tantas. */
const TANDA = 30

type Filtro = 'todas' | 'pasos'
const FILTROS: { valor: Filtro; label: string }[] = [{ valor: 'todas', label: 'Todas' }, { valor: 'pasos', label: 'Con pasos' }]

/**
 * Las recetas del catálogo de típicos (solo lectura) con buscador: primero las que ya tienen pasos, o solo esas con
 * «Con pasos». Tocar una abre su ficha. Vienen con el catálogo, así que hasta que se descarga no hay ninguna.
 */
export default function RecetarioAppFit() {
  const platos = useLiveQuery(() => catalogRepo.recetario(), [])
  const [busqueda, setBusqueda] = useState('')
  const consulta = useDeferredValue(busqueda)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [visibles, setVisibles] = useState(TANDA)
  const [abierta, setAbierta] = useState<string | null>(null)

  if (platos === undefined) return <LoadingState>Cargando el recetario…</LoadingState>
  if (platos.length === 0) return <EmptyState icon="recetario" title="El recetario aún no está descargado">Llega con el catálogo de alimentos: se descarga solo al abrir la app con conexión, o desde Ajustes › Catálogo de alimentos.</EmptyState>

  const encontradas = filtrarRecetario(platos, consulta).filter((p) => filtro === 'todas' || p.receta?.pasos?.length)

  return (
    <div className="space-y-stack">
      <SearchInput tone="surface" aria-label="Buscar en el recetario AppFit" placeholder={`Buscar entre ${formatInt(platos.length)} recetas…`} value={busqueda}
        onChange={(e) => { setBusqueda(e.target.value); setVisibles(TANDA) }} />
      <SegmentedControl label="Qué recetas enseñar" opciones={FILTROS} valor={filtro} onChange={(f) => { setFiltro(f); setVisibles(TANDA) }} />
      {encontradas.length === 0
        ? <EmptyState>{consulta.trim() ? 'Ninguna receta del recetario se llama así.' : 'Aún no hay recetas con los pasos escritos.'}</EmptyState>
        : (
          <ListGroup aria-label="Recetario AppFit">
            {encontradas.slice(0, visibles).map((p) => {
              const r = p.receta!
              const kcal = r.raciones ? (p.kcal100 * r.pesoFinalG) / r.raciones / 100 : p.kcal100
              return (
                <li key={p.id}>
                  <ListRow onClick={() => setAbierta(p.id)} className="flex-wrap">
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="break-words text-body font-medium text-fg">{p.nombre}</p>
                      <DatosReceta raciones={r.raciones} tiempoMin={r.tiempoMin} />
                    </div>
                    <p className="tabular shrink-0 text-right text-fg"><span className="text-body font-semibold">{formatInt(kcal)}</span> <span className="text-caption text-fg-muted">{r.raciones ? 'kcal/rac.' : 'kcal/100 g'}</span></p>
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
