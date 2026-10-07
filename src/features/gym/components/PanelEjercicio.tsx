import { useState } from 'react'
import Button, { IconButton } from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import { Input } from '../../../shared/components/Input'
import type { Exercise, ObjetivoEjercicio, SetEntry } from '../../../shared/db/types'
import MenuSerie from './MenuSerie'

type CambioSerie = Partial<Pick<SetEntry, 'reps' | 'peso' | 'tipo' | 'rir'>>

/** El borrador evita que una respuesta asíncrona anterior interrumpa la escritura. */
export function CampoSerie({ valor, label, decimal = false, onChange }: {
  valor: number
  label: string
  decimal?: boolean
  onChange: (valor: number) => void
}) {
  const [borrador, setBorrador] = useState<string | null>(null)
  return (
    <Input type="number" inputMode={decimal ? 'decimal' : 'numeric'} enterKeyHint={decimal ? 'done' : 'next'}
      min={0} step={decimal ? 2.5 : 1} aria-label={label} value={borrador ?? valor}
      onFocus={() => setBorrador(String(valor))}
      onChange={(e) => {
        const texto = e.target.value
        setBorrador(texto)
        if (texto !== '') onChange(Math.round(Math.max(0, Number(texto) || 0) * 100) / 100)
      }}
      onBlur={() => {
        if (borrador === '') onChange(0)
        setBorrador(null)
      }}
      className="tabular no-spin text-center font-semibold"
    />
  )
}

interface Props {
  ejercicio: Exercise
  /** Series del ejercicio en esta sesión, ordenadas. */
  sets: SetEntry[]
  /** Texto bajo el título («Última vez: …»). */
  ultimaVez?: string
  objetivo?: ObjetivoEjercicio
  /** Solo en la sesión activa: series marcadas y acción de marcar. Sin ellas, el número no es un botón. */
  completadas?: number[]
  onCompletar?: (serie: SetEntry, numero: number) => void
  nuevaId?: number | null
  bloqueado?: boolean
  barraKg: number
  onActualizar: (id: number, patch: CambioSerie) => void
  onBorrar: (id: number, numero: number) => void
  onAgregar: () => void
  mover?: { puedeSubir: boolean; puedeBajar: boolean; onSubir: () => void; onBajar: () => void }
}

/** Panel de un ejercicio con sus series; lo comparten la sesión activa y el editor de entrenos terminados. */
export default function PanelEjercicio({ ejercicio, sets, ultimaVez, objetivo, completadas, onCompletar, nuevaId, bloqueado, barraKg, onActualizar, onBorrar, onAgregar, mover }: Props) {
  const [menu, setMenu] = useState<number | null>(null)
  // Las series de calentamiento no se numeran: se marcan con «C».
  let efectivas = 0
  const numeradas = sets.map((s) => ({ s, numero: s.tipo === 'calentamiento' ? null : ++efectivas }))
  const abierta = numeradas.find((n) => n.s.id === menu)

  return (
    <Card className="exercise-panel space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="exercise-title break-words text-title text-fg">{ejercicio.nombre}</h2>
          {ultimaVez && <p className="text-caption text-fg-muted">{ultimaVez}</p>}
          {objetivo && <p className="tabular text-caption text-fg-muted">Objetivo: {objetivo.series} × {objetivo.repsMin === objetivo.repsMax ? objetivo.repsMin : `${objetivo.repsMin}–${objetivo.repsMax}`} reps{objetivo.descansoSeg ? ` · ${objetivo.descansoSeg} s de descanso` : ''}</p>}
        </div>
        {mover && (
          <div className="flex shrink-0">
            <IconButton icon="chevron-left" label={`Subir ${ejercicio.nombre}`} variant="ghost" size="sm" className="rotate-90" disabled={!mover.puedeSubir} onClick={mover.onSubir} />
            <IconButton icon="chevron-right" label={`Bajar ${ejercicio.nombre}`} variant="ghost" size="sm" className="rotate-90" disabled={!mover.puedeBajar} onClick={mover.onBajar} />
          </div>
        )}
      </div>
      <div className="space-y-2">
        {sets.length > 0 && (
          <div className="series-row text-caption text-fg-muted" aria-hidden>
            <span className="text-center">Serie</span><span className="text-center">Reps</span><span className="text-center">Kg</span><span />
          </div>
        )}
        {numeradas.map(({ s, numero }) => {
          const nombreSerie = numero === null ? 'calentamiento' : `serie ${numero}`
          const hecha = completadas?.includes(s.id) ?? false
          return (
            <div key={s.id} className="space-y-1" data-motion-id={s.id}>
              <div data-done={hecha} className={`series-row ${nuevaId === s.id ? 'series-new' : ''}`}>
                {onCompletar ? (
                  <button type="button" className="series-complete app-button tabular text-label font-bold"
                    aria-label={`${hecha ? 'Desmarcar' : 'Completar'} ${nombreSerie} de ${ejercicio.nombre}`} aria-pressed={hecha}
                    disabled={s.reps <= 0 || bloqueado} title={s.reps <= 0 ? 'Introduce las repeticiones para completar la serie' : undefined}
                    onClick={() => onCompletar(s, numero ?? 0)}>
                    {hecha ? <Icon name="check" className="mx-auto" size={20} /> : numero ?? 'C'}
                  </button>
                ) : (
                  <span className="tabular text-center text-label font-bold text-fg-muted" aria-label={nombreSerie}>{numero ?? 'C'}</span>
                )}
                <div className="min-w-0 flex-1">
                  <CampoSerie valor={s.reps} label={`Repeticiones, ${nombreSerie} de ${ejercicio.nombre}`} onChange={(reps) => onActualizar(s.id, { reps })} />
                </div>
                <div className="min-w-0 flex-1">
                  <CampoSerie valor={s.peso} label={`Peso en kg, ${nombreSerie} de ${ejercicio.nombre}`} decimal onChange={(peso) => onActualizar(s.id, { peso })} />
                </div>
                <IconButton icon="more" label={`Opciones de ${nombreSerie} de ${ejercicio.nombre}`} variant="ghost" size="sm" onClick={() => setMenu(s.id)} />
              </div>
              {(s.tipo === 'calentamiento' || s.rir !== undefined) && (
                <p className="tabular pl-1 text-caption text-fg-muted">{[s.tipo === 'calentamiento' ? 'Calentamiento' : null, s.rir !== undefined ? `RIR ${s.rir}` : null].filter(Boolean).join(' · ')}</p>
              )}
            </div>
          )
        })}
      </div>
      <Button variant="ghost" block onClick={onAgregar}>
        <Icon name="plus" size={16} />
        Añadir serie
      </Button>
      {abierta && (
        <MenuSerie open titulo={`${abierta.numero === null ? 'Calentamiento' : `Serie ${abierta.numero}`} · ${ejercicio.nombre}`} serie={abierta.s} barraKg={barraKg}
          onClose={() => setMenu(null)} onCambiar={(patch) => onActualizar(abierta.s.id, patch)}
          onBorrar={() => { setMenu(null); onBorrar(abierta.s.id, abierta.numero ?? 0) }} />
      )}
    </Card>
  )
}
