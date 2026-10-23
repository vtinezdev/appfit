import { useState } from 'react'
import Button, { IconButton } from '../../shared/components/Button'
import PageHeader from '../../shared/components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/StateMessage'
import ViewTabs from '../../shared/components/ViewTabs'
import { useAviso } from '../../shared/hooks/useAviso'
import { formatInt } from '../../shared/lib/format'
import { useCuenta } from '../cuenta/useCuenta'
import Anadir from './components/Anadir'
import CrearPerfil from './components/CrearPerfil'
import ListaPersonas from './components/ListaPersonas'
import PerfilSheet from './components/PerfilSheet'
import PublicacionesPersona from './components/PublicacionesPersona'
import Solicitudes from './components/Solicitudes'
import type { MiPerfil } from './data/social'
import { useConsulta } from './hooks/useConsulta'
import { reiniciarAdmin } from './hooks/useAdmin'
import type { Persona } from './lib/relacion'
import { cargarSocial } from './servicio'

type Vista = 'siguiendo' | 'seguidores' | 'anadir'

/**
 * Amigos (se abre desde Social, ADR 040 y 043): tu perfil social y las personas (solicitudes, a quién sigues, quién te sigue y añadir a
 * alguien). Las publicaciones viven en Social. Necesita cuenta.
 */
export default function AmigosTab({ onIrACuenta, anadirInicial = false, onVolver }: {
  onIrACuenta: () => void; anadirInicial?: boolean
  /** Amigos se abre desde Social: «‹ Social» encima del título (NAV-02). */
  onVolver?: () => void
}) {
  const volver = onVolver ? { etiqueta: 'Social', onVolver } : undefined
  const cuenta = useCuenta()
  if (cuenta.fase === 'cargando') return <div className="px-page pt-5"><LoadingState /></div>
  if (cuenta.fase === 'sin-sesion') {
    return (
      <div className="space-y-section px-page pt-5">
        <PageHeader title="Amigos" volver={volver} />
        <EmptyState icon="users" title="Entra con tu cuenta" action={<Button variant="secondary" onClick={onIrACuenta}>Ir a Cuenta</Button>}>
          Para seguir a otras personas y que te sigan necesitas una cuenta. Tus registros siguen siendo solo tuyos: los demás solo verán lo que publiques.
        </EmptyState>
      </div>
    )
  }
  return <ConCuenta key={cuenta.email} anadirInicial={anadirInicial} volver={volver} />
}

type Volver = { etiqueta: string; onVolver: () => void } | undefined

function ConCuenta({ anadirInicial, volver }: { anadirInicial: boolean; volver: Volver }) {
  const [version, setVersion] = useState(0)
  const perfil = useConsulta(async () => (await cargarSocial()).miPerfil(), version)

  if (perfil.estado === 'error' && perfil.datos === undefined) {
    return (
      <div className="space-y-section px-page pt-5">
        <PageHeader title="Amigos" volver={volver} />
        <div className="space-y-3"><ErrorState>{perfil.error}</ErrorState><Button variant="secondary" size="sm" onClick={perfil.recargar}>Reintentar</Button></div>
      </div>
    )
  }
  if (perfil.datos === undefined) return <div className="px-page pt-5"><LoadingState /></div>
  if (perfil.datos === null) return <CrearPerfil onCreado={() => setVersion((v) => v + 1)} />
  return <Amigos anadirInicial={anadirInicial} volver={volver} perfil={perfil.datos} onPerfilCambiado={() => setVersion((v) => v + 1)} />
}

