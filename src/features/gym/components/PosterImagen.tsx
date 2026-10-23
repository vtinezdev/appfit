import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { ErrorState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'
import { compartirImagen, cssFuentesIncrustadas, descargarImagen, puedeCompartirArchivos, svgAPng } from '../lib/exportarImagen'
import type { HitoSesion } from '../lib/fichaEntreno'
import type { ZonaMuscular } from '../lib/musculos'
import { ALTO_POSTER, ANCHO_POSTER, nombreArchivoPoster, svgPoster, type ColoresPoster } from '../lib/posterImagen'
import { formatDuracion, rangoSesion } from '../lib/workout'
import type { FiguraMapa } from './mapaMuscularGeometria'

interface Props {
  titulo: string
  inicio: number
  fin: number
  series: number
  volumen: number
  gimnasio?: string
  /** La franja «Hoy» del póster (al terminar) o los récords del entreno (en el historial). */
  hoy: HitoSesion[]
  levels?: Partial<Record<ZonaMuscular, number>>
  figura?: FiguraMapa
}

/** Los colores del póster en el tema que se ve ahora, leídos de los tokens (el canvas no entiende variables CSS). */
function coloresDelTema(): ColoresPoster {
  const estilo = getComputedStyle(document.documentElement)
  const token = (nombre: string) => estilo.getPropertyValue(`--c-${nombre}`).trim()
  return {
    fondo: token('training'), texto: token('on-training'), tenue: token('training-muted'), pista: token('training-track'), acento: token('meal-accent'),
    musculo: [token('muscle-poster-1'), token('muscle-poster-2'), token('muscle-poster-3'), token('muscle-poster-4'), token('muscle-poster-5')],
  }
}

/**
 * «Guardar imagen» y «Compartir…» bajo el póster (ENT-11): la misma sesión como PNG de 1080 × 1350 con título, fecha,
 * cifras, «Hoy» y el muñeco, y «Hecho con AppFit» al pie. Sin cuenta ni red: «Compartir…» abre la hoja del móvil y solo
 * aparece donde se pueden compartir archivos; si no, se descarga.
 */
export default function PosterImagen({ titulo, inicio, fin, series, volumen, gimnasio, hoy, levels, figura = 'hombre' }: Props) {
  const [ocupado, setOcupado] = useState<'guardar' | 'compartir' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [compartible] = useState(puedeCompartirArchivos)

  async function crear(): Promise<Blob> {
    const [css, { CUERPOS, VIEWBOX_CUERPO }] = await Promise.all([cssFuentesIncrustadas(), import('./mapaMuscularGeometria')])
    const svg = svgPoster({
      titulo,
      fecha: `${rangoSesion(inicio, fin)}${gimnasio ? ` · ${gimnasio}` : ''}`,
      cifras: [{ rotulo: 'Duración', valor: formatDuracion(fin - inicio) }, { rotulo: 'Volumen', valor: formatInt(volumen), unidad: 'kg' }, { rotulo: 'Series', valor: formatInt(series) }],
      hoy,
      ...(levels ? { muneco: { levels, cuerpo: CUERPOS[figura], viewBox: VIEWBOX_CUERPO } } : {}),
    }, coloresDelTema(), css)
    return svgAPng(svg, ANCHO_POSTER, ALTO_POSTER)
  }

  async function ejecutar(accion: 'guardar' | 'compartir') {
    if (ocupado) return
    setOcupado(accion)
    setError(null)
    try {
      const png = await crear()
      const nombre = nombreArchivoPoster(titulo, inicio)
      if (accion === 'compartir') await compartirImagen(png, nombre)
      else descargarImagen(png, nombre)
    } catch {
      setError(accion === 'compartir' ? 'No se ha podido compartir la imagen. Prueba a guardarla.' : 'No se ha podido crear la imagen. Inténtalo de nuevo.')
    } finally {
      setOcupado(null)
    }
  }

  return <section aria-label="Imagen del entreno" className="space-y-2">
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" className="flex-1 basis-40" loading={ocupado === 'guardar'} disabled={ocupado !== null} onClick={() => void ejecutar('guardar')}>
        <Icon name="download" size={18} />Guardar imagen
      </Button>
      {compartible && <Button variant="secondary" className="flex-1 basis-40" loading={ocupado === 'compartir'} disabled={ocupado !== null} onClick={() => void ejecutar('compartir')}>
        <Icon name="compartir" size={18} />Compartir…
      </Button>}
    </div>
    {error && <ErrorState>{error}</ErrorState>}
  </section>
}
