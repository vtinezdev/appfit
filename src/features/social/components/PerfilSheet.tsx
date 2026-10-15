import { useState, type FormEvent } from 'react'
import Button from '../../../shared/components/Button'
import Campo from '../../../shared/components/Campo'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import Disclosure from '../../../shared/components/Disclosure'
import { Input } from '../../../shared/components/Input'
import ListGroup from '../../../shared/components/ListGroup'
import Sheet from '../../../shared/components/Sheet'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import type { MiPerfil } from '../data/social'
import { useConsulta } from '../hooks/useConsulta'
import { limpiarNombre, NOMBRE_MAX, normalizarAlias, validarAlias, validarNombre } from '../lib/alias'
import { cargarSocial } from '../servicio'
import NombrePersona from './NombrePersona'

interface Props {
  open: boolean
  perfil: MiPerfil
  onClose: () => void
  /** Algo cambió (alias, código, bloqueos): se vuelve a leer. */
  onCambio: () => void
  /** El perfil ya no existe. */
  onBorrado: () => void
}

/** «Tu perfil»: alias y nombre, código de invitación nuevo, personas bloqueadas y borrar el perfil. */
export default function PerfilSheet({ open, perfil, onClose, onCambio, onBorrado }: Props) {
  const [alias, setAlias] = useState(perfil.alias)
  const [nombre, setNombre] = useState(perfil.nombre ?? '')
  const [borrar, setBorrar] = useState(false)
  const [version, setVersion] = useState(0)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bloqueados = useConsulta(async () => (await cargarSocial()).personas('bloqueados'), version)

  async function ejecutar(fn: () => Promise<string | void>) {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    setMensaje(null)
    try {
      const hecho = await fn()
      if (hecho) setMensaje(hecho)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido completar. Inténtalo de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  const guardar = (e: FormEvent) => {
    e.preventDefault()
    const invalido = validarAlias(alias) ?? validarNombre(nombre)
    if (invalido) {
      setError(invalido)
      return
    }
    void ejecutar(async () => {
      await (await cargarSocial()).editarPerfil(normalizarAlias(alias), limpiarNombre(nombre))
      onCambio()
      return 'Perfil guardado.'
    })
  }

  const nuevoCodigo = () => ejecutar(async () => {
    await (await cargarSocial()).nuevoCodigo()
    onCambio()
    return 'Código nuevo listo. El anterior ya no sirve.'
  })

  const desbloquear = (aliasBloqueado: string) => ejecutar(async () => {
    await (await cargarSocial()).desbloquear(aliasBloqueado)
    setVersion((v) => v + 1)
    return `Has desbloqueado a @${aliasBloqueado}.`
  })

  const borrarPerfil = () => ejecutar(async () => {
    await (await cargarSocial()).borrarPerfil()
    onBorrado()
  })

  const lista = bloqueados.datos ?? []

  return (
    <Sheet open={open} onClose={onClose} title="Tu perfil">
      <div className="space-y-section">
        <form className="space-y-stack" onSubmit={guardar} noValidate aria-label="Alias y nombre">
          <Campo etiqueta="Alias" ayuda="Si lo cambias, el anterior queda libre para otra persona.">
            <Input autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={21} value={alias} onChange={(e) => setAlias(e.target.value)} />
          </Campo>
          <Campo etiqueta="Nombre (opcional)">
            <Input autoComplete="nickname" maxLength={NOMBRE_MAX + 10} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Campo>
          <Button type="submit" variant="secondary" block disabled={ocupado}>Guardar</Button>
        </form>

        <div className="space-y-2">
          <p className="text-body-sm font-medium text-fg">Código de invitación</p>
          <p className="text-body-sm text-fg-muted">Tu código es <span className="font-semibold tabular text-fg">{perfil.codigo}</span>. Si lo has compartido con quien no querías, crea otro: el anterior dejará de servir.</p>
          <Button variant="ghost" size="sm" disabled={ocupado} onClick={() => void nuevoCodigo()}>Crear código nuevo</Button>
        </div>

        <Disclosure title="Personas bloqueadas">
          {bloqueados.estado === 'cargando' && !bloqueados.datos ? <LoadingState />
            : bloqueados.estado === 'error' ? <ErrorState>{bloqueados.error}</ErrorState>
              : lista.length === 0 ? <EmptyState>No has bloqueado a nadie.</EmptyState>
                : (
                  <ListGroup variante="plana" aria-label="Personas bloqueadas">
                    {lista.map((p) => (
                      <li key={p.alias} className="flex items-center justify-between gap-3 py-2">
                        <NombrePersona persona={p} />
                        <Button variant="subtle" size="sm" disabled={ocupado} onClick={() => void desbloquear(p.alias)}>Desbloquear</Button>
                      </li>
                    ))}
                  </ListGroup>
                )}
        </Disclosure>

        {borrar ? (
          <ConfirmacionDestructiva
            mensaje="Se borran tu perfil, a quién sigues y quién te sigue. Tu cuenta, tu copia y tus registros se quedan. No se puede deshacer."
            confirmar="Sí, borrar el perfil"
            ocupado={ocupado}
            onCancelar={() => setBorrar(false)}
            onConfirmar={() => void borrarPerfil()}
          />
        ) : (
          <Button variant="destructive" size="sm" disabled={ocupado} onClick={() => { setError(null); setMensaje(null); setBorrar(true) }}>Borrar el perfil</Button>
        )}

        {error && <ErrorState>{error}</ErrorState>}
        {mensaje && <p role="status" className="text-body-sm text-accent-strong">{mensaje}</p>}
      </div>
    </Sheet>
  )
}
