import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { ConfiguracionCarga, ModoCarga, SetEntry } from '../../../shared/db/types'
import Button from '../../../shared/components/Button'
import Sheet from '../../../shared/components/Sheet'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import { Input } from '../../../shared/components/Input'
import { ErrorState } from '../../../shared/components/StateMessage'
import { formatDiaMes, toISODate } from '../../../shared/lib/dates'
import { formatNumber } from '../../../shared/lib/format'
import { MODOS_CARGA, modoCarga } from '../lib/carga'
import * as pesosRepo from '../../inicio/data/pesosRepo'
import Disclosure from '../../../shared/components/Disclosure'

const DESCRIPCION: Record<ModoCarga, string> = {
  externa: 'Kg de la barra, mancuernas o máquina',
  corporal: 'Solo tu cuerpo, sin carga añadida',
  lastre: 'Kg añadidos a tu peso corporal',
  asistencia: 'Kg de ayuda de la máquina; menos ayuda es más carga',
}

/** Modo vigente del ejercicio en la sesión: la configuración guardada o el de sus series. */
export function cargaActual(sets: SetEntry[], configuracion?: ConfiguracionCarga): { modo: ModoCarga; pesoCorporal?: number; mixta: boolean } {
  const modo = configuracion?.modo ?? modoCarga(sets[0] ?? {})
  return { modo, pesoCorporal: configuracion ? configuracion.pesoCorporal : sets[0]?.pesoCorporal, mixta: sets.some(s => modoCarga(s) !== modo) }
}
export function textoCarga(sets: SetEntry[], configuracion?: ConfiguracionCarga): string {
  const c = cargaActual(sets, configuracion)
  if (c.mixta) return 'Cargas mixtas'
  return `${MODOS_CARGA[c.modo]}${c.modo !== 'externa' && c.pesoCorporal !== undefined ? ` · ${formatNumber(c.pesoCorporal, 2)} kg` : ''}`
}

/** Se monta al abrir: parte siempre de la configuración vigente. */
export default function CargaEjercicio({ nombre, inicio, sets, configuracion, onGuardar, onClose }: {
  nombre: string; inicio: number; sets: SetEntry[]; configuracion?: ConfiguracionCarga
  onGuardar: (carga: ConfiguracionCarga) => Promise<void>; onClose: () => void
}) {
  const actual = cargaActual(sets, configuracion)
  const [modo, setModo] = useState<ModoCarga>(actual.modo)
  // null = sin decidir: se propone el pesaje. Una configuración guardada sin masa es «desconocida» a propósito.
  const [peso, setPeso] = useState<string | null>(configuracion ? String(configuracion.pesoCorporal ?? '') : actual.pesoCorporal === undefined ? null : String(actual.pesoCorporal))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sugerido = useLiveQuery(() => pesosRepo.ultimoHasta(toISODate(new Date(inicio))), [inicio])
  // Sin masa guardada se propone el último pesaje hasta la fecha del entreno.
  const texto = peso ?? (sugerido ? String(sugerido.kg) : '')
  async function guardar() {
    if (guardando) return
    const masa = texto.trim() ? Number(texto) : undefined
    if (modo !== 'externa' && masa !== undefined && (!Number.isFinite(masa) || masa <= 0 || masa > 1000)) { setError('Indica un peso corporal positivo o deja el campo vacío.'); return }
    setGuardando(true); setError(null)
    try { await onGuardar({ modo, ...(modo !== 'externa' && masa !== undefined ? { pesoCorporal: masa } : {}) }); onClose() }
    catch { setError('No se ha podido guardar la carga. Inténtalo de nuevo.') }
    finally { setGuardando(false) }
  }
  return (
    <Sheet open onClose={() => { if (!guardando) onClose() }} title={`Carga · ${nombre}`} footer={<div className="space-y-2"><Button block loading={guardando} onClick={guardar}>Guardar carga</Button><Button variant="ghost" block disabled={guardando} onClick={onClose}>Cancelar</Button></div>}>
      <div className="space-y-section">
        <SegmentedControl variante="vertical" label="Tipo de carga" valor={modo} onChange={setModo}
          opciones={(Object.keys(MODOS_CARGA) as ModoCarga[]).map(m => ({ valor: m, label: MODOS_CARGA[m], descripcion: DESCRIPCION[m] }))} />
        {modo !== 'externa' && <label className="block space-y-2"><span className="text-label text-fg-muted">Peso corporal usado (kg), opcional</span>
          <Input type="number" inputMode="decimal" min={0} step={0.1} aria-label="Peso corporal usado" value={texto} disabled={guardando} onChange={e => setPeso(e.target.value)} placeholder="Sin dato" />
          {sugerido && <p className="text-caption text-fg-muted">Último pesaje hasta este entreno: {formatNumber(sugerido.kg, 2)} kg · {formatDiaMes(new Date(`${sugerido.fecha}T12:00`).getTime())}.</p>}
        </label>}
        <p className="text-body-sm text-fg-muted">Se aplica a todas las series de este ejercicio en este entreno. Al cambiar el tipo, sus kg empiezan en cero.</p>
        <Disclosure title="Cómo se contabiliza"><p className="text-body-sm text-fg-muted">El volumen suma carga externa y lastre. No estima la masa del cuerpo movida ni suma la asistencia; en máquinas, más asistencia significa menos carga.</p></Disclosure>
        {error && <ErrorState>{error}</ErrorState>}
      </div>
    </Sheet>
  )
}
