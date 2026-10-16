import { useState, type ReactNode } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { ErrorState } from '../../../shared/components/StateMessage'
import { useCuenta } from '../../cuenta/useCuenta'
import { borrarPublicacion } from '../data/publicacionesRepo'
import type { Resumen } from '../lib/publicacion'
import { useConsulta } from '../hooks/useConsulta'
import { cargarSocial, socialDisponible } from '../servicio'
import TarjetaPublicacion from './TarjetaPublicacion'
import { CompartirComunidad } from './CrearPublicacion'

/**
 * Solo pinta lo de dentro si se puede publicar: Amigos configurado, sesión y un perfil sin suspender. Sin conexión o
 * sin perfil no aparece nada (se puede publicar después desde el detalle). Así quien lo use puede calcular el resumen
 * dentro sin coste para quien no usa Amigos.
 */
export function SiPuedePublicar({ children }: { children: ReactNode }) {
  if (!socialDisponible) return null
  return <ConSesion>{children}</ConSesion>
}

function ConSesion({ children }: { children: ReactNode }) {
  const { fase, email } = useCuenta()
  if (fase === 'cargando' || fase === 'sin-sesion') return null
  return <ConPerfil key={email}>{children}</ConPerfil>
}

function ConPerfil({ children }: { children: ReactNode }) {
  const perfil = useConsulta(async () => (await cargarSocial()).miPerfil(), 0)
  if (perfil.estado !== 'listo' || !perfil.datos || perfil.datos.suspendido) return null
  return children
}

interface Props {
  /** Id de la publicación anotado en el registro (ya publicado), o `undefined`. */
  publicacion: string | undefined
  /** ms del inicio. */
  fecha: number
  resumen: Resumen
  /** Anota en el registro el id publicado, o lo quita (`undefined`). */
  onAnotar: (publicacion: string | undefined) => Promise<void>
}

/**
 * «Compartir» (en Social) al terminar un entreno o en el detalle de un entreno o una actividad: la vista
 * previa de lo que se publica y «Publicar»; ya publicado, «Borrar publicación». Va dentro de `SiPuedePublicar`.
 */
export default function Publicar({ publicacion, fecha, resumen, onAnotar }: Props) {
  // El mismo id en cada intento: si la red falla después de publicar, el reintento no duplica.
  const [id] = useState(() => crypto.randomUUID())
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ejecutar(fn: () => Promise<void>) {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido completar. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  const publicar = () => ejecutar(async () => {
    await (await cargarSocial()).publicar(id, fecha, resumen)
    await onAnotar(id)
  })
  const borrar = (pub: string) => ejecutar(async () => {
    await borrarPublicacion(await cargarSocial(), pub)
    await onAnotar(undefined)
  })

  if (publicacion) {
    return (
      <section aria-label="Publicado en Social" className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p role="status" className="flex items-center gap-2 text-body-sm font-semibold text-fg"><Icon name="check" size={18} className="text-accent-strong" />Publicado en Social</p>
          <Button variant="subtle" size="sm" loading={ocupado} onClick={() => void borrar(publicacion)}>Borrar publicación</Button>
        </div>
        {error && <ErrorState>{error}</ErrorState>}
        <CompartirComunidad resumen={resumen} fecha={fecha} />
      </section>
    )
  }

  return (
    <section aria-label="Compartir con tus seguidores" className="space-y-3">
      <h2 className="text-heading text-fg">Compartir</h2>
      <TarjetaPublicacion resumen={resumen} fecha={fecha} />
      <p className="text-caption text-fg-muted">Lo verán las personas que te siguen. Tu nutrición, tu peso y tus medidas no se comparten{resumen.tipo === 'actividad' ? ', ni el recorrido' : ''}.</p>
      {error && <ErrorState>{error}</ErrorState>}
      <Button variant="primary" block loading={ocupado} onClick={() => void publicar()}>Publicar en Social</Button>
      <CompartirComunidad resumen={resumen} fecha={fecha} />
    </section>
  )
}
