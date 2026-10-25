import { IconButton } from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import { etiquetaPeriodo } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import type { ResumenTarjetaRevision } from '../hooks/useRevisionSemanal'
import { formatDiferencia } from '../lib/revisionSemanal'
import type { Settings } from '../../../shared/db/types'
import { moduloActivo } from '../../../shared/lib/modulos'

interface Props {
  resumen: ResumenTarjetaRevision
  /** Módulos de «Lo que usas» (B9): las cifras de los ocultos no salen. */
  modulos?: Pick<Settings, 'modulos'>
  onVer: () => void
  onCerrar: () => void
}

function Cifra({ valor, unidad, vacio, detalle }: { valor: string | null; unidad: string; vacio: string; detalle?: string | null }) {
  return (
    <span className="flex min-w-0 flex-col">
      {valor === null
        ? <span className="text-body-sm font-semibold text-fg">{vacio}</span>
        : <span className="tabular flex flex-wrap items-baseline gap-x-1 text-fg"><span className="font-numeric text-title">{valor}</span></span>}
      <span className="break-words text-caption text-fg-muted">{unidad}</span>
      {detalle && <span className="tabular break-words text-caption text-fg-muted">{detalle}</span>}
    </span>
  )
}

/**
 * Revisión de la semana cerrada en Inicio, en una fila: peso medio, kcal medias y entrenos, cada uno con su diferencia
 * frente a la semana anterior y sin juicio de valor. Toda la tarjeta abre la revisión; la X («Hecho») la oculta hasta el
 * lunes siguiente.
 */
export default function TarjetaRevisionSemanal({ resumen, modulos, onVer, onCerrar }: Props) {
  const { semana, peso, nutricion, sesiones, sesionesAnterior } = resumen
  const cifras = [moduloActivo(modulos, 'peso'), moduloActivo(modulos, 'nutricion'), moduloActivo(modulos, 'gym')].filter(Boolean).length
  return (
    <Card role="region" aria-label="Revisión semanal" padded={false} className="relative">
      <button type="button" onClick={onVer} className="flex w-full flex-col gap-3 rounded-lg p-4 text-left">
        <span className="pr-10 text-rotulo text-fg-muted">Tu semana · <span className="tabular">{etiquetaPeriodo('semana', semana.lunes)}</span></span>
        <span className={`grid w-full gap-3 ${cifras === 3 ? 'grid-cols-3' : cifras === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {moduloActivo(modulos, 'peso') && <Cifra valor={peso.media === null ? null : formatNumber(peso.media, 1)} unidad="kg de media" vacio="Sin pesajes"
            detalle={peso.diferencia === null ? null : formatDiferencia(peso.diferencia, 1, 'kg')} />}
          {moduloActivo(modulos, 'nutricion') && <Cifra valor={nutricion.kcalMedia === null ? null : formatInt(nutricion.kcalMedia)} unidad="kcal al día" vacio="Sin registros"
            detalle={nutricion.kcalMedia !== null && nutricion.kcalObjetivo !== null ? `objetivo ${formatInt(nutricion.kcalObjetivo)}` : null} />}
          {moduloActivo(modulos, 'gym') && <Cifra valor={formatInt(sesiones)} unidad={sesiones === 1 ? 'entreno' : 'entrenos'} vacio="" detalle={formatDiferencia(sesiones - sesionesAnterior)} />}
        </span>
        <span className="flex w-full items-center gap-2 text-body-sm font-semibold text-fg">
          <span className="min-w-0 flex-1">Ver revisión</span>
          <Icon name="chevron-right" size={18} className="text-fg-subtle" />
        </span>
      </button>
      <div className="absolute right-1 top-1"><IconButton icon="close" label="Hecho" variant="ghost" onClick={onCerrar} /></div>
    </Card>
  )
}
