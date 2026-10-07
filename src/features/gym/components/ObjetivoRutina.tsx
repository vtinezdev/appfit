import Button from '../../../shared/components/Button'
import Disclosure from '../../../shared/components/Disclosure'
import NumberStepper from '../../../shared/components/NumberStepper'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import type { ObjetivoEjercicio } from '../../../shared/db/types'
import { DESCANSOS_SEG, OBJETIVO_POR_DEFECTO, REPS_MAX, SERIES_MAX, SERIES_MIN, sanearObjetivo, textoObjetivo } from '../lib/objetivos'

interface Props {
  nombre: string
  objetivo?: ObjetivoEjercicio
  onChange: (objetivo: ObjetivoEjercicio | undefined) => void
}

/** Objetivo de un ejercicio dentro de la rutina: series, rango de repeticiones y descanso propio (opcional). */
export default function ObjetivoRutina({ nombre, objetivo, onChange }: Props) {
  const cambiar = (patch: Partial<ObjetivoEjercicio>) => objetivo && onChange(sanearObjetivo({ ...objetivo, ...patch }))
  return (
    <Disclosure title={objetivo ? `Objetivo: ${textoObjetivo(objetivo)} reps` : 'Sin objetivo'}>
      {objetivo ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3"><span className="text-body-sm text-fg-muted">Series</span>
            <NumberStepper label={`series de ${nombre}`} min={SERIES_MIN} value={objetivo.series} onChange={(v) => cambiar({ series: Math.min(SERIES_MAX, v) })} /></div>
          <div className="flex items-center justify-between gap-3"><span className="text-body-sm text-fg-muted">Reps mínimas</span>
            <NumberStepper label={`repeticiones mínimas de ${nombre}`} min={1} value={objetivo.repsMin} onChange={(v) => cambiar({ repsMin: Math.min(REPS_MAX, v) })} /></div>
          <div className="flex items-center justify-between gap-3"><span className="text-body-sm text-fg-muted">Reps máximas</span>
            <NumberStepper label={`repeticiones máximas de ${nombre}`} min={1} value={objetivo.repsMax} onChange={(v) => cambiar({ repsMax: Math.min(REPS_MAX, v) })} /></div>
          <div className="space-y-1">
            <SegmentedControl label={`Descanso de ${nombre}`} size="sm" valor={String(objetivo.descansoSeg ?? 0)}
              onChange={(v) => onChange(sanearObjetivo({ ...objetivo, descansoSeg: Number(v) || undefined }))}
              opciones={DESCANSOS_SEG.map((s) => ({ valor: String(s), label: s === 0 ? 'Global' : `${s} s` }))} />
            <p className="text-caption text-fg-muted">«Global» usa el descanso configurado en la sesión.</p>
          </div>
          <Button variant="subtle" block onClick={() => onChange(undefined)}>Quitar objetivo</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-body-sm text-fg-muted">Al empezar la rutina se crearán las series con los últimos valores que usaste.</p>
          <Button variant="secondary" block onClick={() => onChange({ ...OBJETIVO_POR_DEFECTO })}>Definir objetivo</Button>
        </div>
      )}
    </Disclosure>
  )
}
