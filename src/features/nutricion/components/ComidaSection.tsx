import { useId, useState } from 'react'
import Button, { IconButton } from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import type { Comida, Entry } from '../../../shared/db/types'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { sumMacros } from '../lib/nutrition'
import { nombreVisible } from '../lib/nombresCortos'
import { agruparPlatos, type Plato } from '../lib/platos'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useListMotion } from '../../../shared/hooks/useListMotion'
import CabeceraComida from './CabeceraComida'
import RegistroComida from './RegistroComida'
import AccionesPlatoSheet from './AccionesPlatoSheet'

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

function FilaEntrada({ entry: e, nombreCorto, ingrediente = false, onEditar, onBorrar }: { entry: Entry; nombreCorto: string; ingrediente?: boolean } & Pick<Props, 'onEditar' | 'onBorrar'>) {
  return <li data-entry-id={e.id}><RegistroComida tipo={ingrediente ? 'ingrediente' : 'individual'} nombre={nombreCorto} nombreOriginal={e.nombre}
    detalle={e.rapida ? 'Registro rápido' : `${formatNumber(e.gramos, 1)} g`} macros={e} aproximado={e.rapida} onClick={() => onEditar(e)}
    accion={<IconButton icon="trash" label={`Borrar ${e.nombre}`} variant="ghost" size="sm" onClick={() => onBorrar(e)} />} /></li>
}

function FilaPlato({ plato, nombresCortos, onEditar, onBorrar, onBorrarPlato, onEditarPlato, onAccionesPlato, onMoverPlato, moviendo }: { plato: Plato; nombresCortos: ReadonlyMap<string, string> } & Pick<Props, 'onEditar' | 'onBorrar' | 'onBorrarPlato' | 'onEditarPlato' | 'onAccionesPlato' | 'onMoverPlato' | 'moviendo'>) {
  const [abierto, setAbierto] = useState(false)
  const [acciones, setAcciones] = useState(false)
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: plato.clave, data: { plato }, disabled: moviendo })
  const detalleId = useId()
  const accionesId = useId()
  const totales = sumMacros(plato.entries)
  return (
    <li ref={setNodeRef} data-motion-id={plato.clave} data-plato-id={plato.entries[0].platoId} className={isDragging ? 'opacity-40' : ''}>
      <RegistroComida tipo="plato" nombre={plato.nombre} detalle={`${formatInt(plato.entries.length)} ${plato.entries.length === 1 ? 'alimento' : 'alimentos'}`}
        macros={totales} aproximado={plato.entries.some(e => e.rapida)} abierto={abierto} detalleId={detalleId} onClick={() => setAbierto(!abierto)}
        accion={<IconButton icon="more" label={`Acciones del plato ${plato.nombre}`} variant="ghost" size="sm" disabled={moviendo}
          data-mover-plato={plato.entries[0].platoId} aria-haspopup="dialog" aria-expanded={acciones} aria-controls={accionesId} onClick={() => setAcciones(true)} />}>
        <div id={detalleId} hidden={!abierto} className="border-t border-line">
        <ul aria-label={`Ingredientes de ${plato.nombre}`} className="divide-y divide-line px-1">
          {plato.entries.map((e) => (
            <FilaEntrada key={e.id} entry={e} ingrediente nombreCorto={nombreVisible(e, nombresCortos)} onEditar={onEditar} onBorrar={onBorrar} />
          ))}
        </ul>
        <div className="flex items-center gap-1 border-t border-line px-2 py-1">
          <IconButton ref={setActivatorNodeRef} {...attributes} {...listeners} icon="grip" variant="ghost"
            label={`Arrastrar plato ${plato.nombre}`} className="touch-none cursor-grab active:cursor-grabbing" disabled={moviendo} />
          <span className="text-caption text-fg-muted">Arrastrar para mover</span>
        </div>
        </div>
      </RegistroComida>
      <AccionesPlatoSheet id={accionesId} open={acciones} nombre={plato.nombre} ocupado={moviendo} onClose={() => setAcciones(false)}
        onAnadir={() => onEditarPlato(plato)} onMover={() => onMoverPlato(plato)} onCopiar={() => onAccionesPlato(plato)} onBorrar={() => onBorrarPlato(plato)} />
    </li>
  )
}

/** Platos y entradas sueltas comparten fila; solo los ingredientes se subordinan al desplegar. */
export default function ComidaSection({ comida, titulo, entries, nombresCortos, onAcciones, onEditar, onBorrar, onBorrarPlato, onEditarPlato, onAccionesPlato, onMoverPlato, moviendo, onAnadir, disponiblesAyer, onRepetir, ocupado, repitiendo }: Props) {
  const { setNodeRef, isOver, active } = useDroppable({ id: `comida:${comida}`, data: { comida }, disabled: moviendo })
  const listRef = useListMotion<HTMLUListElement>(entries.map(e => e.id).join(','))
  const recibe = isOver && active?.data.current?.plato?.entries[0].comida !== comida
  const totales = sumMacros(entries)
  const hayEntradas = entries.length > 0
  const repetir = disponiblesAyer > 0 && (
    <Button variant="subtle" size="sm" onClick={onRepetir} disabled={ocupado}>
      <Icon name="copy" size={16} />
      {repitiendo ? 'Repitiendo…' : `Repetir del día anterior (${disponiblesAyer})`}
    </Button>
  )
  return (
    <section ref={setNodeRef} aria-label={titulo} data-comida={comida} data-drop-active={recibe || undefined} className="meal-section">
      <CabeceraComida comida={comida} titulo={titulo} kcal={totales.kcal} registros={entries.length} onAcciones={onAcciones} />
      {!hayEntradas && <div className="mt-1 flex flex-wrap items-center gap-x-1">
        <Button variant="subtle" size="sm" onClick={onAnadir}><Icon name="plus" size={16} />Añadir</Button>
        {repetir}
      </div>}
      {hayEntradas && (
        <Card padded={false} className="mt-2 px-1">
          <ul ref={listRef} className="divide-y divide-line">
            {agruparPlatos(entries, (entry) => nombreVisible(entry, nombresCortos)).map((plato) =>
              plato.agrupado ? (
                <FilaPlato key={plato.clave} plato={plato} nombresCortos={nombresCortos} onEditar={onEditar} onBorrar={onBorrar} onBorrarPlato={onBorrarPlato} onEditarPlato={onEditarPlato} onAccionesPlato={onAccionesPlato} onMoverPlato={onMoverPlato} moviendo={moviendo} />
              ) : (
                <FilaEntrada key={plato.clave} entry={plato.entries[0]} nombreCorto={nombreVisible(plato.entries[0], nombresCortos)} onEditar={onEditar} onBorrar={onBorrar} />
              ),
            )}
          </ul>
          <div className="flex flex-wrap items-center gap-x-1 border-t border-line">
            <Button variant="subtle" size="sm" onClick={onAnadir}>
              <Icon name="plus" size={16} />
              Añadir a {titulo.toLowerCase()}
            </Button>
            {repetir}
          </div>
        </Card>
      )}
    </section>
  )
}
