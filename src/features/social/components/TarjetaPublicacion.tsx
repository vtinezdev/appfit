import type { ReactNode } from 'react'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import Metric from '../../../shared/components/Metric'
import { formatFechaHoraConDia } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { duracionTexto, formatKm, formatRitmo, NOMBRE_TIPO, ritmoSegPorKm } from '../../actividades/lib/actividad'
import { textoEjercicios, type LineaLogro, type Resumen } from '../lib/publicacion'

interface Props {
  resumen: Resumen
  /** ms del inicio del entreno o de la actividad. */
  fecha: number
  /** Quién lo publicó (en el feed); sin él, es la vista previa de lo propio. */
  autor?: ReactNode
  /** Debajo de todo (reacciones y comentarios en el feed). */
  pie?: ReactNode
}

function Lineas({ titulo, icono, lineas }: { titulo: string; icono?: 'trophy'; lineas: LineaLogro[] }) {
  if (!lineas.length) return null
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1 text-label text-fg-muted">{icono && <Icon name={icono} size={16} className="text-accent-strong" />}{titulo}</p>
      <ul className="space-y-1">
        {lineas.map((l, i) => <li key={`${l.ejercicio}-${i}`} className="break-words text-body-sm text-fg"><span className="font-semibold">{l.ejercicio}</span> · {l.texto}</li>)}
      </ul>
    </div>
  )
}

/** Un entreno o una actividad publicados: lo que ven los seguidores (y la vista previa antes de publicar). */
export default function TarjetaPublicacion({ resumen: r, fecha, autor, pie }: Props) {
  const contexto = r.tipo === 'actividad' ? `${NOMBRE_TIPO[r.actividad]} · ${formatFechaHoraConDia(fecha)}` : formatFechaHoraConDia(fecha)
  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        {autor}
        <p className="break-words text-title text-fg">{r.titulo}</p>
        <p className="text-caption text-fg-muted first-letter:uppercase">{contexto}</p>
      </div>
      {r.tipo === 'entreno' ? (
        <div className="grid grid-cols-3 gap-3">
          <Metric size="title" label="Duración" valor={duracionTexto(r.duracionSeg)} />
          <Metric size="title" label="Series" valor={formatInt(r.series)} />
          <Metric size="title" label="Volumen" valor={formatInt(r.volumenKg)} unidad="kg" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Metric size="title" label="Distancia" valor={formatKm(r.distanciaM)} unidad="km" />
          <Metric size="title" label="Duración" valor={duracionTexto(r.duracionSeg)} />
          <Metric size="title" label="Ritmo" valor={formatRitmo(ritmoSegPorKm(r.duracionSeg, r.distanciaM))} />
          {r.desnivelM !== null && <Metric size="title" label="Desnivel +" valor={formatInt(r.desnivelM)} unidad="m" />}
        </div>
      )}
      {r.tipo === 'entreno' && (
        <>
          {r.ejercicios.length > 0 && <p className="break-words text-body-sm text-fg-muted">{textoEjercicios(r.ejercicios)}</p>}
          <Lineas titulo="Récords" icono="trophy" lineas={r.records} />
          <Lineas titulo="Ligas" lineas={r.ligas} />
          {r.logros.length > 0 && (
            <div className="space-y-1">
              <p className="text-label text-fg-muted">Nuevo en la Vitrina</p>
              <p className="break-words text-body-sm text-fg">{r.logros.join(' · ')}</p>
            </div>
          )}
        </>
      )}
      {pie}
    </Card>
  )
}
