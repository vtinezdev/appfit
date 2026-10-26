import { useId, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Comida } from '../../../shared/db/types'
import { todayISO } from '../../../shared/lib/dates'
import * as foodsRepo from '../data/foodsRepo'
import { encajanConLoQueFalta, type AlimentoElegible } from '../lib/alimentos'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import ListRow from '../../../shared/components/ListRow'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { claveRef } from '../../../shared/db/foodRef'

interface Props {
  comida: Comida
  /** Lo que falta del día (proteína y kcal); `null` sin objetivo. */
  falta: { prot: number; kcal: number } | null
  /** Elegir un habitual con la cantidad propuesta, editable en la hoja de gramos. */
  onElegir: (alimento: AlimentoElegible, gramos: number) => void
}

/**
 * «Cerrar el día» (B10), bajo Escribir: un botón que despliega tus frecuentes de esa comida con la cantidad que más se
 * acerca a la proteína que falta sin pasar de las kcal que quedan. Solo sale si falta proteína (10 g o más), quedan
 * kcal y algún habitual encaja.
 */
export default function EncajanConLoQueFalta({ comida, falta, onElegir }: Props) {
  const [abierto, setAbierto] = useState(false)
  const listaId = useId()
  const hoy = todayISO()
  const frecuentes = useLiveQuery(() => foodsRepo.frecuentes({ comida, hoy }), [comida, hoy])
  const encajes = falta && frecuentes ? encajanConLoQueFalta(frecuentes, falta) : []
  if (!falta || encajes.length === 0) return null

  return (
    <section aria-label="Encajan con lo que te falta" className="space-y-2">
      <Button variant={abierto ? 'primary' : 'secondary'} size="sm" aria-expanded={abierto} aria-controls={listaId} onClick={() => setAbierto((v) => !v)}>
        <Icon name="flag" size={16} />Encajan con lo que te falta
      </Button>
      {abierto && <div id={listaId} className="space-y-1">
        <p className="tabular text-body-sm text-fg-muted">Te faltan {formatInt(falta.prot)} g de proteína y quedan {formatInt(falta.kcal)} kcal. Tus habituales, con la cantidad que más se acerca sin pasarte de las kcal.</p>
        <ul className="divide-y divide-line" aria-label="Alimentos que encajan">
          {encajes.map((e) => <li key={claveRef(e.alimento.ref)}>
            <ListRow tone="flat" onClick={() => onElegir(e.alimento, e.gramos)}>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-body font-medium">{e.alimento.nombre}</span>
                <span className="tabular mt-1 block text-caption text-fg-muted">{formatInt(e.gramos)} {e.alimento.ml ? 'ml' : 'g'} · {formatNumber(e.prot, 0)} g de proteína · {formatInt(e.kcal)} kcal</span>
              </span>
              <Icon name="chevron-right" size={18} className="shrink-0 text-fg-subtle" />
            </ListRow>
          </li>)}
        </ul>
      </div>}
    </section>
  )
}
