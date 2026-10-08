import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Disclosure from '../../../shared/components/Disclosure'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { updateSettings } from '../../../shared/db/settings'
import TecnicaSerie, { type SeccionTecnica } from './TecnicaSerie'
import OpcionEjercicio from './OpcionEjercicio'
import { contextoSerie, textoAgarre } from '../lib/ejecucion'
import type { CambiosSerie } from '../data/setsRepo'
import type { Exercise, SetEntry } from '../../../shared/db/types'
import { formatNumber } from '../../../shared/lib/format'
import { BARRAS, calcularDiscos } from '../lib/discos'

interface Props {
  open: boolean
  onClose: () => void
  titulo: string
  serie: SetEntry
  barraKg: number
  ejercicio?: Exercise
  onTecnica?: (patch: CambiosSerie) => Promise<void>
  onCambiar: (patch: Pick<Partial<SetEntry>, 'tipo' | 'rir'>) => void
  onBorrar: () => void
}

/** Opciones secundarias; RIR se edita en la fila y discos solo corresponde a carga externa. */
export default function MenuSerie({ open, onClose, titulo, serie, barraKg, onCambiar, onBorrar, ejercicio, onTecnica }: Props) {
  const [tecnica, setTecnica] = useState<SeccionTecnica | null>(null)
  const [discosAbierto, setDiscosAbierto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const discos = calcularDiscos(serie.peso, barraKg)

  if (tecnica && ejercicio && onTecnica) return <TecnicaSerie serie={serie} ejercicio={ejercicio} titulo={titulo} seccionInicial={tecnica} onGuardar={onTecnica} onClose={onClose} />

  return (
    <Sheet open={open} onClose={onClose} title={titulo}>
      <div className="space-y-section">
        <div className="space-y-2">
          <SegmentedControl label="Tipo de serie" valor={serie.tipo ?? 'efectiva'}
            onChange={(v) => onCambiar({ tipo: v === 'calentamiento' ? 'calentamiento' : undefined })}
            opciones={[{ valor: 'efectiva', label: 'Efectiva' }, { valor: 'calentamiento', label: 'Calentamiento' }]} />
          {serie.tipo === 'calentamiento' && <p className="text-caption text-fg-muted">No cuenta en volumen, récords, mapa muscular ni progreso.</p>}
        </div>

        {(serie.modoCarga === undefined || serie.modoCarga === 'externa') && <Disclosure title="Discos por lado" open={discosAbierto} onChange={setDiscosAbierto}>
          <div className="space-y-3">
            <SegmentedControl label="Peso de la barra" size="sm" valor={String(barraKg)}
              onChange={(v) => { updateSettings({ barraKg: Number(v) }).catch(() => setError('No se ha podido guardar la barra.')) }}
              opciones={BARRAS.map((b) => ({ valor: String(b), label: `${b} kg` }))} />
            {discos.menorQueBarra ? (
              <p className="text-body-sm text-fg-muted">{formatNumber(serie.peso, 2)} kg es menos que la barra ({formatNumber(barraKg)} kg).</p>
            ) : (
              <div className="space-y-1" aria-live="polite">
                <p className="text-body-sm text-fg-muted">Para {formatNumber(discos.alcanzable, 2)} kg con barra de {formatNumber(barraKg)} kg:</p>
                {discos.porLado.length === 0 ? <p className="text-body font-semibold text-fg">Solo la barra</p> : (
                  <ul className="tabular text-body font-semibold text-fg" aria-label="Discos por lado">
                    {discos.porLado.map((d) => <li key={d.disco}>{d.cantidad} × {formatNumber(d.disco, 2)} kg</li>)}
                  </ul>
                )}
                <p className="text-caption text-fg-muted">Por cada lado de la barra.</p>
                {!discos.exacto && <p className="text-body-sm text-destructive">No se puede cargar {formatNumber(serie.peso, 2)} kg exactos con discos estándar; lo más cercano es {formatNumber(discos.alcanzable, 2)} kg.</p>}
              </div>
            )}
            {error && <ErrorState>{error}</ErrorState>}
          </div>
        </Disclosure>}

        {ejercicio && onTecnica && <div className="divide-y divide-line">
          <OpcionEjercicio titulo="Ejecución y agarre" detalle={contextoSerie({ ejecucion: serie.ejecucion, kgUnilateral: serie.kgUnilateral, lados: serie.lados }) || textoAgarre(serie.agarre) || 'Bilateral · agarre sin especificar'} onClick={() => setTecnica('ejecucion')} />
          <OpcionEjercicio titulo="Negativas y tempo" detalle={contextoSerie({ soloNegativas: serie.soloNegativas, excentricaSeg: serie.excentricaSeg }) || 'Repetición completa · descenso sin especificar'} onClick={() => setTecnica('negativas')} />
          <OpcionEjercicio titulo="Dropset" detalle={serie.bajadas?.length ? `${serie.bajadas.length} bajadas registradas` : 'Añadir bajadas de carga a esta serie'} onClick={() => setTecnica('dropset')} />
        </div>}
        <Button variant="destructive" block onClick={onBorrar}>Borrar serie</Button>
      </div>
    </Sheet>
  )
}
