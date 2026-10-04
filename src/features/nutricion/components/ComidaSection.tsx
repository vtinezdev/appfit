import { useId, useState } from 'react'
import Button, { IconButton } from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import type { Comida, Entry } from '../../../shared/db/types'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { resumenMacros, sumMacros } from '../lib/nutrition'
import { nombreVisible } from '../lib/nombresCortos'
import { agruparPlatos, type Plato } from '../lib/platos'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useListMotion } from '../../../shared/hooks/useListMotion'

interface Props {
  comida: Comida
  titulo: string
  entries: Entry[]
  onAcciones: () => void
  onEditar: (entry: Entry) => void
  onBorrar: (entry: Entry) => void
  onBorrarPlato: (plato: Plato) => void
  onEditarPlato: (plato: Plato) => void
  onAccionesPlato: (plato: Plato) => void
  onMoverPlato: (plato: Plato) => void
  moviendo: boolean
  /** «Añadir a desayuno»: abre Añadir comida con esta comida preseleccionada. */
  onAnadir: () => void
  /** Entradas de esa misma comida el día anterior: si hay, se ofrece repetirlas. */
  disponiblesAyer: number
  onRepetir: () => void
  /** Hay una repetición en curso: bloquea los botones de repetir. */
  ocupado: boolean
  /** Esta comida es la que se está repitiendo (cambia el texto del botón). */
  repitiendo: boolean
  nombresCortos: ReadonlyMap<string, string>
}

/** «Kcal rápidas» (A5) no tiene gramos: se muestra solo con los macros que se hayan indicado. */
function detalleEntry(e: Entry): string {
  if (!e.rapida) {
    return `${formatNumber(e.gramos, 1)} g`
  }
  const macros = ([
    ['P', e.prot],
    ['C', e.carb],
    ['G', e.grasa],
  ] as const)
    .filter(([, valor]) => valor > 0)
    .map(([letra, valor]) => `${letra}${formatInt(valor)}`)
    .join(' ')
  return `${macros ? `${macros} · ` : ''}rápida`
}

function FilaEntrada({ entry: e, nombreCorto, onEditar, onBorrar }: { entry: Entry; nombreCorto: string } & Pick<Props, 'onEditar' | 'onBorrar'>) {
  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onEditar(e)}
        className="-mx-2 flex min-h-touch min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-left transition-colors duration-short hover:bg-surface-muted active:bg-surface-muted"
      >
        <span className="min-w-0 flex-1">
          <span className="block break-words text-body font-medium text-fg" title={e.nombre}>{nombreCorto}</span>
          <span className="tabular block text-caption text-fg-muted">{detalleEntry(e)}</span>
        </span>
        <span className="tabular shrink-0 text-body font-semibold text-fg">
          {e.rapida ? '≈ ' : ''}
          {formatInt(e.kcal)}
        </span>
      </button>
      <IconButton icon="trash" label={`Borrar ${e.nombre}`} variant="ghost" size="sm" onClick={() => onBorrar(e)} />
    </li>
  )
}

function FilaPlato({ plato, nombresCortos, onEditar, onBorrar, onBorrarPlato, onEditarPlato, onAccionesPlato, onMoverPlato, moviendo }: { plato: Plato; nombresCortos: ReadonlyMap<string, string> } & Pick<Props, 'onEditar' | 'onBorrar' | 'onBorrarPlato' | 'onEditarPlato' | 'onAccionesPlato' | 'onMoverPlato' | 'moviendo'>) {
  const [abierto, setAbierto] = useState(false)
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: plato.clave, data: { plato }, disabled: moviendo })
  const detalleId = useId()
  const totales = sumMacros(plato.entries)
  return (
    <li ref={setNodeRef} data-motion-id={plato.clave} data-plato-id={plato.entries[0].platoId} className={isDragging ? 'opacity-40' : ''}>
      <Card padded={false} className="overflow-hidden">
        <div className="flex items-center gap-1 px-3 py-1">
          <button
            type="button"
            aria-expanded={abierto}
            aria-controls={detalleId}
            onClick={() => setAbierto(!abierto)}
            className="-mx-2 flex min-h-touch min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-3 text-left transition-colors duration-short hover:bg-surface-muted active:bg-surface-muted"
          >
            <Icon name="chevron-right" size={16} className={`text-fg-muted transition-transform duration-short ${abierto ? 'rotate-90' : ''}`} />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 block text-body font-semibold text-fg" title={plato.nombre}>{plato.nombre}</span>
              <span className="block text-caption text-fg-muted">
                {formatInt(plato.entries.length)} {plato.entries.length === 1 ? 'alimento' : 'alimentos'} · {abierto ? 'Ocultar ingredientes' : 'Ver ingredientes'}
              </span>
              <span className="tabular block text-caption text-fg-muted">{resumenMacros(totales)}</span>
            </span>
            <span className="tabular shrink-0 text-body font-semibold text-fg">
              {plato.entries.some((e) => e.rapida) ? '≈ ' : ''}
              {formatInt(totales.kcal)}
            </span>
          </button>
          <IconButton icon="trash" label={`Borrar plato ${plato.nombre}`} variant="ghost" size="sm" onClick={() => onBorrarPlato(plato)} />
        </div>
        <ul id={detalleId} hidden={!abierto} aria-label={`Ingredientes de ${plato.nombre}`} className="divide-y divide-line border-t border-line bg-surface px-3 py-2">
          {plato.entries.map((e) => (
            <FilaEntrada key={e.id} entry={e} nombreCorto={nombreVisible(e, nombresCortos)} onEditar={onEditar} onBorrar={onBorrar} />
          ))}
        </ul>
        <div className="flex flex-wrap gap-1 border-t border-line px-3 py-1">
          <Button variant="ghost" size="sm" aria-label={`Añadir ingredientes a ${plato.nombre}`} onClick={() => onEditarPlato(plato)} disabled={moviendo}>
            <Icon name="plus" size={16} />
            Añadir ingredientes
          </Button>
          <div className="flex items-center">
            <Button variant="ghost" size="sm" data-mover-plato={plato.entries[0].platoId} aria-label={`Mover plato ${plato.nombre}`} disabled={moviendo} onClick={() => onMoverPlato(plato)}>
              <Icon name="move" size={16} />Mover
            </Button>
            <IconButton ref={setActivatorNodeRef} {...attributes} {...listeners} icon="grip" variant="ghost"
              label={`Arrastrar plato ${plato.nombre}`} className="touch-none cursor-grab active:cursor-grabbing" disabled={moviendo} />
          </div>
          <Button variant="ghost" size="sm" aria-label={`Copiar plato ${plato.nombre}`} onClick={() => onAccionesPlato(plato)}>
            <Icon name="copy" size={16} />
            Copiar plato
          </Button>
        </div>
      </Card>
    </li>
  )
}

