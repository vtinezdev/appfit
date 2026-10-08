import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Disclosure from '../../../shared/components/Disclosure'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { updateSettings } from '../../../shared/db/settings'
import type { CambiosSerie } from '../data/setsRepo'
import type { ConfiguracionEjecucion, Exercise, SetEntry } from '../../../shared/db/types'
import { formatNumber } from '../../../shared/lib/format'
import { BARRAS, calcularDiscos } from '../lib/discos'
import { modoCarga } from '../lib/carga'
import { SEGUNDOS_BAJADA, TIPOS_SERIE, cambiosTipo, tipoSerie, type TipoSerie } from '../lib/serie'
import { CamposAgarre } from './EjecucionEjercicio'
import { opcionesAgarre, textoAgarre } from '../lib/ejecucion'

interface Props {
  open: boolean
  onClose: () => void
  titulo: string
  serie: SetEntry
  ejercicio: Exercise
  /** Variante común del ejercicio en la sesión: el agarre de la serie solo se indica si es distinto. */
  base: ConfiguracionEjecucion
  barraKg: number
  onCambiar: (patch: CambiosSerie) => Promise<void>
  onBorrar: () => void
}

/** Tipo de serie, bajada lenta y excepciones de la serie. Cada elección se guarda al tocarla, sin pestañas ni «Guardar». */
export default function MenuSerie({ open, onClose, titulo, serie, ejercicio, base, barraKg, onCambiar, onBorrar }: Props) {
  const [discosAbierto, setDiscosAbierto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const discos = calcularDiscos(serie.peso, barraKg)
  const tipo = tipoSerie(serie)
  const segundos = [...new Set([...SEGUNDOS_BAJADA, ...(serie.excentricaSeg ? [serie.excentricaSeg] : [])])].sort((a, b) => a - b)
  const agarre = opcionesAgarre(ejercicio)
  const conAgarre = agarre.orientacion || agarre.anchura || agarre.accesorio || !!serie.agarre
  const cambiar = (patch: CambiosSerie) => { setError(null); onCambiar(patch).catch(() => setError('No se ha podido guardar la serie. Inténtalo de nuevo.')) }

  return (
    <Sheet open={open} onClose={() => { setError(null); onClose() }} title={titulo}>
      <div className="space-y-section">
        <SegmentedControl variante="vertical" label="Tipo de serie" valor={tipo}
          onChange={(v: TipoSerie) => cambiar(cambiosTipo(serie, v, () => crypto.randomUUID()))}
          opciones={(Object.entries(TIPOS_SERIE) as [TipoSerie, (typeof TIPOS_SERIE)[TipoSerie]][]).map(([valor, t]) => ({ valor, label: t.letra ? `${t.letra} · ${t.label}` : t.label, descripcion: t.descripcion }))} />

        <div className="space-y-2">
          <p className="text-label text-fg-muted">Bajada lenta</p>
          <SegmentedControl label="Segundos de bajada" size="sm" valor={serie.excentricaSeg ? String(serie.excentricaSeg) : 'no'}
            onChange={v => cambiar({ excentricaSeg: v === 'no' ? undefined : Number(v) })}
            opciones={[{ valor: 'no', label: 'No' }, ...segundos.map(s => ({ valor: String(s), label: `${formatNumber(s)} s` }))]} />
          <p className="text-caption text-fg-muted">Duración de la fase de bajada en cada repetición. Se compara aparte en Progreso.</p>
        </div>

        {error && <ErrorState>{error}</ErrorState>}

        <div>
          {conAgarre && <Disclosure title={`Agarre en esta serie: ${textoAgarre(serie.agarre ?? base.agarre) || 'sin indicar'}`}>
            <div className="space-y-4">
              <CamposAgarre ejercicio={ejercicio} valor={serie.agarre} onChange={a => cambiar({ agarre: a })} />
              {textoAgarre(serie.agarre) !== textoAgarre(base.agarre) && <Button variant="secondary" size="sm" onClick={() => cambiar({ agarre: base.agarre })}>Usar el agarre del ejercicio</Button>}
              <p className="text-caption text-fg-muted">Para todas las series, cambia la variante en la cabecera del ejercicio.</p>
            </div>
          </Disclosure>}
          {modoCarga(serie) === 'externa' && <Disclosure title="Discos por lado" open={discosAbierto} onChange={setDiscosAbierto}>
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
            </div>
          </Disclosure>}
        </div>

        <Button variant="destructive" block onClick={onBorrar}>Borrar serie</Button>
      </div>
    </Sheet>
  )
}
