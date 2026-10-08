import { useState } from 'react'
import Button, { IconButton } from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import { Input } from '../../../shared/components/Input'
import type { ConfiguracionEjecucion, Workout, ConfiguracionCarga, Exercise, ObjetivoEjercicio, SetEntry } from '../../../shared/db/types'
import MenuSerie from './MenuSerie'
import Disclosure from '../../../shared/components/Disclosure'
import RirStepper from './RirStepper'
import NotaEjercicio from './NotaEjercicio'
import EjecucionEjercicio from './EjecucionEjercicio'
import ProgresionEjercicio from './ProgresionEjercicio'
import { contextoSerie, describirReps, tieneReps } from '../lib/ejecucion'
import type { CambiosSerie } from '../data/setsRepo'
import CargaEjercicio from './CargaEjercicio'
import { admiteCargaCorporal, formatearCarga, modoCarga } from '../lib/carga'

type CambioSerie = CambiosSerie

/** El borrador evita que una respuesta asíncrona anterior interrumpa la escritura. */
export function CampoSerie({ valor, label, decimal = false, disabled = false, onChange }: {
  valor: number
  label: string
  decimal?: boolean
  disabled?: boolean
  onChange: (valor: number) => void
}) {
  const [borrador, setBorrador] = useState<string | null>(null)
  return (
    <Input disabled={disabled} type="number" inputMode={decimal ? 'decimal' : 'numeric'} enterKeyHint={decimal ? 'done' : 'next'}
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
  onActualizar: (id: number, patch: CambioSerie) => void | Promise<void>
  onBorrar: (id: number, numero: number) => void
  onAgregar: () => void
  onQuitar?: () => void
  contexto?: { workoutId: number; inicio: number; nota?: string; carga?: ConfiguracionCarga; onCarga: (carga: ConfiguracionCarga) => Promise<void>; workout?: Workout; ejecucion?: ConfiguracionEjecucion; onEjecucion?: (c: ConfiguracionEjecucion, habitual: boolean) => Promise<void>; onProgresion?: (clave: string, decision: 'aplicada' | 'mantener' | 'descartada') => Promise<void> }
  mover?: { puedeSubir: boolean; puedeBajar: boolean; onSubir: () => void; onBajar: () => void }
}

/** Panel de un ejercicio con sus series; lo comparten la sesión activa y el editor de entrenos terminados. */
export default function PanelEjercicio({ ejercicio, sets, ultimaVez, objetivo, completadas, onCompletar, nuevaId, bloqueado, barraKg, onActualizar, onBorrar, onAgregar, onQuitar, contexto, mover }: Props) {
  const actualizar = (id: number, patch: CambioSerie) => { void Promise.resolve(onActualizar(id, patch)).catch(() => {}) }
  const [menu, setMenu] = useState<number | null>(null)
  // Las series de calentamiento no se numeran: se marcan con «C».
  let efectivas = 0
  const numeradas = sets.map((s) => ({ s, numero: s.tipo === 'calentamiento' ? null : ++efectivas }))
  const abierta = numeradas.find((n) => n.s.id === menu)

  return (
    <Card data-exercise-id={ejercicio.id} className="exercise-panel space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 basis-32">
          <h2 tabIndex={-1} className="exercise-title break-words text-title text-fg">{ejercicio.nombre}</h2>
          {ultimaVez && <p className="text-caption text-fg-muted">{ultimaVez}</p>}
          {objetivo && <p className="tabular text-caption text-fg-muted">Objetivo: {objetivo.series} × {objetivo.repsMin === objetivo.repsMax ? objetivo.repsMin : `${objetivo.repsMin}–${objetivo.repsMax}`} reps{objetivo.descansoSeg ? ` · ${objetivo.descansoSeg} s de descanso` : ''}</p>}
        </div>
        {(mover || onQuitar || contexto) && (
          <div className="flex max-w-full shrink-0 flex-wrap justify-end">
            {contexto && <NotaEjercicio workoutId={contexto.workoutId} exerciseId={ejercicio.id} nombre={ejercicio.nombre} inicio={contexto.inicio} nota={contexto.nota} bloqueado={bloqueado} />}
            {mover && <>
              <IconButton icon="chevron-left" label={`Subir ${ejercicio.nombre}`} variant="ghost" size="sm" className="rotate-90" disabled={bloqueado || !mover.puedeSubir} onClick={mover.onSubir} />
              <IconButton icon="chevron-right" label={`Bajar ${ejercicio.nombre}`} variant="ghost" size="sm" className="rotate-90" disabled={bloqueado || !mover.puedeBajar} onClick={mover.onBajar} />
            </>}
            {onQuitar && <IconButton icon="trash" label={`Quitar ${ejercicio.nombre} de este entreno`} variant="ghost" size="sm" disabled={bloqueado} onClick={onQuitar} />}
          </div>
        )}
      </div>
      {contexto?.nota && <p className="line-clamp-1 break-words text-body-sm text-fg-muted">{contexto.nota}</p>}
      {contexto && <Disclosure title="Ajustes del ejercicio"><div className="divide-y divide-line">
      {contexto && (admiteCargaCorporal(ejercicio) || (contexto.carga && contexto.carga.modo !== 'externa') || sets.some(s => modoCarga(s) !== 'externa')) && <CargaEjercicio nombre={ejercicio.nombre} inicio={contexto.inicio} sets={sets} configuracion={contexto.carga} bloqueado={bloqueado} onGuardar={contexto.onCarga} />}
      {contexto?.onEjecucion && <EjecucionEjercicio ejercicio={ejercicio} sets={sets} configuracion={contexto.ejecucion} bloqueado={bloqueado} onGuardar={contexto.onEjecucion} />}
      </div></Disclosure>}
      {contexto?.workout && contexto.onProgresion && <ProgresionEjercicio ejercicio={ejercicio} workout={contexto.workout} sets={sets} objetivo={objetivo} bloqueado={bloqueado} onDecidir={contexto.onProgresion} />}
      <div className="space-y-3">
        {sets.length > 0 && (
          <div className="series-row text-caption text-fg-muted" aria-hidden>
            <span className="text-center">Serie</span><span className="text-center">Reps</span><span className="text-center">Kg</span><span className="series-rir-heading text-center">RIR</span><span />
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
                    disabled={!tieneReps(s) || bloqueado} title={!tieneReps(s) ? 'Introduce las repeticiones para completar la serie' : undefined}
                    onClick={() => onCompletar(s, numero ?? 0)}>
                    {hecha ? <Icon name="check" className="mx-auto" size={20} /> : numero ?? 'C'}
                  </button>
                ) : (
                  <span className="tabular text-center text-label font-bold text-fg-muted" aria-label={nombreSerie}>{numero ?? 'C'}</span>
                )}
                <div className="min-w-0 flex-1">
                  {s.ejecucion === 'lados' ? <span className="text-body-sm text-fg-muted">I / D</span> : <CampoSerie disabled={bloqueado} valor={s.reps} label={`Repeticiones, ${nombreSerie} de ${ejercicio.nombre}`} onChange={(reps) => actualizar(s.id, { reps })} />}
                </div>
                <div className="min-w-0 flex-1">
                  {s.ejecucion === 'lados' ? <span className="text-body-sm text-fg-muted">Por lado</span> : modoCarga(s) === 'corporal' ? <p className="break-words text-center text-body-sm text-fg-muted">Corporal</p> : <>
                    <CampoSerie disabled={bloqueado} valor={s.peso} label={`${modoCarga(s) === 'asistencia' ? 'Asistencia' : modoCarga(s) === 'lastre' ? 'Lastre' : 'Peso'} en kg, ${nombreSerie} de ${ejercicio.nombre}`} decimal onChange={(peso) => actualizar(s.id, { peso })} />
                  </>}
                </div>
                <div className="series-rir min-w-0">
                  {s.ejecucion === 'lados' ? <span className="text-caption text-fg-muted">Por lado</span> : <RirStepper disabled={bloqueado} label={`RIR, ${nombreSerie} de ${ejercicio.nombre}`} value={s.rir} onChange={rir => onActualizar(s.id, { rir })} />}
                </div>
                <IconButton icon="more" label={`Opciones de ${nombreSerie} de ${ejercicio.nombre}`} variant="ghost" size="sm" disabled={bloqueado} onClick={() => setMenu(s.id)} />
              </div>
              {contextoSerie(s) && <p className="break-words text-caption text-fg-muted">{contextoSerie(s)}</p>}
              {s.ejecucion === 'lados' && <div className="space-y-2"><p className="tabular break-words text-body-sm text-fg-muted">{describirReps(s)}</p><div className="flex flex-wrap gap-3">{(['izquierda', 'derecha'] as const).filter(l => s.lados?.[l]).map(l => <div key={l} className="flex min-w-0 flex-wrap items-center gap-2"><span className="text-caption text-fg-muted">RIR {l === 'izquierda' ? 'I' : 'D'}</span><RirStepper disabled={bloqueado} label={`RIR ${l}, ${nombreSerie} de ${ejercicio.nombre}`} value={s.lados![l]!.rir} onChange={rir => onActualizar(s.id, { lados: { ...s.lados, [l]: { ...s.lados![l]!, rir } } })} /></div>)}</div></div>}
              {s.bajadas?.map((b, i) => <p key={b.id} className="tabular break-words text-caption text-fg-muted">Bajada {i + 1}: {describirReps({ ...s, ...b })}{s.ejecucion !== 'lados' ? ` · ${formatearCarga({ ...s, ...b })}` : ''}</p>)}
              {(s.tipo === 'calentamiento' || modoCarga(s) !== 'externa') && (
                <p className="tabular break-words pl-1 text-caption text-fg-muted">{[s.tipo === 'calentamiento' ? 'Calentamiento' : null, modoCarga(s) !== 'externa' ? formatearCarga(s) : null].filter(Boolean).join(' · ')}</p>
              )}
            </div>
          )
        })}
      </div>
      <Button variant="ghost" block disabled={bloqueado} onClick={onAgregar}>
        <Icon name="plus" size={16} />
        Añadir serie
      </Button>
      {abierta && (
        <MenuSerie open titulo={`${abierta.numero === null ? 'Calentamiento' : `Serie ${abierta.numero}`} · ${ejercicio.nombre}`} serie={abierta.s} ejercicio={ejercicio} barraKg={barraKg}
          onClose={() => setMenu(null)} onCambiar={(patch) => actualizar(abierta.s.id, patch)} onTecnica={async patch => { await onActualizar(abierta.s.id, patch) }}
          onBorrar={() => { setMenu(null); onBorrar(abierta.s.id, abierta.numero ?? 0) }} />
      )}
    </Card>
  )
}
