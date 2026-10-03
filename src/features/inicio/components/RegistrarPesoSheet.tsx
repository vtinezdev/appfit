import { useState } from 'react'
import Button from '../../../shared/components/Button'
import NumberStepper from '../../../shared/components/NumberStepper'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { PESO_MAX, PESO_MIN, validarPeso } from '../lib/peso'

interface Props {
  open: boolean
  onClose: () => void
  /** Valor con el que arranca el selector (último peso, o 70). Se lee al montar: el padre cambia `key` en cada apertura. */
  pesoInicial: number
  /** Guarda el peso ya validado. Si lanza, el error se enseña en línea. */
  onGuardar: (kg: number) => Promise<void>
}

/** Registro del peso de hoy. Mismo día = se sobrescribe, y se avisa para que no sorprenda. */
export default function RegistrarPesoSheet({ open, onClose, pesoInicial, onGuardar }: Props) {
  const [kg, setKg] = useState(pesoInicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    const valido = validarPeso(kg)
    if (valido === null) {
      setError(`Introduce un peso entre ${PESO_MIN} y ${PESO_MAX} kg.`)
      return
    }
    if (guardando) return
    setGuardando(true)
    setError(null)
    try {
      await onGuardar(valido)
    } catch {
      setError('No se ha podido guardar. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Registrar peso" footer={<div className="space-y-2">
      {error && <ErrorState>{error}</ErrorState>}
      <Button block loading={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
    </div>}>
      <div className="space-y-4">
        <div className="flex justify-center">
          <NumberStepper value={kg} onChange={setKg} step={0.1} min={0} suffix="kg" label="Peso" />
        </div>
        <p className="text-center text-caption text-fg-subtle">Un pesaje por día: si ya hay uno de hoy, se sustituye.</p>
      </div>
    </Sheet>
  )
}
