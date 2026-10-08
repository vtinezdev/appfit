import { useState } from 'react'
import type { ConfiguracionEjecucion, Exercise, SetEntry } from '../../../shared/db/types'
import Button from '../../../shared/components/Button'
import { Select } from '../../../shared/components/Input'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { ACCESORIOS, ANCHURAS, EJECUCIONES, ORIENTACIONES, opcionesAgarre } from '../lib/ejecucion'

export function CamposEjecucion({ ejercicio, valor, onChange, disabled }: { ejercicio: Exercise; valor: ConfiguracionEjecucion; onChange: (v: ConfiguracionEjecucion) => void; disabled?: boolean }) {
  const opciones = opcionesAgarre(ejercicio)
  const campos = [
    { id: 'orientacion' as const, titulo: 'Orientación del agarre', valores: ORIENTACIONES, visible: opciones.orientacion },
    { id: 'anchura' as const, titulo: 'Anchura del agarre', valores: ANCHURAS, visible: opciones.anchura },
    { id: 'accesorio' as const, titulo: 'Accesorio', valores: ACCESORIOS, visible: opciones.accesorio },
  ]
  return <div className="space-y-3">
    <label className="block space-y-1"><span className="text-label text-fg-muted">Ejecución</span><Select aria-label="Ejecución" disabled={disabled} value={valor.ejecucion} onChange={e => onChange({ ...valor, ejecucion: e.target.value as ConfiguracionEjecucion['ejecucion'] })}>{Object.entries(EJECUCIONES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</Select></label>
    {valor.ejecucion === 'unilateral' && <label className="block space-y-1"><span className="text-label text-fg-muted">Los kg representan</span><Select aria-label="Significado de kg unilaterales" disabled={disabled} value={valor.kgUnilateral ?? 'lado'} onChange={e => onChange({ ...valor, kgUnilateral: e.target.value as 'lado' | 'total' })}><option value="lado">Carga de cada lado</option><option value="total">Suma de ambos lados</option></Select></label>}
    {valor.ejecucion !== 'bilateral' && <p className="text-caption text-fg-muted">Las reps son por lado. Ambos iguales registra los dos lados; distinguir lados permite dejar uno sin registrar. Los kg no se multiplican dos veces.</p>}
    {campos.filter(c => c.visible || valor.agarre?.[c.id]).map(c => <label key={c.id} className="block space-y-1"><span className="text-label text-fg-muted">{c.titulo}</span><Select aria-label={c.titulo} disabled={disabled} value={valor.agarre?.[c.id] ?? ''} onChange={e => onChange({ ...valor, agarre: { ...valor.agarre, [c.id]: e.target.value || undefined } })}><option value="">Sin especificar</option>{Object.entries(c.valores).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</Select></label>)}
    <p className="text-caption text-fg-muted">El agarre conserva el ejercicio base y separa sus comparaciones. No cambia su clasificación muscular.</p>
  </div>
}
export default function EjecucionEjercicio({ ejercicio, sets, configuracion, bloqueado, onGuardar }: { ejercicio: Exercise; sets: SetEntry[]; configuracion?: ConfiguracionEjecucion; bloqueado?: boolean; onGuardar: (c: ConfiguracionEjecucion, habitual: boolean) => Promise<void> }) {
  const [abierto, setAbierto] = useState(false), [ocupado, setOcupado] = useState(false), [error, setError] = useState<string | null>(null)
  const [valor, setValor] = useState<ConfiguracionEjecucion>({ ejecucion: 'bilateral' }), [habitual, setHabitual] = useState(false)
  const actual = configuracion ?? { ejecucion: sets[0]?.ejecucion ?? 'bilateral', kgUnilateral: sets[0]?.kgUnilateral, agarre: sets[0]?.agarre }
  async function guardar() { setOcupado(true); setError(null); try { await onGuardar(valor, habitual); setAbierto(false) } catch (e) { setError(e instanceof Error ? e.message : 'No se ha podido guardar. Inténtalo de nuevo.') } finally { setOcupado(false) } }
  return <>
    <Button variant="ghost" size="sm" disabled={bloqueado} onClick={() => { setValor(structuredClone(actual)); setHabitual(false); setError(null); setAbierto(true) }}>Ejecución y agarre</Button>
    <Sheet open={abierto} onClose={() => { if (!ocupado) setAbierto(false) }} title={`Ejecución · ${ejercicio.nombre}`}><div className="space-y-section">
      <CamposEjecucion ejercicio={ejercicio} valor={valor} onChange={setValor} disabled={ocupado} />
      <p className="text-body-sm text-fg-muted">Se aplica a todas las series de este ejercicio en esta sesión. Cambiar bilateral/unilateral o el significado de kg vacía los valores para que los registres correctamente. Puedes elegir un agarre distinto por serie desde sus opciones.</p>
      <label className="flex min-h-touch items-center gap-3 text-body-sm"><input type="checkbox" checked={habitual} disabled={ocupado} onChange={e => setHabitual(e.target.checked)} />Usar como ejecución habitual en nuevas sesiones</label>
      {error && <ErrorState>{error}</ErrorState>}<Button block loading={ocupado} onClick={guardar}>Guardar ejecución</Button><Button block variant="ghost" disabled={ocupado} onClick={() => setAbierto(false)}>Cancelar</Button>
    </div></Sheet>
  </>
}
