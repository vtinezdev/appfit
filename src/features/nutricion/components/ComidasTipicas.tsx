import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { formatInt } from '../../../shared/lib/format'
import SectionHeader from '../../../shared/components/SectionHeader'
import ListRow from '../../../shared/components/ListRow'
import Sheet from '../../../shared/components/Sheet'
import { LoadingState } from '../../../shared/components/StateMessage'
import Button, { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import * as comidasTipicasRepo from '../data/comidasTipicasRepo'
import { DIAS_PARA_TIPICA, VENTANA_TIPICAS, type ComidaTipica } from '../lib/comidasTipicas'
import { sumMacros } from '../lib/nutrition'

interface Props {
  fecha: string
  onElegir: (tipica: ComidaTipica) => void
  onCrear: () => void
  enSelector?: boolean
  /** En el registro muestra dos accesos; la lista completa se abre aparte. */
  onVerTodas?: () => void
}

/** Una misma colección para cualquier comida; el destino lo decide quien abre el selector. */
export default function ComidasTipicas({ fecha, onElegir, onCrear, enSelector = false, onVerTodas }: Props) {
  const tipicas = useLiveQuery(() => comidasTipicasRepo.listar(fecha), [fecha])
  const [ayuda, setAyuda] = useState(false)
  const visibles = onVerTodas ? tipicas?.slice(0, 2) : tipicas
  return <section aria-label="Tus comidas típicas" className="space-y-2">
    {!enSelector && <SectionHeader variant="section" action={onVerTodas && (tipicas?.length ?? 0) > 2 && <Button variant="subtle" size="sm" onClick={onVerTodas}>Ver todas<Icon name="chevron-right" size={16} /></Button>}>Tus comidas típicas</SectionHeader>}
    {!tipicas ? <LoadingState>Cargando comidas típicas…</LoadingState> : tipicas.length === 0 ? <p className="text-body-sm text-fg-muted">Guarda un alimento o plato habitual para tenerlo aquí.</p> : <ul className="divide-y divide-line">
      {visibles?.map(tipica => <li key={tipica.clave}>
        <ListRow tone="flat" onClick={() => onElegir(tipica)}>
          <span aria-hidden className="icono-pastilla shrink-0 text-fg-muted"><Icon name="utensils" size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 block break-words text-body font-semibold">{tipica.nombre}</span>
            <span className="block text-caption text-fg-muted">{tipica.origen === 'marcada' ? 'Guardada' : `Sugerida · ${formatInt(tipica.dias)} días`} · {formatInt(sumMacros(tipica.items).kcal)} kcal</span>
          </span>
          <Icon name="chevron-right" size={18} className="shrink-0 text-fg-subtle" />
        </ListRow>
      </li>)}
    </ul>}
    <div className="flex flex-wrap items-center justify-between gap-1">
      <Button variant="subtle" size="sm" onClick={onCrear}><Icon name="plus" size={18} />Nueva comida típica</Button>
      <IconButton icon="info" label="Cómo funcionan las comidas típicas" variant="ghost" onClick={() => setAyuda(true)} />
    </div>
    <Sheet open={ayuda} onClose={() => setAyuda(false)} title="Cómo funcionan las comidas típicas">
      <div className="space-y-stack text-body-sm text-fg-muted">
        <p>Guarda un alimento o un plato para tenerlo siempre a mano. Puedes usarlo en desayuno, comida, cena o snack.</p>
        <p>Las sugerencias aparecen cuando repites los mismos alimentos en {formatInt(DIAS_PARA_TIPICA)} días distintos de los últimos {formatInt(VENTANA_TIPICAS)}. Usan las últimas cantidades registradas.</p>
        <p>Al elegir una típica puedes revisar sus alimentos antes de añadirla. Para editar las guardadas, ve a Alimentos → Típicas.</p>
      </div>
    </Sheet>
  </section>
}
