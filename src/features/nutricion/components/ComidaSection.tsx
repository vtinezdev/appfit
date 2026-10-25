import { useId, useState } from 'react'
import Button, { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import Card from '../../../shared/components/Card'
import { MACROS } from '../../../shared/design/macros'
import type { Comida, Entry } from '../../../shared/db/types'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { sumMacros } from '../lib/nutrition'
import { nombreVisible } from '../lib/nombresCortos'
import { categoriaDeEntrada } from '../lib/repartoCategorias'
import IconoCategoria from './IconoCategoria'
import FilaDeslizable from '../../../shared/components/FilaDeslizable'
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
  onCopiarEntrada: (entry: Entry) => void
  onBorrarPlato: (plato: Plato) => void
  onEditarPlato: (plato: Plato) => void
  onAccionesPlato: (plato: Plato) => void
  onMoverPlato: (plato: Plato) => void
  moviendo: boolean
  /** «Añadir a desayuno»: abre Añadir comida con esta comida preseleccionada. */
  onAnadir: () => void
  /** Abre la colección compartida de típicas con esta comida como destino. */
  onTipicas: () => void
  tipicasAbiertas?: boolean
  tipicasId?: string
  nombresCortos: ReadonlyMap<string, string>
  /** Categoría actual de cada alimento referenciado, por `claveRef` (ver `foodsRepo.categoriasDeEntradas`). */
  categorias: ReadonlyMap<string, string>
}

/** Alimento suelto o ingrediente: deslizar ofrece Copiar y Borrar, accesibles también con teclado. */
function FilaEntrada({ entry: e, nombreCorto, categorias, ingrediente = false, onEditar, onBorrar, onCopiarEntrada }: { entry: Entry; nombreCorto: string; ingrediente?: boolean } & Pick<Props, 'onEditar' | 'onBorrar' | 'onCopiarEntrada' | 'categorias'>) {
  return <li data-entry-id={e.id}><FilaDeslizable etiqueta={`Borrar ${e.nombre}`} onBorrar={() => onBorrar(e)} accionCopiar={{ etiqueta: `Copiar ${e.nombre}`, onCopiar: () => onCopiarEntrada(e) }}>
    <RegistroComida tipo={ingrediente ? 'ingrediente' : 'individual'} nombre={nombreCorto} nombreOriginal={e.nombre}
      icono={<IconoCategoria categoria={categoriaDeEntrada(e, categorias)} sinCategoria="hueco" inicial={nombreCorto.trim().charAt(0)} />}
      detalle={e.rapida ? 'Registro rápido' : `${formatNumber(e.gramos, 1)} g`} macros={e} aproximado={e.rapida} onClick={() => onEditar(e)} accion={null} />
  </FilaDeslizable></li>
}

