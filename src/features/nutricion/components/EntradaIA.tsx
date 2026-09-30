import VoiceRecorder from '../../../shared/components/VoiceRecorder'
import type { EntradaComida } from '../hooks/useInterpretarComida'
import Button, { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { Textarea } from '../../../shared/components/Input'
import SectionHeader from '../../../shared/components/SectionHeader'
import { ErrorState } from '../../../shared/components/StateMessage'

interface Props {
  texto: string
  onTextoChange: (texto: string) => void
  /** Intérprete local: sin IA ni conexión. */
  onInterpretar: () => void
  /** Interpretar con Gemini (texto o audio). */
  onInterpretarIA: (entrada: EntradaComida) => void
  /** Hay API key: se ofrecen «Con IA» y la grabación de voz. */
  iaDisponible: boolean
  onError: (mensaje: string) => void
  cargando: boolean
  /** Qué está interpretando ahora mismo, para el texto del botón. */
  cargandoIA: boolean
  error: string | null
  /** Abre «Medidas» (qué medidas caseras se entienden). */
  onVerMedidas: () => void
}

/**
 * Texto libre (escrito o dictado con el micrófono del teclado) que se interpreta en el dispositivo; con API key,
 * también con IA (texto o voz grabada).
 */
export default function EntradaIA({ texto, onTextoChange, onInterpretar, onInterpretarIA, iaDisponible, onError, cargando, cargandoIA, error, onVerMedidas }: Props) {
  const vacio = !texto.trim()
  return (
    <section aria-label="Describir comida" className="space-y-2">
      <SectionHeader action={<IconButton icon="info" label="Medidas que se entienden" variant="ghost" size="sm" className="-my-2" onClick={onVerMedidas} />}>
        Describir comida
      </SectionHeader>
      <Textarea
        tone="surface"
        aria-label="Describe lo que has comido"
        value={texto}
        onChange={(e) => onTextoChange(e.target.value)}
        placeholder="Escribe o dicta con el micrófono del teclado: 200 g de arroz, 2 huevos y un plátano"
        rows={3}
      />
      <div className="flex items-center gap-2">
        <Button onClick={onInterpretar} disabled={vacio || cargando} className="flex-1">
          {cargando && !cargandoIA && <Icon name="loader" size={18} />}
          {cargando && !cargandoIA ? 'Interpretando…' : 'Interpretar'}
        </Button>
        {iaDisponible && (
          <>
            <Button variant="secondary" onClick={() => onInterpretarIA({ texto })} disabled={vacio || cargando}>
              <Icon name={cargandoIA ? 'loader' : 'sparkles'} size={18} />
              {cargandoIA ? 'Con IA…' : 'Con IA'}
            </Button>
            <VoiceRecorder onGrabado={(audioBase64, audioMime) => onInterpretarIA({ audioBase64, audioMime })} onError={onError} disabled={cargando} />
          </>
        )}
      </div>
      {error && <ErrorState>{error}</ErrorState>}
    </section>
  )
}
