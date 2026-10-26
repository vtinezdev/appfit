import { lazy, Suspense, useRef, useState } from 'react'
import Button, { IconButton } from '../../shared/components/Button'
import PageHeader from '../../shared/components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/StateMessage'
import ViewTabs from '../../shared/components/ViewTabs'
import { useAviso } from '../../shared/hooks/useAviso'
import { formatInt } from '../../shared/lib/format'
import { useCuenta } from '../cuenta/useCuenta'
import ModalPage from '../../shared/components/ModalPage'
import PrimerosPasosSocial from './components/PrimerosPasosSocial'
import CrearPerfil from './components/CrearPerfil'
import MiPerfilPagina from './components/MiPerfilPagina'
import AvatarPersona from './components/AvatarPersona'
import Compositor from './components/Compositor'
import SemanaCompania from './components/SemanaCompania'
import AvisosSheet from './components/AvisosSheet'
import type { PublicacionComentada } from './components/ComentariosSheet'
import ListaFeed from './components/ListaFeed'
import PublicacionesPersona from './components/PublicacionesPersona'
import CrearPublicacion from './components/CrearPublicacion'
import Comunidades from './components/Comunidades'
import Moderacion from './components/Moderacion'
import type { MiPerfil } from './data/social'
import { reiniciarAvatares, useAvatares } from './hooks/useAvatares'
import { reiniciarAdmin, useAdmin } from './hooks/useAdmin'
import { useConsulta } from './hooks/useConsulta'
import { cargarSocial } from './servicio'

const DetalleEntreno = lazy(() => import('../gym/pages/DetalleEntreno'))

type Vista = 'todo' | 'comunidades'

interface Props {
  onIrAAmigos: (anadir?: boolean) => void
  onIrAGym: () => void
  onIrACuenta: () => void
}

/**
 * Social (en la rejilla de secciones, ADR 040, 043 y 060): las publicaciones de quienes sigues y las tuyas, sus ánimos y comentarios, y los
 * avisos. Cabecera con Avisos, Amigos y tu perfil (con tus publicaciones); las personas (seguir, solicitudes) están en Amigos.
 */
export default function SocialTab({ onIrAAmigos, onIrACuenta, onIrAGym }: Props) {
  const cuenta = useCuenta()
  if (cuenta.fase === 'cargando') return <div className="px-page pt-5"><LoadingState /></div>
  if (cuenta.fase === 'sin-sesion') {
    return (
      <div className="space-y-section px-page pt-5">
        <PageHeader title="Social" />
        <EmptyState icon="comentario" title="Entra con tu cuenta" action={<Button variant="secondary" onClick={onIrACuenta}>Ir a Cuenta</Button>}>
          Publicaciones, logros y comunidades. Entra con tu cuenta para participar.
        </EmptyState>
      </div>
    )
  }
  return <ConCuenta key={cuenta.email} onIrAAmigos={onIrAAmigos} onIrAGym={onIrAGym} />
}

function ConCuenta({ onIrAAmigos, onIrAGym }: Pick<Props, 'onIrAAmigos' | 'onIrAGym'>) {
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
  if (perfil.datos === null) return <CrearPerfil titulo="Social" onCreado={perfil.recargar} />
  if (perfil.datos.suspendido) {
    const suspendido = perfil.datos?.suspendido === true
    return (
      <div className="space-y-section px-page pt-5">
        <PageHeader title="Social" />
        <EmptyState icon="users" title={suspendido ? 'Perfil suspendido' : 'Crea tu perfil'} action={<Button variant="secondary" onClick={() => onIrAAmigos()}>Ir a Amigos</Button>}>
          {suspendido
            ? 'Tu perfil se ha suspendido por una denuncia. Mientras tanto no puedes ver ni publicar nada.'
            : 'Crea tu perfil en Amigos para publicar y unirte a comunidades.'}
        </EmptyState>
      </div>
    )
  }
  return <Social perfil={perfil.datos} onIrAAmigos={onIrAAmigos} onIrAGym={onIrAGym} onPerfilCambiado={perfil.recargar} />
}

