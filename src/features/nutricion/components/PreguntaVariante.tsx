import { useEffect, useState } from 'react'
import Button from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import type { VarianteReceta } from '../../../shared/db/types'
import { NOMBRE_VARIANTE_MAX } from '../lib/variantes'

interface Props {
  open: boolean
  receta: string
  /** Lo que ha cambiado frente a la receta normal (o la variante de la que se partía). */
  cambios: string[]
  nombrePropuesto: string
  /** Variante ya guardada con los mismos ingredientes: se reutiliza en lugar de crear otra. */
  igual?: VarianteReceta
  ocupado: boolean
  error: string | null
  onSoloEstaVez: () => void
  onGuardarVariante: (nombre: string) => void
  onClose: () => void
}

/**
 * Al guardar una receta con ingredientes cambiados: registrarla así solo esta vez o guardar los cambios como una
 * variante, que la próxima vez se puede elegir junto a la receta normal. La receta normal no cambia.
 */
export default function PreguntaVariante({ open, receta, cambios, nombrePropuesto, igual, ocupado, error, onSoloEstaVez, onGuardarVariante, onClose }: Props) {
  const [nombre, setNombre] = useState(nombrePropuesto)
  useEffect(() => { if (open) setNombre(nombrePropuesto) }, [open, nombrePropuesto])
  const valido = nombre.trim().length > 0 && nombre.trim().length <= NOMBRE_VARIANTE_MAX

  return (
    <Sheet open={open} onClose={onClose} title="Has cambiado la receta"
      footer={<div className="space-y-2">
        {error && <ErrorState>{error}</ErrorState>}
        <Button block loading={ocupado} disabled={!igual && !valido} onClick={() => onGuardarVariante(igual ? igual.nombre : nombre)}>
          {igual ? `Usar la variante «${igual.nombre}»` : 'Guardar como variante'}
        </Button>
        <Button block variant="secondary" disabled={ocupado} onClick={onSoloEstaVez}>Solo esta vez</Button>
      </div>}>
      <div className="space-y-4">
        <p className="break-words text-body text-fg">«{receta}» no cambia. Puedes registrar estos ingredientes solo esta vez o guardarlos como una variante para elegirla otro día.</p>
        {cambios.length > 0 && (
          <ul aria-label="Cambios" className="space-y-1">
            {cambios.map((c) => <li key={c} className="break-words text-body-sm text-fg-muted">· {c}</li>)}
          </ul>
        )}
        {igual
          ? <p className="text-body-sm text-fg-muted">Ya tienes una variante con estos mismos ingredientes: «{igual.nombre}».</p>
          : (
            <label className="block space-y-1">
              <span className="text-label text-fg-muted">Nombre de la variante</span>
              <Input value={nombre} maxLength={NOMBRE_VARIANTE_MAX} onChange={(e) => setNombre(e.target.value)} />
            </label>
          )}
      </div>
    </Sheet>
  )
}
