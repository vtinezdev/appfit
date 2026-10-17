import TendenciaRegistros from '../../../shared/components/TendenciaRegistros'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import NumberStepper from '../../../shared/components/NumberStepper'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { addDays } from '../../../shared/lib/dates'
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
  const historial = useLiveQuery(() => aguaRepo.entreFechas(addDays(hoy, -89), hoy), [hoy])
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

        <section aria-label="Historial de agua" className="space-y-2">
          <h3 className="text-title text-fg">Evolución del agua</h3>
          <TendenciaRegistros puntos={(historial ?? []).map(a => ({ fecha: a.fecha, valor: a.ml }))} unidad="ml" titulo="agua" diaria periodos={['7', '30', '90']} />
        </section>
      </div>
    </Sheet>
  )
}
