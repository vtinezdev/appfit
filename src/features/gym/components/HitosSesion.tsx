import type { HitoSesion } from '../lib/fichaEntreno'

/** Franja «Hoy» del póster al terminar (ENT-10): hasta tres hitos de la sesión (`lib/fichaEntreno.hitosDeSesion`). Sin animación. */
export default function HitosSesion({ hitos }: { hitos: HitoSesion[] }) {
  return <section aria-label="Hoy" className="space-y-2">
    <h2 className="training-muted text-rotulo">Hoy</h2>
    <ul className="space-y-2">
      {hitos.map((h, i) => <li key={i} className="flex items-baseline gap-3">
        <span className="w-16 shrink-0 text-caption font-semibold text-accent-strong">{h.etiqueta}</span>
        <span className="min-w-0 break-words text-body-sm">{h.texto}</span>
      </li>)}
    </ul>
  </section>
}
