import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import type { Actividad } from '../../../shared/db/types'
import { formatFriendly, toISODate } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import * as actividadesRepo from '../../actividades/data/actividadesRepo'
import { duracionTexto, formatKm, tituloActividad } from '../../actividades/lib/actividad'
import * as workoutsRepo from '../../gym/data/workoutsRepo'
import { useResumenDeEntreno } from '../../gym/hooks/useResumenEntreno'
import { sugerenciaCompartir } from '../lib/presentacion'
import { resumenActividad, type Resumen, type ResumenLogro } from '../lib/publicacion'
import AvatarPersona from './AvatarPersona'
import CrearPublicacion from './CrearPublicacion'

interface Props {
  persona: { alias: string; nombre: string | null }
  logro?: ResumenLogro
  /** Abre el editor de una publicación de texto. */
  onEscribir: () => void
  /** Se publicó la sugerencia: el feed se vuelve a leer. */
  onPublicada: () => void
}

/**
 * Arriba del feed: escribir algo y, si lo último que registraste (entreno o actividad de los últimos siete días) no está
 * compartido, compartirlo con sus cifras ya puestas. Publicar abre el mismo editor con vista previa de siempre.
 */
export default function Compositor({ persona, logro, onEscribir, onPublicada }: Props) {
  const ultimos = useLiveQuery(async () => ({ entreno: await workoutsRepo.ultimoTerminado() ?? null, actividad: await actividadesRepo.ultimaTerminada() ?? null }), [])
  const cual = ultimos ? sugerenciaCompartir(ultimos.entreno ?? undefined, ultimos.actividad ?? undefined, Date.now()) : null
  return <Card className="space-y-3">
    <div className="flex items-center gap-3">
      <AvatarPersona persona={persona} logro={logro} />
      <button type="button" aria-haspopup="dialog" onClick={onEscribir}
        className="app-button flex min-h-touch min-w-0 flex-1 items-center rounded-md bg-surface-muted px-4 py-2 text-left text-body text-fg-muted hover:bg-line">
        Comparte algo con tus seguidores
      </button>
    </div>
    {cual === 'entreno' && ultimos?.entreno && <SugerenciaEntreno workoutId={ultimos.entreno.id} onPublicada={onPublicada} />}
    {cual === 'actividad' && ultimos?.actividad && <SugerenciaActividad actividad={ultimos.actividad} onPublicada={onPublicada} />}
  </Card>
}

function Sugerencia({ icono, titulo, detalle, resumen, fecha, onAnotar, onPublicada }: { icono: 'dumbbell' | 'footprints'; titulo: string; detalle: string; resumen: Resumen; fecha: number; onAnotar: (id: string) => Promise<void>; onPublicada: () => void }) {
  const [editor, setEditor] = useState(false)
  return <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
    <span aria-hidden className="flex h-touch w-touch shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg-muted"><Icon name={icono} size={20} /></span>
    <p className="min-w-0 flex-1 basis-28">
      <span className="block break-words text-body-sm font-semibold text-fg">{titulo}</span>
      <span className="block tabular break-words text-caption text-fg-muted">Sin compartir · {detalle}</span>
    </p>
    <Button variant="secondary" size="sm" className="ml-auto" aria-haspopup="dialog" onClick={() => setEditor(true)}>Publicar</Button>
    {editor && <CrearPublicacion adjunto={{ resumen, fecha }} onClose={() => setEditor(false)}
      onPublicada={async (id, comunidad) => { if (!comunidad) await onAnotar(id); onPublicada() }} />}
  </div>
}

function SugerenciaEntreno({ workoutId, onPublicada }: { workoutId: number; onPublicada: () => void }) {
  const listo = useResumenDeEntreno(workoutId)
  if (!listo) return null
  const { workout, resumen: r } = listo
  const detalle = [formatFriendly(toISODate(new Date(workout.inicio))), r.duracionSeg !== undefined && duracionTexto(r.duracionSeg), `${formatInt(r.series)} series`, r.volumenKg ? `${formatInt(r.volumenKg)} kg` : null].filter(Boolean).join(' · ')
  return <Sugerencia icono="dumbbell" titulo={r.titulo} detalle={detalle} resumen={r} fecha={workout.inicio}
    onAnotar={id => workoutsRepo.marcarPublicacion(workoutId, id)} onPublicada={onPublicada} />
}

function SugerenciaActividad({ actividad: a, onPublicada }: { actividad: Actividad; onPublicada: () => void }) {
  const r = resumenActividad({ tipo: a.tipo, titulo: tituloActividad(a), duracionSeg: a.duracionSeg, distanciaM: a.distanciaM, desnivelM: a.desnivelM })
  const detalle = [formatFriendly(toISODate(new Date(a.inicio))), `${formatKm(a.distanciaM)} km`, duracionTexto(a.duracionSeg)].join(' · ')
  return <Sugerencia icono="footprints" titulo={r.titulo} detalle={detalle} resumen={r} fecha={a.inicio}
    onAnotar={id => actividadesRepo.marcarPublicacion(a.id, id)} onPublicada={onPublicada} />
}
