import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Sheet from '../../../shared/components/Sheet'
import Button from '../../../shared/components/Button'
import { ErrorState } from '../../../shared/components/StateMessage'
import type { Comida, Entry } from '../../../shared/db/types'
import { formatFriendly } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import * as nombresAlimentosRepo from '../data/nombresAlimentosRepo'
import { nombreComida } from '../lib/comidas'
import { nombreVisible } from '../lib/nombresCortos'
import { sumMacros } from '../lib/nutrition'
import { agruparPlatos, idsElegidos } from '../lib/platos'

interface Props {
  /** Comida a repetir; `null` cierra el sheet. */
  comida: Comida | null
  /** Día de origen (el anterior al mostrado) y sus entradas de esa comida (referencia estable: se usa en `useLiveQuery`). */
  fechaOrigen: string
  entries: Entry[]
  /** Copia esas entradas al día mostrado; si falla, el error se muestra en el sheet. */
  onRepetir: (ids: number[]) => Promise<void>
  onClose: () => void
}

/** Repetir con selección: los platos van enteros y todo empieza marcado (repetirlo todo sigue siendo un toque). */
export default function RepetirComidaSheet({ comida, fechaOrigen, entries, onRepetir, onClose }: Props) {
  const [cerrando, setCerrando] = useState(false)
  // Se guarda lo desmarcado: lo que aparezca mientras el sheet está abierto entra marcado.
  const [quitados, setQuitados] = useState<ReadonlySet<string>>(new Set())
  const [repitiendo, setRepitiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nombresCortos = useLiveQuery(() => nombresAlimentosRepo.paraComida(entries), [entries]) ?? new Map<string, string>()
  const platos = agruparPlatos(entries, (e) => nombreVisible(e, nombresCortos))
  const ids = idsElegidos(platos, quitados)
  const elegidos = new Set(ids)
  const total = sumMacros(entries.filter((e) => elegidos.has(e.id)))
  const todos = platos.every((p) => !quitados.has(p.clave))
  const titulo = comida ? nombreComida(comida) : ''

  function alternar(clave: string) {
    const siguiente = new Set(quitados)
    if (!siguiente.delete(clave)) siguiente.add(clave)
    setQuitados(siguiente)
  }

  async function repetir() {
    if (repitiendo || ids.length === 0) return
    setRepitiendo(true)
    setError(null)
    try {
      await onRepetir(ids)
      setCerrando(true)
    } catch {
      setError('No se ha podido repetir la comida. Inténtalo de nuevo.')
    } finally {
      setRepitiendo(false)
    }
  }

  return (
    <Sheet open={comida !== null && !cerrando} title={`Repetir ${titulo.toLowerCase()}`} onClose={() => setCerrando(true)}
      onExited={() => { setCerrando(false); setQuitados(new Set()); setError(null); onClose() }}
      footer={<div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-label text-fg-muted">Total</span>
          <span className="tabular break-words text-title text-fg">{formatInt(total.kcal)} <span className="text-caption text-fg-muted">kcal</span></span>
        </div>
        {error && <ErrorState>{error}</ErrorState>}
        <Button block loading={repitiendo} disabled={ids.length === 0} onClick={repetir}>
          {repitiendo ? 'Añadiendo…' : `Añadir a ${titulo.toLowerCase()}`}
        </Button>
      </div>}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 text-body-sm text-fg-muted">{titulo} de {formatFriendly(fechaOrigen).toLowerCase()}</p>
          <Button variant="subtle" size="sm" onClick={() => setQuitados(todos ? new Set(platos.map((p) => p.clave)) : new Set())}>
            {todos ? 'Desmarcar todo' : 'Marcar todo'}
          </Button>
        </div>
        <ul className="divide-y divide-line">
          {platos.map((p) => {
            const kcal = sumMacros(p.entries).kcal
            const unico = p.entries[0]
            const detalle = p.agrupado ? `${formatInt(p.entries.length)} ${p.entries.length === 1 ? 'alimento' : 'alimentos'}`
              : unico.rapida ? 'Registro rápido' : `${formatNumber(unico.gramos, 1)} g`
            // Con nombre propio, el plato no dice qué lleva: se listan sus ingredientes.
            const ingredientes = p.entries.some((e) => e.nombrePlato?.trim()) ? p.entries.map((e) => nombreVisible(e, nombresCortos)).join(' · ') : null
            return (
              <li key={p.clave}>
                <label className="flex min-h-touch cursor-pointer items-center gap-3 px-1 py-2">
                  <input type="checkbox" checked={!quitados.has(p.clave)} onChange={() => alternar(p.clave)} className="h-5 w-5 shrink-0 accent-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-body font-semibold text-fg">{p.nombre}</span>
                    <span className="tabular block break-words text-caption text-fg-muted">{detalle}</span>
                    {ingredientes && <span className="block break-words text-caption text-fg-subtle">{ingredientes}</span>}
                  </span>
                  <span className="tabular shrink-0 text-body-sm text-fg">{p.entries.some((e) => e.rapida) ? '≈ ' : ''}{formatInt(kcal)} kcal</span>
                </label>
              </li>
            )
          })}
        </ul>
      </div>
    </Sheet>
  )
}
