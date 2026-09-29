import Icon, { type IconName } from '../shared/components/Icon'
export type Tab = 'nutricion' | 'gym' | 'ajustes'

interface Props {
  tab: Tab
  onChange: (tab: Tab) => void
}

const ITEMS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'nutricion', label: 'Nutrición', icon: 'utensils' },
  { key: 'gym', label: 'Gym', icon: 'dumbbell' },
  { key: 'ajustes', label: 'Ajustes', icon: 'settings' },
]

export default function BottomNav({ tab, onChange }: Props) {
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-40 flex border-t border-line bg-bg">
      {ITEMS.map((item) => {
        const active = item.key === tab
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-caption font-medium transition-colors ${
              active ? 'text-accent' : 'text-fg-subtle'
            }`}
          >
            <Icon name={item.icon} size={22} />
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
