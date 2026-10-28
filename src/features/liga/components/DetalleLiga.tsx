import ProgressBar from '../../../shared/components/ProgressBar'
import type { Exercise } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import { esBasico } from '../lib/basicos'
import { PASO_ELITE, type LigaEjercicio } from '../lib/liga'
import { textoPico, textoProgreso, textoSemanaDeLiga, textoSemanas, textoSiguiente } from '../lib/textos'
import InsigniaLiga, { SemanasLiga } from './InsigniaLiga'

/**
 * La liga de un ejercicio: insignia, semana dentro de la liga, camino hacia Élite, qué pasa ahora, racha, mejor marca
 * anterior y ciclos. La comparten la card de Progreso y la hoja del entreno activo. `tituloId` etiqueta la sección que la
 * contiene.
 */
export default function DetalleLiga({ liga: l, ejercicio, hoy, tituloId, mantenido = false, sinRecords = 0 }: { liga: LigaEjercicio; ejercicio: Exercise | undefined; hoy: string; tituloId?: string; mantenido?: boolean; sinRecords?: number }) {
  const basico = !!ejercicio && esBasico(ejercicio)
  const ciclos = l.ciclos.length
  return <>
    {/* Con el texto ampliado, el nombre y las semanas bajan bajo la insignia. */}
    <div className="flex flex-wrap items-center gap-3">
      <InsigniaLiga liga={l.division.liga} size={48} />
      <div className="min-w-0 flex-1 basis-32 space-y-1">
        <h3 id={tituloId} className="text-label text-fg-muted">Liga</h3>
        <p className="break-words text-heading text-fg">{l.division.nombre}</p>
        {l.division.semana > 0 && <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-fg-muted">
          <SemanasLiga semana={l.division.semana} /><span className="tabular">{textoSemanaDeLiga(l.division)}</span>
        </p>}
      </div>
    </div>
    <div className="space-y-1">
      <ProgressBar value={l.division.paso} goal={PASO_ELITE} colorClass="bg-fg" label="Camino hacia Élite" valueText={textoProgreso(l)} />
      <p className="tabular text-caption text-fg-muted">{textoProgreso(l)}</p>
    </div>
    <p className="text-body-sm text-fg">{textoSiguiente(l, hoy, { basico, mantenido, sinRecords })}</p>
    <dl className="cifras-filetes grid grid-cols-2">
      <div><dt className="text-caption text-fg-muted">Racha</dt><dd className="tabular text-body font-semibold text-fg">{l.semanasSeguidas ? textoSemanas(l.semanasSeguidas) : 'Sin racha'}</dd></div>
      <div><dt className="text-caption text-fg-muted">Mejor marca anterior</dt><dd className="tabular break-words text-body font-semibold text-fg">{l.pico ? textoPico(l.pico, hoy) : '—'}</dd></div>
    </dl>
    {ciclos > 0 && <p className="tabular text-caption text-fg-muted">Has llegado a Élite con este ejercicio {ciclos === 1 ? 'una vez' : `${formatInt(ciclos)} veces`}.</p>}
  </>
}
