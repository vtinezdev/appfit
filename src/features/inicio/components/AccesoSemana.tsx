import type { EstadoAtributos } from '../../atributos/hooks/useAtributos'
import DiasSemana from '../../ritmo/components/DiasSemana'
import { ESTADOS_SEMANA } from '../../ritmo/lib/ritmo'
import { cifrasSemana, faltaParaCumplir, textoHilo } from '../../ritmo/lib/textos'
import TarjetaAcceso from './TarjetaAcceso'

/**
 * «Tu semana» (Ritmo) en Inicio: los 7 días con entreno y registro, las cifras frente al plan, lo que falta y el hilo.
 * Toda la tarjeta abre Ritmo. No aparece si la gamificación está oculta en Ajustes.
 */
export default function AccesoSemana({ hoy, estado, onAbrir }: { hoy: string; estado: EstadoAtributos | undefined; onAbrir: () => void }) {
  if (!estado?.visible) return null
  const r = estado.resultado
  const s = r.ritmo.actual
  return (
    <TarjetaAcceso etiqueta="Tu semana" onAbrir={onAbrir}>
      <span className="break-words text-title text-fg">
        {s.pausa ? 'En pausa' : s.cumplida ? ESTADOS_SEMANA.cumplida.nombre : textoHilo(r.ritmo.hiloActual)}
      </span>
      <span className="mt-1 block"><DiasSemana lunes={s.lunes} hoy={hoy} diasEntreno={r.diasEntreno} diasRegistro={estado.conNutricion ? r.diasRegistro : null} /></span>
      <span className="tabular break-words text-body-sm text-fg-muted">{cifrasSemana(s)}</span>
      <span className="break-words text-body-sm text-fg">{faltaParaCumplir(s) ?? (s.pausa ? 'El hilo se congela mientras dure' : textoHilo(r.ritmo.hiloActual))}</span>
    </TarjetaAcceso>
  )
}