function Amigos({ perfil, onPerfilCambiado, anadirInicial, volver }: { anadirInicial: boolean; volver: Volver; perfil: MiPerfil; onPerfilCambiado: () => void }) {
  const [vista, setVista] = useState<Vista>(anadirInicial ? 'anadir' : 'siguiendo')
  const [version, setVersion] = useState(0)
  // Como en Social: al entrar se vuelve a preguntar si es administrador (puede haber cambiado de cuenta).
  useState(reiniciarAdmin)
  // Las hojas siguen montadas al cerrarse (animan la salida); `n` las vuelve a montar limpias en cada apertura.
  const [ajustes, setAjustes] = useState({ open: false, n: 0 })
  const [publicacionesDe, setPublicacionesDe] = useState<Persona | null>(null)
  const { avisarError, toast } = useAviso()
  // Las dos listas a la vez: sus recuentos van en las pestañas.
  const siguiendo = useConsulta(async () => (await cargarSocial()).personas('siguiendo'), `siguiendo-${version}`)
  const seguidores = useConsulta(async () => (await cargarSocial()).personas('seguidores'), `seguidores-${version}`)

  const cambio = () => {
    setVersion((v) => v + 1)
    onPerfilCambiado()
  }
  const abrir = (p: Persona) => setPublicacionesDe(p)
  const abrirAjustes = () => setAjustes((a) => ({ open: true, n: a.n + 1 }))

  const cabecera = (
    <div>
      <PageHeader title="Amigos" volver={volver} action={<IconButton icon="settings" label="Ajustes del perfil" variant="ghost" aria-haspopup="dialog" onClick={abrirAjustes} />} />
      {/* Fuera de `overline`, que pone en mayúscula la primera letra y cambiaría el alias. */}
      <p className="mt-1 break-words text-body-sm text-fg-muted">
        @{perfil.alias}{perfil.solicitudes > 0 && ` · ${formatInt(perfil.solicitudes)} ${perfil.solicitudes === 1 ? 'solicitud' : 'solicitudes'}`}
      </p>
    </div>
  )
  const hojaPerfil = ajustes.n > 0 && (
    <PerfilSheet key={`perfil-${ajustes.n}`} open={ajustes.open} perfil={perfil} onClose={() => setAjustes((a) => ({ ...a, open: false }))}
      onCambio={cambio}
      onBorrado={() => {
        setAjustes((a) => ({ ...a, open: false }))
        onPerfilCambiado()
      }} />
  )

  if (perfil.suspendido) {
    return (
      <div className="space-y-section px-page pt-5">
        {cabecera}
        <EmptyState icon="users" title="Perfil suspendido" action={<Button variant="secondary" onClick={abrirAjustes}>Ajustes del perfil</Button>}>
          Tu perfil se ha suspendido por una denuncia. Mientras tanto no puedes seguir a nadie ni aparecer en las búsquedas.
        </EmptyState>
        {hojaPerfil}
      </div>
    )
  }

  const cuenta = (n: number | undefined) => (n === undefined ? '' : ` · ${formatInt(n)}`)
  const vistas: { valor: Vista; label: string }[] = [
    { valor: 'siguiendo', label: `Sigues${cuenta(siguiendo.datos?.length)}` },
    { valor: 'seguidores', label: `Te siguen${cuenta(seguidores.datos?.length)}` },
    { valor: 'anadir', label: 'Añadir' },
  ]

  return (
    <div className="space-y-section px-page pt-5">
      {cabecera}
      <Solicitudes version={version} onAbrir={abrir} onCambio={cambio} onError={avisarError} />
      <ViewTabs opciones={vistas} valor={vista} onChange={setVista} label="Amigos">
        {vista === 'anadir'
          ? <Anadir codigo={perfil.codigo} onAbrir={abrir} onCambio={cambio} />
          : <ListaPersonas lista={vista} consulta={vista === 'siguiendo' ? siguiendo : seguidores} onAbrir={abrir} onCambio={cambio} onError={avisarError} />}
      </ViewTabs>

      {publicacionesDe && <PublicacionesPersona persona={publicacionesDe} onCambio={cambio} onClose={() => setPublicacionesDe(null)} />}
      {hojaPerfil}
      {toast}
    </div>
  )
}
