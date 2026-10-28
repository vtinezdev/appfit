import { useState } from 'react'
import Avatar from '../../../shared/components/Avatar'
import { recursoImagenComunidad } from '../lib/recursoImagenComunidad'

interface Props {
  nombre: string
  /** Se tolera un identificador futuro o ausente: las iniciales siguen disponibles. */
  imagen?: string | null
  tamano?: 'sm' | 'md' | 'lg'
  className?: string
}

/** Imagen decorativa junto al nombre de la comunidad; conserva los tamaños y el recuadro de Avatar. */
export default function ImagenComunidad({ nombre, imagen, tamano = 'md', className = '' }: Props) {
  const recurso = recursoImagenComunidad(imagen)
  const [fallido, setFallido] = useState<string | null>(null)
  if (!recurso || fallido === recurso) return <Avatar nombre={nombre} forma="cuadrado" tamano={tamano} className={className} />
  return <span aria-hidden className={`app-avatar app-avatar-${tamano} inline-flex shrink-0 overflow-hidden rounded-md ${className}`}>
    <img key={recurso} src={recurso} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" onError={() => setFallido(recurso)} />
  </span>
}
