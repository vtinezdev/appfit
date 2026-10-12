import { kmTexto } from '../../actividades/lib/actividad'
import TrazadoCamino from '../../caminos/components/TrazadoCamino'
import type { EstadoCaminos } from '../../caminos/hooks/useCaminos'
import { cuandoFue } from '../../cumbres/lib/cumbres'
import { etapaActual, llegadaReciente, nombreExpedicion, progresoTexto } from '../../caminos/lib/caminos'
import TarjetaAcceso from './TarjetaAcceso'

/**
 * Camino en Inicio (tarjeta ancha): la ruta actual con su trazado y la etapa en curso; sin ruta elegida, la invitación
 * a elegir la primera. Abre Caminos. No aparece si la gamificación está oculta en Ajustes.
 */
export default function AccesoCamino({ hoy, estado, onAbrir }: { hoy: string; estado: EstadoCaminos | undefined; onAbrir: () => void }) {
  if (!estado?.visible) return null
  const c = estado.caminos

  if (!c) {
    return (
      <TarjetaAcceso etiqueta="Caminos" onAbrir={onAbrir}>
        <span className="break-words text-title text-fg">Elige tu primer Camino</span>
        <span className="break-words text-body-sm text-fg-muted">El Camino de Santiago, grandes rutas del mundo o viajes de libro, con los km que caminas y corres.</span>
      </TarjetaAcceso>
    )
  }

  const etapa = etapaActual(c.actual)
  const reciente = llegadaReciente(c, hoy)
  return (
    <TarjetaAcceso etiqueta="Camino" onAbrir={onAbrir}>
      <span className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="break-words text-title text-fg">{nombreExpedicion(c.actual)}</span>
        <span className="tabular text-body-sm text-fg-muted">{progresoTexto(c.actual)}</span>
      </span>
      <span className="mt-1 block"><TrazadoCamino expedicion={c.actual} decorativo /></span>
      {reciente?.llegada && <span className="break-words text-body-sm font-semibold text-fg">Llegada a {reciente.ruta.etapas.at(-1)?.hasta} {cuandoFue(reciente.llegada.fecha, hoy)}</span>}
      <span className="tabular break-words text-body-sm text-fg">Hacia {etapa.hasta}: faltan {kmTexto(etapa.total - etapa.recorridos)}</span>
    </TarjetaAcceso>
  )
}
