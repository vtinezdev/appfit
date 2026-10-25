import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Campo from '../../../shared/components/Campo'
import { Select, Textarea } from '../../../shared/components/Input'
import { ErrorState } from '../../../shared/components/StateMessage'
import { MOTIVOS_DENUNCIA, type MotivoDenuncia } from '../data/social'

const DETALLE_MAX = 500

interface Props {
  /** Envía la denuncia; si falla, el error se ve aquí y se puede reintentar. */
  onEnviar: (motivo: MotivoDenuncia, detalle: string | null) => Promise<void>
  onCancelar: () => void
}

/** Motivo y detalle opcional de una denuncia (de un perfil, una publicación o un comentario). Va dentro de un Sheet. */
export default function FormDenuncia({ onEnviar, onCancelar }: Props) {
  const [motivo, setMotivo] = useState<MotivoDenuncia>('acoso')
  const [detalle, setDetalle] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviar() {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    try {
      const texto = detalle.trim()
      await onEnviar(motivo, texto === '' ? null : texto)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido enviar. Inténtalo de nuevo.')
      setOcupado(false)
    }
  }

  return (
    <form className="space-y-stack" onSubmit={(e) => { e.preventDefault(); void enviar() }} noValidate>
      <p className="text-body-sm text-fg-muted">La revisaremos. No se dice quién ha denunciado.</p>
      <Campo etiqueta="Motivo">
        <Select value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoDenuncia)}>
          {MOTIVOS_DENUNCIA.map((m) => <option key={m.valor} value={m.valor}>{m.label}</option>)}
        </Select>
      </Campo>
      <Campo etiqueta="Detalle (opcional)" ayuda={`Como mucho ${DETALLE_MAX} caracteres.`}>
        <Textarea rows={3} maxLength={DETALLE_MAX} value={detalle} onChange={(e) => setDetalle(e.target.value)} />
      </Campo>
      {error && <ErrorState>{error}</ErrorState>}
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" disabled={ocupado} onClick={onCancelar}>Cancelar</Button>
        <Button type="submit" variant="primary" className="flex-1" loading={ocupado}>Enviar</Button>
      </div>
    </form>
  )
}
