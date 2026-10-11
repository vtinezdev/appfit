import { formatInt } from '../../../shared/lib/format'
import { entrenoHoy, nivelDeXp, textoEntrenoHoy, tituloDe } from '../../atributos/lib/atributos'
import PerfilMontana from '../../cumbres/components/PerfilMontana'
import type { EstadoCumbres } from '../../cumbres/hooks/useCumbres'
import { cuandoFue, cumbreReciente, progresoTexto } from '../../cumbres/lib/cumbres'
import { pausaActiva } from '../../ritmo/lib/pausas'
import TarjetaAcceso from './TarjetaAcceso'

/**
 * Nivel en Inicio (tarjeta ancha): nivel y título y lo que valdría entrenar hoy. Con Cumbres empezada, el perfil de la
 * montaña sustituye a la barra de XP (una sola barra en la tarjeta) y abre Cumbres; si no, la barra de XP abre
 * Atributos. No aparece si están ocultos en Ajustes.
 */
export default function AccesoNivel({ hoy, estado, onAbrirAtributos, onAbrirCumbres }: {
  hoy: string
  estado: EstadoCumbres | undefined
  onAbrirAtributos: () => void
  onAbrirCumbres: () => void
}) {
  if (!estado?.visible) return null
  const r = estado.resultado
  const n = nivelDeXp(r.total)
  const c = estado.cumbres
  const nivel = <span className="flex flex-wrap items-baseline gap-x-2">
    <span className="tabular font-numeric text-heading text-fg">{formatInt(n.nivel)}</span>
    <span className="break-words text-title text-fg">{tituloDe(n.nivel)}</span>
  </span>
  const xp = <span className="tabular text-body-sm text-fg-muted">{formatInt(n.xpEnNivel)} de {formatInt(n.xpSiguiente)} XP para el nivel {formatInt(n.nivel + 1)}</span>
  const hoyEntreno = <span className="break-words text-body-sm text-fg">{textoEntrenoHoy(entrenoHoy(r, hoy))}</span>

  if (!c) {
    return (
      <TarjetaAcceso etiqueta="Nivel" onAbrir={onAbrirAtributos}>
        {nivel}
        {/* Dentro de un botón: barra decorativa; las cifras van en el texto de debajo. */}
        <span aria-hidden className="relative mt-1 block h-1.5 w-full overflow-hidden rounded-sm bg-line">
          <span className="progress-fill absolute inset-0 origin-left bg-fg" style={{ transform: `scaleX(${n.xpEnNivel / n.xpSiguiente})` }} />
        </span>
        {xp}
        {hoyEntreno}
      </TarjetaAcceso>
    )
  }

  const reciente = cumbreReciente(c, hoy)
  const enPausa = pausaActiva(estado.pausas, hoy) !== null
  return (
    <TarjetaAcceso etiqueta="Nivel y cumbre" onAbrir={onAbrirCumbres}>
      {nivel}
      {c.actual
        ? <>
          <span className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="break-words text-body font-semibold text-fg">{c.actual.montana.nombre}</span>
            <span className="tabular text-body-sm text-fg-muted">{progresoTexto(c.actual)}</span>
          </span>
          <span className="mt-1 block"><PerfilMontana expedicion={c.actual} variante="tarjeta" decorativo /></span>
        </>
        : <span className="break-words text-body font-semibold text-fg">Todas las cumbres coronadas</span>}
      {reciente?.cumbre && <span className="break-words text-body-sm font-semibold text-fg">Cumbre del {reciente.montana.nombre} {cuandoFue(reciente.cumbre.fecha, hoy)}</span>}
      {enPausa && <span className="break-words text-body-sm text-fg-muted">En el refugio mientras dure la pausa</span>}
      {xp}
      {hoyEntreno}
    </TarjetaAcceso>
  )
}
