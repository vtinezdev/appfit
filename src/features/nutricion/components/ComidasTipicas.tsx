import { useLiveQuery } from 'dexie-react-hooks'
import type { Comida } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import SectionHeader from '../../../shared/components/SectionHeader'
import ListRow from '../../../shared/components/ListRow'
import { LoadingState } from '../../../shared/components/StateMessage'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import * as comidasTipicasRepo from '../data/comidasTipicasRepo'
import { DIAS_PARA_TIPICA, VENTANA_TIPICAS, type ComidaTipica } from '../lib/comidasTipicas'
import { sumMacros } from '../lib/nutrition'

interface Props {
  comida: Comida
  fecha: string
  onElegir: (tipica: ComidaTipica) => void
  onCrear: () => void
  enSelector?: boolean
}

export default function ComidasTipicas({ comida, fecha, onElegir, onCrear, enSelector = false }: Props) {
  const tipicas = useLiveQuery(() => comidasTipicasRepo.listar(comida, fecha), [comida, fecha])
  return <section aria-label="Tus comidas típicas" className={`space-y-stack ${enSelector ? '' : 'border-t border-line pt-4'}`}>
    <div className="space-y-1">
      {!enSelector && <SectionHeader variant="section">Tus comidas típicas</SectionHeader>}
      <p className="text-body-sm text-fg-muted">Tus alimentos y platos guardados, junto a los que repites en {formatInt(DIAS_PARA_TIPICA)} días de los últimos {formatInt(VENTANA_TIPICAS)}.</p>
    </div>
    <Button variant="secondary" block onClick={onCrear}><Icon name="plus" size={18} />Nueva comida típica</Button>
    {!tipicas ? <LoadingState>Cargando comidas típicas…</LoadingState> : tipicas.length === 0 ? <p className="text-body-sm text-fg-muted">Añade un alimento o un plato que suelas comer para tenerlo siempre a mano. También puedes marcar una comida al registrarla.</p> : <ul className="divide-y divide-line">
      {tipicas.map(tipica => <li key={tipica.clave}>
        <ListRow tone="flat" className="flex-wrap" onClick={() => onElegir(tipica)}>
          <span className="min-w-0 flex-1 basis-28">
            <span className="line-clamp-2 block break-words text-body font-medium">{tipica.nombre}</span>
            <span className="line-clamp-2 block text-caption text-fg-muted">{tipica.items.map(it => it.nombre).join(' · ')}</span>
            <span className="block text-caption text-fg-subtle">{tipica.origen === 'marcada' ? 'Guardada por ti' : `Repetida en ${formatInt(tipica.dias)} días · últimas cantidades`}</span>
          </span>
          <span className="tabular shrink-0 text-body-sm text-fg">{formatInt(sumMacros(tipica.items).kcal)} <span className="text-caption text-fg-muted">kcal</span></span>
        </ListRow>
      </li>)}
    </ul>}
  </section>
}
