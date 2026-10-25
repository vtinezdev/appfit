import { lazy, Suspense, type ReactNode } from 'react'
import { formatInt } from '../../../shared/lib/format'
import type { ResumenMuscular } from '../lib/cargaMuscular'
import { textoDesde, type HitoEntrenos } from '../lib/fichaEntreno'
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
  /** Nombre del gimnasio si no es el habitual: va tras la fecha. */
  gimnasio?: string
  /** Al terminar: la franja «Hoy» bajo las cifras (ENT-10). */
  hoy?: ReactNode
  /** Al terminar: el muñeco del progreso muscular, en lugar de las figuras de `levels`. */
  figuras?: ReactNode
  /** Al terminar el entreno nº 10, 25, 50…: la cifra encima del título (A23). */
  hito?: HitoEntrenos | null
}

/** Póster de una sesión: lo comparten el fin del entreno y el detalle del historial. Datos reales, sin récords ni rachas inventados. */
export default function PosterSesion({ titulo, inicio, fin, series, volumen, levels, figura, estado, gimnasio, hoy, figuras, hito }: Props) {
  return <section aria-label="Resumen de la sesión" className="training-surface session-poster space-y-5 p-5">
    {estado}
    {hito && <p className="flex flex-wrap items-baseline gap-x-3">
      <span className="whitespace-nowrap font-numeric text-hero tabular text-accent-strong">{formatInt(hito.numero)}</span>
      <span className="min-w-0 flex-1 basis-40 break-words text-body-sm font-semibold">entrenos terminados
        <span className="training-muted block text-caption font-normal">{textoDesde(hito.desde, Date.now())}</span></span>
    </p>}
    <div className="space-y-1">
      <h1 className="poster-title break-words">{titulo}</h1>
      <p className="training-muted tabular break-words text-body-sm">{rangoSesion(inicio, fin)}{gimnasio ? ` · ${gimnasio}` : ''}</p>
    </div>
    <dl className="cifras-filetes grid grid-cols-3">
      <div className="min-w-0"><dt className="training-muted text-caption">Duración</dt><dd className="break-words font-numeric text-heading tabular">{formatDuracion(fin - inicio)}</dd></div>
      <div className="min-w-0"><dt className="training-muted text-caption">Volumen</dt><dd className="tabular"><span className="break-words font-numeric text-heading">{formatInt(volumen)}</span> <span className="training-muted text-caption">kg</span></dd></div>
      <div className="min-w-0"><dt className="training-muted text-caption">Series</dt><dd className="font-numeric text-heading tabular">{formatInt(series)}</dd></div>
    </dl>
    {hoy}
    {figuras ?? (levels && <Suspense fallback={<div className="poster-map-reserva" />}><FigurasMusculares levels={levels} figura={figura} /></Suspense>)}
  </section>
}
