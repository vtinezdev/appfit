import { lazy, Suspense, type ReactNode } from 'react'
import { formatInt } from '../../../shared/lib/format'
import type { ResumenMuscular } from '../lib/cargaMuscular'
import { formatDuracion, rangoSesion } from '../lib/workout'
import type { FiguraMapa } from './mapaMuscularGeometria'

// Diferido: la geometría de los muñecos pesa más que el resto del póster.
const FigurasMusculares = lazy(() => import('./MapaMuscular').then(m => ({ default: m.FigurasMusculares })))

interface Props {
  /** Nombre de la rutina o «Entreno libre». */
  titulo: string
  inicio: number
  fin: number
  series: number
  volumen: number
  /** Niveles del mapa muscular; sin ellos el póster no lleva figuras (p. ej. mientras se edita). */
  levels?: ResumenMuscular['levels']
  figura?: FiguraMapa
  /** Línea sobre el título («Sesión guardada» al terminar). */
  estado?: ReactNode
}

/** Póster de una sesión: lo comparten el fin del entreno y el detalle del historial. Datos reales, sin récords ni rachas inventados. */
export default function PosterSesion({ titulo, inicio, fin, series, volumen, levels, figura, estado }: Props) {
  return <section aria-label="Resumen de la sesión" className="training-surface session-poster space-y-5 p-5">
    {estado}
    <div className="space-y-1">
      <h1 className="poster-title break-words">{titulo}</h1>
      <p className="training-muted tabular text-body-sm">{rangoSesion(inicio, fin)}</p>
    </div>
    <dl className="cifras-filetes grid grid-cols-3">
      <div className="min-w-0"><dt className="training-muted text-caption">Duración</dt><dd className="break-words font-numeric text-heading tabular">{formatDuracion(fin - inicio)}</dd></div>
      <div className="min-w-0"><dt className="training-muted text-caption">Volumen</dt><dd className="tabular"><span className="break-words font-numeric text-heading">{formatInt(volumen)}</span> <span className="training-muted text-caption">kg</span></dd></div>
      <div className="min-w-0"><dt className="training-muted text-caption">Series</dt><dd className="font-numeric text-heading tabular">{formatInt(series)}</dd></div>
    </dl>
    {levels && <Suspense fallback={<div className="poster-map-reserva" />}><FigurasMusculares levels={levels} figura={figura} /></Suspense>}
  </section>
}
