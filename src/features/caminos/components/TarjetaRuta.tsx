import { useId, useState, type ReactNode } from 'react'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import ProgressBar from '../../../shared/components/ProgressBar'
import { formatFriendly } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { formatKm, kmTexto } from '../../actividades/lib/actividad'
import { etapaActual, finalesDeEtapa, nombreExpedicion, type Expedicion } from '../lib/caminos'
import { metrosRuta } from '../lib/rutas'

/** Paradas que se ven a la vez en la fila de la tarjeta. */
const PARADAS = 4

const sellosTexto = (n: number) => (n === 1 ? '1 sello' : `${formatInt(n)} sellos`)

interface Props {
  actual: Expedicion
  /** La ruta la puso la app tras una llegada y aún no se ha elegido. */
  sugerida: boolean
  metrosSemana: number
  /** «Cómo funciona», en la esquina. */
  ayuda: ReactNode
  /** En una ruta propia, su mapa. */
  mapa?: ReactNode
  /** «Cambiar de ruta»; sin él, no sale. */
  onCambiar?: () => void
}

/**
 * La ruta en curso (punto 6, opción C): nombre y km, una fila con cuatro paradas alrededor de la actual, la etapa en curso
 * con su barra (al tocarla se despliegan todas las etapas, dentro de la misma tarjeta) y la credencial con un sello por día
 * que avanzaste, con su día del mes.
 */
