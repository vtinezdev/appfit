import TendenciaRegistros from '../../../shared/components/TendenciaRegistros'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Ayuda from '../../../shared/components/Ayuda'
import Button from '../../../shared/components/Button'
import NumberStepper from '../../../shared/components/NumberStepper'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { addDays, todayISO } from '../../../shared/lib/dates'
import { getPerfil } from '../../perfil/data/perfilRepo'
import * as aguaRepo from '../data/aguaRepo'
import { AGUA_POR_DEFECTO_ML, formatAgua, objetivoAguaPorDefecto, OPCIONES_AGUA_ML, validarObjetivoAgua, type ObjetivoAgua } from '../lib/agua'

interface Props {
  open: boolean
  onClose: () => void
  hoy: string
  objetivo: ObjetivoAgua | null
}

type Eleccion = `${(typeof OPCIONES_AGUA_ML)[number]}` | 'otra'

/**
 * Añadir agua (250 / 330 / 500 ml o una cantidad propia), quitar la última toma, cambiar el objetivo diario (punto 27: vive
 * aquí, no en Ajustes) y repasar los últimos días. Dentro de un Sheet el Toast queda debajo, así que los errores van en línea.
 */
export default function AguaSheet({ open, onClose, hoy, objetivo }: Props) {
  const hoyAgua = useLiveQuery(() => aguaRepo.delDia(hoy), [hoy])
  const historial = useLiveQuery(() => aguaRepo.entreFechas(addDays(hoy, -89), hoy), [hoy])
  const [eleccion, setEleccion] = useState<Eleccion>(`${AGUA_POR_DEFECTO_ML}` as Eleccion)
  const [otra, setOtra] = useState(200)
  const [error, setError] = useState<string | null>(null)
  const [errorObjetivo, setErrorObjetivo] = useState<string | null>(null)
  const recomendado = useLiveQuery(async () => objetivoAguaPorDefecto((await getPerfil()).sexo), [])
  const ml = eleccion === 'otra' ? otra : Number(eleccion)
  const ultima = hoyAgua?.tomas?.[hoyAgua.tomas.length - 1] ?? (hoyAgua && hoyAgua.ml > 0 ? hoyAgua.ml : undefined)

  async function anadir() {
    setError(null)
    try { await aguaRepo.anadir(todayISO(), ml) } catch { setError('No se ha podido añadir el agua. Comprueba la cantidad (1–5.000 ml).') }
  }
  async function quitar() {
    setError(null)
    try { await aguaRepo.quitarUltima(todayISO()) } catch { setError('No se ha podido quitar la última toma.') }
  }
  function fijarObjetivo(nuevo: number | undefined) {
    setErrorObjetivo(null)
    aguaRepo.fijarObjetivo(nuevo).catch(() => setErrorObjetivo('No se ha podido guardar el objetivo de agua.'))
  }

  return (
    <Sheet open={open} onClose={onClose} title="Agua">
      <div className="space-y-section">
        <div className="space-y-1">
          <p className="tabular text-heading text-fg">{formatAgua(hoyAgua?.ml ?? 0)}{objetivo && <span className="text-body-sm font-normal text-fg-muted"> de {formatAgua(objetivo.ml)}</span>}</p>
        </div>

        <div className="space-y-3">
          <SegmentedControl<Eleccion> label="Cantidad de la toma" valor={eleccion} onChange={setEleccion}
            opciones={[...OPCIONES_AGUA_ML.map((n) => ({ valor: `${n}` as Eleccion, label: `${n} ml` })), { valor: 'otra' as const, label: 'Otra' }]} />
          {eleccion === 'otra' && <div className="flex justify-center"><NumberStepper label="mililitros de la toma" value={otra} min={1} step={50} suffix="ml" onChange={setOtra} /></div>}
          <Button block size="lg" onClick={anadir}>Añadir {formatAgua(ml)}</Button>
          <Button block variant="subtle" disabled={ultima === undefined} onClick={quitar}>{ultima === undefined ? 'Quitar la última toma' : `Quitar la última toma (${formatAgua(ultima)})`}</Button>
          {error && <ErrorState>{error}</ErrorState>}
        </div>

        <section aria-labelledby="agua-objetivo" className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 id="agua-objetivo" className="text-title text-fg">Objetivo diario</h3>
            <Ayuda titulo="Objetivo de agua">
              <p>El recomendado parte de la ingesta adecuada de agua de EFSA (2010) para adultos, según tu sexo en Perfil, sin la parte que llega con la comida; detalles en Referencias › Proteína y agua.</p>
              <p>Si fijas uno tuyo, manda el tuyo.</p>
            </Ayuda>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-muted p-3">
            <span className="min-w-0">
              <span className="tabular block text-body font-semibold text-fg">{objetivo ? formatAgua(objetivo.ml) : 'Sin objetivo'}</span>
              <span className="block text-caption text-fg-muted">{objetivo ? (objetivo.origen === 'efsa' ? 'El recomendado' : 'El tuyo') : 'Fija uno o indica tu sexo en Perfil'}</span>
            </span>
            <NumberStepper label="Objetivo diario de agua (ml)" value={objetivo?.ml ?? recomendado ?? 2000} step={250} min={500} suffix="ml"
              onChange={(n) => { const v = validarObjetivoAgua(n); if (v !== null) fijarObjetivo(v) }} />
          </div>
          {objetivo?.origen === 'ajustes' && recomendado != null && recomendado !== objetivo.ml && <Button variant="ghost" size="sm" onClick={() => fijarObjetivo(undefined)}>Volver al recomendado ({formatAgua(recomendado)})</Button>}
          {errorObjetivo && <ErrorState>{errorObjetivo}</ErrorState>}
        </section>

        <section aria-label="Historial de agua" className="space-y-2">
          <h3 className="text-title text-fg">Evolución del agua</h3>
          <TendenciaRegistros puntos={(historial ?? []).map(a => ({ fecha: a.fecha, valor: a.ml }))} unidad="ml" titulo="agua" diaria periodos={['7', '30', '90']} />
        </section>
      </div>
    </Sheet>
  )
}
