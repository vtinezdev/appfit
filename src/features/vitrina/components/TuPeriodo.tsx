import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button, { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import ModalPage from '../../../shared/components/ModalPage'
import { ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { getSettings } from '../../../shared/db/settings'
import { moduloActivo } from '../../../shared/lib/modulos'
import { compartirImagen, cssFuentesIncrustadas, descargarImagen, puedeCompartirArchivos, svgAPng } from '../../gym/lib/exportarImagen'
import { ALTO_POSTER, ANCHO_POSTER } from '../../gym/lib/posterImagen'
import { useDatosPeriodo } from '../hooks/useTuPeriodo'
import { useVitrina } from '../hooks/useVitrina'
import { nombreArchivoTuPeriodo, svgTuPeriodo, type ColoresTuPeriodo } from '../lib/imagenTuPeriodo'
import { cifrasPeriodo, lineaTarjeta, resumirPeriodo, type CifraPeriodo, type Periodo } from '../lib/tuPeriodo'

/** Cifras y grupo del periodo, con los metros del lector compartido y los módulos de B9. `undefined` mientras carga. */
function useResumen(p: Periodo, hoy: string): { cifras: CifraPeriodo[]; grupo: string | null } | undefined {
  const datos = useDatosPeriodo(p)
  const vitrina = useVitrina(hoy)
  const settings = useLiveQuery(() => getSettings(), [])
  if (!datos || vitrina === undefined || !settings) return undefined
  const tramos = vitrina.visible && vitrina.cumbres ? vitrina.cumbres.tramos : null
  const r = resumirPeriodo(p, { ...datos, tramos })
  const usa = { gym: moduloActivo(settings, 'gym'), actividades: moduloActivo(settings, 'actividades'), nutricion: moduloActivo(settings, 'nutricion') }
  return { cifras: cifrasPeriodo(r, usa), grupo: usa.gym ? r.grupo : null }
}

/** Los colores del grafito en el tema que se ve ahora, leídos de los tokens (el canvas no entiende variables CSS). */
function coloresDelTema(): ColoresTuPeriodo {
  const estilo = getComputedStyle(document.documentElement)
  const token = (nombre: string) => estilo.getPropertyValue(`--c-${nombre}`).trim()
  return { fondo: token('training'), texto: token('on-training'), tenue: token('training-muted'), filete: token('training-track') }
}

/**
 * Tarjeta de Inicio los días 1–7 (B15): «Tu octubre» (en enero, «Tu 2026») en grafito con sus cuatro primeras cifras,
 * «Ver» y la X, que la cierra hasta el mes siguiente (con «Deshacer» en Inicio).
 */
export function TarjetaTuPeriodo({ periodo, hoy, onVer, onCerrar }: { periodo: Periodo; hoy: string; onVer: () => void; onCerrar: () => void }) {
  const resumen = useResumen(periodo, hoy)
  if (!resumen || resumen.cifras.length === 0) return null
  return (
    <section aria-label={periodo.titulo} className="training-surface relative space-y-1 p-4 pr-12">
      <button type="button" onClick={onVer} className="app-button block w-full text-left">
        <span className="block font-numeric text-heading">{periodo.titulo}</span>
        <span className="training-muted tabular block break-words text-caption">{lineaTarjeta(resumen.cifras)}</span>
        <span className="mt-2 flex items-center gap-1 text-body-sm font-semibold">Ver<Icon name="chevron-right" size={16} /></span>
      </button>
      <div className="absolute right-1 top-1"><IconButton icon="close" label={`Cerrar ${periodo.titulo}`} variant="ghost" className="training-muted" onClick={onCerrar} /></div>
    </section>
  )
}

/** El resumen del periodo en grafito, con «Guardar imagen» y «Compartir…» (la utilidad del póster, A10). */
export function ResumenTuPeriodo({ periodo, hoy, onClose }: { periodo: Periodo; hoy: string; onClose: () => void }) {
  const resumen = useResumen(periodo, hoy)
  const [ocupado, setOcupado] = useState<'guardar' | 'compartir' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [compartible] = useState(puedeCompartirArchivos)

  async function ejecutar(accion: 'guardar' | 'compartir') {
    if (ocupado || !resumen) return
    setOcupado(accion); setError(null)
    try {
      const svg = svgTuPeriodo({ titulo: periodo.titulo, subtitulo: periodo.subtitulo, ...resumen }, coloresDelTema(), await cssFuentesIncrustadas())
      const png = await svgAPng(svg, ANCHO_POSTER, ALTO_POSTER)
      const nombre = nombreArchivoTuPeriodo(periodo.clave, periodo.titulo)
      if (accion === 'compartir') await compartirImagen(png, nombre)
      else descargarImagen(png, nombre)
    } catch {
      setError(accion === 'compartir' ? 'No se ha podido compartir la imagen. Prueba a guardarla.' : 'No se ha podido crear la imagen. Inténtalo de nuevo.')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <ModalPage title={periodo.titulo} closeLabel="Inicio" onClose={onClose}>
      {!resumen ? <LoadingState /> : <div className="space-y-section">
        <section aria-label={`Resumen de ${periodo.subtitulo}`} className="training-surface space-y-4 p-5">
          <div>
            <p className="training-muted text-rotulo">AppFit · {periodo.subtitulo}</p>
            <h2 className="poster-title">{periodo.titulo}</h2>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {resumen.cifras.map((c) => <div key={c.rotulo} className="training-filete min-w-0 pt-2">
              <dt className="training-muted break-words text-caption">{c.rotulo}</dt>
              <dd className="tabular flex flex-wrap items-baseline gap-x-1"><span className="font-numeric text-metric">{c.valor}</span>{c.unidad && <span className="training-muted text-caption">{c.unidad}</span>}</dd>
            </div>)}
          </dl>
          {resumen.grupo && <p className="break-words text-body-sm">Lo más trabajado: {resumen.grupo}</p>}
        </section>
        <section aria-label="Imagen del resumen" className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="flex-1 basis-40" loading={ocupado === 'guardar'} disabled={ocupado !== null} onClick={() => void ejecutar('guardar')}><Icon name="download" size={18} />Guardar imagen</Button>
            {compartible && <Button variant="secondary" className="flex-1 basis-40" loading={ocupado === 'compartir'} disabled={ocupado !== null} onClick={() => void ejecutar('compartir')}><Icon name="compartir" size={18} />Compartir…</Button>}
          </div>
          <p className="text-caption text-fg-muted">Todo se calcula en el móvil; la imagen solo sale si tú la compartes.</p>
          {error && <ErrorState>{error}</ErrorState>}
        </section>
      </div>}
    </ModalPage>
  )
}
