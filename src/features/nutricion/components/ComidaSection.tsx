import Button, { IconButton } from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import type { Entry } from '../../../shared/db/types'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { sumMacros } from '../lib/nutrition'
import FranjaMacros from './FranjaMacros'

interface Props {
  titulo: string
  entries: Entry[]
  onAcciones: () => void
  onEditar: (entry: Entry) => void
  onBorrar: (entry: Entry) => void
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

/**
 * Una comida del día en su propia Card: cabecera con el total, franja de macros, filas (hairlines, sin cards anidadas)
 * y pie con «Añadir a …» y, si hay, «Repetir del día anterior». Sin registros la card es compacta: solo cabecera y pie.
 * Cada fila es un botón para editar; borrar es un botón aparte. Nombres largos: hasta dos líneas.
 */
export default function ComidaSection({ titulo, entries, onAcciones, onEditar, onBorrar, onAnadir, disponiblesAyer, onRepetir, ocupado, repitiendo }: Props) {
  const totales = sumMacros(entries)
  const hayEntradas = entries.length > 0
  return (
    <section aria-label={titulo}>
      <Card padded={false} className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 pl-card pr-2 pt-2">
          <h2 className="text-title text-fg">{titulo}</h2>
          <div className="flex items-center gap-1">
            {hayEntradas && <span className="tabular text-body-sm font-semibold text-fg">{formatInt(totales.kcal)} kcal</span>}
            <IconButton icon="more" label={`Acciones de ${titulo}`} variant="ghost" size="sm" onClick={onAcciones} />
          </div>
        </div>
        {hayEntradas && (
          <>
            <div className="px-card pb-2 pt-1">
              <FranjaMacros macros={totales} />
            </div>
            <ul className="divide-y divide-line border-t border-line">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center gap-1 pr-2">
                  <button
                    type="button"
                    onClick={() => onEditar(e)}
                    className="flex min-h-touch min-w-0 flex-1 items-center gap-3 py-2 pl-card text-left transition-colors duration-short active:bg-surface-muted"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block text-body-sm font-medium text-fg">{e.nombre}</span>
                      <span className="tabular block text-caption text-fg-subtle">{detalleEntry(e)}</span>
                    </span>
                    <span className="tabular shrink-0 text-body-sm text-fg">
                      {e.rapida ? '≈ ' : ''}
                      {formatInt(e.kcal)}
                    </span>
                  </button>
                  <IconButton icon="trash" label={`Borrar ${e.nombre}`} variant="ghost" size="sm" onClick={() => onBorrar(e)} />
                </li>
              ))}
            </ul>
          </>
        )}
        <div className={`flex flex-wrap items-center gap-x-1 px-1 pb-1 ${hayEntradas ? 'border-t border-line' : ''}`}>
          <Button variant="ghost" size="sm" onClick={onAnadir}>
            <Icon name="plus" size={16} />
            Añadir a {titulo.toLowerCase()}
          </Button>
          {disponiblesAyer > 0 && (
            <Button variant="ghost" size="sm" onClick={onRepetir} disabled={ocupado}>
              <Icon name="copy" size={16} />
              {repitiendo ? 'Repitiendo…' : `Repetir del día anterior (${disponiblesAyer})`}
            </Button>
          )}
        </div>
      </Card>
    </section>
  )
}
