import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Campo from '../../../shared/components/Campo'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import { Textarea } from '../../../shared/components/Input'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import type { GestionComunidad } from '../data/social'
import { cargarSocial } from '../servicio'
import NombrePersona from './NombrePersona'

type Accion = 'transferir' | 'nombrar' | 'revocar' | 'expulsar'
export default function GestionarComunidad({ id, gestion, onClose, onCambio }: { id: string; gestion: GestionComunidad; onClose: () => void; onCambio: () => void }) {
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
  return <Sheet open onClose={onClose} onBeforeClose={() => !ocupado} title="Gestionar comunidad"><div className="space-y-stack">
    {confirmacion ? <ConfirmacionDestructiva mensaje={confirmacion.accion === 'transferir' ? `@${confirmacion.alias} será el nuevo creador y controlará esta comunidad. Tú seguirás como miembro y perderás los permisos de creador.` : confirmacion.accion === 'expulsar' ? `@${confirmacion.alias} perderá el acceso a las publicaciones de esta comunidad. Podrá volver a unirse si no se bloquea su acceso.` : `Se ${confirmacion.accion === 'nombrar' ? 'conceden' : 'retiran'} permisos de moderación a @${confirmacion.alias}.`}
      confirmar={confirmacion.accion === 'transferir' ? 'Transferir comunidad' : confirmacion.accion === 'expulsar' ? 'Expulsar miembro' : 'Confirmar permisos'} ocupado={ocupado} onCancelar={() => setConfirmacion(null)} onConfirmar={() => void ejecutar(async () => { await (await cargarSocial()).gestionarComunidad(id, confirmacion.accion, confirmacion.alias) })} /> : <>
      {gestion.creador && <form className="space-y-stack" onSubmit={e => { e.preventDefault(); void ejecutar(async () => { const s=await cargarSocial(); await s.gestionarComunidad(id,'reglas',undefined,reglas); await s.gestionarComunidad(id,'bienvenida',undefined,bienvenida) }) }}>
        <Campo etiqueta="Reglas" ayuda="Se muestran fijadas dentro de la comunidad."><Textarea maxLength={1000} rows={4} value={reglas} onChange={e => setReglas(e.target.value)} /></Campo>
        <Campo etiqueta="Bienvenida"><Textarea maxLength={500} rows={3} value={bienvenida} onChange={e => setBienvenida(e.target.value)} /></Campo>
        <Button type="submit" variant="secondary" block disabled={ocupado}>Guardar reglas y bienvenida</Button>
      </form>}
      <p className="text-body-sm text-fg-muted">Los moderadores pueden retirar publicaciones y comentarios y expulsar miembros. El creador asigna permisos y puede transferir la comunidad.</p>
      <ul className="divide-y divide-line">{gestion.miembros.map(p => <li key={p.alias} className="space-y-1 py-2"><NombrePersona persona={p} /><p className="text-caption text-fg-muted">{p.creador ? 'Creador' : p.moderador ? 'Moderador' : 'Miembro'}</p>
        {!p.creador && !p.yo && <div className="flex flex-wrap gap-1">
          {gestion.creador && <><Button variant="subtle" size="sm" disabled={ocupado} onClick={() => setConfirmacion({ accion: p.moderador ? 'revocar' : 'nombrar', alias:p.alias })}>{p.moderador ? 'Retirar moderación' : 'Nombrar moderador'}</Button><Button variant="subtle" size="sm" disabled={ocupado} onClick={() => setConfirmacion({accion:'transferir',alias:p.alias})}>Transferir a @{p.alias}</Button></>}
          {(gestion.creador || !p.moderador) && <Button variant="destructive" size="sm" disabled={ocupado} onClick={() => setConfirmacion({accion:'expulsar',alias:p.alias})}>Expulsar</Button>}
        </div>}
      </li>)}</ul>
    </>}
    {error && <ErrorState>{error}</ErrorState>}
  </div></Sheet>
}
