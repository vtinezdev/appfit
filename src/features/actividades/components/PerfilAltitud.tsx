import type { PuntoRecorrido } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import { perfilAltitud } from '../lib/geo'

const ANCHO = 320
const ALTO = 72
const MARGEN = 4

/**
 * Perfil de altitud a lo largo del recorrido: área en `fg` al 10 % con la línea en `fg`, sin ejes; la altitud mínima y
 * máxima van en texto al lado. No dibuja nada si el recorrido no trae altitudes o no cambia.
 */
export default function PerfilAltitud({ recorrido }: { recorrido: readonly (readonly PuntoRecorrido[])[] }) {
  const perfil = perfilAltitud(recorrido)
  if (perfil.length < 2) return null
  const total = perfil[perfil.length - 1].distanciaM
  const eles = perfil.map((p) => p.ele)
  const min = Math.min(...eles)
  const max = Math.max(...eles)
  if (!(total > 0) || max - min < 1) return null
  const x = (d: number) => Math.round((MARGEN + (d / total) * (ANCHO - 2 * MARGEN)) * 10) / 10
  const y = (e: number) => Math.round((MARGEN + (1 - (e - min) / (max - min)) * (ALTO - 2 * MARGEN)) * 10) / 10
  const linea = perfil.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.distanciaM)} ${y(p.ele)}`).join(' ')
  const area = `${linea} L${x(total)} ${ALTO} L${x(0)} ${ALTO} Z`
  return (
    <figure className="space-y-1">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-label text-fg-muted">Altitud</span>
        <span className="tabular text-caption text-fg-muted">{formatInt(min)} – {formatInt(max)} m</span>
      </figcaption>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="block h-auto w-full" role="img" aria-label={`Altitud entre ${formatInt(min)} y ${formatInt(max)} m`}>
        <path d={area} className="fill-fg/10" />
        <path d={linea} fill="none" strokeWidth={2} strokeLinejoin="round" className="stroke-fg" />
      </svg>
    </figure>
  )
}
