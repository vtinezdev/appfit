import { useId, useState } from 'react'
import type { ResumenMuscular, NivelMuscular } from '../lib/cargaMuscular'
import { MUSCULOS, ZONAS_MUSCULARES, type ZonaMuscular } from '../lib/musculos'
import { CUERPOS, VIEWBOX_CUERPO, type FiguraMapa, type VistaCuerpo } from './mapaMuscularGeometria'
import Icon from '../../../shared/components/Icon'
import Disclosure from '../../../shared/components/Disclosure'
import { formatInt } from '../../../shared/lib/format'

export const NIVELES_MUSCULARES: Record<NivelMuscular, string> = { 0: 'Sin trabajo registrado', 1: 'Muy bajo', 2: 'Bajo', 3: 'Moderado', 4: 'Alto', 5: 'Muy alto' }

type Huella = Partial<Record<ZonaMuscular, boolean>>
/** Nivel por zona: 0–5 en la rampa de la sesión, 0–9 en la de progreso. */
type Niveles = Record<ZonaMuscular, number>
/** `sesion`: rampa roja relativa a la sesión (ADR 015). `progreso`: nueve niveles en tres tramos (ADR 051). */
export type EscalaMapa = 'sesion' | 'progreso'
const relleno = (escala: EscalaMapa, nivel: number) => (nivel ? { fill: `rgb(var(--c-${escala === 'progreso' ? 'progreso' : 'muscle'}-${nivel}))` } : undefined)

/** Una vista del cuerpo. `huella`: contorno de lo que llegó a un nivel y lo perdió (mapa de progreso). `onZona`: tocar una zona es un atajo; la alternativa accesible es una lista. */
function Cuerpo({ title, vista, levels, escala = 'sesion', huella, onZona, className = 'mx-auto block w-full' }: { title?: string; vista: VistaCuerpo; levels: Niveles; escala?: EscalaMapa; huella?: Huella; onZona?: (m: ZonaMuscular) => void; className?: string }) {
  const svg = <svg viewBox={VIEWBOX_CUERPO} className={`muscle-body ${className}`} aria-hidden="true" focusable="false">
    <path d={vista.detalles} className="muscle-region" />
    {(Object.entries(vista.zonas) as [ZonaMuscular, string][]).map(([id, d]) => <g key={id} data-muscle={id} data-level={levels[id]} {...(huella ? { 'data-huella': !!huella[id] } : {})}>
      <path d={d} className={`muscle-region ${onZona ? 'cursor-pointer' : ''}`} style={relleno(escala, levels[id])} onClick={onZona && (() => onZona(id))} />
    </g>)}
    <path d={vista.silueta} className="muscle-outline" />
  </svg>
  if (!title) return svg
  return <figure className="min-w-0">
    <figcaption className="mb-3 text-center text-label text-fg-muted">{title}</figcaption>
    {svg}
  </figure>
}

/** Frontal y trasera en miniatura, sin rótulos ni leyenda (tarjeta del último entreno en Inicio). Decorativa: el texto de al lado dice lo más trabajado. */
export function MiniMapa({ levels, figura = 'hombre' }: { levels: ResumenMuscular['levels']; figura?: FiguraMapa }) {
  return <span className="muscle-mini flex shrink-0 gap-1" aria-hidden="true">
    {(['frontal', 'trasera'] as const).map(v => <svg key={v} viewBox={VIEWBOX_CUERPO} className="h-full w-auto" focusable="false">
      <path d={CUERPOS[figura][v].detalles} className="muscle-region" />
      {(Object.entries(CUERPOS[figura][v].zonas) as [ZonaMuscular, string][]).map(([id, d]) => <path key={id} d={d} className="muscle-region" style={levels[id] ? { fill: `rgb(var(--c-muscle-${levels[id]}))` } : undefined} />)}
      <path d={CUERPOS[figura][v].silueta} className="muscle-outline" />
    </svg>)}
  </span>
}

