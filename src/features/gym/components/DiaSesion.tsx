/** El día de una sesión en un cuadro: el número en grande y el día de la semana debajo. Decorativo: la fecha va en texto. */
export default function DiaSesion({ inicio }: { inicio: number }) {
  const fecha = new Date(inicio)
  return <span aria-hidden className="flex h-thumb w-thumb shrink-0 flex-col items-center justify-center rounded-md bg-surface-muted">
    <span className="tabular font-numeric text-title leading-none text-fg">{fecha.getDate()}</span>
    <span className="text-caption text-fg-muted">{fecha.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')}</span>
  </span>
}
