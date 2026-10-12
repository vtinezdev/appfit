import { entrenoHoy, textoEntrenoHoy } from '../../experiencia/lib/experiencia'
import PerfilMontana from '../../cumbres/components/PerfilMontana'
import type { EstadoCumbres } from '../../cumbres/hooks/useCumbres'
import { cuandoFue, cumbreReciente, nombreExpedicion, progresoTexto } from '../../cumbres/lib/cumbres'
import { pausaActiva } from '../../ritmo/lib/pausas'
import TarjetaAcceso from './TarjetaAcceso'

/**
 * Cumbre en Inicio (tarjeta ancha): la montaña actual con su perfil y lo que valdría entrenar hoy; sin montaña elegida,
 * la invitación a elegir la primera. Abre Cumbres. No aparece si la gamificación está oculta en Ajustes.
 */
export default function AccesoCumbre({ hoy, estado, onAbrir }: { hoy: string; estado: EstadoCumbres | undefined; onAbrir: () => void }) {
  if (!estado?.visible) return null
  const c = estado.cumbres
  const hoyEntreno = <span className="break-words text-body-sm text-fg">{textoEntrenoHoy(entrenoHoy(estado.resultado, hoy))}</span>

  if (!c) {
    return (
      <TarjetaAcceso etiqueta="Cumbres" onAbrir={onAbrir}>
        <span className="break-words text-title text-fg">Elige tu primera montaña</span>
        <span className="break-words text-body-sm text-fg-muted">Entrenos, récords{estado.conNutricion ? ', comidas' : ''} y semanas cumplidas te suben metros, desde el día en que empiezas.</span>
      </TarjetaAcceso>
    )
  }

  const reciente = cumbreReciente(c, hoy)
  const enPausa = pausaActiva(estado.pausas, hoy) !== null
  return (
    <TarjetaAcceso etiqueta="Cumbre" onAbrir={onAbrir}>
      <span className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="break-words text-title text-fg">{nombreExpedicion(c.actual)}</span>
        <span className="tabular text-body-sm text-fg-muted">{progresoTexto(c.actual)}</span>
      </span>
      <span className="mt-1 block"><PerfilMontana expedicion={c.actual} variante="tarjeta" decorativo /></span>
      {reciente?.cumbre && <span className="break-words text-body-sm font-semibold text-fg">Cumbre del {nombreExpedicion(reciente)} {cuandoFue(reciente.cumbre.fecha, hoy)}</span>}
      {enPausa && <span className="break-words text-body-sm text-fg-muted">En el refugio mientras dure la pausa</span>}
      {hoyEntreno}
    </TarjetaAcceso>
  )
}
