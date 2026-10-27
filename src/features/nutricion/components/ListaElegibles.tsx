import PreparacionAlimento from './PreparacionAlimento'
import { claveRef } from '../../../shared/db/foodRef'
import Icon from '../../../shared/components/Icon'
import ListRow from '../../../shared/components/ListRow'
import { formatInt } from '../../../shared/lib/format'
import { kcalPorRacion, type AlimentoElegible } from '../lib/alimentos'
import { textoRaciones } from '../lib/recetas'
import IconoCategoria from './IconoCategoria'

interface Props {
  alimentos: AlimentoElegible[]
  onElegir: (alimento: AlimentoElegible) => void
}

/** «Receta · Tuya · 6 raciones» o «Receta · AppFit». */
function lineaReceta(a: AlimentoElegible): string {
  const r = a.receta!
  return ['Receta', r.origen === 'tuya' ? 'Tuya' : 'AppFit', ...(r.raciones !== undefined ? [textoRaciones(r.raciones)] : [])].join(' · ')
}

/**
 * Lista plana con hairlines, como las comidas de Hoy. La categoría, como icono a la izquierda (su nombre, al pulsarlo); la marca, debajo.
 * Una receta lleva el icono de recetario, dice que es una receta y da sus kcal por ración (por 100 g si aún no tiene raciones).
 */
export default function ListaElegibles({ alimentos, onElegir }: Props) {
  return (
    <ul className="animate-fade-in divide-y divide-line">
      {alimentos.map((a) => {
        const porRacion = kcalPorRacion(a)
        return (
          <li key={claveRef(a.ref)} className="flex items-center gap-1">
            {a.receta
              ? <span aria-hidden className="grid h-touch w-touch shrink-0 place-items-center text-fg-muted"><Icon name="recetario" size={20} /></span>
              : <IconoCategoria categoria={a.categoria} sinCategoria="hueco" />}
            <ListRow tone="flat" onClick={() => onElegir(a)} className="min-w-0 flex-1 items-start">
              <span className="min-w-0 flex-1">
                <span className="block break-words text-body font-medium">{a.nombre}</span>
                {a.receta && <span className="mt-1 block text-caption font-medium text-fg-muted">{lineaReceta(a)}</span>}
                {!a.receta && <PreparacionAlimento nombre={a.nombre} />}
                <span className="tabular mt-1 block text-caption text-fg-muted">
                  {porRacion !== null ? `${formatInt(porRacion)} kcal por ración` : `${formatInt(a.kcal100)} kcal por 100 ${a.ml ? 'ml' : 'g'}`}
                </span>
                {a.detalle && <span className="block truncate text-caption text-fg-subtle">{a.detalle}</span>}
              </span>
            </ListRow>
          </li>
        )
      })}
    </ul>
  )
}
