import { useLiveQuery } from 'dexie-react-hooks'
import Disclosure from '../../../shared/components/Disclosure'
import ListGroup from '../../../shared/components/ListGroup'
import SectionHeader from '../../../shared/components/SectionHeader'
import type { Entry } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import * as foodsRepo from '../data/foodsRepo'
import Icon from '../../../shared/components/Icon'
import { iconoDeCategoria } from '../lib/iconosCategoria'
import { repartoPorCategoria, type RepartoCategoria } from '../lib/repartoCategorias'

interface Props {
  entries: Entry[]
}

/** Categorías que se ven sin desplegar; el resto, en «Ver N más». */
const VISIBLES = 5

/** Aquí el nombre se ve siempre: la lista es la leyenda de los iconos. */
function Fila({ r }: { r: RepartoCategoria }) {
  const icono = iconoDeCategoria(r.categoria ?? undefined)
  return <li className="flex min-h-touch items-center justify-between gap-3 py-2">
    <span className={`flex min-w-0 items-center gap-3 text-body ${r.categoria === null ? 'text-fg-muted' : 'text-fg'}`}>
      {icono ? <Icon name={icono} size={20} className="text-fg-muted" /> : <span aria-hidden className="w-5 shrink-0" />}
      <span className="min-w-0 break-words">{r.categoria ?? 'Sin categoría'}</span>
    </span>
    <span className="shrink-0 text-right">
      <span className="tabular block text-body font-semibold text-fg">{formatInt(r.kcal)} <span className="text-caption font-normal text-fg-muted">kcal</span></span>
      <span className="tabular block text-caption text-fg-muted">{formatInt(r.fraccion * 100)} % · P {formatInt(r.prot)} g</span>
    </span>
  </li>
}

/** Reparto de las kcal (y la proteína) del periodo del Resumen por categoría de alimento. */
export default function CategoriasResumen({ entries }: Props) {
  const categorias = useLiveQuery(() => foodsRepo.categoriasDeEntradas(entries), [entries])
  if (!categorias) return null
  const reparto = repartoPorCategoria(entries, categorias)
  if (reparto.length === 0) return null
  const visibles = reparto.slice(0, VISIBLES)
  const resto = reparto.slice(VISIBLES)

  return <section aria-label="Por categoría" className="space-y-3">
    <SectionHeader variant="section">Por categoría</SectionHeader>
    <ListGroup variante="plana" aria-label="Calorías por categoría">
      {visibles.map((r) => <Fila key={r.categoria ?? 'sin'} r={r} />)}
    </ListGroup>
    {resto.length > 0 && (
      <Disclosure title={`Ver ${formatInt(resto.length)} más`}>
        <ListGroup variante="plana" aria-label="Resto de categorías">
          {resto.map((r) => <Fila key={r.categoria ?? 'sin'} r={r} />)}
        </ListGroup>
      </Disclosure>
    )}
    <p className="text-caption text-fg-muted">Suma del periodo, según la categoría actual de cada alimento. «Sin categoría» reúne las kcal rápidas, los alimentos borrados y los que aún no tienen categoría.</p>
  </section>
}
