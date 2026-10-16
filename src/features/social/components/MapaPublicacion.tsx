import { lazy, Suspense } from 'react'
import { MUSCULOS, ZONAS_MUSCULARES } from '../../gym/lib/musculos'
import type { MapaCompartido } from '../lib/publicacion'

const FigurasMusculares = lazy(() => import('../../gym/components/MapaMuscular').then(m => ({ default: m.FigurasMusculares })))
const NIVEL = ['', 'Muy bajo', 'Bajo', 'Moderado', 'Alto', 'Muy alto']

/** La misma geometría para todas las publicaciones: el resumen no lleva datos del Perfil. */
export default function MapaPublicacion({ mapa }: { mapa: MapaCompartido }) {
  const activos = ZONAS_MUSCULARES.filter(z => mapa[z] > 0)
  return <section aria-label="Mapa de calor del entreno" className="space-y-2">
    <h3 className="text-label text-fg-muted">Mapa muscular</h3>
    <Suspense fallback={<p className="text-caption text-fg-muted">Cargando mapa…</p>}><FigurasMusculares levels={mapa} className="publicacion-mapa mx-auto w-full" /></Suspense>
    <p className="break-words text-caption text-fg-muted">{activos.length ? activos.map(z => `${MUSCULOS[z]}: ${NIVEL[mapa[z]]}`).join(' · ') : 'Sin trabajo muscular identificado.'}</p>
    <p className="text-caption text-fg-muted">Trabajo relativo dentro de este entreno.</p>
  </section>
}
