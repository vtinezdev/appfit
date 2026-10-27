import { useId, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Comida } from '../../../shared/db/types'
import { todayISO } from '../../../shared/lib/dates'
import * as foodsRepo from '../data/foodsRepo'
import * as comidasTipicasRepo from '../data/comidasTipicasRepo'
import type { AlimentoElegible } from '../lib/alimentos'
import type { ComidaTipica } from '../lib/comidasTipicas'
import { hayMasTandas, MAX_IDEAS, MAX_SUELTOS, paraUnaPropuesta, proponer, tanda, type Falta, type Propuesta, type PropuestaItem } from '../lib/cerrarDia'
import { resumenMacros } from '../lib/nutrition'
import Badge from '../../../shared/components/Badge'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import ListRow from '../../../shared/components/ListRow'
import SectionHeader from '../../../shared/components/SectionHeader'
import { formatInt } from '../../../shared/lib/format'

interface Props {
  comida: Comida
  fecha: string
  /** Lo que falta del día en los cuatro macros; `null` sin objetivo. */
  falta: Falta | null
  /** Un solo alimento con la cantidad propuesta, editable en la hoja de gramos. */
  onElegirAlimento: (alimento: AlimentoElegible, gramos: number) => void
  /** Una combinación: se abre la revisión con sus alimentos y cantidades. */
  onElegirCombinacion: (items: PropuestaItem[]) => void
  onElegirTipica: (tipica: ComidaTipica) => void
}

/** «Te quedan 520 kcal. Faltan 35 g de proteína, 60 g de carbohidratos y 15 g de grasa.» Solo lo que falta. */
function frasePendiente(falta: Falta): string {
  const partes = ([['prot', 'proteína'], ['carb', 'carbohidratos'], ['grasa', 'grasa']] as const)
    .filter(([m]) => Math.round(falta[m]) > 0)
    .map(([m, nombre]) => `${formatInt(falta[m])} g de ${nombre}`)
  const lista = partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}` : partes[0]
  return `Te quedan ${formatInt(falta.kcal)} kcal.${lista ? ` Faltan ${lista}.` : ''}`
}

function Fila({ propuesta, onElegir }: { propuesta: Propuesta; onElegir: () => void }) {
  const titulo = propuesta.tipo === 'tipica' ? propuesta.tipica.nombre : propuesta.items.map((i) => i.alimento.nombre).join(' + ')
  const cantidad = propuesta.tipo === 'tipica'
    ? `${formatInt(propuesta.tipica.items.length)} ${propuesta.tipica.items.length === 1 ? 'alimento' : 'alimentos'}`
    : propuesta.items.map((i) => `${formatInt(i.gramos)} ${i.alimento.ml ? 'ml' : 'g'}`).join(' + ')
  return (
    <ListRow tone="flat" onClick={onElegir}>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-body font-medium">{titulo}</span>
        <span className="tabular mt-1 block text-caption text-fg-muted">{cantidad} · {resumenMacros(propuesta.aporte)} · {formatInt(propuesta.aporte.kcal)} kcal</span>
        {propuesta.tipo === 'tipica' && <Badge className="mt-1">Comida típica</Badge>}
        {propuesta.tipo === 'idea' && <Badge className="mt-1">Idea nueva</Badge>}
      </span>
      <Icon name="chevron-right" size={18} className="shrink-0 text-fg-subtle" />
    </ListRow>
  )
}

/**
 * «Cerrar el día» (B10), bajo Escribir: un botón que despliega propuestas que encajan con lo que falta en los cuatro
 * macros, cada una del tamaño de una comida (`paraUnaPropuesta`). Arriba, estables, tus comidas típicas y
 * combinaciones de tus frecuentes; debajo, otras ideas y alimentos sueltos, que cambian con «Sugerir otras». Solo sale
 * si hay hueco (`hayHueco`) y alguna propuesta.
 */
export default function EncajanConLoQueFalta({ comida, fecha, falta, onElegirAlimento, onElegirCombinacion, onElegirTipica }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [vuelta, setVuelta] = useState(0)
  const listaId = useId()
  const hoy = todayISO()
  const datos = useLiveQuery(() => foodsRepo.paraCerrarDia({ comida, hoy }), [comida, hoy])
  const tipicas = useLiveQuery(() => comidasTipicasRepo.listar(fecha), [fecha])
  if (!falta || !datos || !tipicas) return null
  const propuestas = proponer({ falta, comida, tipicas, frecuentes: datos.frecuentes, ideas: datos.ideas })
  const limite = paraUnaPropuesta(falta, comida).kcal
  const otras = [...tanda(propuestas.ideas, MAX_IDEAS, vuelta), ...tanda(propuestas.sueltos, MAX_SUELTOS, vuelta)]
  if (propuestas.fijas.length === 0 && otras.length === 0) return null

  const elegir = (p: Propuesta) => {
    if (p.tipo === 'tipica') onElegirTipica(p.tipica)
    else if (p.items.length === 1) onElegirAlimento(p.items[0].alimento, p.items[0].gramos)
    else onElegirCombinacion(p.items)
  }

  return (
    <section aria-label="Encajan con lo que te falta" className="space-y-2">
      <button type="button" aria-expanded={abierto} aria-controls={listaId} onClick={() => setAbierto((v) => !v)}
        className="app-button flex min-h-touch w-full items-center gap-3 rounded-md border border-line bg-surface p-3 text-left enabled:hover:bg-surface-muted">
        <span aria-hidden className="icono-pastilla shrink-0 text-accent-strong"><Icon name="flag" size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold text-fg">Encajan con lo que te falta</span>
          <span className="tabular block text-caption text-fg-muted">Ideas para {formatInt(Math.round(falta.kcal))} kcal que te quedan</span>
        </span>
        <Icon name={abierto ? 'chevron-up' : 'chevron-down'} size={18} className="shrink-0 text-fg-subtle" />
      </button>
      {abierto && <div id={listaId} className="space-y-stack">
        <p className="tabular text-body-sm text-fg-muted">{frasePendiente(falta)} {limite < falta.kcal ? `Cada propuesta, hasta ${formatInt(limite)} kcal, para que te quede para el resto del día.` : 'Sin pasarte de las kcal, los carbohidratos ni la grasa que te quedan.'}</p>
        {propuestas.fijas.length > 0 && <div className="space-y-1">
          <SectionHeader>Con lo que sueles comer</SectionHeader>
          <ul className="divide-y divide-line" aria-label="Con lo que sueles comer">
            {propuestas.fijas.map((p) => <li key={p.clave}><Fila propuesta={p} onElegir={() => elegir(p)} /></li>)}
          </ul>
        </div>}
        {otras.length > 0 && <div className="space-y-1">
          <SectionHeader action={hayMasTandas(propuestas) && <Button variant="subtle" size="sm" onClick={() => setVuelta((v) => v + 1)}><Icon name="sparkles" size={16} />Sugerir otras</Button>}>
            Otras opciones
          </SectionHeader>
          <ul className="divide-y divide-line" aria-label="Otras opciones" aria-live="polite">
            {otras.map((p) => <li key={p.clave}><Fila propuesta={p} onElegir={() => elegir(p)} /></li>)}
          </ul>
        </div>}
      </div>}
    </section>
  )
}
