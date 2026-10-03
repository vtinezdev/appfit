import { tramosCarril } from '../design/carril'
interface Props {
  value: number
  goal: number
  colorClass?: string
  size?: 'md' | 'lg'
  label?: string
  valueText?: string
}
/** Objetivo marcado y exceso atenuado. Valor final inmediato, sin contar desde cero. */
export default function ProgressBar({ value, goal, colorClass = 'bg-accent', size = 'md', label, valueText }: Props) {
  const t = tramosCarril(value, goal)
  const v = Number.isFinite(value) ? Math.max(value, 0) : 0
  const g = Number.isFinite(goal) ? Math.max(goal, 0) : 0
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={Math.round(Math.max(g, v, 1))}
      aria-valuenow={Math.round(v)} aria-valuetext={valueText} className={`relative w-full ${size === 'lg' ? 'h-2' : 'h-1.5'}`}>
      <div className="absolute inset-0 overflow-hidden rounded-sm bg-surface-muted">
        <div className={`absolute inset-y-0 left-0 ${colorClass} transition-[width] duration-normal`} style={{ width: `${t.relleno * 100}%` }} />
        {t.exceso > 0 && <div className={`absolute inset-y-0 opacity-50 ${colorClass} transition-[left,width] duration-normal`} style={{ left: `${t.relleno * 100}%`, width: `${t.exceso * 100}%` }} />}
      </div>
      {t.meta !== null && <div aria-hidden className="absolute -inset-y-0.5 w-0.5 bg-goal ring-2 ring-bg transition-[left] duration-normal" style={{ left: `calc(${t.meta * 100}% - 1px)` }} />}
    </div>
  )
}
