import { useState } from 'react'
import type { DatosLado, Exercise, SetEntry, TramoDropset } from '../../../shared/db/types'
import Button, { IconButton } from '../../../shared/components/Button'
import { DecimalInput, Select } from '../../../shared/components/Input'
import { ErrorState } from '../../../shared/components/StateMessage'
import { aplicarEjecucion, validarSerie } from '../lib/ejecucion'
import { modoCarga } from '../lib/carga'
import { CamposEjecucion } from './EjecucionEjercicio'
import type { CambiosSerie } from '../data/setsRepo'

export function DatosTramoEditor({ serie, tramo, label, onChange, disabled }: { serie: SetEntry; tramo: Pick<TramoDropset, 'reps' | 'peso' | 'lados'>; label: string; onChange: (d: Pick<TramoDropset, 'reps' | 'peso' | 'lados'>) => void; disabled?: boolean }) {
  const campos = (p: DatosLado, titulo: string, cambiar: (p: DatosLado) => void) => <div className="grid grid-cols-2 gap-3">
    <label className="block min-w-0 space-y-1"><span className="text-caption text-fg-muted">Reps</span><DecimalInput aria-label={`Reps ${titulo}`} value={p.reps} disabled={disabled} onChange={reps => cambiar({ ...p, reps: reps ?? 0 })} /></label>
    {modoCarga(serie) !== 'corporal' && <label className="block min-w-0 space-y-1"><span className="text-caption text-fg-muted">{modoCarga(serie) === 'asistencia' ? 'Ayuda kg' : modoCarga(serie) === 'lastre' ? 'Lastre kg' : 'Kg'}</span><DecimalInput aria-label={`Kg ${titulo}`} value={p.peso} disabled={disabled} onChange={peso => cambiar({ ...p, peso: peso ?? 0 })} /></label>}
  </div>
  if (serie.ejecucion !== 'lados') return campos(tramo, label, p => onChange({ ...tramo, ...p }))
  return <div className="space-y-3">{(['izquierda', 'derecha'] as const).map(lado => {
    const p = tramo.lados?.[lado]
    return <div key={lado} className="space-y-2"><label className="flex min-h-touch items-center gap-3 text-body-sm"><input type="checkbox" disabled={disabled} checked={!!p} onChange={e => { const lados = { ...tramo.lados }; if (e.target.checked) lados[lado] = { reps: 0, peso: 0 }; else delete lados[lado]; onChange({ ...tramo, lados }) }} />{lado === 'izquierda' ? 'Izquierda' : 'Derecha'} registrada</label>
      {p && <>{campos(p, `${label} ${lado}`, nuevo => onChange({ ...tramo, lados: { ...tramo.lados, [lado]: nuevo } }))}<label className="block space-y-1"><span className="text-caption text-fg-muted">RIR del lado</span><Select aria-label={`RIR ${label} ${lado}`} disabled={disabled} value={p.rir ?? ''} onChange={e => onChange({ ...tramo, lados: { ...tramo.lados, [lado]: { ...p, rir: e.target.value === '' ? undefined : Number(e.target.value) } } })}><option value="">—</option>{[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}</Select></label></>}
    </div>
  })}</div>
}
/** Borrador explícito: cancelar conserva todos los tramos originales; guardar es atómico. */
export default function TecnicaSerie({ serie, ejercicio, onGuardar, onClose }: { serie: SetEntry; ejercicio: Exercise; onGuardar: (patch: CambiosSerie) => Promise<void>; onClose: () => void }) {
  const [draft, setDraft] = useState(() => structuredClone(serie)), [ocupado, setOcupado] = useState(false), [error, setError] = useState<string | null>(null)
  async function guardar() {
    setError(null); setOcupado(true)
    try {
      validarSerie(draft)
      const { reps, peso, ejecucion, kgUnilateral, agarre, lados, soloNegativas, excentricaSeg, bajadas } = draft
      await onGuardar({ reps, peso, ejecucion, kgUnilateral, agarre, lados, soloNegativas, excentricaSeg, bajadas: bajadas?.length ? bajadas : undefined }); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'No se ha podido guardar. Inténtalo de nuevo.') } finally { setOcupado(false) }
  }
  return <div className="space-y-section">
    <CamposEjecucion ejercicio={ejercicio} valor={{ ejecucion: draft.ejecucion ?? 'bilateral', kgUnilateral: draft.kgUnilateral, agarre: draft.agarre }} disabled={ocupado} onChange={c => setDraft(s => ({ ...s, ...aplicarEjecucion(s, c) }))} />
    <section className="space-y-3" aria-label="Tramo inicial"><h3 className="text-title">Tramo inicial</h3><DatosTramoEditor serie={draft} tramo={draft} label="tramo inicial" disabled={ocupado} onChange={t => setDraft(s => ({ ...s, ...t }))} /></section>
    <label className="block space-y-1"><span className="text-label text-fg-muted">Repetición</span><Select aria-label="Fase de la repetición" disabled={ocupado} value={draft.soloNegativas ? 'negativa' : 'completa'} onChange={e => setDraft(s => ({ ...s, soloNegativas: e.target.value === 'negativa' ? true : undefined }))}><option value="completa">Completa</option><option value="negativa">Solo negativa</option></Select></label>
    <label className="block space-y-1"><span className="text-label text-fg-muted">Segundos de descenso (opcional)</span><DecimalInput aria-label="Segundos de descenso" value={draft.excentricaSeg} disabled={ocupado} onChange={excentricaSeg => setDraft(s => ({ ...s, excentricaSeg }))} /></label>
    <p className="text-caption text-fg-muted">Descenso lento sigue siendo una repetición completa. Solo negativas registra únicamente la fase excéntrica y no se compara con repeticiones completas ni estima 1RM.</p>
    <section aria-label="Bajadas de dropset" className="space-y-3"><h3 className="text-title">Dropset</h3>
      {(draft.bajadas ?? []).map((b, i) => <div key={b.id} className="space-y-2 border-t border-line pt-3"><div className="flex items-center justify-between gap-2"><h4 className="text-body font-semibold">Bajada {i + 1}</h4><IconButton icon="trash" variant="ghost" label={`Quitar bajada ${i + 1}`} disabled={ocupado} onClick={() => setDraft(s => ({ ...s, bajadas: s.bajadas?.filter(t => t.id !== b.id) }))} /></div><DatosTramoEditor serie={draft} tramo={b} label={`bajada ${i + 1}`} disabled={ocupado} onChange={t => setDraft(s => ({ ...s, bajadas: s.bajadas?.map(x => x.id === b.id ? { ...x, ...t } : x) }))} /></div>)}
      <Button variant="secondary" block disabled={ocupado || (draft.bajadas?.length ?? 0) >= 10} onClick={() => setDraft(s => ({ ...s, bajadas: [...(s.bajadas ?? []), { id: crypto.randomUUID(), reps: 0, peso: 0 }] }))}>Añadir bajada</Button>
      <p className="text-caption text-fg-muted">Los tramos forman una sola serie extendida. Su volumen se suma una vez; la serie queda fuera de récords convencionales y sugerencias de progresión. Guardar confirma los cambios; cancelar también deshace las bajadas eliminadas.</p>
    </section>
    {error && <ErrorState>{error}</ErrorState>}<Button block loading={ocupado} onClick={guardar}>Guardar técnica</Button><Button variant="ghost" block disabled={ocupado} onClick={onClose}>Cancelar</Button>
  </div>
}
