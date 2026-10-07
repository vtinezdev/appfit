import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as routinesRepo from '../data/routinesRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import Button from '../../../shared/components/Button'
import { Input, Select } from '../../../shared/components/Input'
import NumberStepper from '../../../shared/components/NumberStepper'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { toISODate } from '../../../shared/lib/dates'
import { combinarFechaHora, formatHora, validarEntrenoPasado } from '../lib/workout'

interface Props {
  open: boolean
  onClose: () => void
  onRegistrado: (id: number) => void
}

/** Crea un entreno ya terminado (fecha, hora, duración y rutina opcional) y abre su editor. */
export default function RegistrarEntrenoPasado({ open, onClose, onRegistrado }: Props) {
  const rutinas = useLiveQuery(() => routinesRepo.listar(), [])
  const [fecha, setFecha] = useState(() => toISODate(new Date()))
  const [hora, setHora] = useState(() => formatHora(Date.now() - 3600_000))
  const [minutos, setMinutos] = useState(60)
  const [rutina, setRutina] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function registrar() {
    if (ocupado) return
    const inicio = combinarFechaHora(fecha, hora)
    const invalido = validarEntrenoPasado(inicio, minutos, Date.now())
    if (invalido) { setError(invalido); return }
    setOcupado(true)
    setError(null)
    try {
      const id = await workoutsRepo.crearPasado({ inicio: inicio!, fin: inicio! + minutos * 60000, routineId: rutina ? Number(rutina) : undefined })
      onClose()
      onRegistrado(id)
    } catch {
      setError('No se ha podido registrar el entreno. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Registrar entreno pasado"
      footer={<div className="space-y-2">{error && <ErrorState>{error}</ErrorState>}<Button block loading={ocupado} onClick={registrar}>Registrar y añadir series</Button></div>}>
      <div className="space-y-3">
        <p className="text-body-sm text-fg-muted">Para un entreno que no registraste en su momento. Después añades ejercicios y series.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block min-w-0 space-y-1"><span className="text-label text-fg-muted">Fecha</span>
            <Input type="date" max={toISODate(new Date())} value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
          <label className="block min-w-0 space-y-1"><span className="text-label text-fg-muted">Hora de inicio</span>
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} /></label>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-body-sm text-fg-muted">Duración</span>
          <NumberStepper label="duración en minutos" suffix="min" min={1} step={5} value={minutos} onChange={setMinutos} />
        </div>
        {!!rutinas?.length && (
          <label className="block space-y-1"><span className="text-label text-fg-muted">Rutina (opcional)</span>
            <Select value={rutina} onChange={(e) => setRutina(e.target.value)}>
              <option value="">Sin rutina</option>
              {rutinas.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </Select></label>
        )}
      </div>
    </Sheet>
  )
}
