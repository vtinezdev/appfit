import type { NutrientesAdicionales } from '../../../shared/db/types'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { resumenNutrientes } from '../lib/nutrientes'

interface Props {
  entries: { nutrientes?: NutrientesAdicionales }[]
  titulo?: string
}

/** Valores adicionales con cobertura explícita para no ocultar los datos desconocidos. */
export default function NutrientesDetalle({ entries, titulo = 'Nutrientes adicionales' }: Props) {
  const resumen = resumenNutrientes(entries)
  const incompleto = resumen.some((n) => n.conocidos < n.total)
  return (
    <section aria-label={titulo} className="space-y-2 border-t border-line pt-3">
      <h3 className="text-label font-semibold text-fg-muted">{titulo}</h3>
      <dl className="grid grid-cols-2 gap-3">
        {resumen.map(({ clave, label, valor, conocidos, total }) => (
          <div key={clave} className="min-w-0 space-y-1">
            <dt className="text-label text-fg-muted">{label}</dt>
            <dd className="tabular break-words text-body font-semibold text-fg">
              {valor === undefined ? 'Sin datos' : `${formatNumber(valor, 3)} g`}
              {conocidos > 0 && conocidos < total && (
                <span className="mt-1 block text-caption font-normal text-fg-muted">Parcial · {formatInt(conocidos)} de {formatInt(total)} alimentos</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {incompleto && <p className="text-caption text-fg-muted">Solo se suman los valores conocidos. Los alimentos sin datos no cuentan como cero.</p>}
    </section>
  )
}
