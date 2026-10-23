import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { textoDescanso } from '../lib/descansoSugerido'

/**
 * Propuesta de descanso tras la primera serie de quien entrena sin temporizador (ENT-14): una banda en línea bajo el
 * ejercicio, no una hoja. Sale una sola vez; la respuesta se guarda como pista vista.
 */
export default function DescansoSugerido({ segundos, ejercicio, compuesto, ocupado, onSi, onNo }: {
  segundos: number; ejercicio: string; compuesto: boolean; ocupado?: boolean; onSi: () => void; onNo: () => void
}) {
  const texto = textoDescanso(segundos)
  return (
    <aside aria-label="Descanso sugerido" className="mt-2 space-y-2 rounded-lg bg-accent-subtle p-card">
      <p className="flex items-start gap-2 text-body-sm text-fg">
        <Icon name="timer" size={18} className="mt-0.5 shrink-0 text-accent-strong" />
        <span className="min-w-0"><span className="font-semibold">¿Quieres un descanso de {texto} entre series?</span>{' '}
          {compuesto ? `Es lo habitual en un ejercicio compuesto como ${ejercicio}.` : 'Es lo habitual en un ejercicio de aislamiento.'} Lo puedes cambiar en «Descanso».</span>
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" size="sm" disabled={ocupado} onClick={onNo}>No, gracias</Button>
        <Button variant="secondary" size="sm" disabled={ocupado} onClick={onSi}>Sí, {texto}</Button>
      </div>
    </aside>
  )
}
