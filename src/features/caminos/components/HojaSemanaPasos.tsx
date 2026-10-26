import { useState } from 'react'
import Button, { IconButton } from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { addDays, etiquetaPeriodo, formatShort } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { kmTexto } from '../../actividades/lib/actividad'
import { PasosInvalidos } from '../data/pasosRepo'
import { metrosDePasos, pasosTexto } from '../lib/pasos'
import { borradorInicial, conDia, conTotal, diasDeSemana, leerSemana, sustituye, ultimaSemana, type DiasSemana } from '../lib/semanaPasos'

interface Props {
  open: boolean
  onClose: () => void
  hoy: string
  /** Lunes de la semana con la que se abre (por defecto, la de hoy). */
  lunesInicial?: string
  /** Pasos ya apuntados por día: la semana parte de ellos. */
  apuntados: ReadonlyMap<string, number>
  zancadaCm: number
  /** Guarda; si falla, el mensaje se muestra en la hoja. */
  onGuardar: (lunes: string, dias: DiasSemana) => Promise<void>
}

/**
 * Apuntar una semana de una vez: el total se reparte a partes iguales entre sus días ya pasados y cada día se puede
 * cambiar (el total pasa a ser la suma). Un día vacío queda sin pasos. Montar con `key` para empezar de cero.
 */
export default function HojaSemanaPasos({ open, onClose, hoy, lunesInicial, apuntados, zancadaCm, onGuardar }: Props) {
  const ultima = ultimaSemana(hoy)
  const [lunes, setLunes] = useState(lunesInicial ?? ultima)
  const fechas = diasDeSemana(lunes, hoy)
  const [borrador, setBorrador] = useState(() => borradorInicial(fechas, apuntados))
  const [error, setError] = useState<{ mensaje: string; fecha?: string } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const leido = leerSemana(fechas, borrador)
  const total = 'dias' in leido ? leido.dias.reduce((t, d) => t + (d.pasos ?? 0), 0) : null

  function irA(nuevo: string) {
    setLunes(nuevo)
    setBorrador(borradorInicial(diasDeSemana(nuevo, hoy), apuntados))
    setError(null)
  }

  async function guardar() {
    if (guardando) return
    if ('error' in leido) { setError({ mensaje: leido.error, fecha: leido.fecha }); return }
    setGuardando(true)
    setError(null)
    try {
      await onGuardar(lunes, leido.dias)
    } catch (e) {
      setError({ mensaje: e instanceof PasosInvalidos ? e.message : 'No se han podido guardar los pasos. Inténtalo de nuevo.' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Pasos de la semana"
      footer={<div className="space-y-2">{error && <ErrorState>{error.fecha ? `${formatShort(error.fecha)}: ${error.mensaje}` : error.mensaje}</ErrorState>}
        <Button block loading={guardando} onClick={guardar}>Guardar semana</Button></div>}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <IconButton icon="chevron-left" label="Semana anterior" variant="ghost" onClick={() => irA(addDays(lunes, -7))} />
          <p className="tabular min-w-0 text-center text-title text-fg" aria-live="polite">{etiquetaPeriodo('semana', lunes)}</p>
          <IconButton icon="chevron-right" label="Semana siguiente" variant="ghost" disabled={lunes >= ultima} onClick={() => irA(addDays(lunes, 7))} />
        </div>
        <p className="break-words text-body-sm text-fg-muted">
          {fechas.length === 1 ? 'Esta semana solo va un día: el total es el de hoy. Las semanas anteriores se reparten entre sus 7 días.'
            : `Escribe el total y se reparte a partes iguales entre los ${formatInt(fechas.length)} días${lunes === ultima ? ' que van de semana' : ''}; luego puedes cambiar cualquier día.`}
        </p>
        <label className="block space-y-1"><span className="text-label text-fg-muted">Total de la semana</span>
          <Input inputMode="numeric" enterKeyHint="done" autoComplete="off" value={borrador.total} placeholder="63000" onFocus={(e) => e.target.select()}
            aria-invalid={error && !error.fecha ? true : undefined}
            onChange={(e) => { setBorrador(conTotal(borrador, fechas, e.target.value)); setError(null) }} /></label>
        <ul className="app-list-flat divide-y divide-line" aria-label="Pasos de cada día">
          {fechas.map((f) => <li key={f}>
            <label className="flex min-h-touch items-center justify-between gap-3 py-1">
              <span className="min-w-0 break-words text-body text-fg">{formatShort(f)}</span>
              <span className="w-32 shrink-0">
                <Input inputMode="numeric" autoComplete="off" value={borrador.dias[f] ?? ''} placeholder="—" onFocus={(e) => e.target.select()}
                  aria-invalid={error?.fecha === f ? true : undefined}
                  onChange={(e) => { setBorrador(conDia(borrador, fechas, f, e.target.value)); setError(null) }} />
              </span>
            </label>
          </li>)}
        </ul>
        <p className="tabular break-words text-body-sm text-fg" aria-live="polite">
          {total ? `${pasosTexto(total)} · ≈ ${kmTexto(metrosDePasos(total, zancadaCm))} con tu zancada de ${formatInt(zancadaCm)} cm` : `Tu zancada: ${formatInt(zancadaCm)} cm`}
        </p>
        {'dias' in leido && sustituye(leido.dias, apuntados) && <p className="break-words text-body-sm text-fg-muted">Sustituyes lo que ya tenías apuntado esta semana; un día vacío se queda sin pasos.</p>}
      </div>
    </Sheet>
  )
}
