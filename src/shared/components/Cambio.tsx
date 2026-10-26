/**
 * Un cambio como etiqueta pequeña y neutra, sin juicio de valor (el mismo tono suba o baje): «↑ +0,4 kg». `frente` dice a
 * los lectores de pantalla con qué se compara («frente a la semana anterior»).
 */
export default function Cambio({ diferencia, texto, frente }: { diferencia: number; texto: string; frente: string }) {
  return <span className="tabular inline-flex items-center gap-1 rounded-pill bg-surface-muted px-2 py-0.5 text-caption text-fg-muted">
    <span aria-hidden>{diferencia === 0 ? '=' : diferencia > 0 ? '↑' : '↓'}</span>{texto}<span className="sr-only"> {frente}</span>
  </span>
}
