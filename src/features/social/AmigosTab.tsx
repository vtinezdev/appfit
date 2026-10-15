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
import PersonaSheet from './components/PersonaSheet'
import Solicitudes from './components/Solicitudes'
import type { MiPerfil } from './data/social'
import { useConsulta } from './hooks/useConsulta'
import type { Persona } from './lib/relacion'
import { cargarSocial } from './servicio'

type Vista = 'siguiendo' | 'seguidores' | 'anadir'

/** Amigos (en Más): perfil social, a quién sigues, quién te sigue y añadir a alguien (ADR 040). Necesita cuenta. */
export default function AmigosTab({ onIrACuenta }: { onIrACuenta: () => void }) {
  const cuenta = useCuenta()
  if (cuenta.fase === 'cargando') return <div className="px-page pt-5"><LoadingState /></div>
  if (cuenta.fase === 'sin-sesion') {
    return (
      <div className="space-y-section px-page pt-5">
        <PageHeader title="Amigos" />
        <EmptyState icon="users" title="Entra con tu cuenta" action={<Button variant="secondary" onClick={onIrACuenta}>Ir a Cuenta</Button>}>
          Para seguir a otras personas y que te sigan necesitas una cuenta. Tus registros siguen siendo solo tuyos: los demás solo verán lo que publiques.
        </EmptyState>
      </div>
    )
  }
  return <ConCuenta key={cuenta.email} />
}

function ConCuenta() {
  const [version, setVersion] = useState(0)
  const perfil = useConsulta(async () => (await cargarSocial()).miPerfil(), version)

  if (perfil.estado === 'error' && perfil.datos === undefined) {
    return (
      <div className="space-y-section px-page pt-5">
        <PageHeader title="Amigos" />
        <div className="space-y-3"><ErrorState>{perfil.error}</ErrorState><Button variant="secondary" size="sm" onClick={perfil.recargar}>Reintentar</Button></div>
      </div>
    )
  }
  if (perfil.datos === undefined) return <div className="px-page pt-5"><LoadingState /></div>
  if (perfil.datos === null) return <CrearPerfil onCreado={() => setVersion((v) => v + 1)} />
  return <Amigos perfil={perfil.datos} onPerfilCambiado={() => setVersion((v) => v + 1)} />
}

function Amigos({ perfil, onPerfilCambiado }: { perfil: MiPerfil; onPerfilCambiado: () => void }) {
  const [vista, setVista] = useState<Vista>('siguiendo')
  const [version, setVersion] = useState(0)
  // La hoja sigue montada al cerrarse (anima la salida); `n` la vuelve a montar limpia en cada apertura.
  const [persona, setPersona] = useState<{ persona: Persona; open: boolean; n: number } | null>(null)
  const [ajustes, setAjustes] = useState({ open: false, n: 0 })
  const { avisar, avisarError, toast } = useAviso()

  const cambio = () => {
    setVersion((v) => v + 1)
    onPerfilCambiado()
  }
  const abrir = (p: Persona) => setPersona((s) => ({ persona: p, open: true, n: (s?.n ?? 0) + 1 }))
  const cerrar = () => setPersona((s) => (s ? { ...s, open: false } : s))

  if (perfil.suspendido) {
    return (
      <div className="space-y-section px-page pt-5">
        <div>
          <PageHeader title="Amigos" />
          <p className="mt-1 break-words text-body-sm text-fg-muted">@{perfil.alias}</p>
        </div>
        <EmptyState icon="users" title="Perfil suspendido" action={<Button variant="secondary" onClick={() => setAjustes((a) => ({ open: true, n: a.n + 1 }))}>Tu perfil</Button>}>
          Tu perfil se ha suspendido por una denuncia. Mientras tanto no puedes seguir a nadie ni aparecer en las búsquedas.
        </EmptyState>
        {ajustes.n > 0 && <PerfilSheet key={`perfil-${ajustes.n}`} open={ajustes.open} perfil={perfil} onClose={() => setAjustes((a) => ({ ...a, open: false }))} onCambio={onPerfilCambiado} onBorrado={onPerfilCambiado} />}
      </div>
    )
  }

  const opciones: { valor: Vista; label: string }[] = [
    { valor: 'siguiendo', label: 'Siguiendo' },
    { valor: 'seguidores', label: 'Seguidores' },
    { valor: 'anadir', label: 'Añadir' },
  ]

  return (
    <div className="space-y-section px-page pt-5">
      <div>
        <PageHeader title="Amigos" action={<IconButton icon="settings" label="Tu perfil" variant="ghost" onClick={() => setAjustes((a) => ({ open: true, n: a.n + 1 }))} />} />
        {/* Fuera de `overline`, que pone en mayúscula la primera letra y cambiaría el alias. */}
        <p className="mt-1 break-words text-body-sm text-fg-muted">
          @{perfil.alias}{perfil.solicitudes > 0 && ` · ${formatInt(perfil.solicitudes)} ${perfil.solicitudes === 1 ? 'solicitud' : 'solicitudes'}`}
        </p>
      </div>

      <Solicitudes version={version} onAbrir={abrir} onCambio={cambio} onError={avisarError} />

      <ViewTabs opciones={opciones} valor={vista} onChange={setVista} label="Amigos">
        {vista === 'anadir'
          ? <Anadir codigo={perfil.codigo} onAbrir={abrir} onCambio={cambio} />
          : <ListaPersonas lista={vista} version={version} onAbrir={abrir} />}
      </ViewTabs>

      {persona && (
        <PersonaSheet key={`persona-${persona.n}`} open={persona.open} persona={persona.persona} onClose={cerrar}
          onCambio={(mensaje) => {
            cambio()
            if (mensaje) {
              cerrar()
              avisar({ mensaje })
            }
          }} />
      )}
      {ajustes.n > 0 && (
        <PerfilSheet key={`perfil-${ajustes.n}`} open={ajustes.open} perfil={perfil} onClose={() => setAjustes((a) => ({ ...a, open: false }))}
          onCambio={cambio}
          onBorrado={() => {
            setAjustes((a) => ({ ...a, open: false }))
            onPerfilCambiado()
          }} />
      )}
      {toast}
    </div>
  )
}
