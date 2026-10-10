import { formatInt } from '../../../shared/lib/format'
import type { EstadoAtributos } from '../../atributos/hooks/useAtributos'
import { entrenoHoy, nivelDeXp, textoEntrenoHoy, tituloDe } from '../../atributos/lib/atributos'
import TarjetaAcceso from './TarjetaAcceso'

/**
 * Nivel en Inicio (tarjeta ancha): nivel y título, la barra de XP del nivel y lo que valdría entrenar hoy. Toda la tarjeta
 * abre Atributos. No aparece si están ocultos en Ajustes.
 */
export default function AccesoNivel({ hoy, estado, onAbrir }: { hoy: string; estado: EstadoAtributos | undefined; onAbrir: () => void }) {
  if (!estado?.visible) return null
  const r = estado.resultado
  const n = nivelDeXp(r.total)
  return (
    <TarjetaAcceso etiqueta="Nivel" onAbrir={onAbrir}>
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="tabular font-numeric text-heading text-fg">{formatInt(n.nivel)}</span>
        <span className="break-words text-title text-fg">{tituloDe(n.nivel)}</span>
      </span>
      {/* Dentro de un botón: barra decorativa; las cifras van en el texto de debajo. */}
      <span aria-hidden className="relative mt-1 block h-1.5 w-full overflow-hidden rounded-sm bg-line">
        <span className="progress-fill absolute inset-0 origin-left bg-fg" style={{ transform: `scaleX(${n.xpEnNivel / n.xpSiguiente})` }} />
      </span>
      <span className="tabular text-body-sm text-fg-muted">{formatInt(n.xpEnNivel)} de {formatInt(n.xpSiguiente)} XP para el nivel {formatInt(n.nivel + 1)}</span>
      <span className="break-words text-body-sm text-fg">{textoEntrenoHoy(entrenoHoy(r, hoy))}</span>
    </TarjetaAcceso>
  )
}
