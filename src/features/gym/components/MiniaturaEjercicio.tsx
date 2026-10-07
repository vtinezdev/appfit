import { useState } from 'react'
import Icon from '../../../shared/components/Icon'
import { imagenEjercicio } from '../lib/imagenEjercicio'

/** Imagen de referencia del ejercicio; sin imagen (o si no carga) deja un hueco del mismo tamaño para alinear las filas. */
export default function MiniaturaEjercicio({ catalogId }: { catalogId?: string }) {
  const src = imagenEjercicio(catalogId)
  const [fallida, setFallida] = useState(false)
  if (src && !fallida) {
    return <img src={src} alt="" width={192} height={192} loading="lazy" decoding="async" onError={() => setFallida(true)}
      className="ejercicio-thumb h-thumb w-thumb shrink-0 rounded-md bg-surface-muted object-cover" />
  }
  return <span aria-hidden="true" className="flex h-thumb w-thumb shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg-subtle">
    <Icon name="dumbbell" size={20} />
  </span>
}
