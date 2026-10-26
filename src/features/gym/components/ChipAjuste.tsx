import Icon, { type IconName } from '../../../shared/components/Icon'

/** Botón de ajuste con su valor a la vista (variante de un ejercicio, gimnasio de la sesión, tipo de carga en Progreso); abre su hoja. */
export default function ChipAjuste({ label, texto, icon, apagado, disabled, onClick }: { label: string; texto: string; icon?: IconName; apagado?: boolean; disabled?: boolean; onClick: () => void }) {
  return <button type="button" aria-label={`${label}: ${texto}`} disabled={disabled} onClick={onClick}
    className={`app-button inline-flex min-h-touch max-w-full items-center gap-1 rounded-pill bg-surface-muted px-3 text-body-sm font-semibold hover:bg-line disabled:opacity-40 ${apagado ? 'text-fg-muted' : 'text-fg'}`}>
    {icon && <Icon name={icon} size={16} className="shrink-0 text-fg-muted" />}<span className="min-w-0 truncate">{texto}</span><Icon name="chevron-right" size={16} className="shrink-0 rotate-90 text-fg-muted" />
  </button>
}
