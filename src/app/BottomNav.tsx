import Icon, { type IconName } from '../shared/components/Icon'
export type Tab = 'inicio' | 'nutricion' | 'gym' | 'ajustes'

interface Props {
  tab: Tab
  onChange: (tab: Tab) => void
}

const ITEMS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'inicio', label: 'Inicio', icon: 'home' },
  { key: 'nutricion', label: 'Nutrición', icon: 'utensils' },
  { key: 'gym', label: 'Gym', icon: 'dumbbell' },
  { key: 'ajustes', label: 'Ajustes', icon: 'settings' },
]

/** Cuatro destinos estables y etiquetados. Ocupa espacio propio, fuera del scroll. */
export default function BottomNav({ tab, onChange }: Props) {
  return (
    <nav aria-label="Navegación principal" className="safe-bottom z-40 shrink-0 border-t border-line bg-surface">
      <div className="mx-auto grid h-nav max-w-lg grid-cols-4 px-2">
        {ITEMS.map((item) => {
          const active = item.key === tab
          return (
            <button
              key={item.key}
              type="button"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => onChange(item.key)}
              className={`relative flex min-h-touch min-w-0 flex-col items-center justify-center gap-1 px-1 transition-colors duration-short active:bg-surface-muted ${
                active ? 'text-accent-strong' : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Icon name={item.icon} size={22} />
              <span className={`text-caption ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
              {active && <span aria-hidden className="absolute inset-x-6 top-0 h-0.5 bg-accent" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
