import { useState } from 'react'
import Button from '../shared/components/Button'
import Card from '../shared/components/Card'
import Disclosure from '../shared/components/Disclosure'
import Icon from '../shared/components/Icon'
import { Textarea } from '../shared/components/Input'
import ListGroup from '../shared/components/ListGroup'
import { ErrorState } from '../shared/components/StateMessage'
import { crearDiagnostico, ultimoErrorDiagnostico } from '../shared/lib/diagnostico'
import { enviarAlCreador, envioDisponible } from '../features/cuenta/mensajes'

function entorno() {
  return {
    version: __APP_VERSION__.id, compilacion: __APP_VERSION__.fecha,
    navegador: navigator.userAgent, idioma: navigator.language,
    ancho: window.innerWidth, alto: window.innerHeight, enLinea: navigator.onLine,
    instalada: window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    error: ultimoErrorDiagnostico(),
  }
}

export default function DiagnosticoAjustes() {
  const [pasos, setPasos] = useState('')
  const [datos, setDatos] = useState(entorno)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const texto = crearDiagnostico(datos, pasos)
  async function enviar() {
    setError(''); setMensaje('')
    if (!pasos.trim()) { setError('Cuenta primero qué ha pasado.'); return }
    setEnviando(true)
    try { await enviarAlCreador({ tipo: 'problema', texto, version: __APP_VERSION__.id }); setEnviado(true); setPasos('') }
    catch (e) { setError(e instanceof Error ? e.message : 'No se ha podido enviar. Inténtalo de nuevo más tarde.') }
    finally { setEnviando(false) }
  }
  async function copiar() {
    setError(''); setMensaje('')
    try { await navigator.clipboard.writeText(texto); setMensaje('Informe copiado. Pégalo en el mensaje o correo en el que cuentes el problema.') }
    catch { setError('No se ha podido copiar automáticamente. Selecciona el texto del diagnóstico y cópialo con el menú de tu dispositivo.') }
  }
  // Punto 32: qué hace, en una tarjeta, y los tres pasos numerados; el informe técnico, recogido hasta que se quiera ver.
  // Con Supabase configurado se envía al creador (ADR 061); sin él, se copia.
  const paso = (n: number, titulo: string) => <h3 className="flex items-center gap-3 text-body font-semibold text-fg">
    <span aria-hidden className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-surface-muted text-caption font-semibold">{n}</span>{titulo}
  </h3>
  return <div className="space-y-section">
    <Card tone="muted" className="flex items-start gap-3">
      <Icon name="info" size={20} className="mt-0.5 shrink-0 text-fg-muted" />
      <p className="min-w-0 text-body-sm text-fg">{envioDisponible
        ? 'Cuéntanos qué ha pasado y llegará al creador de AppFit con unos datos técnicos (versión, navegador, pantalla y último error). Solo se envía lo que ves en el informe, al pulsar Enviar.'
        : 'Prepara un informe con lo que te ha pasado y unos datos técnicos (versión, navegador, pantalla y último error) para que lo envíes tú. No se envía nada solo.'}</p>
    </Card>
    <section className="space-y-2">
      {paso(1, 'Cuenta qué ha pasado')}
      <Textarea aria-label="Qué ha pasado" rows={5} maxLength={4000} value={pasos} onChange={e => { setPasos(e.target.value); setMensaje(''); setEnviado(false) }} placeholder="Qué estabas haciendo, qué esperabas y qué ocurrió. Sin datos personales." />
    </section>
    <section className="space-y-2">
      {paso(2, 'Revisa el informe')}
      <ListGroup aria-label="Informe" pie={envioDisponible ? 'No incluye tus registros, mensajes ni ubicación. Si has entrado en tu cuenta, va asociado a ella para poder contestarte.' : 'No incluye tus registros, tu cuenta, mensajes ni ubicación.'}>
        <li><Disclosure title="Ver el informe completo">
          <div className="space-y-3">
            <Textarea aria-label="Diagnóstico para revisar y copiar" readOnly rows={12} value={texto} onFocus={e => e.currentTarget.select()} />
            <Button variant="secondary" size="sm" onClick={() => { setDatos(entorno()); setMensaje(''); setError('') }}>Actualizar datos técnicos</Button>
          </div>
        </Disclosure></li>
      </ListGroup>
    </section>
    <section className="space-y-2">
      {paso(3, envioDisponible ? 'Envíalo' : 'Cópialo y envíalo')}
      {enviado
        ? <Card tone="muted" className="flex items-start gap-3" role="status">
            <Icon name="check" size={20} className="mt-0.5 shrink-0 text-success" />
            <p className="min-w-0 text-body-sm text-fg">Enviado. Gracias: lo leerá el creador de AppFit.</p>
          </Card>
        : envioDisponible
          ? <>
              <Button block loading={enviando} disabled={enviando} onClick={() => { void enviar() }}><Icon name="enviar" size={18} />Enviar</Button>
              <Button block variant="ghost" onClick={() => { void copiar() }}>Copiar informe</Button>
            </>
          : <Button block onClick={() => { void copiar() }}>Copiar informe</Button>}
      {mensaje && <p role="status" className="text-body-sm text-fg-muted">{mensaje}</p>}
      {error && <ErrorState>{error}</ErrorState>}
    </section>
  </div>
}
