import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import { Textarea } from '../../../shared/components/Input'
import Metric from '../../../shared/components/Metric'
import PageHeader from '../../../shared/components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import type { Actividad } from '../../../shared/db/types'
import { formatFechaHoraConDia } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import AvanceActividad from '../../caminos/components/AvanceActividad'
import HojaActividad from '../components/HojaActividad'
import PerfilAltitud from '../components/PerfilAltitud'
import TrazadoRecorrido from '../components/TrazadoRecorrido'
import * as actividadesRepo from '../data/actividadesRepo'
import { duracionTexto, formatKm, formatRitmo, formatVelocidad, kmTexto, NOMBRE_TIPO, ritmoSegPorKm, tituloActividad } from '../lib/actividad'
import { valoresIniciales } from '../lib/formulario'

const ORIGEN: Record<Actividad['origen'], string> = {
  manual: 'Registrada a mano',
  gpx: 'Importada de un GPX',
  gps: 'Grabada con el GPS del móvil',
}

interface Props {
  actividadId: number
  onVolver: () => void
  /** Tras borrarla: quien la abrió ofrece «Deshacer». */
  onBorrada: (a: Actividad) => void
}

/** Una actividad: recorrido, cifras, altitud, lo que subió en Cumbres y avanzó en Caminos, notas, editar y borrar. */
export default function DetalleActividad({ actividadId, onVolver, onBorrada }: Props) {
  const a = useLiveQuery(async () => (await actividadesRepo.obtener(actividadId)) ?? null, [actividadId])
  const [editando, setEditando] = useState(false)
  const [aperturas, setAperturas] = useState(0)
  const [notas, setNotas] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [borrando, setBorrando] = useState(false)

  const volver = <Button variant="ghost" size="sm" className="-ml-3" onClick={onVolver}><Icon name="arrow-left" size={18} />Actividades</Button>
  if (a === undefined) return <div className="px-page pt-5"><LoadingState /></div>
  if (a === null || a.enCurso) return <div className="space-y-3 px-page pt-5">{volver}<EmptyState>Esta actividad ya no está disponible.</EmptyState></div>

  const actividad = a
  const ritmo = ritmoSegPorKm(actividad.duracionSeg, actividad.distanciaM)

  async function guardarNotas() {
    if (notas === null || notas === (actividad.notas ?? '')) return
    try {
      await actividadesRepo.actualizar(actividad.id, { notas })
      setError(null)
    } catch {
      setError('No se han podido guardar las notas. Inténtalo de nuevo.')
    }
  }

  async function borrar() {
    if (borrando) return
    setBorrando(true)
    try {
      const borrada = await actividadesRepo.borrar(actividad.id)
      if (borrada) onBorrada(borrada)
      onVolver()
    } catch {
      setError('No se ha podido borrar. Inténtalo de nuevo.')
      setBorrando(false)
    }
  }

  return (
    <div className="space-y-section px-page pb-16 pt-5">
      <div className="flex items-center justify-between gap-2">
        {volver}
        <Button variant="secondary" size="sm" onClick={() => { setAperturas((n) => n + 1); setEditando(true) }}><Icon name="pencil" size={16} />Editar</Button>
      </div>
      <PageHeader title={tituloActividad(actividad)} overline={`${NOMBRE_TIPO[actividad.tipo]} · ${formatFechaHoraConDia(actividad.inicio)}`} />
      {error && <ErrorState>{error}</ErrorState>}

      <Card className="space-y-4">
        {actividad.recorrido?.length ? <TrazadoRecorrido recorrido={actividad.recorrido} label={`Recorrido de ${kmTexto(actividad.distanciaM)}`} /> : null}
        <div className="grid grid-cols-2 gap-4">
          <Metric size="title" label="Distancia" valor={formatKm(actividad.distanciaM)} unidad="km" />
          <Metric size="title" label="Duración" valor={duracionTexto(actividad.duracionSeg)} />
          <Metric size="title" label="Ritmo" valor={formatRitmo(ritmo)} caption={formatVelocidad(actividad.duracionSeg, actividad.distanciaM)} />
          {actividad.desnivelM !== undefined && <Metric size="title" label="Desnivel +" valor={formatInt(actividad.desnivelM)} unidad="m" />}
        </div>
        {actividad.recorrido?.length ? <PerfilAltitud recorrido={actividad.recorrido} /> : null}
        <p className="break-words text-caption text-fg-muted">{ORIGEN[actividad.origen]}</p>
      </Card>

      <AvanceActividad actividad={actividad} />

      <label className="block space-y-1"><span className="text-label text-fg-muted">Notas</span>
        <Textarea rows={3} value={notas ?? actividad.notas ?? ''} onChange={(e) => setNotas(e.target.value)} onBlur={() => { void guardarNotas() }} placeholder="Sensaciones, tiempo, compañía…" /></label>

      <Button variant="destructive" block loading={borrando} onClick={borrar}><Icon name="trash" size={18} />Borrar actividad</Button>

      <HojaActividad key={aperturas} open={editando} onClose={() => setEditando(false)} titulo="Editar actividad" accion="Guardar cambios"
        inicial={valoresIniciales(actividad)}
        onGuardar={async (datos) => {
          await actividadesRepo.actualizar(actividad.id, { ...datos, desnivelM: datos.desnivelM, nombre: datos.nombre ?? '' })
          setEditando(false)
        }} />
    </div>
  )
}
