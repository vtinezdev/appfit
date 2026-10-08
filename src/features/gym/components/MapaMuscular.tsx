import { useId, useState } from 'react'
import type { ResumenMuscular, NivelMuscular } from '../lib/cargaMuscular'
import { MUSCULOS, ZONAS_MUSCULARES, type ZonaMuscular } from '../lib/musculos'
import { SILUETA_CORPORAL, ZONAS_FRONTALES, ZONAS_TRASERAS } from './mapaMuscularGeometria'
import Icon from '../../../shared/components/Icon'
import Disclosure from '../../../shared/components/Disclosure'
import { formatInt } from '../../../shared/lib/format'

export const NIVELES_MUSCULARES: Record<NivelMuscular, string> = { 0: 'Sin trabajo registrado', 1: 'Muy bajo', 2: 'Bajo', 3: 'Moderado', 4: 'Alto', 5: 'Muy alto' }

function Cuerpo({ title, regions, levels }: { title: string; regions: Partial<Record<ZonaMuscular, string[]>>; levels: ResumenMuscular['levels'] }) {
  return <figure className="min-w-0">
    <figcaption className="mb-3 text-center text-label text-fg-muted">{title}</figcaption>
    <svg viewBox="0 0 160 355" className="muscle-body mx-auto block w-full" aria-hidden="true" focusable="false">
      <ellipse cx="80" cy="25" rx="17" ry="20" className="muscle-outline" />
      <path d={SILUETA_CORPORAL} className="muscle-outline" />
      {(Object.entries(regions) as [ZonaMuscular, string[]][]).map(([id, paths]) => <g key={id} data-muscle={id} data-level={levels[id]}>
        {paths.map((d, i) => <path key={i} d={d} className="muscle-region" style={{ fill: levels[id] ? `rgb(var(--c-muscle-${levels[id]}))` : 'rgb(var(--c-surface-muted))' }} />)}
      </g>)}
    </svg>
  </figure>
}

/** Solo representación: recibe agregación/niveles ya calculados; la lista táctil ofrece el detalle accesible. */
export default function MapaMuscular({ summary }: { summary: ResumenMuscular }) {
  const [selected, setSelected] = useState<ZonaMuscular | null>(null)
  const id = useId()
  const activos = ZONAS_MUSCULARES.filter(m => summary.levels[m] > 0).sort((a, b) => summary.muscles[b].score - summary.muscles[a].score)
  const inactivos = ZONAS_MUSCULARES.filter(m => summary.levels[m] === 0)
  function fila(m: ZonaMuscular) {
    const expanded = selected === m
    return <li key={m}>
      <button type="button" aria-expanded={expanded} aria-controls={`${id}-${m}`} onClick={() => setSelected(expanded ? null : m)}
        className="muscle-row min-h-touch w-full items-center gap-x-3 py-3 text-left hover:bg-surface-muted">
        <span className="muscle-name flex min-w-0 items-center gap-3"><span aria-hidden="true" className="muscle-swatch shrink-0" data-level={summary.levels[m]} /><span className="break-words text-body font-semibold text-fg">{MUSCULOS[m]}</span></span>
        <span className="muscle-level text-body-sm text-fg-muted">{NIVELES_MUSCULARES[summary.levels[m]]}</span>
        <Icon name="chevron-right" size={18} className={`muscle-chevron shrink-0 text-fg-muted ${expanded ? 'rotate-90' : ''}`} />
      </button>
      <div id={`${id}-${m}`} hidden={!expanded} className="pb-4">
        {summary.muscles[m].exercises.length ? <ul className="space-y-2">{summary.muscles[m].exercises.map(e => <li key={e.exerciseId} className="break-words text-body-sm text-fg">
          {e.nombre}<span className="block text-caption text-fg-muted">{e.role === 'primary' ? 'Principal' : 'Secundario'} · {formatInt(e.sets)} {e.sets === 1 ? 'serie registrada' : 'series registradas'}</span>
        </li>)}</ul> : <p className="text-body-sm text-fg-muted">Sin aportes identificados en las series registradas.</p>}
      </div>
    </li>
  }
  return <section aria-label="Mapa muscular" className="muscle-summary space-y-stack">
    <div><h2 className="text-heading text-fg">Mapa muscular</h2><p className="text-body-sm text-fg-muted">Trabajo estimado · Comparado dentro de esta sesión</p></div>
    <div className="muscle-map grid grid-cols-2 gap-3 rounded-lg bg-surface p-3">
      <Cuerpo title="Frontal" regions={ZONAS_FRONTALES} levels={summary.levels} />
      <Cuerpo title="Trasera" regions={ZONAS_TRASERAS} levels={summary.levels} />
    </div>
    <div aria-label="Escala de trabajo relativo" className="flex flex-wrap items-center justify-between gap-2 text-caption text-fg-muted">
      <span>Sin trabajo registrado</span><div aria-hidden="true" className="flex gap-1">{([0, 1, 2, 3, 4, 5] as NivelMuscular[]).map(n => <span key={n} className="muscle-swatch" data-level={n} />)}</div><span>Muy alto</span>
    </div>
    {summary.coverage.total === 0 ? <p className="text-body-sm text-fg-muted">No hay series con repeticiones para calcular el mapa.</p> : <>
      <p className="text-caption text-fg-muted">Clasificación disponible en {formatInt(summary.coverage.classified)} de {formatInt(summary.coverage.total)} ejercicios.</p>
      {activos.length > 0 && <><p className="text-caption text-fg-muted">Toca un grupo para ver sus ejercicios.</p><ul className="divide-y divide-line">{activos.map(fila)}</ul></>}
      {summary.unclassified.length > 0 && <p className="break-words text-body-sm text-fg-muted">Sin reparto por zonas: {summary.unclassified.join(', ')}. No se les atribuye un estímulo muscular específico.</p>}
    </>}
    {inactivos.length > 0 && <Disclosure title="Grupos sin trabajo identificado"><ul className="divide-y divide-line">{inactivos.map(fila)}</ul></Disclosure>}
    <Disclosure title="Cómo se estima el trabajo"><div className="space-y-2 text-body-sm text-fg-muted">
      <p>Se consideran las series con repeticiones confirmadas y las antiguas cuya realización es desconocida; las pendientes se excluyen. Las repeticiones se ponderan hasta un límite y la carga externa se compara solo entre series externas del mismo ejercicio y variante. Los modos corporales, con lastre o asistencia, aportan series y repeticiones sin inferir esfuerzo de la masa corporal o de la ayuda de una máquina. El volumen externo incluye el lastre y excluye la asistencia. Una serie unilateral se promedia por lado sin duplicarla; los tramos de dropset comparten un único límite de repeticiones. Negativas y tempo no añaden factores de intensidad.</p>
      <p>Los músculos principales reciben el aporte completo y los secundarios la mitad. El grupo con más trabajo define la referencia visual; no compara intensidad entre sesiones, ni mide esfuerzo, fatiga o recuperación. Hombros se muestra como un grupo común, sin distinguir porciones anterior y posterior.</p>
      <p>{summary.legacy ? 'Sesión antigua: se usan las asociaciones disponibles actualmente; su clasificación original no se guardó.' : 'Se utilizan las asociaciones musculares guardadas al terminar esta sesión.'}</p>
    </div></Disclosure>
  </section>
}
