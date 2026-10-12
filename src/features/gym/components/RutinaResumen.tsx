import type { Routine } from '../../../shared/db/types'
import type { ResumenRutina } from '../lib/rutinas'
import { cuandoFue } from '../lib/workout'
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

/** Línea de detalle de una rutina: ejercicios, series objetivo y la última vez que se hizo. */
export function detalleRutina(r: Pick<Routine, 'exerciseIds'>, resumen: ResumenRutina): string {
  const n = r.exerciseIds.length
  return [`${n} ejercicio${n === 1 ? '' : 's'}`, resumen.series !== null && `${resumen.series} series`, resumen.ultima !== null ? `Última: ${cuandoFue(resumen.ultima).toLowerCase()}` : 'Sin hacer todavía'].filter(Boolean).join(' · ')
}
