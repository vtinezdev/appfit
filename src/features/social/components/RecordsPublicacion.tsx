import Icon from '../../../shared/components/Icon'

/** Cuánto subió el peso de un ejercicio publicado («+5 kg»), una fila por variante. */
export default function RecordsPublicacion({ ejercicio, mejoras }: { ejercicio: string; mejoras: { variante?: string; mejora: string }[] }) {
  return <ul className="divide-y divide-line rounded-md bg-surface-muted px-3" aria-label={`Récord de ${ejercicio}`}>
    {mejoras.map((m, i) => <li key={i} className="flex items-center justify-between gap-3 py-2">
      <span className="min-w-0 break-words text-body-sm font-semibold text-fg">{ejercicio}{m.variante && <span className="font-normal text-fg-muted"> · {m.variante}</span>}</span>
      <span className="inline-flex shrink-0 items-center gap-1 font-numeric text-title text-accent-strong tabular-nums"><Icon name="chevron-up" size={18} />{m.mejora}</span>
    </li>)}
  </ul>
}
