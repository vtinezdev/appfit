import VoiceRecorder from '../../../shared/components/VoiceRecorder'
import type { EntradaComida } from '../hooks/useInterpretarComida'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { Textarea } from '../../../shared/components/Input'
import SectionHeader from '../../../shared/components/SectionHeader'
import { ErrorState } from '../../../shared/components/StateMessage'

interface Props {
  texto: string
  onTextoChange: (texto: string) => void
  onInterpretar: (entrada: EntradaComida) => void
  onError: (mensaje: string) => void
  cargando: boolean
  error: string | null
}

/** Texto libre o voz para que la IA interprete lo comido. */
export default function EntradaIA({ texto, onTextoChange, onInterpretar, onError, cargando, error }: Props) {
  return (
    <section aria-label="Describir comida" className="space-y-2">
      <SectionHeader>Describir comida</SectionHeader>
      <Textarea
        tone="surface"
        aria-label="Describe lo que has comido"
        value={texto}
        onChange={(e) => onTextoChange(e.target.value)}
        placeholder="Ej: 200 g de arroz con pollo y una manzana"
        rows={3}
      />
      <div className="flex items-center gap-2">
        <Button onClick={() => onInterpretar({ texto: texto || undefined })} disabled={!texto.trim() || cargando} className="flex-1">
          <Icon name={cargando ? 'loader' : 'sparkles'} size={18} />
          {cargando ? 'Interpretando…' : 'Interpretar con IA'}
        </Button>
        <VoiceRecorder onGrabado={(audioBase64, audioMime) => onInterpretar({ audioBase64, audioMime })} onError={onError} disabled={cargando} />
      </div>
      {error && <ErrorState>{error}</ErrorState>}
    </section>
  )
}
