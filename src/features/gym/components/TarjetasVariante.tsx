import type { SetEntry } from '../../../shared/db/types'
import Icon from '../../../shared/components/Icon'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { contextoSerie } from '../lib/ejecucion'
import { UNIDAD_TARJETA, tendenciaVariante, trazoMini, type ResumenVariante } from '../lib/progreso'

/** Nombre de una variante: ejecución, agarre y técnica, sin el gimnasio (que en Progreso es otra dimensión). */
export function nombreVariante(s: SetEntry): string {
  return contextoSerie({ ...s, gimnasioId: undefined }) || 'Sin agarre ni tempo indicados'
}

/**
 * Carrusel de variantes de Progreso: una tarjeta por variante con sesiones, su mejor marca, una minigráfica y su tendencia.
 * Tocar una elige la gráfica de abajo. Se desliza en horizontal dentro de su caja; la página no.
 */
export default function TarjetasVariante({ variantes, elegida, onElegir }: { variantes: ResumenVariante[]; elegida?: string; onElegir: (clave: string) => void }) {
  return <section aria-labelledby="progreso-variantes" className="space-y-2">
    <div className="flex items-baseline justify-between gap-2">
      <h3 id="progreso-variantes" className="text-label text-fg-muted">Variante</h3>
      {variantes.length > 2 && <span className="text-caption text-fg-subtle">Desliza para ver las {formatInt(variantes.length)}</span>}
    </div>
    <div role="group" aria-labelledby="progreso-variantes" className="carrusel-variantes flex gap-2 overflow-x-auto pb-1">
      {variantes.map(v => {
        const activa = v.clave === elegida
        const nombre = nombreVariante(v.serie)
        const tendencia = tendenciaVariante(v)
        const trazo = trazoMini(v.puntos, 124, 30)
        return <button key={v.clave} type="button" aria-pressed={activa} onClick={() => onElegir(v.clave)}
          aria-label={`${nombre}: ${formatInt(v.sesiones)} ${v.sesiones === 1 ? 'sesión' : 'sesiones'}, mejor ${formatNumber(v.mejor, 1)} ${UNIDAD_TARJETA[v.metrica]}, ${tendencia.texto}`}
          className={`tarjeta-variante flex flex-col gap-1 rounded-lg bg-surface p-3 text-left transition-colors duration-short ${activa ? 'tarjeta-variante-activa' : 'border border-line hover:border-line-strong'}`}>
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0 break-words text-body-sm font-semibold text-fg">{nombre}</span>
            {activa && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-accent text-accent-on"><Icon name="check" size={14} /></span>}
          </span>
          <span className="tabular text-caption text-fg-muted">{formatInt(v.sesiones)} {v.sesiones === 1 ? 'sesión' : 'sesiones'}{v.gimnasios > 1 ? ` · ${formatInt(v.gimnasios)} gimnasios` : ''}</span>
          <span className="flex items-baseline gap-1">
            <span className="font-numeric tabular text-title text-fg">{formatNumber(v.mejor, 1)}</span>
            <span className="text-caption text-fg-muted">{UNIDAD_TARJETA[v.metrica]}</span>
          </span>
          {trazo
            ? <svg viewBox="0 0 124 30" className="mini-grafica tarjeta-variante-mini" aria-hidden="true" focusable="false"><path d={trazo.d} className="mini-grafica-linea" /><circle cx={trazo.ultimo.x} cy={trazo.ultimo.y} r={2.5} className="mini-grafica-punto" /></svg>
            : <span aria-hidden className="tarjeta-variante-mini" />}
          <span className={`text-caption font-semibold ${tendencia.mejora === true ? 'text-accent-strong' : tendencia.mejora === false ? 'text-warning' : 'text-fg-muted'}`}>{tendencia.texto}</span>
        </button>
      })}
    </div>
  </section>
}
