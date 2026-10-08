import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { ConfiguracionCarga, ModoCarga, SetEntry } from '../../../shared/db/types'
import Button from '../../../shared/components/Button'
import Sheet from '../../../shared/components/Sheet'
import { Input, Select } from '../../../shared/components/Input'
import { ErrorState } from '../../../shared/components/StateMessage'
import { formatDiaMes, toISODate } from '../../../shared/lib/dates'
import { formatNumber } from '../../../shared/lib/format'
import { MODOS_CARGA, modoCarga } from '../lib/carga'
import * as pesosRepo from '../../inicio/data/pesosRepo'

export default function CargaEjercicio({ nombre, inicio, sets, configuracion, bloqueado, onGuardar }: {
  nombre: string; inicio: number; sets: SetEntry[]; configuracion?: ConfiguracionCarga; bloqueado?: boolean
  onGuardar: (carga: ConfiguracionCarga) => Promise<void>
}) {
  const [abierto, setAbierto] = useState(false)
  const [modo, setModo] = useState<ModoCarga>('externa')
  const [peso, setPeso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sugerido = useLiveQuery(() => pesosRepo.ultimoHasta(toISODate(new Date(inicio))), [inicio])
  const actual = configuracion?.modo ?? modoCarga(sets[0] ?? {})
  const mixto = sets.some(s => modoCarga(s) !== actual)
  async function guardar() {
    if (guardando) return
    const masa = peso.trim() ? Number(peso) : undefined
    if (modo !== 'externa' && masa !== undefined && (!Number.isFinite(masa) || masa <= 0 || masa > 1000)) { setError('Indica un peso corporal positivo o deja el campo vacío.'); return }
    setGuardando(true); setError(null)
    try { await onGuardar({ modo, ...(modo !== 'externa' && masa !== undefined ? { pesoCorporal: masa } : {}) }); setAbierto(false) }
    catch { setError('No se ha podido guardar la carga. Inténtalo de nuevo.') }
    finally { setGuardando(false) }
  }
  return <>
    <Button variant="subtle" size="sm" disabled={bloqueado} aria-label={`Tipo de carga de ${nombre}`} onClick={() => {
      setModo(actual)
      const masa = configuracion ? configuracion.pesoCorporal : sets[0]?.pesoCorporal ?? sugerido?.kg
      setPeso(masa === undefined ? '' : String(masa)); setError(null); setAbierto(true)
    }}>{mixto ? 'Cargas mixtas' : MODOS_CARGA[actual]}</Button>
    <Sheet open={abierto} onClose={() => { if (!guardando) setAbierto(false) }} title={`Carga · ${nombre}`}>
      <div className="space-y-section">
        <label className="block space-y-2"><span className="text-label text-fg-muted">Tipo de carga</span>
          <Select aria-label="Tipo de carga" value={modo} disabled={guardando} onChange={e => setModo(e.target.value as ModoCarga)}>
            {Object.entries(MODOS_CARGA).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </Select></label>
        {modo !== 'externa' && <label className="block space-y-2"><span className="text-label text-fg-muted">Peso corporal usado (kg), opcional</span>
          <Input type="number" inputMode="decimal" min={0} step={0.1} aria-label="Peso corporal usado" value={peso} disabled={guardando} onChange={e => setPeso(e.target.value)} placeholder="Sin dato" />
          {sugerido && <p className="text-caption text-fg-muted">Último pesaje hasta este entreno: {formatNumber(sugerido.kg, 2)} kg · {formatDiaMes(new Date(`${sugerido.fecha}T12:00`).getTime())}.</p>}
        </label>}
        <p className="text-body-sm text-fg-muted">Se aplica a todas las series de este ejercicio en este entreno. Al cambiar el tipo, sus kg empiezan en cero.</p>
        <p className="text-caption text-fg-muted">El volumen suma carga externa y lastre. No estima la masa del cuerpo movida ni suma la asistencia; en máquinas, más asistencia significa menos carga.</p>
        {error && <ErrorState>{error}</ErrorState>}
        <Button block loading={guardando} onClick={guardar}>Guardar carga</Button>
        <Button variant="ghost" block disabled={guardando} onClick={() => setAbierto(false)}>Cancelar</Button>
      </div>
    </Sheet>
  </>
}
