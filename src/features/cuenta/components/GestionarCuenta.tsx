import { useState, type FormEvent } from 'react'
import Button from '../../../shared/components/Button'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import Disclosure from '../../../shared/components/Disclosure'
import { Input } from '../../../shared/components/Input'
import { ErrorState } from '../../../shared/components/StateMessage'
import { validarContrasena } from '../lib/cifrado'
import { copiaNube } from '../servicio'

type Accion = 'contrasena' | 'clave' | 'cerrar' | 'borrar'

/**
 * Cambiar la contraseña, nueva clave de recuperación, cerrar sesión y borrar la cuenta. Sin copia en este móvil
 * (`conCopia` falso) solo quedan cerrar sesión y borrar la cuenta.
 */
export default function GestionarCuenta({ conCopia, onMensaje }: { conCopia: boolean; onMensaje: (mensaje: string) => void }) {
  const [accion, setAccion] = useState<Accion | null>(null)
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [clave, setClave] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function abrir(siguiente: Accion | null) {
    setAccion(siguiente)
    setActual('')
    setNueva('')
    setRepetida('')
    setClave(null)
    setError(null)
  }

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

  const cambiarContrasena = (e: FormEvent) => {
    e.preventDefault()
    const invalida = validarContrasena(nueva, repetida)
    if (invalida) return setError(invalida)
    void ejecutar(async () => {
      await copiaNube.cambiarContrasena(actual, nueva)
      abrir(null)
      onMensaje('Contraseña cambiada. Úsala al entrar en otro móvil.')
    })
  }

  const nuevaClave = (e: FormEvent) => {
    e.preventDefault()
    void ejecutar(async () => {
      setClave(await copiaNube.nuevaClaveRecuperacion(actual))
      setActual('')
    })
  }

  const campo = (etiqueta: string, valor: string, cambiar: (v: string) => void, autoComplete: string) => (
    <label className="block space-y-1">
      <span className="block text-body-sm font-medium text-fg">{etiqueta}</span>
      <Input type="password" autoComplete={autoComplete} value={valor} onChange={(e) => cambiar(e.target.value)} />
    </label>
  )

  return (
    <Disclosure title="Gestionar la cuenta">
      <div className="space-y-4">
        {accion === 'contrasena' ? (
          <form className="space-y-3" onSubmit={cambiarContrasena} noValidate aria-label="Cambiar la contraseña">
            {campo('Contraseña actual', actual, setActual, 'current-password')}
            {campo('Contraseña nueva', nueva, setNueva, 'new-password')}
            {campo('Repite la nueva', repetida, setRepetida, 'new-password')}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" disabled={ocupado} onClick={() => abrir(null)}>Cancelar</Button>
              <Button type="submit" variant="primary" className="flex-1" loading={ocupado}>Cambiar</Button>
            </div>
          </form>
        ) : accion === 'clave' ? (
          clave ? (
            <div className="space-y-3">
              <p className="text-body-sm text-fg-muted">Esta es tu clave nueva; la anterior ya no sirve. Guárdala: no se volverá a mostrar.</p>
              <p className="break-all rounded-md bg-surface-muted p-card text-center font-numeric text-title tabular">{clave}</p>
              <Button variant="primary" block onClick={() => abrir(null)}>Ya la he guardado</Button>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={nuevaClave} noValidate aria-label="Nueva clave de recuperación">
              <p className="text-body-sm text-fg-muted">Si has perdido la clave de recuperación, crea otra. La anterior dejará de servir.</p>
              {campo('Contraseña', actual, setActual, 'current-password')}
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" disabled={ocupado} onClick={() => abrir(null)}>Cancelar</Button>
                <Button type="submit" variant="primary" className="flex-1" loading={ocupado}>Crear clave</Button>
              </div>
            </form>
          )
        ) : accion === 'cerrar' && !conCopia ? (
          <div className="space-y-2" role="group" aria-label="Cerrar sesión">
            <p className="text-body-sm text-fg-muted">Tus registros siguen en este móvil.</p>
            <Button variant="secondary" block loading={ocupado} onClick={() => void ejecutar(async () => { await copiaNube.cerrarSesion(false); onMensaje('Has cerrado la sesión. Tus registros siguen en este móvil.') })}>
              Cerrar sesión
            </Button>
            <Button variant="ghost" block disabled={ocupado} onClick={() => abrir(null)}>Cancelar</Button>
          </div>
        ) : accion === 'cerrar' ? (
          <div className="space-y-2" role="group" aria-label="Cerrar sesión">
            <p className="text-body-sm text-fg-muted">La copia de la nube se queda. Los cambios que hagas a partir de ahora no se guardarán en ella hasta que vuelvas a entrar.</p>
            <Button variant="secondary" block loading={ocupado} onClick={() => void ejecutar(async () => { await copiaNube.cerrarSesion(false); onMensaje('Has cerrado la sesión. Tus registros siguen en este móvil.') })}>
              Cerrar sesión y conservar los datos aquí
            </Button>
            <Button variant="danger" block disabled={ocupado} onClick={() => void ejecutar(async () => { await copiaNube.cerrarSesion(true); onMensaje('Has cerrado la sesión y se han borrado los datos de este móvil.') })}>
              Cerrar sesión y borrar los datos de este móvil
            </Button>
            <Button variant="ghost" block disabled={ocupado} onClick={() => abrir(null)}>Cancelar</Button>
          </div>
        ) : accion === 'borrar' ? (
          <ConfirmacionDestructiva
            mensaje="Se borran tu cuenta y, si la tiene, su copia de la nube. Tus registros siguen en este móvil. No se puede deshacer."
            confirmar="Sí, borrar la cuenta"
            ocupado={ocupado}
            onCancelar={() => abrir(null)}
            onConfirmar={() => void ejecutar(async () => { await copiaNube.borrarCuenta(); onMensaje('Cuenta borrada. Tus registros siguen en este móvil.') })}
          />
        ) : (
          <div className="flex flex-col items-start gap-1">
            <p className="text-caption text-fg-muted">Si pasas 12 meses sin abrir la app con la cuenta, la cuenta y lo que guarda se borran solos. Tus registros siguen en el móvil.</p>
            {conCopia && (
              <>
                <Button variant="ghost" size="sm" onClick={() => abrir('contrasena')}>Cambiar la contraseña</Button>
                <Button variant="ghost" size="sm" onClick={() => abrir('clave')}>Nueva clave de recuperación</Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => abrir('cerrar')}>Cerrar sesión</Button>
            <Button variant="destructive" size="sm" onClick={() => abrir('borrar')}>Borrar la cuenta</Button>
          </div>
        )}
        {error && <ErrorState>{error}</ErrorState>}
      </div>
    </Disclosure>
  )
}
