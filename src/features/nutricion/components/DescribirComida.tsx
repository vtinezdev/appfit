import Button from '../../../shared/components/Button'
import { Textarea } from '../../../shared/components/Input'
import Icon from '../../../shared/components/Icon'
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
  onEscanear?: () => void
  titulo?: string
  /** Texto de la acción al añadir a una revisión que ya tiene alimentos. */
  accion?: string
}

/**
 * Texto libre (escrito o dictado con el micrófono del teclado) que se interpreta en el dispositivo, sin conexión. Un
 * alimento por línea (lo enseña el ejemplo); «Medidas» en la esquina del campo y «Revisar» solo con algo escrito.
 */
export default function DescribirComida({ texto, onTextoChange, onInterpretar, cargando, error, onVerMedidas, onEscanear, titulo = '¿Qué has comido?', accion }: Props) {
  const partes = parsear(texto)
  return (
    <section aria-label="Añadir alimentos por escrito" className="space-y-stack">
      <h2 className="text-heading text-fg">{titulo}</h2>
      <div className="rounded-lg border border-line-strong bg-surface p-3">
      <Textarea
        tone="surface"
        aria-label="Describe lo que has comido"
        value={texto}
        onChange={(e) => onTextoChange(e.target.value)}
        placeholder={'200 g de arroz\n2 huevos\nMedio aguacate'}
        rows={4}
        className="border-0 bg-transparent p-1 shadow-none"
        disabled={cargando}
      />
      <div className="flex justify-end"><Button variant="subtle" size="sm" onClick={onVerMedidas} aria-label="Medidas que se entienden"><Icon name="info" size={16} />Medidas</Button></div>
      </div>
      {(partes.length > 0 || cargando) && <Button onClick={onInterpretar} disabled={partes.length === 0} loading={cargando} block>
        {cargando ? 'Preparando revisión…' : accion ?? (partes.length > 0 ? `Revisar ${formatInt(partes.length)} ${partes.length === 1 ? 'alimento' : 'alimentos'}` : 'Revisar alimentos')}
        {!cargando && <Icon name="chevron-right" size={18} />}
      </Button>}
      {onEscanear && <Button variant="secondary" block onClick={onEscanear} disabled={cargando}>
        <Icon name="barcode" size={20} />
        Escanear producto
      </Button>}
      {error && <ErrorState>{error}</ErrorState>}
    </section>
  )
}
