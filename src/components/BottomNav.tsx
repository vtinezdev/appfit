export type Tab = 'nutricion' | 'gym' | 'ajustes'

interface Props {
  tab: Tab
  onChange: (tab: Tab) => void
}

const ITEMS: { key: Tab; label: string; icon: string }[] = [
  { key: 'nutricion', label: 'Nutrición', icon: '🍎' },
  { key: 'gym', label: 'Gym', icon: '🏋️' },
  { key: 'ajustes', label: 'Ajustes', icon: '⚙️' },
]

export default function BottomNav({ tab, onChange }: Props) {
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-800 bg-slate-950/95 backdrop-blur">
      {ITEMS.map((item) => {
        const active = item.key === tab
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
              active ? 'text-brand-400' : 'text-slate-500'
            }`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
