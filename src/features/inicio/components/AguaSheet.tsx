import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import NumberStepper from '../../../shared/components/NumberStepper'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { addDays, formatFriendly } from '../../../shared/lib/dates'
import * as aguaRepo from '../data/aguaRepo'
import { AGUA_POR_DEFECTO_ML, formatAgua, OPCIONES_AGUA_ML, type ObjetivoAgua } from '../lib/agua'

interface Props {
  open: boolean
  onClose: () => void
  hoy: string
  objetivo: ObjetivoAgua | null
}

type Eleccion = `${(typeof OPCIONES_AGUA_ML)[number]}` | 'otra'

/**
 * Añadir agua (250 / 330 / 500 ml o una cantidad propia), quitar la última toma y repasar los últimos días. Dentro de
 * un Sheet el Toast queda debajo, así que los errores van en línea.
 */
export default function AguaSheet({ open, onClose, hoy, objetivo }: Props) {
  const hoyAgua = useLiveQuery(() => aguaRepo.delDia(hoy), [hoy])
  const historial = useLiveQuery(() => aguaRepo.entreFechas(addDays(hoy, -6), hoy), [hoy])
  const [eleccion, setEleccion] = useState<Eleccion>(`${AGUA_POR_DEFECTO_ML}` as Eleccion)
  const [otra, setOtra] = useState(200)
  const [error, setError] = useState<string | null>(null)
  const ml = eleccion === 'otra' ? otra : Number(eleccion)
  const ultima = hoyAgua?.tomas?.[hoyAgua.tomas.length - 1] ?? (hoyAgua && hoyAgua.ml > 0 ? hoyAgua.ml : undefined)

  async function anadir() {
    setError(null)
    try { await aguaRepo.anadir(hoy, ml) } catch { setError('No se ha podido añadir el agua. Comprueba la cantidad (1–5.000 ml).') }
  }
  async function quitar() {
    setError(null)
    try { await aguaRepo.quitarUltima(hoy) } catch { setError('No se ha podido quitar la última toma.') }
  }

  const dias = Array.from({ length: 7 }, (_, i) => addDays(hoy, -i))
  const porDia = new Map((historial ?? []).map((a) => [a.fecha, a.ml]))

  return (
    <Sheet open={open} onClose={onClose} title="Agua">
      <div className="space-y-section">
        <div className="space-y-1">
          <p className="tabular text-heading text-fg">{formatAgua(hoyAgua?.ml ?? 0)}{objetivo && <span className="text-body-sm font-normal text-fg-muted"> de {formatAgua(objetivo.ml)}</span>}</p>
          {!objetivo && <p className="text-caption text-fg-muted">Sin objetivo: se muestra solo lo bebido. Puedes fijarlo en Ajustes o indicar tu sexo en Perfil para ver el recomendado.</p>}
        </div>

        <div className="space-y-3">
          <SegmentedControl<Eleccion> label="Cantidad de la toma" valor={eleccion} onChange={setEleccion}
            opciones={[...OPCIONES_AGUA_ML.map((n) => ({ valor: `${n}` as Eleccion, label: `${n} ml` })), { valor: 'otra' as const, label: 'Otra' }]} />
          {eleccion === 'otra' && <div className="flex justify-center"><NumberStepper label="mililitros de la toma" value={otra} min={1} step={50} suffix="ml" onChange={setOtra} /></div>}
          <Button block size="lg" onClick={anadir}>Añadir {formatAgua(ml)}</Button>
          <Button block variant="subtle" disabled={ultima === undefined} onClick={quitar}>{ultima === undefined ? 'Quitar la última toma' : `Quitar la última toma (${formatAgua(ultima)})`}</Button>
          {error && <ErrorState>{error}</ErrorState>}
        </div>

        <section aria-label="Últimos días" className="space-y-1">
          <h3 className="text-label text-fg-muted">Últimos 7 días</h3>
          <ul className="divide-y divide-line">
            {dias.map((d) => (
              <li key={d} className="flex min-h-touch items-center justify-between gap-3 text-body-sm">
                <span className="text-fg-muted first-letter:uppercase">{formatFriendly(d)}</span>
                <span className="tabular font-semibold text-fg">{porDia.has(d) ? formatAgua(porDia.get(d)!) : '—'}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Sheet>
  )
}