function Social({ perfil, onIrAAmigos, onIrAGym, onPerfilCambiado }: Pick<Props, 'onIrAAmigos' | 'onIrAGym'> & { perfil: MiPerfil; onPerfilCambiado: () => void }) {
  const [miPerfil, setMiPerfil] = useState(false)
  const [moderacion, setModeracion] = useState(false)
  const [entreno, setEntreno] = useState<number | null>(null)
  const [descubrir, setDescubrir] = useState(0)
  const [vista, setVista] = useState<Vista>('todo')
  const [editor, setEditor] = useState(false)
  const [version, setVersion] = useState(0)
  const [comprobar, setComprobar] = useState(0)
  const [avisosAbiertos, setAvisosAbiertos] = useState({ open: false, n: 0 })
  // Tocar un aviso cierra la hoja de avisos y, cuando termina de cerrarse, abre los comentarios.
  const siguiente = useRef<(() => void) | null>(null)
  const [comentariosDe, setComentariosDe] = useState<PublicacionComentada | null>(null)
  const [publicacionesDe, setPublicacionesDe] = useState<{ alias: string; nombre: string | null } | null>(null)
  const avisos = useConsulta(async () => (await cargarSocial()).avisos(), 0, true)
  const { avisarError, avisar, toast } = useAviso()
  // Cada visita a Social vuelve a pedir los avatares, antes de que se pinte la primera lista.
  useState(reiniciarAvatares)
  // También se vuelve a preguntar si es administrador: solo quien lo es ve Moderación y sus acciones.
  useState(reiniciarAdmin)
  const admin = useAdmin()
  const avatares = useAvatares([perfil.alias])

  const nuevos = avisos.datos?.nuevos ?? 0
  const solicitudes = avisos.datos?.solicitudes ?? perfil.solicitudes
  // Las invitaciones de la semana en compañía cuentan como las solicitudes hasta responderlas (A19).
  const invitaciones = avisos.datos?.invitaciones ?? 0
  const pendientes = nuevos + solicitudes + invitaciones
  const etiquetaAvisos = ['Avisos', nuevos > 0 && `${formatInt(nuevos)} ${nuevos === 1 ? 'nuevo' : 'nuevos'}`, solicitudes > 0 && `${formatInt(solicitudes)} ${solicitudes === 1 ? 'solicitud' : 'solicitudes'}`,
    invitaciones > 0 && `${formatInt(invitaciones)} ${invitaciones === 1 ? 'invitación' : 'invitaciones'}`].filter(Boolean).join(', ')
  const [versionCompania, setVersionCompania] = useState(0)
  const vistas: { valor: Vista; label: string }[] = [
    { valor: 'todo', label: 'Siguiendo' },
    { valor: 'comunidades', label: 'Comunidades' },
  ]
  const cambiarVista = (v: Vista) => {
    // Volver a tocar Siguiendo comprueba si hay publicaciones nuevas.
    if (v === vista && v === 'todo') setComprobar(n => n + 1)
    setVista(v)
  }

  return (
    <div className="space-y-section px-page pt-5">
      <PageHeader title="Social" action={<div className="flex items-center gap-1">
        <span className="relative">
          <IconButton icon="campana" label={etiquetaAvisos} variant="ghost" aria-haspopup="dialog" onClick={() => setAvisosAbiertos((a) => ({ open: true, n: a.n + 1 }))} />
          {pendientes > 0 && <span aria-hidden className="contador-avisos pointer-events-none absolute flex items-center justify-center rounded-pill bg-fg px-1 text-caption font-bold tabular-nums text-bg">{pendientes > 99 ? '99+' : formatInt(pendientes)}</span>}
        </span>
        {admin && <IconButton icon="escudo" label="Moderación" variant="ghost" onClick={() => setModeracion(true)} />}
        <IconButton icon="users" label="Amigos" variant="ghost" onClick={() => onIrAAmigos()} />
        <button type="button" aria-label="Tu perfil" className="app-button flex h-touch w-touch items-center justify-center rounded-pill" onClick={() => setMiPerfil(true)}>
          <AvatarPersona persona={perfil} avatar={avatares[perfil.alias]} tamano="sm" />
        </button>
      </div>} />

      <PrimerosPasosSocial version={version} onCodigo={() => onIrAAmigos(true)} onComunidades={() => { setDescubrir(v => v + 1); setVista('comunidades') }} onEntreno={id => id ? setEntreno(id) : onIrAGym()} onError={avisarError} />

      <ViewTabs opciones={vistas} valor={vista} onChange={cambiarVista} label="Publicaciones">
        {vista === 'todo' ? (
          <div className="space-y-stack">
            <SemanaCompania version={versionCompania} onRespondida={avisos.recargar} onAmigos={() => onIrAAmigos()} onError={avisarError} />
            <Compositor persona={perfil} avatar={avatares[perfil.alias]} onEscribir={() => setEditor(true)}
              onPublicada={() => { setVersion(v => v + 1); avisar({ mensaje: 'Publicación creada' }) }} />
            <ListaFeed ocultarSilenciadas version={`todo-${version}`} onError={avisarError} comentariosDe={comentariosDe} comprobarSenal={comprobar}
              onAbrirPersona={setPublicacionesDe}
              cargar={async (antes) => (await cargarSocial()).feed(antes)}
              vacio={
                <EmptyState icon="comentario" title="Aún no hay publicaciones" action={<Button variant="secondary" onClick={() => onIrAAmigos()}>Buscar a alguien</Button>}>
                  Aquí verás las publicaciones de las personas que sigues y las tuyas.
                </EmptyState>
              } />
          </div>
        ) : <Comunidades onCambio={() => setVersion(v => v + 1)} key={descubrir} descubrirInicial={descubrir > 0} onError={avisarError} />}
      </ViewTabs>

      {avisosAbiertos.n > 0 && (
        <AvisosSheet key={`avisos-${avisosAbiertos.n}`} open={avisosAbiertos.open} consulta={avisos} onReintentar={avisos.recargar} onAmigos={() => onIrAAmigos()}
          onCompania={() => setVersionCompania(v => v + 1)}
          onClose={() => setAvisosAbiertos((a) => ({ ...a, open: false }))}
          onExited={() => {
            const fn = siguiente.current
            siguiente.current = null
            fn?.()
          }}
          onVistos={avisos.recargar}
          onAbrir={(aviso) => {
            siguiente.current = () => {
              if (aviso.tipo === 'aceptada') { setPublicacionesDe({ alias: aviso.alias, nombre: aviso.nombre }); return }
              // Abre Mis comunidades (vuelta a montar: la lista se relee con la nueva).
              if (aviso.tipo === 'anadido') { setDescubrir(d => (d > 0 ? 0 : d - 1)); setVista('comunidades'); return }
              // La revisión de una denuncia no lleva a ningún sitio (no dice qué se hizo).
              if (aviso.tipo === 'denuncia') return
              // El ánimo de la semana en compañía: su tarjeta está arriba de Siguiendo.
              if (aviso.tipo === 'animo_compania') { setVista('todo'); setVersionCompania(v => v + 1); window.scrollTo({ top: 0 }); return }
              setVista('todo')
              setComentariosDe({ id: aviso.publicacion, titulo: aviso.titulo, mia: aviso.mia ?? true })
            }
            setAvisosAbiertos((a) => ({ ...a, open: false }))
          }} />
      )}
      {publicacionesDe && <PublicacionesPersona onCambio={() => { setVersion(v => v + 1); avisos.recargar() }} persona={publicacionesDe} volver="Social" onClose={() => setPublicacionesDe(null)} />}
      {editor && <CrearPublicacion onClose={() => setEditor(false)} onPublicada={() => { setVersion(v => v + 1); avisar({ mensaje: 'Publicación creada' }) }} />}
      {moderacion && <Moderacion onClose={() => setModeracion(false)} onCambio={() => { setVersion(v => v + 1); avisos.recargar() }} />}
      {miPerfil && <MiPerfilPagina perfil={perfil} onClose={() => { setMiPerfil(false); setVersion(v => v + 1) }} onPerfilCambiado={onPerfilCambiado} onError={avisarError} />}
      {entreno !== null && <ModalPage title="Tu último entreno" closeLabel="Social" onClose={() => setEntreno(null)}><Suspense fallback={<LoadingState />}><DetalleEntreno workoutId={entreno} onVolver={() => setEntreno(null)} onRepetido={() => { setEntreno(null); onIrAGym() }} /></Suspense></ModalPage>}
      {toast}
    </div>
  )
}
