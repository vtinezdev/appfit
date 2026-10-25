import { useState } from 'react'
import Button from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'
import { ZancadaInvalida } from '../data/caminosRepo'
import { ERROR_ZANCADA, validarZancada, type Zancada } from '../lib/pasos'

interface Props {
  open: boolean
  onClose: () => void
  zancada: Zancada
  estimada: Zancada
  /** Guarda la propia o, con `undefined`, vuelve a la estimada; si falla, el mensaje se muestra en la hoja. */
  onGuardar: (cm: number | undefined) => Promise<void>
}

/** La zancada con la que los pasos pasan a metros. Montar con `key` para empezar de cero. */
export default function HojaZancada({ open, onClose, zancada, estimada, onGuardar }: Props) {
  const [texto, setTexto] = useState(String(zancada.cm))
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const cm = /^\d+$/.test(texto.trim()) ? validarZancada(Number(texto.trim())) : null

  async function guardar(valor: number | undefined) {
    if (guardando) return
    setGuardando(true)
    setError(null)
    try {
      await onGuardar(valor)
    } catch (e) {
      setError(e instanceof ZancadaInvalida ? e.message : 'No se ha podido guardar la zancada. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Tu zancada"
      footer={<div className="space-y-2">
        {error && <ErrorState>{error}</ErrorState>}
        <Button block loading={guardando} onClick={() => (cm === null ? setError(ERROR_ZANCADA) : void guardar(cm === estimada.cm ? undefined : cm))}>Guardar zancada</Button>
        {zancada.origen === 'propia' && <Button block variant="ghost" disabled={guardando} onClick={() => void guardar(undefined)}>Usar la estimada ({formatInt(estimada.cm)} cm)</Button>}
      </div>}>
      <div className="space-y-4">
        <label className="block space-y-1"><span className="text-label text-fg-muted">Zancada (cm)</span>
          <Input inputMode="numeric" enterKeyHint="done" autoComplete="off" value={texto} onFocus={(e) => e.target.select()}
            aria-invalid={cm === null ? true : undefined} onChange={(e) => { setTexto(e.target.value); setError(null) }} /></label>
        <p className="break-words text-body-sm text-fg-muted">
          {estimada.origen === 'altura'
            ? `Por tu altura, unos ${formatInt(estimada.cm)} cm (0,415 × la altura; 0,413 en mujeres). Es una estimación, como la de los podómetros.`
            : `Sin tu altura en Perfil se usan ${formatInt(estimada.cm)} cm. Con ella, AppFit la estima.`}
        </p>
        <p className="break-words text-body-sm text-fg-muted">Para medirla: cuenta los pasos que das en 10 metros caminando normal; tu zancada son 1.000 cm entre esos pasos.</p>
      </div>
    </Sheet>
  )
}