/** Sección por comida; cada guardado múltiple tiene su propio bloque desplegable, sin duplicar macros. */
export default function ComidaSection({ comida, titulo, entries, nombresCortos, onAcciones, onEditar, onBorrar, onBorrarPlato, onEditarPlato, onAccionesPlato, onMoverPlato, moviendo, onAnadir, disponiblesAyer, onRepetir, ocupado, repitiendo }: Props) {
  const { setNodeRef, isOver, active } = useDroppable({ id: `comida:${comida}`, data: { comida }, disabled: moviendo })
  const listRef = useListMotion<HTMLUListElement>(entries.map(e => e.id).join(','))
  const recibe = isOver && active?.data.current?.plato?.entries[0].comida !== comida
  const totales = sumMacros(entries)
  const hayEntradas = entries.length > 0
  const repetir = disponiblesAyer > 0 && (
    <Button variant="ghost" size="sm" onClick={onRepetir} disabled={ocupado}>
      <Icon name="copy" size={16} />
      {repitiendo ? 'Repitiendo…' : `Repetir del día anterior (${disponiblesAyer})`}
    </Button>
  )
  return (
    <section ref={setNodeRef} aria-label={titulo} data-comida={comida} data-drop-active={recibe || undefined} className="meal-section border-t border-line pt-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="min-w-0 break-words text-heading font-extrabold text-fg">{titulo}</h2>
        <div className="flex items-center gap-1">
          {hayEntradas ? (
            <span className="tabular text-body font-semibold text-fg">
              {formatInt(totales.kcal)} <span className="text-body-sm font-normal text-fg-muted">kcal</span>
            </span>
          ) : (
            <Button variant="ghost" size="sm" onClick={onAnadir}>
              <Icon name="plus" size={16} />
              Añadir
            </Button>
          )}
          <IconButton icon="more" label={`Acciones de ${titulo}`} variant="ghost" size="sm" onClick={onAcciones} />
        </div>
      </div>
      {hayEntradas && (
        <>
          <ul ref={listRef} className="mt-3 space-y-stack">
            {agruparPlatos(entries, (entry) => nombreVisible(entry, nombresCortos)).map((plato) =>
              plato.agrupado ? (
                <FilaPlato key={plato.clave} plato={plato} nombresCortos={nombresCortos} onEditar={onEditar} onBorrar={onBorrar} onBorrarPlato={onBorrarPlato} onEditarPlato={onEditarPlato} onAccionesPlato={onAccionesPlato} onMoverPlato={onMoverPlato} moviendo={moviendo} />
              ) : (
                <FilaEntrada key={plato.clave} entry={plato.entries[0]} nombreCorto={nombreVisible(plato.entries[0], nombresCortos)} onEditar={onEditar} onBorrar={onBorrar} />
              ),
            )}
          </ul>
          <div className="mt-3 border-t border-line">
            <div className="-ml-4 flex flex-wrap items-center gap-x-1">
              <Button variant="ghost" size="sm" onClick={onAnadir}>
                <Icon name="plus" size={16} />
                Añadir a {titulo.toLowerCase()}
              </Button>
              {repetir}
            </div>
          </div>
        </>
      )}
      {!hayEntradas && disponiblesAyer > 0 && <div className="-ml-4">{repetir}</div>}
    </section>
  )
}
