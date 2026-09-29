import Button from './Button'

interface Props {
  mensaje: string
  /** Texto del botón que confirma, p. ej. «Sí, borrar». */
  confirmar: string
  onConfirmar: () => void
  onCancelar: () => void
  /** Deshabilita los botones mientras se ejecuta la acción. */
  ocupado?: boolean
}

/**
 * Segundo paso de una acción destructiva que no se puede deshacer (borrar una rutina o una plantilla).
 * Sustituye en su sitio al botón que la ofrecía. Para una fila suelta se usa «Deshacer» en su lugar.
 */
export default function ConfirmacionDestructiva({ mensaje, confirmar, onConfirmar, onCancelar, ocupado = false }: Props) {
  return (
    <div className="space-y-2" role="group" aria-label="Confirmar borrado">
      <p className="text-body-sm text-destructive">{mensaje}</p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCancelar} disabled={ocupado} className="flex-1">
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirmar} disabled={ocupado} className="flex-1">
          {confirmar}
        </Button>
      </div>
    </div>
  )
}
