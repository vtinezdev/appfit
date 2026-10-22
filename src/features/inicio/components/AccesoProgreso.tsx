import Icon, { type IconName } from '../../../shared/components/Icon'
import { todayISO } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { useVitrina } from '../../vitrina/hooks/useVitrina'
import { formatKm } from '../../actividades/lib/actividad'
import { recuentoPiezas } from '../../vitrina/lib/logros'

export type DestinoProgreso = 'cumbres' | 'caminos' | 'ritmo' | 'vitrina'

interface Tesela { key: DestinoProgreso; label: string; icon: IconName; valor: string | null; unidad?: string; detalle: string }

/**
 * Progreso en Inicio, bajo la energía: Cumbres, Caminos, Ritmo y Vitrina en 2 × 2, una tesela por sección con su dato vivo
 * (metros, km, hilo, piezas) para ver cómo van sin entrar; tocarla abre la sección. No se pinta con la gamificación oculta en Ajustes.
 */
export default function AccesoProgreso({ onAbrir }: { onAbrir: (destino: DestinoProgreso) => void }) {
  const hoy = todayISO()
  const estado = useVitrina(hoy)
  if (!estado?.visible) return null
  const caminos = estado.caminos
  const camino = caminos?.visible ? caminos.caminos?.actual : undefined
  const actual = estado.cumbres?.actual
  const piezas = recuentoPiezas(estado.vitrina.logros)
  const hilo = estado.resultado.ritmo.hiloActual

  const teselas: Tesela[] = [
    actual
      ? { key: 'cumbres', label: 'Cumbres', icon: 'mountain', valor: formatInt(actual.metros), unidad: 'm', detalle: actual.montana.nombre }
      : { key: 'cumbres', label: 'Cumbres', icon: 'mountain', valor: null, detalle: 'Elige montaña' },
    camino
      ? { key: 'caminos', label: 'Caminos', icon: 'route', valor: formatKm(camino.metros), unidad: 'km', detalle: camino.ruta.nombre }
      : { key: 'caminos', label: 'Caminos', icon: 'route', valor: null, detalle: caminos?.visible ? 'Elige ruta' : '' },
    { key: 'ritmo', label: 'Ritmo', icon: 'calendar', valor: formatInt(hilo), unidad: hilo === 1 ? 'semana' : 'semanas', detalle: 'Hilo actual' },
    { key: 'vitrina', label: 'Vitrina', icon: 'trophy', valor: `${formatInt(piezas.conseguidas)}/${formatInt(piezas.total)}`, detalle: 'Piezas' },
  ]

  return (
    <ul className="progreso-teselas" aria-label="Tu progreso">
      {teselas.map((t) => <li key={t.key} className="min-w-0">
        <button type="button" onClick={() => onAbrir(t.key)}
          className="app-button app-card flex h-full min-h-touch-lg w-full flex-col items-start gap-1 rounded-lg border border-transparent bg-surface p-3 text-left shadow-card">
          <span className="flex w-full flex-col items-start gap-1 text-fg-muted">
            <Icon name={t.icon} size={18} className="shrink-0" />
            <span className="min-w-0 text-rotulo">{t.label}</span>
          </span>
          <span className="tabular flex min-h-touch flex-wrap items-baseline gap-x-1 text-fg">
            {t.valor !== null ? <><span className="font-numeric text-heading">{t.valor}</span>{t.unidad && <span className="text-caption text-fg-muted">{t.unidad}</span>}</> : <span className="text-body-sm text-fg-muted">—</span>}
          </span>
          {t.detalle && <span className="w-full break-words text-caption text-fg-muted">{t.detalle}</span>}
        </button>
      </li>)}
    </ul>
  )
}
