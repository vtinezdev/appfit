import { useId, useRef, useState } from 'react'
import type { NutrientesAdicionales } from '../../../shared/db/types'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { resumenNutrientes } from '../lib/nutrientes'
import ProgressBar from '../../../shared/components/ProgressBar'
import Sheet from '../../../shared/components/Sheet'
import Button, { IconButton } from '../../../shared/components/Button'
import { referenciasNutrientes, referenciaNutricional, type NutrienteId } from '../../../shared/lib/referenciasNutricionales'
import ReferenciaNutrienteContenido from '../../referencias/components/ReferenciaNutrienteContenido'

interface Props {
  entries: { nutrientes?: NutrientesAdicionales }[]
  titulo?: string
  /** Solo el diario compara con referencias diarias; la revisión de un alimento no. */
  objetivoKcal?: number
  onVerReferencia?: (id: NutrienteId) => void
}

export default function NutrientesDetalle({ entries, titulo = 'Nutrientes adicionales', objetivoKcal, onVerReferencia }: Props) {
  const resumen = resumenNutrientes(entries)
  const referencias = objetivoKcal === undefined ? undefined : referenciasNutrientes(objetivoKcal)
  const [elegido, setElegido] = useState<keyof NutrientesAdicionales | null>(null)
  const [abierto, setAbierto] = useState(false)
  const pendiente = useRef<NutrienteId | null>(null)
  const sheetId = useId()
  const referencia = elegido ? referenciaNutricional(elegido, { kcal: objetivoKcal ?? 0, prot: 0, carb: 0, grasa: 0 }) : null
  const consumo = (valor: number | undefined) => valor === undefined ? 'Sin datos' : `${formatNumber(valor, 3)} g`

  return <section aria-label={titulo} className="space-y-3 border-t border-line pt-3">
    <h3 className="text-label font-semibold text-fg-muted">{titulo}</h3>
    {referencias ? <div className="divide-y divide-line">
      {resumen.map(({ clave, label, valor, conocidos, total }) => {
        const cobertura = `Información disponible en ${formatInt(conocidos)} de ${formatInt(total)} alimentos`
        return <div key={clave} data-nutriente={clave} className="nutrient-row min-w-0 space-y-2 py-3 first:pt-0 last:pb-0">
          <div className="flex items-center gap-2">
            <dl className="nutrient-values grid min-w-0 flex-1 grid-cols-2 items-center gap-2">
              <dt className="min-w-0 break-words text-body-sm font-semibold text-fg">{label}</dt>
              {/* Un hueco de datos no pesa más que una cifra real. */}
              <dd className={`tabular min-w-0 break-words text-right ${valor === undefined ? 'text-body-sm text-fg-muted' : 'text-title font-bold text-fg'}`}>{consumo(valor)}</dd>
            </dl>
            <IconButton icon="info" label={`Información sobre ${label}`} variant="ghost" aria-haspopup="dialog" aria-controls={sheetId} aria-expanded={abierto && elegido === clave}
              onClick={() => { pendiente.current = null; setElegido(clave); setAbierto(true) }} />
          </div>
          {valor !== undefined ? <ProgressBar value={valor} goal={referencias[clave].gramos} label={`${label}: consumo diario conocido`} valueText={`${consumo(valor)}${conocidos < total ? ', suma parcial' : ''}. ${cobertura}.`} /> : <div aria-hidden className="h-1.5 rounded-sm bg-line" />}
          <p className="text-caption text-fg-muted">{cobertura}</p>
        </div>
      })}
    </div> : <>
      <dl className="grid grid-cols-2 gap-3">
        {resumen.map(({ clave, label, valor, conocidos, total }) => <div key={clave} className="min-w-0 space-y-1">
          <dt className="text-label text-fg-muted">{label}</dt>
          <dd className="space-y-1">
            <span className="tabular block break-words text-body font-semibold text-fg">{consumo(valor)}</span>
            {conocidos > 0 && conocidos < total && <span className="mt-1 block text-caption font-normal text-fg-muted">Parcial · {formatInt(conocidos)} de {formatInt(total)} alimentos</span>}
          </dd>
        </div>)}
      </dl>
      {resumen.some(n => n.conocidos < n.total) && <p className="text-caption text-fg-muted">Solo se suman los valores conocidos. Los alimentos sin datos no cuentan como cero.</p>}
    </>}
    <Sheet id={sheetId} open={abierto} title={referencia?.nombre} onClose={() => setAbierto(false)}
      onExited={() => { const destino = pendiente.current; pendiente.current = null; setElegido(null); if (destino) onVerReferencia?.(destino) }}
      footer={onVerReferencia && <Button variant="secondary" block onClick={() => { pendiente.current = elegido; setAbierto(false) }}>Ver en Referencias</Button>}>
      {referencia && <ReferenciaNutrienteContenido referencia={referencia} />}
    </Sheet>
  </section>
}
