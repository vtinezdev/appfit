import { useId, useState } from 'react'
import Button, { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import type { Entry } from '../../../shared/db/types'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { resumenMacros, sumMacros } from '../lib/nutrition'
import { agruparPlatos, type Plato } from '../lib/platos'
import FranjaMacros from './FranjaMacros'

interface Props {
  titulo: string
  entries: Entry[]
  onAcciones: () => void
  onEditar: (entry: Entry) => void
  onBorrar: (entry: Entry) => void
  onBorrarPlato: (plato: Plato) => void
  /** «Añadir a desayuno»: abre Añadir comida con esta comida preseleccionada. */
  onAnadir: () => void
  /** Entradas de esa misma comida el día anterior: si hay, se ofrece repetirlas. */
  disponiblesAyer: number
  onRepetir: () => void
  /** Hay una repetición en curso: bloquea los botones de repetir. */
  ocupado: boolean
  /** Esta comida es la que se está repitiendo (cambia el texto del botón). */
  repitiendo: boolean
}

/** «Kcal rápidas» (A5) no tiene gramos: se muestra solo con los macros que se hayan indicado. */
function detalleEntry(e: Entry): string {
  if (!e.rapida) {
    return `${formatNumber(e.gramos, 1)} g · P${formatInt(e.prot)} C${formatInt(e.carb)} G${formatInt(e.grasa)}`
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

function FilaEntrada({ entry: e, onEditar, onBorrar }: { entry: Entry } & Pick<Props, 'onEditar' | 'onBorrar'>) {
  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onEditar(e)}
        className="-mx-2 flex min-h-touch min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-left transition-colors duration-short hover:bg-surface-muted active:bg-surface-muted"
      >
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-body-sm font-medium text-fg">{e.nombre}</span>
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

function FilaPlato({ plato, onEditar, onBorrar, onBorrarPlato }: { plato: Plato } & Pick<Props, 'onEditar' | 'onBorrar' | 'onBorrarPlato'>) {
  const [abierto, setAbierto] = useState(false)
  const detalleId = useId()
  const totales = sumMacros(plato.entries)
  return (
    <li>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls={detalleId}
          onClick={() => setAbierto(!abierto)}
          className="-mx-2 flex min-h-touch min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-3 text-left transition-colors duration-short hover:bg-surface-muted active:bg-surface-muted"
        >
          <Icon name="chevron-right" size={16} className={`text-fg-muted transition-transform duration-short ${abierto ? 'rotate-90' : ''}`} />
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 block text-body-sm font-medium text-fg">{plato.nombre}</span>
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
      <ul id={detalleId} hidden={!abierto} aria-label={`Ingredientes de ${plato.nombre}`} className="mb-2 ml-3 divide-y divide-line border-l border-line pl-3">
        {plato.entries.map((e) => (
          <FilaEntrada key={e.id} entry={e} onEditar={onEditar} onBorrar={onBorrar} />
        ))}
      </ul>
    </li>
  )
}

/** Sección plana por comida; los guardados múltiples son platos desplegables, sin duplicar sus macros. */
export default function ComidaSection({ titulo, entries, onAcciones, onEditar, onBorrar, onBorrarPlato, onAnadir, disponiblesAyer, onRepetir, ocupado, repitiendo }: Props) {
  const totales = sumMacros(entries)
  const hayEntradas = entries.length > 0
  const repetir = disponiblesAyer > 0 && (
    <Button variant="ghost" size="sm" onClick={onRepetir} disabled={ocupado}>
      <Icon name="copy" size={16} />
      {repitiendo ? 'Repitiendo…' : `Repetir del día anterior (${disponiblesAyer})`}
    </Button>
  )
  return (
    <section aria-label={titulo}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-title text-fg">{titulo}</h2>
        <div className="flex items-center gap-1">
          {hayEntradas ? (
            <span className="tabular text-title text-fg">
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
          <div className="mt-1">
            <FranjaMacros macros={totales} />
          </div>
          <ul className="mt-2 divide-y divide-line border-t border-line">
            {agruparPlatos(entries).map((plato) =>
              plato.agrupado ? (
                <FilaPlato key={plato.clave} plato={plato} onEditar={onEditar} onBorrar={onBorrar} onBorrarPlato={onBorrarPlato} />
              ) : (
                <FilaEntrada key={plato.clave} entry={plato.entries[0]} onEditar={onEditar} onBorrar={onBorrar} />
              ),
            )}
          </ul>
          <div className="border-t border-line">
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
