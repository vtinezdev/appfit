import { useRef, useState } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import type { TipoActividad } from '../../../shared/db/types'
import { ETIQUETA_TIPO, TIPOS_ACTIVIDAD } from '../lib/actividad'

interface Props {
  open: boolean
  onClose: () => void
  /** Se llama al terminar de cerrarse la hoja, para no apilar la grabación sobre ella. */
  onEmpezar: (tipo: TipoActividad) => void
}

/** Antes de grabar: el tipo y lo que hay que saber del GPS en una web app (la pantalla tiene que seguir encendida). */
export default function HojaGrabar({ open, onClose, onEmpezar }: Props) {
  const [tipo, setTipo] = useState<TipoActividad>('caminar')
  const elegido = useRef<TipoActividad | null>(null)
  const gpsDisponible = typeof navigator !== 'undefined' && 'geolocation' in navigator

  return (
    <Sheet open={open} onClose={onClose} title="Grabar con el GPS"
      onExited={() => { const t = elegido.current; elegido.current = null; if (t) onEmpezar(t) }}
      footer={<Button block disabled={!gpsDisponible} onClick={() => { elegido.current = tipo; onClose() }}><Icon name="play" size={18} />Empezar</Button>}>
      <div className="space-y-4">
        <SegmentedControl<TipoActividad> label="Tipo de actividad" valor={tipo} onChange={setTipo}
          opciones={TIPOS_ACTIVIDAD.map((t) => ({ valor: t, label: ETIQUETA_TIPO[t] }))} />
        <ul className="list-disc space-y-2 pl-5 text-body-sm text-fg">
          <li>Deja la pantalla encendida y AppFit abierta: con la pantalla bloqueada o en otra app, el iPhone no le da la ubicación. AppFit intenta que la pantalla no se apague sola.</li>
          <li>Si se corta, al volver une el hueco en línea recta: la distancia puede quedarse algo corta.</li>
          <li>Para rutas largas, graba con tu reloj, Strava o Wikiloc e importa después el GPX.</li>
          <li>La ubicación no sale del móvil: el recorrido se guarda solo aquí y se dibuja sin mapa.</li>
        </ul>
        {!gpsDisponible && <p className="break-words text-body-sm text-warning">Este navegador no da acceso a la ubicación.</p>}
      </div>
    </Sheet>
  )
}
