import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Button from '../../../shared/components/Button'
import Campo from '../../../shared/components/Campo'
import Icon from '../../../shared/components/Icon'
import { Input } from '../../../shared/components/Input'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import type { Vinculo } from '../lib/decision'
import { validarContrasena } from '../lib/cifrado'
import { copiaNube } from '../servicio'
import ElegirCopia from './ElegirCopia'

type Paso =
  | { paso: 'email' }
  | { paso: 'codigo'; email: string }
  | { paso: 'ofrecer'; vinculo: Vinculo }
  | { paso: 'crear' }
  | { paso: 'contrasena'; vinculo: Vinculo }
  | { paso: 'recuperacion'; vinculo: Vinculo }
  | { paso: 'nueva-contrasena'; vinculo: Vinculo }
  | { paso: 'cero' }
  | { paso: 'elegir' }
  | { paso: 'clave'; codigo: string }

interface Props {
  open: boolean
  /** Con sesión y sin copia en este móvil: activa o abre la copia, sin pedir el código. */
  reanudar?: boolean
  onClose: () => void
  /** Al terminar, con el mensaje para Ajustes. */
  onTerminado: (mensaje: string) => void
}

const TITULOS: Record<Paso['paso'], string> = {
  email: 'Tu cuenta', codigo: 'Revisa tu correo', ofrecer: 'Has entrado', crear: 'Protege tu copia', contrasena: 'Abre tu copia', recuperacion: 'Clave de recuperación',
  'nueva-contrasena': 'Contraseña nueva', cero: 'Empezar de cero', elegir: '¿Qué datos se quedan?', clave: 'Tu clave de recuperación',
}

const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : 'No se ha podido completar. Inténtalo de nuevo.')

/**
 * Entrar o crear la cuenta: email → código → ofrecer la copia cifrada (opcional) → contraseña (o crearla) → elegir
 * copia si hace falta. Con `reanudar` empieza en la copia.
 */
