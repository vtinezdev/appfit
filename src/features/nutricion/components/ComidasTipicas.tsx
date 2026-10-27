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
import * as foodsRepo from '../data/foodsRepo'
import { claveRef, refDe } from '../../../shared/db/foodRef'
import { iconoDeCategoria } from '../lib/iconosCategoria'

interface Props {
  fecha: string
  onElegir: (tipica: ComidaTipica) => void
  onCrear: () => void
  enSelector?: boolean
  /** En el registro muestra dos accesos; la lista completa se abre aparte. */
  onVerTodas?: () => void
  /**
   * Tarjetas en una fila que se desliza, en lugar de la lista (Escribir): las kcal en grande, el nombre, los iconos de
   * sus alimentos y la barra del reparto de proteína, hidratos y grasa.
   */
  tarjetas?: boolean
}

/** Una misma colección para cualquier comida; el destino lo decide quien abre el selector. */
export default function ComidasTipicas({ fecha, onElegir, onCrear, enSelector = false, onVerTodas, tarjetas = false }: Props) {
  const tipicas = useLiveQuery(() => comidasTipicasRepo.listar(fecha), [fecha])
  const categorias = useLiveQuery(() => foodsRepo.categoriasDeEntradas((tipicas ?? []).flatMap(t => t.items)), [tipicas])
  const [ayuda, setAyuda] = useState(false)
  const visibles = tarjetas ? tipicas?.slice(0, 6) : onVerTodas ? tipicas?.slice(0, 2) : tipicas
  return <section aria-label="Tus comidas típicas" className="space-y-2">
    {!enSelector && <SectionHeader variant="section" action={tarjetas
      ? <span className="flex items-center">{onVerTodas && (tipicas?.length ?? 0) > 6 && <Button variant="subtle" size="sm" onClick={onVerTodas}>Ver todas</Button>}<IconButton icon="info" label="Cómo funcionan las comidas típicas" variant="ghost" onClick={() => setAyuda(true)} /></span>
      : onVerTodas && (tipicas?.length ?? 0) > 2 && <Button variant="subtle" size="sm" onClick={onVerTodas}>Ver todas<Icon name="chevron-right" size={16} /></Button>}>Tus comidas típicas</SectionHeader>}
    {tarjetas && tipicas && tipicas.length > 0 ? <ul className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
      {visibles?.map(tipica => {
        const total = sumMacros(tipica.items)
        const kcalMacros = total.prot * 4 + total.carb * 4 + total.grasa * 9
        const iconos = [...new Set(tipica.items.map((it) => { const r = refDe(it); return iconoDeCategoria(r ? categorias?.get(claveRef(r)) : undefined) ?? 'utensils' }))].slice(0, 4)
        return <li key={tipica.clave} className="w-44 shrink-0 snap-start">
          <button type="button" onClick={() => onElegir(tipica)} className="app-button flex h-full w-full flex-col gap-2 rounded-md border border-line bg-surface p-3 text-left enabled:hover:bg-surface-muted">
            <span className="tabular flex items-baseline gap-1"><span className="font-numeric text-heading text-fg">{formatInt(total.kcal)}</span><span className="text-caption text-fg-muted">kcal</span></span>
            <span className="line-clamp-2 break-words text-body-sm font-semibold text-fg">{tipica.nombre}</span>
            <span aria-hidden className="mt-auto flex gap-1">{iconos.map((ic) => <span key={ic} className="flex h-7 w-7 items-center justify-center rounded-sm bg-surface-muted text-fg-muted"><Icon name={ic} size={14} /></span>)}</span>
            {kcalMacros > 0 && <span aria-hidden className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-pill">
              <span className="bg-protein" style={{ width: `${(total.prot * 4 / kcalMacros) * 100}%` }} />
              <span className="bg-carbs" style={{ width: `${(total.carb * 4 / kcalMacros) * 100}%` }} />
              <span className="bg-fat" style={{ width: `${(total.grasa * 9 / kcalMacros) * 100}%` }} />
            </span>}
          </button>
        </li>
      })}
    </ul> : !tipicas ? <LoadingState>Cargando comidas típicas…</LoadingState> : tipicas.length === 0 ? <p className="text-body-sm text-fg-muted">Guarda un alimento o plato habitual para tenerlo aquí.</p> : <ul className="divide-y divide-line">
      {visibles?.map(tipica => {
        const ref = tipica.items.length === 1 ? refDe(tipica.items[0]) : undefined
        const icono = tipica.items.length > 1 ? 'cat-plato' : iconoDeCategoria(ref ? categorias?.get(claveRef(ref)) : undefined) ?? 'utensils'
        return <li key={tipica.clave}>
        <ListRow tone="flat" onClick={() => onElegir(tipica)}>
          <span aria-hidden className="icono-pastilla shrink-0 text-fg-muted"><Icon name={icono} size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 block break-words text-body font-semibold">{tipica.nombre}</span>
            <span className="block text-caption text-fg-muted">{formatInt(tipica.items.length)} {tipica.items.length === 1 ? 'alimento' : 'alimentos'} · {tipica.origen === 'marcada' ? 'Guardada' : `Sugerida · ${formatInt(tipica.dias)} días`} · {formatInt(sumMacros(tipica.items).kcal)} kcal</span>
          </span>
          <Icon name="chevron-right" size={18} className="shrink-0 text-fg-subtle" />
        </ListRow>
      </li>})}
    </ul>}
    {!tarjetas && <div className="flex flex-wrap items-center justify-between gap-1">
      <Button variant="subtle" size="sm" onClick={onCrear}><Icon name="plus" size={18} />Nueva comida típica</Button>
      <IconButton icon="info" label="Cómo funcionan las comidas típicas" variant="ghost" onClick={() => setAyuda(true)} />
    </div>}
    <Sheet open={ayuda} onClose={() => setAyuda(false)} title="Cómo funcionan las comidas típicas">
      <div className="space-y-stack text-body-sm text-fg-muted">
        <p>Guarda un alimento o un plato para tenerlo siempre a mano. Puedes usarlo en desayuno, comida, cena o snack.</p>
        <p>Las sugerencias aparecen cuando repites los mismos alimentos en {formatInt(DIAS_PARA_TIPICA)} días distintos de los últimos {formatInt(VENTANA_TIPICAS)}. Usan las últimas cantidades registradas.</p>
        <p>Al elegir una típica puedes revisar sus alimentos antes de añadirla. Para editar las guardadas, ve a Alimentos → Típicas.</p>
      </div>
    </Sheet>
  </section>
}
