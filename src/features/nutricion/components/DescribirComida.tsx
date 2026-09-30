import Button, { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { Textarea } from '../../../shared/components/Input'
import SectionHeader from '../../../shared/components/SectionHeader'
import { ErrorState } from '../../../shared/components/StateMessage'

interface Props {
  texto: string
  onTextoChange: (texto: string) => void
  onInterpretar: () => void
  cargando: boolean
  error: string | null
  /** Abre «Medidas» (qué medidas caseras se entienden). */
  onVerMedidas: () => void
}

/** Texto libre (escrito o dictado con el micrófono del teclado) que se interpreta en el dispositivo, sin conexión. */
export default function DescribirComida({ texto, onTextoChange, onInterpretar, cargando, error, onVerMedidas }: Props) {
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
      <Button onClick={onInterpretar} disabled={!texto.trim() || cargando} block>
        {cargando && <Icon name="loader" size={18} />}
        {cargando ? 'Interpretando…' : 'Interpretar'}
      </Button>
      {error && <ErrorState>{error}</ErrorState>}
    </section>
  )
}
