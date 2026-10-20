import type { ResumenRutina } from '../lib/rutinas'
import MiniaturaEjercicio from './MiniaturaEjercicio'

/** Mosaico de miniaturas de una rutina («+N» en la cuarta). Decorativo. */
export function MosaicoRutina({ resumen }: { resumen: ResumenRutina }) {
  return <span className="rutina-mosaico" aria-hidden="true">
    {resumen.miniaturas.map((c, i) => <span key={i} className="relative">
      <MiniaturaEjercicio catalogId={c} mosaico />
      {i === 3 && resumen.resto > 0 && <span className="rutina-mosaico-mas tabular">+{resumen.resto}</span>}
    </span>)}
  </span>
}

