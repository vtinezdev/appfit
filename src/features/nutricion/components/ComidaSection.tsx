import type { ReactNode } from 'react'
import { IconButton } from '../../../shared/components/Button'
import SectionHeader from '../../../shared/components/SectionHeader'
import { EmptyState } from '../../../shared/components/StateMessage'
import type { Entry } from '../../../shared/db/types'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { sumMacros } from '../lib/nutrition'

interface Props {
  titulo: string
  entries: Entry[]
  onAcciones: () => void
  onEditar: (entry: Entry) => void
  onBorrar: (entry: Entry) => void
  /** Sustituye a «Sin registros» cuando hay algo que ofrecer (repetir del día anterior). */
  vacioAccion?: ReactNode
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
 * Una comida del día: cabecera con su total y lista plana (sin cards) de lo registrado.
 * Cada fila es un botón para editar; borrar es un botón aparte. Nombres largos: hasta dos líneas.
 */
export default function ComidaSection({ titulo, entries, onAcciones, onEditar, onBorrar, vacioAccion }: Props) {
  const total = sumMacros(entries).kcal
  return (
    <section aria-label={titulo} className="space-y-1">
      <SectionHeader
        action={
          <div className="flex items-center gap-1">
            {entries.length > 0 && <span className="tabular text-body-sm font-semibold text-fg">{formatInt(total)} kcal</span>}
            <IconButton icon="more" label={`Acciones de ${titulo}`} variant="ghost" size="sm" onClick={onAcciones} />
          </div>
        }
      >
        {titulo}
      </SectionHeader>
      {entries.length === 0 ? (
        vacioAccion ?? <EmptyState>Sin registros</EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEditar(e)}
                className="flex min-h-touch min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-2 text-left transition-colors duration-short active:bg-surface-muted"
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
      )}
    </section>
  )
}
