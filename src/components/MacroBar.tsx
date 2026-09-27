interface Props {
  label: string
  valor: number
  objetivo: number
  unidad?: string
  color?: string
}

export default function MacroBar({ label, valor, objetivo, unidad = 'g', color = 'bg-brand-500' }: Props) {
  const pct = objetivo > 0 ? Math.min(100, (valor / objetivo) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-300">{label}</span>
        <span className="text-slate-400">
          {Math.round(valor)} / {Math.round(objetivo)} {unidad}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