/** Leyenda de la rampa de la sesión. */
export function EscalaMuscular() {
  return <div aria-label="Escala de trabajo relativo" className="flex flex-wrap items-center justify-center gap-2 text-caption text-fg-muted">
    <span>Menos</span><div aria-hidden="true" className="flex gap-1">{([1, 2, 3, 4, 5] as NivelMuscular[]).map(n => <span key={n} className="muscle-swatch" data-level={n} />)}</div><span>Más trabajo</span>
  </div>
}

const TRAMOS = ['Básico', 'Intermedio', 'Avanzado'] as const
/** Leyenda del mapa de progreso: los tres tramos con sus tres niveles; con `huella`, también el contorno de lo perdido. */
export function EscalaProgreso({ huella = false }: { huella?: boolean }) {
  return <div className="space-y-2">
    <div role="list" aria-label="Niveles de progreso, de Básico I a Avanzado III" className="grid grid-cols-3 gap-2">
      {TRAMOS.map((t, i) => <div role="listitem" key={t} className="min-w-0 space-y-1">
        <div aria-hidden="true" className="flex gap-0.5">{[1, 2, 3].map(j => <span key={j} className="muscle-swatch flex-1" data-escala="progreso" data-level={i * 3 + j} />)}</div>
        <span className="block break-words text-center text-caption text-fg-muted">{t}</span>
      </div>)}
    </div>
    {huella && <p className="flex items-center justify-center gap-2 text-caption text-fg-muted"><span aria-hidden="true" className="muscle-swatch" data-level={0} data-huella="true" />Nivel perdido</p>}
  </div>
}

/** Las dos vistas juntas y la leyenda de su rampa. El detalle accesible está en la lista que las acompaña, no en el color. */
export function FigurasMusculares({ levels, escala = 'sesion', figura = 'hombre', huella, className = '' }: { levels: Niveles; escala?: EscalaMapa; figura?: FiguraMapa; huella?: Huella; className?: string }) {
  return <div className={`space-y-stack ${className}`}>
    <div className="muscle-map grid grid-cols-2 gap-3">
      <Cuerpo title="Frontal" vista={CUERPOS[figura].frontal} levels={levels} escala={escala} huella={huella} />
      <Cuerpo title="Trasera" vista={CUERPOS[figura].trasera} levels={levels} escala={escala} huella={huella} />
    </div>
    {escala === 'progreso' ? <EscalaProgreso huella={!!huella && Object.values(huella).some(Boolean)} /> : <EscalaMuscular />}
  </div>
}

/** Una sola vista, más grande, del mapa de progreso (Progreso). */
export function CuerpoMuscular({ vista, levels, figura = 'hombre', huella, onZona }: { vista: 'frontal' | 'trasera'; levels: Niveles; figura?: FiguraMapa; huella?: Huella; onZona?: (m: ZonaMuscular) => void }) {
  return <div className="muscle-map"><Cuerpo vista={CUERPOS[figura][vista]} levels={levels} escala="progreso" huella={huella} onZona={onZona} className="muscle-progreso mx-auto block w-full" /></div>
}

/**
 * Solo representación: recibe agregación/niveles ya calculados; la lista táctil ofrece el detalle accesible.
 * `figuras={false}` cuando las figuras ya se ven en el póster de la sesión: queda la lista por nivel y la metodología.
 */
export default function MapaMuscular({ summary, figura = 'hombre', figuras = true }: { summary: ResumenMuscular; figura?: FiguraMapa; figuras?: boolean }) {
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
    <div><h2 className="text-heading text-fg">{figuras ? 'Mapa muscular' : 'Trabajo por grupo'}</h2><p className="text-body-sm text-fg-muted">Trabajo estimado · Comparado dentro de esta sesión</p></div>
    {figuras && <FigurasMusculares levels={summary.levels} figura={figura} className="rounded-lg bg-surface p-3" />}
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
