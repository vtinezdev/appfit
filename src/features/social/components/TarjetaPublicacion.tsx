import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import Button from '../../../shared/components/Button'
import Disclosure from '../../../shared/components/Disclosure'
import RecordsPublicacion from './RecordsPublicacion'
import { contextoPublicacion } from '../lib/feed'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import Metric from '../../../shared/components/Metric'
import { formatFechaHoraConDia, formatFriendly } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { duracionTexto, formatKm, formatRitmo, NOMBRE_TIPO, ritmoSegPorKm } from '../../actividades/lib/actividad'
import { textoEjercicios, type LineaLogro, type Resumen } from '../lib/publicacion'
import MapaPublicacion from './MapaPublicacion'
import IconoLogro from '../../vitrina/components/IconoLogro'
import { NUMERALES } from '../../vitrina/lib/logros'

interface Props {
  resumen: Resumen
  /** ms del inicio del entreno o de la actividad. */
  fecha: number
  /** Quién lo publicó (en el feed); sin él, es la vista previa de lo propio. */
  autor?: ReactNode
  creada?: string
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
function TextoExpandible({ texto, previa, nota = false }: { texto: string; previa: boolean; nota?: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const parrafo = useRef<HTMLParagraphElement>(null)
  const [largo, setLargo] = useState(false)
  useLayoutEffect(() => {
    const el=parrafo.current
    if(!el || previa || abierto) return
    const medir=()=>setLargo(el.scrollHeight>el.clientHeight+1)
    medir()
    const observer=new ResizeObserver(medir)
    observer.observe(el)
    return ()=>observer.disconnect()
  }, [texto,previa,abierto])
  return <div><p ref={parrafo} className={`whitespace-pre-wrap break-words text-body text-fg ${!previa && !abierto ? nota ? 'line-clamp-4' : 'line-clamp-6' : ''}`}>{texto}</p>
    {!previa && largo && <Button variant="subtle" size="sm" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>{abierto ? 'Menos' : 'Más'}</Button>}
  </div>
}

export default function TarjetaPublicacion({ resumen: r, fecha, autor, pie, creada }: Props) {
  const [detalle, setDetalle] = useState(false)
  const previa = !creada
  // Los logros solo guardan el día: no inventar una hora de obtención ni desplazarlo al cambiar de zona horaria.
  const dia = new Date(fecha).toISOString().slice(0, 10)
  const contexto = r.tipo === 'logro' ? `Conseguido: ${formatFriendly(dia)}` : creada ? contextoPublicacion(r.tipo, fecha, creada) : r.tipo === 'texto' ? null : formatFechaHoraConDia(fecha)
  const detalles = () => r.tipo === 'entreno' && <div className="space-y-stack">
    {r.ejercicios.length > 0 && <p className="break-words text-body-sm text-fg-muted">{textoEjercicios(r.ejercicios, r.ejercicios.length)}</p>}
    {r.mapa && <MapaPublicacion mapa={r.mapa} />}
    <RecordsPublicacion resumen={r} detalle />
    <Lineas titulo="Ligas" lineas={r.ligas} />
    {r.logros.length > 0 && <div className="space-y-1"><p className="text-label text-fg-muted">Nuevo en la Vitrina</p><p className="break-words text-body-sm text-fg">{r.logros.join(' · ')}</p></div>}
  </div>
  return (
    <Card className="publicacion-tarjeta space-y-3">
      <div className="space-y-1">
        {autor}
        {r.tipo !== 'texto' && <><p className="text-rotulo text-fg-muted">{r.tipo === 'entreno' ? 'ENTRENO' : r.tipo === 'logro' ? 'LOGRO' : `ACTIVIDAD · ${NOMBRE_TIPO[r.actividad].toLocaleUpperCase('es')}`}</p>
        <p className="break-words text-heading text-fg">{r.titulo}</p></>}
        {contexto && <p className="text-caption text-fg-muted first-letter:uppercase">{contexto}</p>}
      </div>
      {r.tipo === 'texto' && <TextoExpandible texto={r.texto} previa={previa} />}
      {r.tipo !== 'texto' && r.nota && <TextoExpandible texto={r.nota} previa={previa} nota />}
      {r.tipo === 'logro' && <div className="flex items-start gap-3">
        <IconoLogro logro={{ id: r.logroId, grupo: r.grupo, nombre: r.titulo, descripcion: r.descripcion, niveles: [{ fecha: dia }] }} />
        <div className="min-w-0 space-y-1">
          <p className="text-body-sm font-semibold text-fg">{r.nivel ? `Nivel ${NUMERALES[r.nivel - 1]}` : 'Logro conseguido'}</p>
          <p className="break-words text-body-sm text-fg-muted">{r.descripcion}</p>
        </div>
      </div>}
      {r.tipo === 'entreno' ? (
        <div className="publicacion-metricas grid grid-cols-3 gap-3">
          {r.duracionSeg !== undefined && <Metric size="title" label="Duración" valor={duracionTexto(r.duracionSeg)} />}
          <Metric size="title" label="Series" valor={formatInt(r.series)} />
          {r.volumenKg !== undefined && <Metric size="title" label="Volumen" valor={formatInt(r.volumenKg)} unidad="kg" />}
        </div>
      ) : r.tipo === 'actividad' ? (
        <div className="publicacion-metricas grid grid-cols-2 gap-3">
          <Metric size="title" label="Distancia" valor={formatKm(r.distanciaM)} unidad="km" />
          {r.duracionSeg !== undefined && <Metric size="title" label="Duración" valor={duracionTexto(r.duracionSeg)} />}
          {r.duracionSeg !== undefined && <Metric size="title" label="Ritmo" valor={formatRitmo(ritmoSegPorKm(r.duracionSeg, r.distanciaM))} />}
          {r.desnivelM !== null && <Metric size="title" label="Desnivel +" valor={formatInt(r.desnivelM)} unidad="m" />}
        </div>
      ) : null}
      {r.tipo === 'entreno' && <>
        <RecordsPublicacion resumen={r} />
        {previa ? detalles() : <Disclosure title="Ver detalle" open={detalle} onChange={setDetalle}>{detalle && detalles()}</Disclosure>}
      </>}
      {pie}
    </Card>
  )
}
