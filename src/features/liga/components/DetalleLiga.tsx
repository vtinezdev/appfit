import ProgressBar from '../../../shared/components/ProgressBar'
import type { Exercise } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import { esBasico } from '../lib/basicos'
import { PASO_ELITE, type LigaEjercicio } from '../lib/liga'
import { textoPico, textoProgreso, textoSemanas, textoSiguiente } from '../lib/textos'

/**
 * La liga de un ejercicio: división, camino hacia Élite, qué pasa ahora, racha, fantasma y ciclos. La comparten la card de
 * Progreso y la hoja del entreno activo. `tituloId` etiqueta la sección que la contiene.
 */
export default function DetalleLiga({ liga: l, ejercicio, hoy, tituloId, mantenido = false, sinRecords = 0 }: { liga: LigaEjercicio; ejercicio: Exercise | undefined; hoy: string; tituloId?: string; mantenido?: boolean; sinRecords?: number }) {
  const basico = !!ejercicio && esBasico(ejercicio)
  const ciclos = l.ciclos.length
  return <>
    <div className="space-y-1">
      <h3 id={tituloId} className="text-label text-fg-muted">Liga</h3>
      <p className="text-heading text-fg">{l.division.nombre}</p>
    </div>
    <div className="space-y-1">
      <ProgressBar value={l.division.paso} goal={PASO_ELITE} colorClass="bg-fg" label="Camino hacia Élite" valueText={textoProgreso(l)} />
      <p className="tabular text-caption text-fg-muted">{textoProgreso(l)}</p>
    </div>
    <p className="text-body-sm text-fg">{textoSiguiente(l, hoy, { basico, mantenido, sinRecords })}</p>
    <dl className="cifras-filetes grid grid-cols-2">
      <div><dt className="text-caption text-fg-muted">Racha</dt><dd className="tabular text-body font-semibold text-fg">{l.semanasSeguidas ? textoSemanas(l.semanasSeguidas) : 'Sin racha'}</dd></div>
      <div><dt className="text-caption text-fg-muted">Pico anterior</dt><dd className="tabular break-words text-body font-semibold text-fg">{l.pico ? textoPico(l.pico, hoy) : '—'}</dd></div>
    </dl>
    {ciclos > 0 && <p className="tabular text-caption text-fg-muted">Has llegado a Élite con este ejercicio {ciclos === 1 ? 'una vez' : `${formatInt(ciclos)} veces`}.</p>}
  </>
}
