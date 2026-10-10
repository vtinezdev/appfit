import Icon from '../../../shared/components/Icon'
import type { LigaEjercicio } from '../lib/liga'
import { textoAvisoElite } from '../lib/textos'

/** Aviso suave en la cabecera del ejercicio cuando está en Élite (ni básico ni mantenido): abre su liga. */
export default function AvisoElite({ liga, nombre, disabled, onAbrir }: { liga: LigaEjercicio; nombre: string; disabled?: boolean; onAbrir: () => void }) {
  const texto = textoAvisoElite(liga)
  return <button type="button" disabled={disabled} onClick={onAbrir} aria-label={`Liga de ${nombre}: ${texto}`}
    className="app-button flex min-h-touch w-full items-center gap-2 rounded-md bg-surface-muted px-3 py-2 text-left text-body-sm text-fg hover:bg-line disabled:opacity-40">
    <Icon name="rank" size={16} className="shrink-0 text-fg-muted" /><span className="min-w-0 flex-1 break-words">{texto}</span><Icon name="chevron-right" size={18} className="shrink-0 text-fg-muted" />
  </button>
}
