import { useState } from 'react'
import Icon from '../../../shared/components/Icon'
import { imagenEjercicio } from '../lib/imagenEjercicio'

/**
 * Imagen de referencia del ejercicio; sin imagen (o si no carga) deja un hueco del mismo tamaño para alinear las filas.
 * `mosaico`: ocupa su celda (mosaico de una rutina) en lugar del tamaño `thumb`.
 */
export default function MiniaturaEjercicio({ catalogId, mosaico = false }: { catalogId?: string; mosaico?: boolean }) {
  const src = imagenEjercicio(catalogId)
  const [fallida, setFallida] = useState(false)
  const tam = mosaico ? 'h-full w-full rounded-sm' : 'h-thumb w-thumb rounded-md'
  if (src && !fallida) {
    return <img src={src} alt="" width={192} height={192} loading="lazy" decoding="async" onError={() => setFallida(true)}
      className={`ejercicio-thumb ${tam} shrink-0 bg-surface-muted object-cover`} />
  }
  return <span aria-hidden="true" className={`flex ${tam} shrink-0 items-center justify-center bg-surface-muted text-fg-subtle`}>
    <Icon name="dumbbell" size={mosaico ? 14 : 20} />
  </span>
}
