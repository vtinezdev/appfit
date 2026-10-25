import { useState } from 'react'
import * as routinesRepo from '../data/routinesRepo'
import Button from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'

interface Props {
  open: boolean
  onClose: () => void
  workoutId: number
  nombreInicial: string
  ejercicios: number
  /** Ya guardada: id y nombre final (con «(2)» si el elegido ya existía). */
  onGuardada: (id: number, nombre: string) => void
}

/** Guarda un entreno terminado como rutina nueva: sus ejercicios en orden, con las series, reps y calentamientos de ese día. */
export default function GuardarComoRutina({ open, onClose, workoutId, nombreInicial, ejercicios, onGuardada }: Props) {
  const [nombre, setNombre] = useState(nombreInicial)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    if (guardando) return
    if (!nombre.trim()) { setError('Ponle un nombre a la rutina.'); return }
    setGuardando(true)
    setError(null)
    try {
      const id = await routinesRepo.guardarDesdeEntreno(workoutId, nombre)
      const guardada = await routinesRepo.obtener(id)
      onClose()
      onGuardada(id, guardada?.nombre ?? nombre.trim())
    } catch (e) {
      setError(e instanceof routinesRepo.RutinaVacia ? e.message : 'No se ha podido guardar la rutina. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return <Sheet open={open} onClose={onClose} title="Guardar como rutina"
    footer={<div className="space-y-2">{error && <ErrorState>{error}</ErrorState>}<Button block loading={guardando} onClick={guardar}>Guardar rutina</Button></div>}>
    <div className="space-y-3">
      <p className="break-words text-body-sm text-fg-muted">
        La rutina tendrá {ejercicios === 1 ? 'el ejercicio' : `los ${formatInt(ejercicios)} ejercicios`} de este entreno, en el mismo orden, con las series, el rango de repeticiones y los calentamientos de ese día. Después puedes cambiarla en Rutinas.
      </p>
      <label className="block space-y-1"><span className="text-label text-fg-muted">Nombre de la rutina</span>
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la rutina" /></label>
    </div>
  </Sheet>
}
