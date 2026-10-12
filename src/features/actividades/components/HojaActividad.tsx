import { useState } from 'react'
import Button from '../../../shared/components/Button'
import { DecimalInput, Input } from '../../../shared/components/Input'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import type { PuntoRecorrido, TipoActividad } from '../../../shared/db/types'
import { toISODate } from '../../../shared/lib/dates'
import { ActividadInvalida } from '../data/actividadesRepo'
import { ETIQUETA_TIPO, TIPOS_ACTIVIDAD, type DatosActividad } from '../lib/actividad'
import { leerValores, type ValoresActividad } from '../lib/formulario'
import TrazadoRecorrido from './TrazadoRecorrido'

interface Props {
  open: boolean
  onClose: () => void
  titulo: string
  /** Texto bajo el título (de dónde salen los datos). */
  intro?: string
  inicial: ValoresActividad
  /** Recorrido importado, para verlo antes de guardar. */
  recorrido?: PuntoRecorrido[][]
  accion: string
  /** Guarda; si falla, el mensaje se muestra en la hoja. */
  onGuardar: (datos: DatosActividad & { nombre?: string }) => Promise<void>
}

const enteroDe = (texto: string) => {
  const n = Number(texto.replace(/\D/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** Formulario de una actividad: a mano, revisión de un GPX y edición. Montar con `key` para empezar de cero. */
export default function HojaActividad({ open, onClose, titulo, intro, inicial, recorrido, accion, onGuardar }: Props) {
  const [v, setV] = useState<ValoresActividad>(inicial)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const cambiar = (parche: Partial<ValoresActividad>) => { setV((x) => ({ ...x, ...parche })); setError(null) }

  async function guardar() {
    if (guardando) return
    const r = leerValores(v)
    if (!r.ok) { setError(r.error); return }
    setGuardando(true)
    setError(null)
    try {
      await onGuardar(r.datos)
    } catch (e) {
      setError(e instanceof ActividadInvalida ? e.message : 'No se ha podido guardar. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={titulo}
      footer={<div className="space-y-2">{error && <ErrorState>{error}</ErrorState>}<Button block loading={guardando} onClick={guardar}>{accion}</Button></div>}>
      <div className="space-y-4">
        {intro && <p className="break-words text-body-sm text-fg-muted">{intro}</p>}
        {recorrido && <TrazadoRecorrido recorrido={recorrido} label="Recorrido del archivo" />}
        <SegmentedControl<TipoActividad> label="Tipo de actividad" valor={v.tipo} onChange={(tipo) => cambiar({ tipo })}
          opciones={TIPOS_ACTIVIDAD.map((t) => ({ valor: t, label: ETIQUETA_TIPO[t] }))} />
        <div className="grid grid-cols-2 gap-3">
          <label className="block min-w-0 space-y-1"><span className="text-label text-fg-muted">Fecha</span>
            <Input type="date" max={toISODate(new Date())} value={v.fecha} onChange={(e) => cambiar({ fecha: e.target.value })} /></label>
          <label className="block min-w-0 space-y-1"><span className="text-label text-fg-muted">Hora de inicio</span>
            <Input type="time" value={v.hora} onChange={(e) => cambiar({ hora: e.target.value })} /></label>
        </div>
        <fieldset className="space-y-1">
          <legend className="text-label text-fg-muted">Duración</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex min-w-0 items-center gap-2">
              <Input inputMode="numeric" aria-label="Horas" value={String(v.horas)} onFocus={(e) => e.target.select()}
                onChange={(e) => cambiar({ horas: enteroDe(e.target.value), segundos: 0 })} />
              <span className="shrink-0 text-body-sm text-fg-muted">h</span>
            </label>
            <label className="flex min-w-0 items-center gap-2">
              <Input inputMode="numeric" aria-label="Minutos" value={String(v.minutos)} onFocus={(e) => e.target.select()}
                onChange={(e) => cambiar({ minutos: Math.min(59, enteroDe(e.target.value)), segundos: 0 })} />
              <span className="shrink-0 text-body-sm text-fg-muted">min</span>
            </label>
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <label className="block min-w-0 space-y-1"><span className="text-label text-fg-muted">Distancia (km)</span>
            <DecimalInput value={v.km} onChange={(km) => cambiar({ km })} placeholder="5,2" /></label>
          <label className="block min-w-0 space-y-1"><span className="text-label text-fg-muted">Desnivel + (m)</span>
            <DecimalInput value={v.desnivel} onChange={(desnivel) => cambiar({ desnivel })} placeholder="Opcional" /></label>
        </div>
        <label className="block space-y-1"><span className="text-label text-fg-muted">Nombre (opcional)</span>
          <Input value={v.nombre} maxLength={120} onChange={(e) => cambiar({ nombre: e.target.value })} placeholder="Ruta por el río" /></label>
      </div>
    </Sheet>
  )
}
