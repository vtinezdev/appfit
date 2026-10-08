import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Exercise, ObjetivoEjercicio, PlanProgresion, SetEntry, Workout } from '../../../shared/db/types'
import Button from '../../../shared/components/Button'
import OpcionEjercicio from './OpcionEjercicio'
import Disclosure from '../../../shared/components/Disclosure'
import Sheet from '../../../shared/components/Sheet'
import { DecimalInput } from '../../../shared/components/Input'
import { ErrorState } from '../../../shared/components/StateMessage'
import { formatFechaHora } from '../../../shared/lib/dates'
import * as exercisesRepo from '../data/exercisesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import { recomendarProgresion } from '../lib/progresion'

export default function ProgresionEjercicio({ ejercicio, workout, sets, objetivo, bloqueado, onDecidir }: { ejercicio: Exercise; workout: Workout; sets: SetEntry[]; objetivo?: ObjetivoEjercicio; bloqueado?: boolean; onDecidir: (clave: string, decision: 'aplicada' | 'mantener' | 'descartada') => Promise<void> }) {
  const todos = useLiveQuery(() => workoutsRepo.listar(), []), historico = useLiveQuery(() => setsRepo.delEjercicio(ejercicio.id), [ejercicio.id])
  const [abierto, setAbierto] = useState(false), [editando, setEditando] = useState(false), [ocupado, setOcupado] = useState(false), [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<PlanProgresion>>({})
  const plan = ejercicio.progresion ?? objetivo
  const base = sets.find(s => s.tipo !== 'calentamiento')
  const resultado = base ? recomendarProgresion(ejercicio.id, base, plan, todos ?? [], historico ?? [], workout.inicio) : { estado: 'Añade una serie para comparar.' }
  const p = resultado.propuesta
  const decision = workout.decisionesProgresion?.[ejercicio.id]
  const resuelta = p && decision?.clave === p.clave
  async function accion(f: () => Promise<void>) { setOcupado(true); setError(null); try { await f() } catch (e) { setError(e instanceof Error ? e.message : 'No se ha podido guardar. Inténtalo de nuevo.') } finally { setOcupado(false) } }
  const campos: { key: keyof PlanProgresion; label: string }[] = [{ key: 'series', label: 'Series objetivo' }, { key: 'repsMin', label: 'Repeticiones mínimas' }, { key: 'repsMax', label: 'Repeticiones máximas' }, { key: 'incrementoKg', label: 'Incremento disponible en kg (opcional)' }, { key: 'rirMin', label: 'RIR mínimo objetivo (opcional)' }]
  return <>
    <OpcionEjercicio titulo="Progresión" detalle={p && !resuelta ? p.texto : plan ? `${plan.series} series · ${plan.repsMin}–${plan.repsMax} reps` : 'Configurar objetivo y consultar sugerencias'} aria-label={p && !resuelta ? p.texto : `Progresión de ${ejercicio.nombre}`} disabled={bloqueado} onClick={() => { setError(null); setEditando(false); setAbierto(true) }} />
    <Sheet open={abierto} onClose={() => { if (!ocupado) setAbierto(false) }} title={`Progresión · ${ejercicio.nombre}`}><div className="space-y-section">
      {editando ? <>
        <p className="text-body-sm text-fg-muted">Este objetivo habitual se usa para las sugerencias, sin modificar tu rutina. Indica el incremento real de tu equipo; no se deduce automáticamente.</p>
        <fieldset className="space-y-3"><legend className="mb-3 text-title font-semibold">Objetivo de repeticiones</legend>{campos.slice(0, 3).map(c => <label key={c.key} className="block space-y-1"><span className="text-label text-fg-muted">{c.label}</span><DecimalInput aria-label={c.label} value={draft[c.key]} disabled={ocupado} onChange={valor => setDraft(d => ({ ...d, [c.key]: valor }))} /></label>)}</fieldset>
        <fieldset className="space-y-3 border-t border-line pt-4"><legend className="text-title font-semibold">Criterios para subir</legend>{campos.slice(3).map(c => <label key={c.key} className="block space-y-1"><span className="text-label text-fg-muted">{c.label}</span><DecimalInput aria-label={c.label} value={draft[c.key]} disabled={ocupado} onChange={valor => setDraft(d => ({ ...d, [c.key]: valor }))} /></label>)}</fieldset>
        <Button block loading={ocupado} onClick={() => accion(async () => { await exercisesRepo.guardarProgresion(ejercicio.id, draft as PlanProgresion); setEditando(false) })}>Guardar objetivo</Button>
        {ejercicio.progresion && <Button variant="ghost" block disabled={ocupado} onClick={() => accion(async () => { await exercisesRepo.guardarProgresion(ejercicio.id, undefined); setEditando(false) })}>Usar objetivo de rutina</Button>}
        <Button variant="ghost" block disabled={ocupado} onClick={() => setEditando(false)}>Cancelar edición</Button>
      </> : <>
        <p className="text-body font-semibold text-fg">{p?.texto ?? resultado.estado}</p>
        {p && <><p className="text-body-sm text-fg-muted">{p.motivo}</p><section className="space-y-2"><h3 className="text-label text-fg-muted">Sesiones utilizadas</h3><ul className="text-body-sm text-fg-muted">{p.sesiones.map(s => <li key={s.id}>{formatFechaHora(s.inicio)}</li>)}</ul></section>
          {resuelta ? <p role="status" className="text-body-sm text-fg-muted">{decision!.decision === 'aplicada' ? 'Propuesta aplicada' : decision!.decision === 'mantener' ? 'Has decidido mantener tus valores' : 'Propuesta descartada'} en esta sesión.</p> : <div className="space-y-2">
            <Button block loading={ocupado} disabled={sets.some(s => s.realizada === true)} onClick={() => accion(() => onDecidir(p.clave, 'aplicada'))}>Aplicar propuesta</Button>
            <Button variant="secondary" block disabled={ocupado} onClick={() => accion(() => onDecidir(p.clave, 'mantener'))}>Mantener mis valores</Button><Button variant="ghost" block disabled={ocupado} onClick={() => accion(() => onDecidir(p.clave, 'descartada'))}>Descartar propuesta</Button>
          </div>}
        </>}
        <Disclosure title="Cómo se calcula la sugerencia"><p className="text-body-sm text-fg-muted">Sugerencia basada en 3 sesiones confirmadas, no una garantía de capacidad. No cambia nada sin Aplicar. Calentamientos, dropsets y negativas quedan fuera. La realización desconocida del historial antiguo no se supone completada.</p></Disclosure>
        <Button variant="secondary" block disabled={ocupado} onClick={() => { setDraft({ ...plan }); setEditando(true) }}>Configurar progresión</Button>
      </>}
      {error && <ErrorState>{error}</ErrorState>}
    </div></Sheet>
  </>
}
