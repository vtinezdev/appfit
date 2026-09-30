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

/**
 * Barra flotante negra (superficie ink) separada de los bordes y por encima del home indicator (`--nav-offset`).
 * La pestaña activa es una pastilla naranja con icono y etiqueta; las demás, solo icono (con `aria-label`).
 */
export default function BottomNav({ tab, onChange }: Props) {
  return (
    <nav aria-label="Navegación principal" className="pointer-events-none fixed inset-x-0 bottom-nav-offset z-40 px-page">
      <div data-surface="ink" className="pointer-events-auto mx-auto flex h-nav max-w-sm items-center justify-between rounded-pill bg-surface p-2 shadow-nav">
        {ITEMS.map((item) => {
          const active = item.key === tab
          return (
            <button
              key={item.key}
              type="button"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => onChange(item.key)}
              className={`flex h-full min-w-touch items-center justify-center gap-2 rounded-pill transition-[background-color,color,transform] duration-normal ease-standard active:scale-95 ${
                active ? 'bg-accent px-5 text-accent-on' : 'px-3 text-fg-muted hover:text-fg'
              }`}
            >
              <Icon name={item.icon} size={22} />
              {active && <span className="text-body-sm font-bold">{item.label}</span>}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
