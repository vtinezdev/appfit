import type { ReactNode } from 'react'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import { etiquetaPeriodo } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import type { ResumenTarjetaRevision } from '../hooks/useRevisionSemanal'
import { formatDiferencia } from '../lib/revisionSemanal'

interface Props {
  resumen: ResumenTarjetaRevision
  onVer: () => void
  onCerrar: () => void
}

function Fila({ etiqueta, valor, detalle }: { etiqueta: string; valor: ReactNode; detalle?: string | null }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2">
      <dt className="text-body-sm text-fg-muted">{etiqueta}</dt>
      <dd className="tabular flex flex-wrap items-baseline justify-end gap-x-2 text-right">
        <span className="text-body font-semibold text-fg">{valor}</span>
        {detalle && <span className="text-caption text-fg-muted">{detalle}</span>}
      </dd>
    </div>
  )
}

/**
 * Revisión de la semana cerrada en Inicio: peso medio, kcal medias y entrenos, cada uno con su diferencia frente a la
 * semana anterior y sin juicio de valor. «Hecho» la oculta hasta el lunes siguiente.
 */
export default function TarjetaRevisionSemanal({ resumen, onVer, onCerrar }: Props) {
  const { semana, peso, nutricion, sesiones, sesionesAnterior } = resumen
  return (
    <Card role="region" aria-label="Revisión semanal" className="space-y-3">
      <div className="space-y-0.5">
        <p className="text-label text-fg-muted">Tu semana</p>
        <p className="tabular text-title text-fg">{etiquetaPeriodo('semana', semana.lunes)}</p>
        <p className="text-caption text-fg-muted">Cambios frente a la semana anterior</p>
      </div>
      <dl className="divide-y divide-line border-y border-line">
        <Fila
          etiqueta="Peso medio"
          valor={peso.media === null ? 'Sin pesajes' : `${formatNumber(peso.media, 1)} kg`}
          detalle={peso.diferencia === null ? null : formatDiferencia(peso.diferencia, 1, 'kg')}
        />
        <Fila
          etiqueta="Kcal al día"
          valor={nutricion.kcalMedia === null ? 'Sin registros' : formatInt(nutricion.kcalMedia)}
          detalle={nutricion.kcalMedia !== null && nutricion.kcalObjetivo !== null ? `objetivo ${formatInt(nutricion.kcalObjetivo)}` : null}
        />
        <Fila etiqueta="Entrenos" valor={formatInt(sesiones)} detalle={formatDiferencia(sesiones - sesionesAnterior)} />
      </dl>
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onCerrar}>Hecho</Button>
        <Button variant="secondary" className="flex-1" onClick={onVer}>Ver revisión</Button>
      </div>
    </Card>
  )
}
