import { useState } from 'react'
import Button from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { formatFriendly } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { kmTexto } from '../../actividades/lib/actividad'
import { PasosInvalidos } from '../data/pasosRepo'
import { ERROR_PASOS, leerPasos, metrosDePasos, pasosTexto } from '../lib/pasos'

interface Props {
  open: boolean
  onClose: () => void
  hoy: string
  /** Al editar, el día (fijo) y sus pasos; si no, se elige el día (por defecto hoy). */
  editando?: { fecha: string; pasos: number }
  /** Pasos ya apuntados por día, para avisar de que se sustituyen. */
  apuntados: ReadonlyMap<string, number>
  zancadaCm: number
  /** Guarda; si falla, el mensaje se muestra en la hoja. */
  onGuardar: (fecha: string, pasos: number) => Promise<void>
}

/** Apuntar o corregir el total de pasos de un día. Montar con `key` para empezar de cero. */
export default function HojaPasos({ open, onClose, hoy, editando, apuntados, zancadaCm, onGuardar }: Props) {
  const [fecha, setFecha] = useState(editando?.fecha ?? hoy)
  const [texto, setTexto] = useState(editando ? String(editando.pasos) : '')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const pasos = leerPasos(texto)
  const previos = editando ? undefined : apuntados.get(fecha)

  async function guardar() {
    if (guardando) return
    if (!fecha || fecha > hoy) { setError('Elige un día que no sea futuro.'); return }
    if (pasos === null) { setError(ERROR_PASOS); return }
    setGuardando(true)
    setError(null)
    try {
      await onGuardar(fecha, pasos)
    } catch (e) {
      setError(e instanceof PasosInvalidos ? e.message : 'No se han podido guardar los pasos. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={editando ? `Pasos · ${formatFriendly(editando.fecha)}` : 'Apuntar pasos'}
      footer={<div className="space-y-2">{error && <ErrorState>{error}</ErrorState>}<Button block loading={guardando} onClick={guardar}>Guardar pasos</Button></div>}>
      <div className="space-y-4">
        <p className="break-words text-body-sm text-fg-muted">El total del día que marca tu móvil (Salud o Google Fit). Avanzan tu Camino los km que no estén ya en tus actividades de ese día.</p>
        <div className="grid grid-cols-2 gap-3">
          {!editando && <label className="block min-w-0 space-y-1"><span className="text-label text-fg-muted">Día</span>
            <Input type="date" max={hoy} value={fecha} onChange={(e) => { setFecha(e.target.value); setError(null) }} /></label>}
          <label className={`block min-w-0 space-y-1 ${editando ? 'col-span-2' : ''}`}><span className="text-label text-fg-muted">Pasos</span>
            <Input inputMode="numeric" enterKeyHint="done" autoComplete="off" value={texto} placeholder="8432" onFocus={(e) => e.target.select()}
              aria-invalid={texto !== '' && pasos === null ? true : undefined}
              onChange={(e) => { setTexto(e.target.value); setError(null) }} onKeyDown={(e) => { if (e.key === 'Enter') void guardar() }} /></label>
        </div>
        <p className="tabular break-words text-body-sm text-fg" aria-live="polite">
          {pasos !== null ? `≈ ${kmTexto(metrosDePasos(pasos, zancadaCm))} con tu zancada de ${formatInt(zancadaCm)} cm` : `Tu zancada: ${formatInt(zancadaCm)} cm`}
        </p>
        {previos !== undefined && <p className="tabular break-words text-body-sm text-fg-muted">Ese día ya tenía {pasosTexto(previos)}: los sustituyes.</p>}
      </div>
    </Sheet>
  )
}
