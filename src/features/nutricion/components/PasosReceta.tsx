import { useState } from 'react'
import Button, { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { Textarea } from '../../../shared/components/Input'
import { PASO_MAX_CARACTERES, PASOS_MAX } from '../lib/recetas'

export interface PasoEditable { clave: string; texto: string }

interface Props {
  pasos: PasoEditable[]
  onChange: (pasos: PasoEditable[]) => void
}

/** Alto del campo según el texto (sin `field-sizing`, que Safari iOS no tiene): de 3 a 8 líneas. */
const filas = (texto: string) => Math.min(8, Math.max(3, Math.ceil(texto.length / 34)))

export const pasoNuevo = (texto = ''): PasoEditable => ({ clave: crypto.randomUUID(), texto })

/**
 * Pasos de la preparación dentro del editor (ModalPage): escribir, subir/bajar y quitar. El Toast queda debajo de la
 * capa, así que el «Deshacer» del quitar va en línea.
 */
export default function PasosReceta({ pasos, onChange }: Props) {
  const [quitado, setQuitado] = useState<{ paso: PasoEditable; indice: number } | null>(null)

  function mover(i: number, delta: -1 | 1) {
    const j = i + delta
    if (j < 0 || j >= pasos.length) return
    const copia = [...pasos]
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
    onChange(copia)
  }

  function quitar(i: number) {
    setQuitado({ paso: pasos[i], indice: i })
    onChange(pasos.filter((_, idx) => idx !== i))
  }

  function deshacer() {
    if (!quitado) return
    const copia = [...pasos]
    copia.splice(Math.min(quitado.indice, copia.length), 0, quitado.paso)
    onChange(copia)
    setQuitado(null)
  }

  return (
    <div className="space-y-stack">
      {pasos.length > 0 && (
        <ol className="space-y-stack" aria-label="Pasos">
          {pasos.map((p, i) => (
            <li key={p.clave} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-label text-fg-muted">Paso {i + 1}</span>
                <div className="flex items-center">
                  <IconButton icon="chevron-up" label={`Subir el paso ${i + 1}`} variant="ghost" disabled={i === 0} onClick={() => mover(i, -1)} />
                  <IconButton icon="chevron-down" label={`Bajar el paso ${i + 1}`} variant="ghost" disabled={i === pasos.length - 1} onClick={() => mover(i, 1)} />
                  <IconButton icon="trash" label={`Quitar el paso ${i + 1}`} variant="ghost" onClick={() => quitar(i)} />
                </div>
              </div>
              <Textarea tone="surface" rows={filas(p.texto)} maxLength={PASO_MAX_CARACTERES} aria-label={`Paso ${i + 1}`} value={p.texto}
                placeholder="Qué hacer en este paso" onChange={(e) => onChange(pasos.map((x, idx) => idx === i ? { ...x, texto: e.target.value } : x))} />
            </li>
          ))}
        </ol>
      )}
      {quitado && (
        <div role="status" className="flex min-h-touch items-center justify-between gap-3 rounded-md bg-surface-muted px-3 text-body-sm text-fg">
          <span className="min-w-0 break-words">Paso {quitado.indice + 1} quitado</span>
          <Button variant="ghost" size="sm" onClick={deshacer}>Deshacer</Button>
        </div>
      )}
      <Button variant="secondary" block disabled={pasos.length >= PASOS_MAX} onClick={() => { setQuitado(null); onChange([...pasos, pasoNuevo()]) }}>
        <Icon name="plus" size={18} />Añadir paso
      </Button>
    </div>
  )
}
