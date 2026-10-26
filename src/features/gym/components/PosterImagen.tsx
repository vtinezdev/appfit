import { useRef, useState } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { ErrorState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'
import { compartirImagen, cssFuentesIncrustadas, descargarImagen, puedeCompartirArchivos, svgAPng } from '../lib/exportarImagen'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import { ejerciciosDelPoster, textoDesde, type HitoEntrenos, type HitoSesion } from '../lib/fichaEntreno'
import type { RecordEjercicio } from '../lib/records'
import IconoLogro from '../../vitrina/components/IconoLogro'
import IconoLiga from '../../liga/components/IconoLiga'
import type { NombreLiga } from '../../liga/lib/liga'
import { nombreConNivel, porRareza, type NuevoLogro } from '../../vitrina/lib/logros'
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
  /** Para leer los ejercicios y sus series al crear la imagen; sin él, la imagen va sin ejercicios. */
  workoutId?: number
  /** Récords del entreno, para ponerlos en cada ejercicio. */
  records?: RecordEjercicio[]
  nombres?: Record<number, string>
  /** Logros de la Vitrina conseguidos con el entreno: salen como medallas, los más especiales primero (vacío si la gamificación está oculta). */
  logros?: NuevoLogro[]
  /** Cambios de liga del entreno («Sube a Oro»): su insignia va en la fila del ejercicio. */
  ligas?: { exerciseId: number; liga: NombreLiga; texto: string; empieza?: boolean }[]
  /** Al terminar el entreno nº 10, 25, 50… (A23). */
  hito?: HitoEntrenos | null
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
 * El dibujo de una insignia ya pintada (`IconoLogro`) para meterlo en la imagen: su interior con las variables de color
 * resueltas (una imagen no las entiende) y los ids de `useId` cambiados por unos propios, para que no choquen entre sí.
 */
function interiorInsignia(svg: SVGSVGElement, prefijo: string): string {
  const estilo = getComputedStyle(document.documentElement)
  let interior = svg.innerHTML
  svg.querySelectorAll('[id]').forEach((el, k) => { interior = interior.split(el.id).join(`${prefijo}-${k}`) })
  return interior.replace(/var\((--[\w-]+)\)/g, (_, nombre: string) => estilo.getPropertyValue(nombre).trim())
}

/**
 * «Guardar imagen» y «Compartir…» bajo el póster (ENT-11): la misma sesión como PNG de 1080 × 1920 con título, fecha,
 * cifras, los récords, las medallas de la Vitrina, los ejercicios con sus series como pastillas, «Hoy» y el muñeco, y «Hecho con AppFit» al pie. Las series se leen
 * al pulsar, no mientras se ve la pantalla. Sin cuenta ni red: «Compartir…» abre la hoja del móvil y solo
 * aparece donde se pueden compartir archivos; si no, se descarga.
 */
export default function PosterImagen({ titulo, inicio, fin, series, volumen, gimnasio, hoy, workoutId, records = [], nombres = {}, logros: conseguidos = [], ligas = [], hito, levels, figura = 'hombre' }: Props) {
  const [ocupado, setOcupado] = useState<'guardar' | 'compartir' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [compartible] = useState(puedeCompartirArchivos)
  const insignias = useRef<HTMLDivElement>(null)
  const insigniasLiga = useRef<HTMLDivElement>(null)
  const logros = porRareza(conseguidos)

  async function crear(): Promise<Blob> {
    const [css, { CUERPOS, VIEWBOX_CUERPO }, w, sets] = await Promise.all([cssFuentesIncrustadas(), import('./mapaMuscularGeometria'),
      workoutId !== undefined ? workoutsRepo.obtener(workoutId) : undefined, workoutId !== undefined ? setsRepo.delWorkout(workoutId) : []])
    const svg = svgPoster({
      titulo,
      fecha: `${rangoSesion(inicio, fin)}${gimnasio ? ` · ${gimnasio}` : ''}`,
      cifras: [{ rotulo: 'Duración', valor: formatDuracion(fin - inicio) }, { rotulo: 'Volumen', valor: formatInt(volumen), unidad: 'kg' }, { rotulo: 'Series', valor: formatInt(series) }],
      ejercicios: w ? ejerciciosDelPoster(w, sets, records, nombres).map(e => {
        const i = ligas.findIndex(l => l.exerciseId === e.exerciseId)
        const svg = insigniasLiga.current?.querySelectorAll<SVGSVGElement>(':scope > svg')[i]
        return i >= 0 && svg ? { ...e, liga: { interior: interiorInsignia(svg, `liga-${i}`), texto: ligas[i].texto, empieza: ligas[i].empieza } } : e
      }) : [],
      records: records.length,
      medallas: [...(insignias.current?.querySelectorAll<SVGSVGElement>(':scope > svg') ?? [])].map((svg, i) => ({ interior: interiorInsignia(svg, `medalla-${i}`), nombre: nombreConNivel(logros[i]) })),
      hoy,
      ...(hito ? { hito: { cifra: formatInt(hito.numero), texto: 'entrenos terminados', desde: textoDesde(hito.desde, Date.now()) } } : {}),
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
    {/* Las insignias, sin mostrar: de aquí se copia su dibujo al crear la imagen. */}
    {ligas.length > 0 && <div ref={insigniasLiga} hidden>{ligas.map(l => <IconoLiga key={l.exerciseId} liga={l.liga} />)}</div>}
    {logros.length > 0 && <div ref={insignias} hidden>{logros.map(l => <IconoLogro key={`${l.logro.id}-${l.nivel ?? 'vez'}`} logro={l.logro} alcanzado />)}</div>}
  </section>
}
