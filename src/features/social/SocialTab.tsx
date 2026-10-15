import { useRef, useState } from 'react'
import Button, { IconButton } from '../../shared/components/Button'
import Icon from '../../shared/components/Icon'
import PageHeader from '../../shared/components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/StateMessage'
import ViewTabs from '../../shared/components/ViewTabs'
import { useAviso } from '../../shared/hooks/useAviso'
import { formatInt } from '../../shared/lib/format'
import { useCuenta } from '../cuenta/useCuenta'
import AvisosSheet from './components/AvisosSheet'
import type { PublicacionComentada } from './components/ComentariosSheet'
import ListaFeed from './components/ListaFeed'
import PublicacionesPersona from './components/PublicacionesPersona'
import type { MiPerfil } from './data/social'
import { useConsulta } from './hooks/useConsulta'
import { cargarSocial } from './servicio'

type Vista = 'todo' | 'tu'

interface Props {
  onIrAAmigos: () => void
  onIrACuenta: () => void
}

/**
 * Social (en la barra, ADR 040): las publicaciones de quienes sigues y las tuyas, sus ánimos y comentarios, y los
 * avisos. Las personas (seguir, solicitudes, tu perfil) están en Amigos.
 */
export default function SocialTab({ onIrAAmigos, onIrACuenta }: Props) {
  const cuenta = useCuenta()
  if (cuenta.fase === 'cargando') return <div className="px-page pt-5"><LoadingState /></div>
  if (cuenta.fase === 'sin-sesion') {
    return (
      <div className="space-y-section px-page pt-5">
        <PageHeader title="Social" />
        <EmptyState icon="comentario" title="Entra con tu cuenta" action={<Button variant="secondary" onClick={onIrACuenta}>Ir a Cuenta</Button>}>
          Aquí verás los entrenos y las actividades que publiquen las personas que sigues, y podrás darles ánimo y comentar. Necesitas una cuenta.
        </EmptyState>
      </div>
    )
  }
  return <ConCuenta key={cuenta.email} onIrAAmigos={onIrAAmigos} />
}

function ConCuenta({ onIrAAmigos }: { onIrAAmigos: () => void }) {
  const perfil = useConsulta(async () => (await cargarSocial()).miPerfil(), 0)
  if (perfil.estado === 'error' && perfil.datos === undefined) {
    return (
      <div className="space-y-section px-page pt-5">
        <PageHeader title="Social" />
        <div className="space-y-3"><ErrorState>{perfil.error}</ErrorState><Button variant="secondary" size="sm" onClick={perfil.recargar}>Reintentar</Button></div>
      </div>
    )
  }
  if (perfil.datos === undefined) return <div className="px-page pt-5"><LoadingState /></div>
  if (perfil.datos === null || perfil.datos.suspendido) {
    const suspendido = perfil.datos?.suspendido === true
    return (
      <div className="space-y-section px-page pt-5">
        <PageHeader title="Social" />
        <EmptyState icon="users" title={suspendido ? 'Perfil suspendido' : 'Crea tu perfil'} action={<Button variant="secondary" onClick={onIrAAmigos}>Ir a Amigos</Button>}>
          {suspendido
            ? 'Tu perfil se ha suspendido por una denuncia. Mientras tanto no puedes ver ni publicar nada.'
            : 'Para ver lo que publican las personas que sigues, primero crea tu perfil en Amigos y sigue a alguien.'}
        </EmptyState>
      </div>
    )
  }
  return <Social perfil={perfil.datos} onIrAAmigos={onIrAAmigos} />
}

function Social({ perfil, onIrAAmigos }: { perfil: MiPerfil; onIrAAmigos: () => void }) {
  const [vista, setVista] = useState<Vista>('todo')
  const [avisosAbiertos, setAvisosAbiertos] = useState({ open: false, n: 0 })
  // Tocar un aviso cierra la hoja de avisos y, cuando termina de cerrarse, abre los comentarios.
  const siguiente = useRef<(() => void) | null>(null)
  const [comentariosDe, setComentariosDe] = useState<PublicacionComentada | null>(null)
  const [publicacionesDe, setPublicacionesDe] = useState<{ alias: string; nombre: string | null } | null>(null)
  const avisos = useConsulta(async () => (await cargarSocial()).avisos(), 0)
  const { avisarError, toast } = useAviso()

  const nuevos = avisos.datos?.nuevos ?? 0
  const solicitudes = avisos.datos?.solicitudes ?? perfil.solicitudes
  const vistas: { valor: Vista; label: string }[] = [
    { valor: 'todo', label: 'Siguiendo' },
    { valor: 'tu', label: 'Tú' },
  ]

  return (
    <div className="space-y-section px-page pt-5">
      <PageHeader title="Social" action={<IconButton icon="users" label="Amigos" variant="ghost" onClick={onIrAAmigos} />} />

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => setAvisosAbiertos((a) => ({ open: true, n: a.n + 1 }))}>
          <Icon name="comentario" size={18} className={nuevos > 0 ? 'text-accent-strong' : ''} />
          {nuevos > 0 ? `Avisos · ${formatInt(nuevos)} ${nuevos === 1 ? 'nuevo' : 'nuevos'}` : 'Avisos'}
        </Button>
        {solicitudes > 0 && (
          <Button variant="secondary" size="sm" onClick={onIrAAmigos}>
            <Icon name="users" size={18} className="text-accent-strong" />{`${formatInt(solicitudes)} ${solicitudes === 1 ? 'solicitud' : 'solicitudes'}`}
          </Button>
        )}
      </div>

      <ViewTabs opciones={vistas} valor={vista} onChange={setVista} label="Publicaciones">
        {vista === 'todo' ? (
          <ListaFeed version="todo" onError={avisarError} comentariosDe={comentariosDe}
            onAbrirPersona={setPublicacionesDe}
            cargar={async (antes) => (await cargarSocial()).feed(antes)}
            vacio={
              <EmptyState icon="comentario" title="Aún no hay publicaciones" action={<Button variant="secondary" onClick={onIrAAmigos}>Buscar a alguien</Button>}>
                Aquí verás los entrenos y las actividades que publiquen las personas que sigues. Sigue a alguien desde Amigos.
              </EmptyState>
            } />
        ) : (
          <ListaFeed version="tu" onError={avisarError} conAutor={false}
            cargar={async (antes) => (await cargarSocial()).publicacionesDe(perfil.alias, antes)}
            vacio={
              <EmptyState icon="comentario" title="Aún no has publicado nada">
                Al terminar un entreno, o en el detalle de un entreno o de una actividad, pulsa «Publicar en Social».
              </EmptyState>
            } />
        )}
      </ViewTabs>

      {avisosAbiertos.n > 0 && (
        <AvisosSheet key={`avisos-${avisosAbiertos.n}`} open={avisosAbiertos.open} lista={avisos.datos?.lista ?? []}
          onClose={() => setAvisosAbiertos((a) => ({ ...a, open: false }))}
          onExited={() => {
            const fn = siguiente.current
            siguiente.current = null
            fn?.()
          }}
          onVistos={avisos.recargar}
          onAbrir={(aviso) => {
            siguiente.current = () => {
              setVista('todo')
              setComentariosDe({ id: aviso.publicacion, titulo: aviso.titulo, mia: true })
            }
            setAvisosAbiertos((a) => ({ ...a, open: false }))
          }} />
      )}
      {publicacionesDe && <PublicacionesPersona persona={publicacionesDe} onClose={() => setPublicacionesDe(null)} />}
      {toast}
    </div>
  )
}