export default function TarjetaRuta({ actual, sugerida, metrosSemana, ayuda, mapa, onCambiar }: Props) {
  const [abiertas, setAbiertas] = useState(false)
  const idEtapas = useId()
  const etapa = etapaActual(actual)
  const etapas = actual.ruta.etapas
  const finales = finalesDeEtapa(actual.ruta)
  const desde = Math.max(0, Math.min(etapa.indice - 1, etapas.length - PARADAS))
  const hecha = (i: number) => actual.etapas[i] !== null
  const enCurso = (i: number) => i === etapa.indice && !hecha(i)

  return <Card className="space-y-4">
    <div className="relative pr-10">
      <div className="absolute -right-2 -top-2">{ayuda}</div>
      <p className="text-rotulo text-fg-muted">{sugerida ? 'Sugerida' : 'Ruta actual'}</p>
      <h2 className="break-words text-heading text-fg">{nombreExpedicion(actual)}</h2>
      <p className="tabular break-words text-body-sm text-fg-muted">{actual.ruta.zona} · {formatKm(actual.metros)} de {kmTexto(metrosRuta(actual.ruta))}</p>
    </div>
    {mapa}

    <ol aria-label="Paradas" className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(PARADAS, etapas.length)}, minmax(0, 1fr))` }}>
      {etapas.slice(desde, desde + PARADAS).map((e, k, visibles) => {
        const i = desde + k
        return <li key={i} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
          <span aria-hidden className="flex w-full items-center">
            <span className={`h-0.5 flex-1 ${k === 0 ? 'bg-transparent' : hecha(i) || enCurso(i) ? 'bg-accent-strong' : 'bg-line-strong'}`} />
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-pill ${hecha(i) ? 'bg-accent text-accent-on' : enCurso(i) ? 'border-2 border-accent-strong bg-surface text-accent-strong' : 'bg-surface-muted text-fg-subtle'}`}>
              {hecha(i) ? <Icon name="check" size={14} /> : <span className="tabular text-caption font-semibold">{formatInt(i + 1)}</span>}
            </span>
            <span className={`h-0.5 flex-1 ${k === visibles.length - 1 ? 'bg-transparent' : hecha(i) ? 'bg-accent-strong' : 'bg-line-strong'}`} />
          </span>
          <span className={`line-clamp-2 break-words text-caption ${enCurso(i) ? 'font-semibold text-fg' : 'text-fg-muted'}`}>
            {e.hasta}<span className="sr-only">: {hecha(i) ? 'hecha' : enCurso(i) ? 'en curso' : 'por delante'}</span>
          </span>
        </li>
      })}
    </ol>

    {/* La etapa en curso; al tocarla, todas las etapas debajo, en la misma tarjeta. */}
    <div className="overflow-hidden rounded-md bg-surface-muted">
      <button type="button" aria-expanded={abiertas} aria-controls={idEtapas} onClick={() => setAbiertas(!abiertas)}
        className="app-button block w-full space-y-2 p-3 text-left">
        <span className="flex items-center justify-between gap-2">
          <span className="tabular text-rotulo text-fg-muted">Etapa {formatInt(etapa.indice + 1)} de {formatInt(etapas.length)}</span>
          <span className="flex items-center gap-1 text-caption font-semibold text-accent-strong">{abiertas ? 'Ocultar etapas' : 'Ver etapas'}<Icon name={abiertas ? 'chevron-up' : 'chevron-down'} size={16} /></span>
        </span>
        <span className="block break-words text-body font-semibold text-fg">{etapa.desde} → {etapa.hasta}</span>
        <ProgressBar value={etapa.recorridos} goal={etapa.total} label={`Etapa hacia ${etapa.hasta}`} valueText={`${formatKm(etapa.recorridos)} de ${kmTexto(etapa.total)}`} />
        <span className="tabular block text-caption text-fg-muted">{formatKm(etapa.recorridos)} de {kmTexto(etapa.total)}</span>
      </button>
      <ol id={idEtapas} hidden={!abiertas} aria-label={`Etapas de ${actual.ruta.nombre}`} className="border-t border-line px-3 pb-1 pt-3">
        {etapas.map((e, i) => {
          const marca = actual.etapas[i]
          const ultima = i === etapas.length - 1
          return <li key={i} className="flex gap-3">
            <span aria-hidden className="flex flex-col items-center">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-pill ${marca ? 'bg-accent text-accent-on' : enCurso(i) ? 'border-2 border-accent-strong bg-surface text-accent-strong' : 'bg-surface text-fg-subtle'}`}>
                {marca ? <Icon name="check" size={14} /> : <span className="tabular text-caption font-semibold">{formatInt(i + 1)}</span>}
              </span>
              {!ultima && <span className="w-px flex-1 bg-line-strong" />}
            </span>
            <span className={`flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 ${ultima ? 'pb-2' : 'pb-4'}`}>
              <span className="min-w-0">
                <span className={`block break-words text-body-sm ${marca || enCurso(i) ? 'font-semibold text-fg' : 'text-fg-muted'}`}>{e.hasta}</span>
                <span className="tabular block text-caption text-fg-muted">Etapa {formatInt(i + 1)} · {kmTexto(Math.round(e.km * 1000))}</span>
              </span>
              <span className="tabular shrink-0 text-caption text-fg-muted">{marca ? formatFriendly(marca.fecha) : `Faltan ${kmTexto(finales[i] - actual.metros)}`}</span>
            </span>
          </li>
        })}
      </ol>
    </div>

    <div className="space-y-2 border-t border-line pt-3">
      <p className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-rotulo text-fg-muted">Credencial</span>
        <span className="tabular text-caption text-fg-muted">{sellosTexto(actual.sellos.length)}{metrosSemana > 0 ? ` · +${kmTexto(metrosSemana)} esta semana` : ''}</span>
      </p>
      {actual.sellos.length === 0
        ? <p className="text-caption text-fg-muted">Cada día que avances en la ruta, un sello.</p>
        : <ul aria-label="Sellos: días que avanzaste" className="flex flex-wrap gap-1.5">
          {actual.sellos.map((f) => <li key={f} className="flex h-9 w-9 items-center justify-center rounded-pill border-2 border-dashed border-accent-strong text-accent-strong">
            <span aria-hidden className="tabular text-caption font-semibold">{Number(f.slice(8, 10))}</span><span className="sr-only">{formatFriendly(f)}</span>
          </li>)}
        </ul>}
    </div>
    {onCambiar && <Button variant="secondary" size="sm" onClick={onCambiar}>Cambiar de ruta</Button>}
  </Card>
}
