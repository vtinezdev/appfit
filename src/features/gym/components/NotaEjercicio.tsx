import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { IconButton } from '../../../shared/components/Button'
import Button from '../../../shared/components/Button'
import Sheet from '../../../shared/components/Sheet'
import { Textarea } from '../../../shared/components/Input'
import { ErrorState } from '../../../shared/components/StateMessage'
import { formatDiaMes } from '../../../shared/lib/dates'
import * as workoutsRepo from '../data/workoutsRepo'

export default function NotaEjercicio({ workoutId, exerciseId, nombre, inicio, nota, bloqueado }: {
  workoutId: number; exerciseId: number; nombre: string; inicio: number; nota?: string; bloqueado?: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const anterior = useLiveQuery(() => abierto ? workoutsRepo.ultimaNotaEjercicio(exerciseId, inicio) : undefined, [abierto, exerciseId, inicio])
  async function guardar() {
    if (guardando) return
    setGuardando(true); setError(null)
    try { await workoutsRepo.guardarNotaEjercicio(workoutId, exerciseId, texto); setAbierto(false) }
    catch { setError('No se ha podido guardar la nota. Inténtalo de nuevo.') }
    finally { setGuardando(false) }
  }
  return <>
    <IconButton icon="pencil" variant="ghost" size="sm" label={`${nota ? 'Editar' : 'Añadir'} nota de ${nombre}`} disabled={bloqueado}
      onClick={() => { setTexto(nota ?? ''); setError(null); setAbierto(true) }} />
    <Sheet open={abierto} onClose={() => { if (!guardando) setAbierto(false) }} title={`Nota · ${nombre}`}>
      <div className="space-y-section">
        <label className="block space-y-2"><span className="text-label text-fg-muted">Nota de este ejercicio en este entreno</span>
          <Textarea aria-label={`Nota de ${nombre}`} rows={4} value={texto} disabled={guardando} onChange={e => setTexto(e.target.value)} placeholder="Ajuste de máquina, técnica, sensaciones…" /></label>
        {anterior && <div className="space-y-1"><p className="text-label text-fg-muted">Última nota · {formatDiaMes(anterior.inicio)}</p><p className="whitespace-pre-wrap break-words text-body-sm text-fg">{anterior.nota}</p></div>}
        {error && <ErrorState>{error}</ErrorState>}
        <Button block loading={guardando} onClick={guardar}>Guardar nota</Button>
        <Button block variant="ghost" disabled={guardando} onClick={() => setAbierto(false)}>Cancelar</Button>
      </div>
    </Sheet>
  </>
}
