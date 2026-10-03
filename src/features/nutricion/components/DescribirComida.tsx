import Button, { IconButton } from '../../../shared/components/Button'
import { Textarea } from '../../../shared/components/Input'
import SectionHeader from '../../../shared/components/SectionHeader'
import { ErrorState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'
import { parsear } from '../lib/interprete/parsear'

interface Props {
  texto: string
  onTextoChange: (texto: string) => void
  onInterpretar: () => void
  cargando: boolean
  error: string | null
  /** Abre «Medidas» (qué medidas caseras se entienden). */
  onVerMedidas: () => void
  /** Texto de la acción al añadir a una revisión que ya tiene alimentos. */
  accion?: string
}

/** Texto libre (escrito o dictado con el micrófono del teclado) que se interpreta en el dispositivo, sin conexión. */
export default function DescribirComida({ texto, onTextoChange, onInterpretar, cargando, error, onVerMedidas, accion = 'Interpretar' }: Props) {
  const partes = parsear(texto)
  return (
    <section aria-label="Describir comida" className="space-y-stack">
      <SectionHeader variant="section" action={<IconButton icon="info" label="Medidas que se entienden" variant="ghost" size="sm" onClick={onVerMedidas} />}>
        Describir comida
      </SectionHeader>
      <p className="text-body-sm text-fg-muted">
        Un alimento por línea, con su cantidad. Puedes escribir varios juntos.
      </p>
      <label className="block space-y-2"><span className="text-label text-fg-muted">¿Qué has comido?</span><Textarea
        tone="surface"
        aria-label="Describe lo que has comido"
        value={texto}
        onChange={(e) => onTextoChange(e.target.value)}
        placeholder={'200 g de arroz\n2 huevos\nMedio aguacate'}
        rows={4}
        disabled={cargando}
      /></label>
      {partes.length > 0 && (
        <div aria-label="Separación de alimentos" className="space-y-2 text-body-sm text-fg-muted">
          <p className="text-caption">{partes.length === 1 ? 'Un alimento para revisar' : `${formatInt(partes.length)} alimentos para revisar`}</p>
          <ol className="space-y-2">
            {partes.map((parte, i) => (
              <li key={i}>
                <div className="flex items-start gap-3 border-l-2 border-accent bg-surface px-3 py-2.5">
                  <span className="tabular text-caption font-semibold text-accent-strong">{formatInt(i + 1)}</span>
                  <span className="min-w-0 break-words font-medium text-fg">{parte.texto}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
      <Button onClick={onInterpretar} disabled={partes.length === 0} loading={cargando} block>
        {cargando ? 'Interpretando…' : accion}
      </Button>
      {error && <ErrorState>{error}</ErrorState>}
    </section>
  )
}
