import Icon from '../shared/components/Icon'
import { todayISO } from '../shared/lib/dates'
import { formatInt } from '../shared/lib/format'
import { useVitrina } from '../features/vitrina/hooks/useVitrina'
import { useCaminos } from '../features/caminos/hooks/useCaminos'
import { formatKm } from '../features/actividades/lib/actividad'
import { recuentoPiezas } from '../features/vitrina/lib/logros'
import { DESTINOS, type Tab } from './navegacion'

interface Props {
  actual: Tab
  onElegir: (tab: Tab) => void
}

interface Tesela { key: Tab; valor: string | null; unidad?: string; detalle: string }

const destino = (key: Tab) => DESTINOS.find((d) => d.key === key)!

/**
 * Cumbres, Caminos, Ritmo y Vitrina en la hoja «Más»: una tesela por sección con su dato vivo (metros, km, hilo, piezas), para ver
 * cómo van sin entrar. Solo se monta con la hoja abierta: la lectura recorre todo el historial.
 */
export default function MasAccesos({ actual: tabActual, onElegir }: Props) {
  const hoy = todayISO()
  const estado = useVitrina(hoy)
  const caminos = useCaminos(hoy)
  const camino = caminos?.visible ? caminos.caminos?.actual : undefined
  const listo = estado?.visible ? estado : null
  const actual = listo?.cumbres?.actual
  const piezas = listo ? recuentoPiezas(listo.vitrina.logros) : null
  const hilo = listo?.resultado.ritmo.hiloActual

  const teselas: Tesela[] = [
    actual
      ? { key: 'cumbres', valor: formatInt(actual.metros), unidad: 'm', detalle: actual.montana.nombre }
      : { key: 'cumbres', valor: null, detalle: listo ? 'Elige montaña' : '' },
    camino
      ? { key: 'caminos', valor: formatKm(camino.metros), unidad: 'km', detalle: camino.ruta.nombre }
      : { key: 'caminos', valor: null, detalle: caminos?.visible ? 'Elige ruta' : '' },
    { key: 'ritmo', valor: hilo === undefined ? null : formatInt(hilo), unidad: hilo === 1 ? 'semana' : 'semanas', detalle: 'Hilo actual' },
    { key: 'vitrina', valor: piezas ? `${formatInt(piezas.conseguidas)}/${formatInt(piezas.total)}` : null, detalle: 'Piezas' },
  ]

  return (
    <ul className="mas-teselas" aria-label="Progreso">
      {teselas.map((t) => {
        const d = destino(t.key)
        return <li key={t.key} className="min-w-0">
          <button type="button" onClick={() => onElegir(t.key)} aria-current={tabActual === t.key ? 'page' : undefined}
            className="app-button flex h-full min-h-touch-lg w-full flex-col items-start gap-1 rounded-lg bg-surface-muted p-3 text-left">
            <span className="flex w-full flex-col items-start gap-1 text-fg-muted">
              <Icon name={d.icon} size={18} className="shrink-0" />
              <span className="min-w-0 text-rotulo">{d.label}</span>
            </span>
            <span className="tabular flex min-h-touch flex-wrap items-baseline gap-x-1 text-fg">
              {t.valor !== null ? <><span className="font-numeric text-heading">{t.valor}</span>{t.unidad && <span className="text-caption text-fg-muted">{t.unidad}</span>}</> : <span className="text-body-sm text-fg-muted">—</span>}
            </span>
            {t.detalle && <span className="w-full break-words text-caption text-fg-muted">{t.detalle}</span>}
          </button>
        </li>
      })}
    </ul>
  )
}
