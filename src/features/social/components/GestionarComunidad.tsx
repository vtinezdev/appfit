import { useState, type FormEvent } from 'react'
import Button from '../../../shared/components/Button'
import Campo from '../../../shared/components/Campo'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import { Input, Textarea } from '../../../shared/components/Input'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import type { GestionComunidad } from '../data/social'
import { cargarSocial } from '../servicio'
import { useAdmin } from '../hooks/useAdmin'
import { normalizarAlias, validarAlias } from '../lib/alias'
import NombrePersona from './NombrePersona'

type Accion = 'transferir' | 'nombrar' | 'revocar' | 'expulsar'
interface Props {
  id: string
  gestion: GestionComunidad
  onClose: () => void
  onCambio: () => void
  /** Un administrador añadió a alguien: la hoja sigue abierta y la lista de miembros se vuelve a leer. */
  onAnadido?: () => void
}

export default function GestionarComunidad({ id, gestion, onClose, onCambio, onAnadido }: Props) {
  // El administrador (0017) añade a cualquiera y expulsa también a moderadores.
  const admin = useAdmin()
  const [alias, setAlias] = useState('')
  const [anadido, setAnadido] = useState<string | null>(null)
  const [reglas, setReglas] = useState(gestion.reglas)
  const [bienvenida, setBienvenida] = useState(gestion.bienvenida)
  const [confirmacion, setConfirmacion] = useState<{ accion: Accion; alias: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function ejecutar(fn: () => Promise<void>) {
    if(ocupado) return
    setOcupado(true); setError(null)
    try { await fn(); onCambio(); onClose() }
    catch(e) { setError(e instanceof Error ? e.message : 'No se ha podido guardar.') }
    finally { setOcupado(false) }
  }
  async function anadir(e: FormEvent) {
    e.preventDefault()
    if (ocupado) return
    const invalido = validarAlias(alias)
    if (invalido) { setError(invalido); return }
    const quien = normalizarAlias(alias)
    setOcupado(true); setError(null); setAnadido(null)
    try { await (await cargarSocial()).anadirAComunidad(id, quien); setAlias(''); setAnadido(`@${quien} ya es miembro. Le llegará un aviso.`); onAnadido?.() }
    catch(e) { setError(e instanceof Error ? e.message : 'No se ha podido añadir.') }
    finally { setOcupado(false) }
  }
  return <Sheet open onClose={onClose} onBeforeClose={() => !ocupado} title="Gestionar comunidad"><div className="space-y-stack">
    {confirmacion ? <ConfirmacionDestructiva mensaje={confirmacion.accion === 'transferir' ? `@${confirmacion.alias} será el nuevo creador y controlará esta comunidad. Tú seguirás como miembro y perderás los permisos de creador.` : confirmacion.accion === 'expulsar' ? `@${confirmacion.alias} perderá el acceso a las publicaciones de esta comunidad. Podrá volver a unirse si no se bloquea su acceso.` : `Se ${confirmacion.accion === 'nombrar' ? 'conceden' : 'retiran'} permisos de moderación a @${confirmacion.alias}.`}
      confirmar={confirmacion.accion === 'transferir' ? 'Transferir comunidad' : confirmacion.accion === 'expulsar' ? 'Expulsar miembro' : 'Confirmar permisos'} ocupado={ocupado} onCancelar={() => setConfirmacion(null)} onConfirmar={() => void ejecutar(async () => { await (await cargarSocial()).gestionarComunidad(id, confirmacion.accion, confirmacion.alias) })} /> : <>
      {gestion.creador && <form className="space-y-stack" onSubmit={e => { e.preventDefault(); void ejecutar(async () => { const s=await cargarSocial(); await s.gestionarComunidad(id,'reglas',undefined,reglas); await s.gestionarComunidad(id,'bienvenida',undefined,bienvenida) }) }}>
        <Campo etiqueta="Reglas" ayuda="Se muestran fijadas dentro de la comunidad."><Textarea maxLength={1000} rows={4} value={reglas} onChange={e => setReglas(e.target.value)} /></Campo>
        <Campo etiqueta="Bienvenida"><Textarea maxLength={500} rows={3} value={bienvenida} onChange={e => setBienvenida(e.target.value)} /></Campo>
        <Button type="submit" variant="secondary" block disabled={ocupado}>Guardar reglas y bienvenida</Button>
      </form>}
      {admin && <form className="space-y-2" onSubmit={anadir} noValidate>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1 basis-48"><Campo etiqueta="Añadir a alguien" ayuda="Escribe su alias. Entra directamente y le llega un aviso; puede salir cuando quiera."><Input autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={21} value={alias} onChange={e => setAlias(e.target.value)} /></Campo></div>
          <Button type="submit" variant="secondary" loading={ocupado}>Añadir</Button>
        </div>
        {anadido && <p role="status" className="text-body-sm text-fg">{anadido}</p>}
      </form>}
      <p className="text-body-sm text-fg-muted">Los moderadores pueden retirar publicaciones y comentarios y expulsar miembros. El creador asigna permisos y puede transferir la comunidad.</p>
      <ul className="divide-y divide-line">{gestion.miembros.map(p => <li key={p.alias} className="space-y-1 py-2"><NombrePersona persona={p} /><p className="text-caption text-fg-muted">{p.creador ? 'Creador' : p.moderador ? 'Moderador' : 'Miembro'}</p>
        {!p.creador && !p.yo && <div className="flex flex-wrap gap-1">
          {gestion.creador && <><Button variant="subtle" size="sm" disabled={ocupado} onClick={() => setConfirmacion({ accion: p.moderador ? 'revocar' : 'nombrar', alias:p.alias })}>{p.moderador ? 'Retirar moderación' : 'Nombrar moderador'}</Button><Button variant="subtle" size="sm" disabled={ocupado} onClick={() => setConfirmacion({accion:'transferir',alias:p.alias})}>Transferir a @{p.alias}</Button></>}
          {(gestion.creador || admin || !p.moderador) && <Button variant="destructive" size="sm" disabled={ocupado} onClick={() => setConfirmacion({accion:'expulsar',alias:p.alias})}>Expulsar</Button>}
        </div>}
      </li>)}</ul>
    </>}
    {error && <ErrorState>{error}</ErrorState>}
  </div></Sheet>
}
