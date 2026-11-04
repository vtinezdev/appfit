import type { CSSProperties, ReactNode } from 'react'
import TrazadoRecorrido from '../../actividades/components/TrazadoRecorrido'
import type { ColeccionRuta } from '../../caminos/lib/rutas'
import { puntoEnLadera, trazadoSilueta } from '../../cumbres/lib/perfil'
import { formaDe } from '../../cumbres/lib/siluetas'
import type { IdLogro } from '../lib/logros'
import { SimboloLogro } from './IconoLogro'
import type { PuntoRecorrido } from '../../../shared/db/types'

/** Cuadro de miniatura de las filas de «Lo mejor del mes»: `surface-muted`, del tamaño de las miniaturas de la app. */
function Cuadro({ children }: { children: ReactNode }) {
  return <span aria-hidden="true" className="flex h-thumb w-thumb shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-muted">{children}</span>
}

const LIENZO = { ancho: 48, alto: 48, margen: 14 }

/**
 * La silueta propia de la montaña (`cumbres/lib/siluetas`) con la bandera en la cima: rellena si se coronó, solo el
 * contorno si se está subiendo.
 */
export function MiniaturaMontana({ montanaId, enCurso = false }: { montanaId: string; enCurso?: boolean }) {
  const forma = formaDe(montanaId)
  const cima = puntoEnLadera(LIENZO, 1, forma)
  const bandera = `M${cima.x} ${cima.y}V${cima.y - 10}L${cima.x + 7} ${cima.y - 8}L${cima.x} ${cima.y - 6}`
  return <Cuadro>
    <svg viewBox={`0 0 ${LIENZO.ancho} ${LIENZO.alto}`} className="block h-full w-full">
      <path d={trazadoSilueta(LIENZO, forma)} strokeWidth={enCurso ? 1.5 : 0} strokeLinejoin="round" className={enCurso ? 'fill-surface stroke-fg' : 'fill-fg'} />
      <path d={bandera} strokeWidth={1.5} strokeLinejoin="round" className="fill-fg stroke-fg" />
    </svg>
  </Cuadro>
}

/** El pictograma de cada colección, el mismo de sus logros de la Vitrina. */
const SELLOS: Record<Exclude<ColeccionRuta, 'propia'>, IdLogro> = { santiago: 'compostela', mundo: 'rutas-mundo', literatura: 'viajes-libro', fantasia: 'fantasia' }
// Los detalles del pictograma (que en la insignia van en verde bosque) se recortan sobre el fondo del cuadro.
const SOBRE_FONDO = { '--c-expedicion-bosque': 'var(--c-surface-muted)', '--c-expedicion-arcilla': 'var(--c-surface-muted)', '--c-expedicion-salvia': 'var(--c-surface-muted)' } as CSSProperties

/**
 * Caminos: el sello de la credencial de su colección (concha, globo, libro, castillo); las rutas propias, con la forma
 * real de su recorrido.
 */
export function MiniaturaCamino({ coleccion, puntos }: { coleccion: ColeccionRuta; puntos?: readonly PuntoRecorrido[] }) {
  if (coleccion === 'propia') {
    return <Cuadro>{puntos && puntos.length >= 2 ? <TrazadoRecorrido recorrido={[puntos]} variante="fila" /> : <SelloVacio />}</Cuadro>
  }
  return <Cuadro>
    <svg viewBox="0 0 64 64" className="block h-full w-full p-0.5">
      <circle cx="32" cy="32" r="29" fill="none" strokeWidth="2" className="stroke-fg" />
      <circle cx="32" cy="32" r="25" fill="none" strokeWidth="1" strokeDasharray="2 3" className="stroke-fg" />
      <svg x="16" y="16" width="32" height="32" viewBox="0 0 64 64" className="fill-fg text-fg" style={SOBRE_FONDO}><SimboloLogro id={SELLOS[coleccion]} /></svg>
    </svg>
  </Cuadro>
}

function SelloVacio() {
  return <svg viewBox="0 0 64 64" className="block h-full w-full p-0.5"><circle cx="32" cy="32" r="29" fill="none" strokeWidth="2" className="stroke-fg" /></svg>
}