export default function EntrarSheet({ open, reanudar = false, onClose, onTerminado }: Props) {
  const [estado, setEstado] = useState<Paso>({ paso: 'email' })
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [repetida, setRepetida] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reenviado, setReenviado] = useState(false)
  const [copiada, setCopiada] = useState(false)

  const ir = (siguiente: Paso) => {
    setError(null)
    setContrasena('')
    setRepetida('')
    setEstado(siguiente)
  }

  /** Tras el código: si la cuenta ya estaba en este móvil, se termina; si no, se ofrece la copia (es opcional). */
  const seguirTrasCodigo = useCallback((resultado: { vinculo: Vinculo } | null) => {
    if (!resultado) {
      onTerminado('Has vuelto a entrar. La copia sigue guardándose sola.')
      return
    }
    ir({ paso: 'ofrecer', vinculo: resultado.vinculo })
  }, [onTerminado])

  /** Activar la copia (cuenta sin copia) o abrirla con la contraseña (la cuenta ya tiene una). */
  const irACopia = useCallback((vinculo: Vinculo) => {
    ir(vinculo === 'crear' ? { paso: 'crear' } : { paso: 'contrasena', vinculo })
  }, [])

  useEffect(() => {
    if (!reanudar) return
    let vivo = true
    setOcupado(true)
    copiaNube.prepararVinculo()
      .then((r) => {
        if (!vivo) return
        if (r) irACopia(r.vinculo)
        else onTerminado('La copia sigue guardándose sola.')
      }, (e: unknown) => { if (vivo) setError(mensajeDe(e)) })
      .finally(() => { if (vivo) setOcupado(false) })
    return () => { vivo = false }
  }, [reanudar, irACopia, onTerminado])

  async function ejecutar(fn: () => Promise<void>) {
    if (ocupado) return
    setOcupado(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(mensajeDe(e))
    } finally {
      setOcupado(false)
    }
  }

  const enviarCodigo = (e?: FormEvent) => {
    e?.preventDefault()
    const limpio = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) {
      setError('Escribe un email válido.')
      return
    }
    void ejecutar(async () => {
      await copiaNube.enviarCodigo(limpio)
      setCodigo('')
      ir({ paso: 'codigo', email: limpio })
    })
  }

  const verificar = (e: FormEvent) => {
    e.preventDefault()
    if (estado.paso !== 'codigo') return
    if (!/^\d{6}$/.test(codigo.replace(/\s/g, ''))) {
      setError('El código tiene 6 cifras.')
      return
    }
    void ejecutar(async () => seguirTrasCodigo(await copiaNube.verificarCodigo(estado.email, codigo)))
  }

  /** Con la copia abierta (contraseña o clave): sin datos aquí se trae sola; con datos, se elige. */
  async function trasAbrir(vinculo: Vinculo) {
    if (vinculo === 'elegir') {
      ir({ paso: 'elegir' })
      return
    }
    await copiaNube.traerCopia()
    onTerminado('Listo: ya tienes aquí tus registros y la copia se guardará sola.')
  }

  const conContrasenaNueva = (fn: () => Promise<void>) => (e: FormEvent) => {
    e.preventDefault()
    const invalida = validarContrasena(contrasena, repetida)
    if (invalida) {
      setError(invalida)
      return
    }
    void ejecutar(fn)
  }

  const cargarResumenes = useCallback(() => copiaNube.resumenes(), [])
  const elegir = useCallback(async (eleccion: 'traer' | 'subir') => {
    if (eleccion === 'traer') await copiaNube.traerCopia()
    else await copiaNube.subirEstaCopia()
    onTerminado(eleccion === 'traer' ? 'Listo: este móvil tiene ahora la copia de la nube.' : 'Listo: la nube tiene ahora los datos de este móvil.')
  }, [onTerminado])

  const camposNuevos = (
    <>
      <Campo etiqueta="Contraseña" ayuda="Al menos 8 caracteres.">
        <Input type="password" autoComplete="new-password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
      </Campo>
      <Campo etiqueta="Repite la contraseña">
        <Input type="password" autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} />
      </Campo>
    </>
  )

  function contenido() {
    if (reanudar && estado.paso === 'email' && ocupado) return <LoadingState>Mirando tu copia…</LoadingState>
    switch (estado.paso) {
      case 'email':
        return (
          <form className="space-y-stack" onSubmit={enviarCodigo} noValidate>
            <p className="text-body-sm text-fg-muted">Con una cuenta puedes guardar tus registros en la nube, cifrados, y recuperarlos en otro móvil. Te enviaremos un código de 6 cifras; si aún no tienes cuenta, se crea.</p>
            <Campo etiqueta="Email">
              <Input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} enterKeyHint="send" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Campo>
            <Button type="submit" variant="primary" block loading={ocupado}>Enviarme un código</Button>
          </form>
        )
      case 'codigo':
        return (
          <form className="space-y-stack" onSubmit={verificar} noValidate>
            <p className="text-body-sm text-fg-muted">Hemos enviado un código a <span className="font-semibold text-fg">{estado.email}</span>. Si no llega, mira en correo no deseado.</p>
            <Campo etiqueta="Código">
              <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} enterKeyHint="go" className="tabular tracking-widest" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} />
            </Campo>
            <Button type="submit" variant="primary" block loading={ocupado}>Entrar</Button>
            {reenviado && <p role="status" className="text-body-sm text-fg-muted">Te hemos enviado otro código.</p>}
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" disabled={ocupado} onClick={() => { setReenviado(false); void ejecutar(async () => { await copiaNube.enviarCodigo(estado.email); setReenviado(true) }) }}>Enviar otro código</Button>
              <Button variant="ghost" size="sm" disabled={ocupado} onClick={() => ir({ paso: 'email' })}>Cambiar el email</Button>
            </div>
          </form>
        )
      case 'ofrecer':
        return (
          <div className="space-y-stack">
            <p className="text-body-sm text-fg-muted">
              {estado.vinculo === 'crear'
                ? 'Puedes guardar tus registros solos en la nube, cifrados con una contraseña que solo conoces tú, para recuperarlos en otro móvil.'
                : 'Tu cuenta tiene una copia cifrada de tus registros. Ábrela con tu contraseña para traerla a este móvil y que se siga guardando.'}
            </p>
            <Button variant="primary" block onClick={() => irACopia(estado.vinculo)}>{estado.vinculo === 'crear' ? 'Activar la copia' : 'Abrir la copia'}</Button>
            <Button variant="secondary" block onClick={() => onTerminado('Has entrado. La copia en la nube está desactivada en este móvil: puedes activarla cuando quieras.')}>Ahora no</Button>
          </div>
        )
      case 'crear':
        return (
          <form className="space-y-stack" onSubmit={conContrasenaNueva(async () => ir({ paso: 'clave', codigo: await copiaNube.crearCopia(contrasena) }))} noValidate>
            <p className="text-body-sm text-fg-muted">Esta contraseña cifra tus datos en el móvil antes de subirlos: nadie más puede leerlos, tampoco quien gestiona la app. Te la pediremos al entrar en otro móvil.</p>
            {camposNuevos}
            <p className="text-body-sm text-fg-muted">No se puede recuperar. Si la olvidas, solo te servirá la clave de recuperación que verás después.</p>
            <Button type="submit" variant="primary" block loading={ocupado}>Crear la copia</Button>
          </form>
        )
      case 'contrasena':
        return (
          <form className="space-y-stack" onSubmit={(e) => { e.preventDefault(); void ejecutar(async () => { await copiaNube.abrir(contrasena, 'contrasena'); await trasAbrir(estado.vinculo) }) }} noValidate>
            <p className="text-body-sm text-fg-muted">Tu cuenta ya tiene una copia. Escribe la contraseña con la que la protegiste.</p>
            <Campo etiqueta="Contraseña">
              <Input type="password" autoComplete="current-password" enterKeyHint="go" value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
            </Campo>
            <Button type="submit" variant="primary" block loading={ocupado}>Abrir la copia</Button>
            <Button variant="ghost" size="sm" disabled={ocupado} onClick={() => ir({ paso: 'recuperacion', vinculo: estado.vinculo })}>He olvidado la contraseña</Button>
          </form>
        )
      case 'recuperacion':
        return (
          <form className="space-y-stack" onSubmit={(e) => { e.preventDefault(); void ejecutar(async () => { await copiaNube.abrir(codigo, 'recuperacion'); ir({ paso: 'nueva-contrasena', vinculo: estado.vinculo }) }) }} noValidate>
            <p className="text-body-sm text-fg-muted">Escribe la clave de recuperación que guardaste al crear la cuenta. Después elegirás una contraseña nueva.</p>
            <Campo etiqueta="Clave de recuperación">
              <Input autoComplete="off" autoCapitalize="characters" spellCheck={false} className="tabular" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            </Campo>
            <Button type="submit" variant="primary" block loading={ocupado}>Abrir con la clave</Button>
            <Button variant="ghost" size="sm" disabled={ocupado} onClick={() => ir({ paso: 'cero' })}>Tampoco tengo la clave</Button>
          </form>
        )
      case 'nueva-contrasena':
        return (
          <form className="space-y-stack" onSubmit={conContrasenaNueva(async () => { await copiaNube.nuevaContrasena(contrasena); await trasAbrir(estado.vinculo) })} noValidate>
            <p className="text-body-sm text-fg-muted">La clave de recuperación sigue sirviendo: guárdala donde estaba.</p>
            {camposNuevos}
            <Button type="submit" variant="primary" block loading={ocupado}>Guardar y seguir</Button>
          </form>
        )
      case 'cero':
        return (
          <form className="space-y-stack" onSubmit={conContrasenaNueva(async () => ir({ paso: 'clave', codigo: await copiaNube.empezarDeCero(contrasena) }))} noValidate>
            <p className="text-body-sm text-destructive">Sin la contraseña ni la clave, nadie puede abrir la copia de la nube. Puedes sustituirla por los datos de este móvil con una contraseña nueva: lo que solo estuviera en la nube se perderá.</p>
            {camposNuevos}
            <Button type="submit" variant="danger" block loading={ocupado}>Sustituir la copia de la nube</Button>
          </form>
        )
      case 'elegir':
        return <ElegirCopia cargar={cargarResumenes} onElegir={elegir} />
      case 'clave':
        return (
          <div className="space-y-stack">
            <p className="text-body-sm text-fg-muted">Guárdala en tu gestor de contraseñas o apúntala. Es la única forma de abrir tu copia si olvidas la contraseña, y no se volverá a mostrar.</p>
            <p className="break-all rounded-md bg-surface-muted p-card text-center font-numeric text-title tabular" aria-label={`Clave de recuperación: ${estado.codigo.split('').join(' ')}`}>{estado.codigo}</p>
            <Button variant="secondary" block onClick={() => {
              navigator.clipboard?.writeText(estado.codigo).then(() => setCopiada(true), () => setError('No se ha podido copiar. Apúntala a mano.'))
            }}><Icon name={copiada ? 'check' : 'copy'} size={18} />{copiada ? 'Copiada' : 'Copiar la clave'}</Button>
            {copiada && <p role="status" className="sr-only">Clave copiada.</p>}
            <Button variant="primary" block onClick={() => onTerminado('Cuenta lista: tus registros se guardarán solos en la nube.')}>Ya la he guardado</Button>
          </div>
        )
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={TITULOS[estado.paso]}>
      <div className="space-y-stack">
        {contenido()}
        {error && <ErrorState>{error}</ErrorState>}
      </div>
    </Sheet>
  )
}