function FilaPlato({ plato, nombresCortos, categorias, onEditar, onBorrar, onCopiarEntrada, onBorrarPlato, onEditarPlato, onAccionesPlato, onMoverPlato, moviendo }: { plato: Plato; nombresCortos: ReadonlyMap<string, string> } & Pick<Props, 'categorias' | 'onEditar' | 'onBorrar' | 'onCopiarEntrada' | 'onBorrarPlato' | 'onEditarPlato' | 'onAccionesPlato' | 'onMoverPlato' | 'moviendo'>) {
  const [abierto, setAbierto] = useState(false)
  const [acciones, setAcciones] = useState(false)
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: plato.clave, data: { plato }, disabled: moviendo })
  const detalleId = useId()
  const accionesId = useId()
  const totales = sumMacros(plato.entries)
  return (
    <li ref={setNodeRef} data-motion-id={plato.clave} data-plato-id={plato.entries[0].platoId} className={isDragging ? 'opacity-40' : ''}>
      <RegistroComida tipo="plato" nombre={plato.nombre} detalle={`${formatInt(plato.entries.length)} ${plato.entries.length === 1 ? 'ingrediente' : 'ingredientes'}`}
        macros={totales} aproximado={plato.entries.some(e => e.rapida)} abierto={abierto} detalleId={detalleId} onClick={() => setAbierto(!abierto)}
        accion={<IconButton icon="more" label={`Acciones del plato ${plato.nombre}`} variant="ghost" size="sm" disabled={moviendo}
          data-mover-plato={plato.entries[0].platoId} aria-haspopup="dialog" aria-expanded={acciones} aria-controls={accionesId} onClick={() => setAcciones(true)} />}>
        <div id={detalleId} hidden={!abierto} className="border-t border-line">
        <ul aria-label={`Ingredientes de ${plato.nombre}`} className="divide-y divide-line px-1">
          {plato.entries.map((e) => (
            <FilaEntrada key={e.id} entry={e} ingrediente nombreCorto={nombreVisible(e, nombresCortos)} categorias={categorias} onEditar={onEditar} onBorrar={onBorrar} onCopiarEntrada={onCopiarEntrada} />
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
export default function ComidaSection({ comida, titulo, entries, nombresCortos, categorias, onAcciones, onEditar, onBorrar, onCopiarEntrada, onBorrarPlato, onEditarPlato, onAccionesPlato, onMoverPlato, moviendo, onAnadir, onTipicas, tipicasAbiertas = false, tipicasId }: Props) {
  const { setNodeRef, isOver, active } = useDroppable({ id: `comida:${comida}`, data: { comida }, disabled: moviendo })
  const listRef = useListMotion<HTMLUListElement>(entries.map(e => e.id).join(','))
  const recibe = isOver && active?.data.current?.plato?.entries[0].comida !== comida
  const totales = sumMacros(entries)
  const hayEntradas = entries.length > 0
  const comidaMinus = titulo.toLowerCase()
  const anadir = <Button variant="subtle" size="sm" className="meal-add bg-surface-muted" aria-label={`Añadir a ${comidaMinus}`} onClick={onAnadir}><Icon name="plus" size={18} />Añadir</Button>
  const tipicas = <Button variant="subtle" size="sm" className="ml-auto" onClick={onTipicas} aria-haspopup="dialog" aria-expanded={tipicasAbiertas} aria-controls={tipicasAbiertas ? tipicasId : undefined} aria-label={`Comidas típicas de ${comidaMinus}`}>
    Típicas<Icon name="chevron-down" size={16} />
  </Button>
  return (
    <section ref={setNodeRef} aria-label={titulo} data-comida={comida} data-drop-active={recibe || undefined} className="meal-section rounded-lg">
      <Card padded={false} className="meal-card">
        <CabeceraComida comida={comida} titulo={titulo} kcal={totales.kcal} registros={entries.length} onAcciones={onAcciones} />
        {hayEntradas ? <>
          <ul ref={listRef} className="divide-y divide-line px-1">
            {agruparPlatos(entries, (entry) => nombreVisible(entry, nombresCortos)).map((plato) =>
              plato.agrupado ? (
                <FilaPlato key={plato.clave} plato={plato} nombresCortos={nombresCortos} categorias={categorias} onEditar={onEditar} onBorrar={onBorrar} onCopiarEntrada={onCopiarEntrada} onBorrarPlato={onBorrarPlato} onEditarPlato={onEditarPlato} onAccionesPlato={onAccionesPlato} onMoverPlato={onMoverPlato} moviendo={moviendo} />
              ) : (
                <FilaEntrada key={plato.clave} entry={plato.entries[0]} nombreCorto={nombreVisible(plato.entries[0], nombresCortos)} categorias={categorias} onEditar={onEditar} onBorrar={onBorrar} onCopiarEntrada={onCopiarEntrada} />
              ),
            )}
          </ul>
          <dl aria-label={`Macros de ${comidaMinus}`} className="meal-macros flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pb-3 pt-2">
            {[{ macro: MACROS.prot, valor: totales.prot }, { macro: MACROS.carbs, valor: totales.carb }, { macro: MACROS.fat, valor: totales.grasa }].map(({ macro, valor }) => <div key={macro.short} className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-caption">
              <dt className="flex items-center gap-1"><span aria-hidden className={`h-1 w-1 shrink-0 rounded-pill ${macro.bg}`} /><span className="sr-only">{macro.label}</span><span aria-hidden className="font-semibold text-fg-muted">{macro.short}</span></dt>
              <dd className="tabular min-w-0 break-words font-semibold text-fg">{formatInt(valor)} <span className="font-normal text-fg-muted">g</span></dd>
            </div>)}
          </dl>
        </> : <p className="px-4 py-3 text-caption text-fg-muted">Sin alimentos todavía.</p>}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2">{anadir}{tipicas}</div>
      </Card>
    </section>
  )
}
