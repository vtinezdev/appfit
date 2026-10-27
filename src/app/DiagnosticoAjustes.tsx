import { useState } from 'react'
import Button from '../shared/components/Button'
import Card from '../shared/components/Card'
import Disclosure from '../shared/components/Disclosure'
import Icon from '../shared/components/Icon'
import { Textarea } from '../shared/components/Input'
import ListGroup from '../shared/components/ListGroup'
import { ErrorState } from '../shared/components/StateMessage'
import { crearDiagnostico, ultimoErrorDiagnostico } from '../shared/lib/diagnostico'

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
  const texto = crearDiagnostico(datos, pasos)
  async function copiar() {
    setError(''); setMensaje('')
    try { await navigator.clipboard.writeText(texto); setMensaje('Informe copiado. Pégalo en el mensaje o correo en el que cuentes el problema.') }
    catch { setError('No se ha podido copiar automáticamente. Selecciona el texto del diagnóstico y cópialo con el menú de tu dispositivo.') }
  }
  // Punto 32: qué hace, en una tarjeta, y los tres pasos numerados; el informe técnico, recogido hasta que se quiera ver.
  const paso = (n: number, titulo: string) => <h3 className="flex items-center gap-3 text-body font-semibold text-fg">
    <span aria-hidden className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-surface-muted text-caption font-semibold">{n}</span>{titulo}
  </h3>
  return <div className="space-y-section">
    <Card tone="muted" className="flex items-start gap-3">
      <Icon name="info" size={20} className="mt-0.5 shrink-0 text-fg-muted" />
      <p className="min-w-0 text-body-sm text-fg">Prepara un informe con lo que te ha pasado y unos datos técnicos (versión, navegador, pantalla y último error) para que lo envíes tú. No se envía nada solo.</p>
    </Card>
    <section className="space-y-2">
      {paso(1, 'Cuenta qué ha pasado')}
      <Textarea aria-label="Qué ha pasado" rows={5} maxLength={4000} value={pasos} onChange={e => { setPasos(e.target.value); setMensaje('') }} placeholder="Qué estabas haciendo, qué esperabas y qué ocurrió" />
      <p className="text-caption text-fg-muted">Evita escribir datos personales.</p>
    </section>
    <section className="space-y-2">
      {paso(2, 'Revisa el informe')}
      <ListGroup aria-label="Informe" pie="No incluye tus registros, tu cuenta, mensajes ni ubicación.">
        <li><Disclosure title="Ver el informe completo">
          <div className="space-y-3">
            <Textarea aria-label="Diagnóstico para revisar y copiar" readOnly rows={12} value={texto} onFocus={e => e.currentTarget.select()} />
            <Button variant="secondary" size="sm" onClick={() => { setDatos(entorno()); setMensaje(''); setError('') }}>Actualizar datos técnicos</Button>
          </div>
        </Disclosure></li>
      </ListGroup>
    </section>
    <section className="space-y-2">
      {paso(3, 'Cópialo y envíalo')}
      <Button block onClick={() => { void copiar() }}>Copiar informe</Button>
      {mensaje && <p role="status" className="text-body-sm text-fg-muted">{mensaje}</p>}
      {error && <ErrorState>{error}</ErrorState>}
    </section>
  </div>
}
