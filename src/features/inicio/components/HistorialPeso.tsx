import { lazy, Suspense, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button, { IconButton } from '../../../shared/components/Button'
import Sheet from '../../../shared/components/Sheet'
import Metric from '../../../shared/components/Metric'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import type { Peso } from '../../../shared/db/types'
import { parseISODate, todayISO } from '../../../shared/lib/dates'
import { formatNumber } from '../../../shared/lib/format'
import * as pesosRepo from '../data/pesosRepo'
import { actualizarObjetivoHoy } from '../../perfil/data/objetivosDiaRepo'
import { mediaMovilPeso } from '../lib/peso'

// Recharts va en su propio chunk: no entra en el arranque de Inicio.
const GraficaPeso = lazy(() => import('./GraficaPeso'))

const fechaLarga = (fecha: string) => parseISODate(fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Consulta y borra pesajes. Dentro de un Sheet el Toast queda debajo, así que el «Deshacer» del borrado va en línea.
 */
export default function HistorialPeso({ onClose }: { onClose: () => void }) {
  const pesos = useLiveQuery(() => pesosRepo.delRango('0000-01-01', todayISO()), [])
  const [borrado, setBorrado] = useState<Peso | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lista = pesos ? [...pesos].reverse() : []

  async function borrar(p: Peso) {
    setError(null)
    try {
      const b = await pesosRepo.borrar(p.id)
      if (b) { setBorrado(b); void actualizarObjetivoHoy(todayISO(), 'peso') }
    } catch {
      setError('No se ha podido borrar el pesaje. Inténtalo de nuevo.')
    }
  }

  async function deshacer() {
    if (!borrado) return
    setError(null)
    try {
      await pesosRepo.restaurar(borrado)
      void actualizarObjetivoHoy(todayISO(), 'peso')
      setBorrado(null)
    } catch {
      setError('No se ha podido deshacer: ya hay otro pesaje de ese día.')
    }
  }

  return (
    <Sheet open title="Historial de peso" onClose={onClose}>
      {!pesos ? <LoadingState /> : (
        <div className="space-y-5">
          {borrado && (
            <div role="status" className="flex min-h-touch items-center justify-between gap-3 rounded-md bg-surface-muted px-3 text-body-sm text-fg">
              <span className="min-w-0">Pesaje del {fechaLarga(borrado.fecha)} borrado</span>
              <Button variant="ghost" size="sm" onClick={deshacer}>Deshacer</Button>
            </div>
          )}
          {error && <ErrorState>{error}</ErrorState>}
          {!lista.length ? <EmptyState title="Tu primer pesaje">Registra el peso desde Inicio. Aquí podrás consultar cada fecha.</EmptyState> : (
            <>
              <Metric size="hero" label="Último registro" valor={formatNumber(lista[0].kg, 1)} unidad="kg" />
              {lista.length >= 2 && <Suspense fallback={<LoadingState />}><GraficaPeso puntos={mediaMovilPeso(lista)} /></Suspense>}
              {lista.length >= 2 && <p className="text-caption text-fg-muted">La media de 7 días promedia los pesajes de los 7 días naturales que acaban en cada fecha: suaviza las subidas y bajadas por agua, sal o digestión.</p>}
              <ul className="divide-y divide-line" aria-label="Pesajes registrados">
                {lista.map(p => <li key={p.id} className="flex min-h-touch items-center justify-between gap-3 py-1">
                  <time dateTime={p.fecha} className="text-body-sm text-fg-muted">{fechaLarga(p.fecha)}</time>
                  <span className="flex items-center gap-1">
                    <span className="tabular text-body font-semibold text-fg">{formatNumber(p.kg, 1)} <span className="font-normal text-fg-muted">kg</span></span>
                    <IconButton icon="trash" variant="ghost" size="sm" label={`Borrar pesaje del ${fechaLarga(p.fecha)}`} onClick={() => borrar(p)} />
                  </span>
                </li>)}
              </ul>
            </>
          )}
        </div>
      )}
    </Sheet>
  )
}
