import { useState } from 'react'
import Button from '../shared/components/Button'
import { Textarea } from '../shared/components/Input'
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
    try { await navigator.clipboard.writeText(texto); setMensaje('Diagnóstico copiado. Puedes pegarlo donde comuniques el problema.') }
    catch { setError('No se ha podido copiar automáticamente. Selecciona el texto del diagnóstico y cópialo con el menú de tu dispositivo.') }
  }
  return <div className="space-y-stack">
    <p className="text-body-sm text-fg-muted">Describe qué estabas haciendo, qué esperabas y qué ocurrió. Revisa el informe antes de copiarlo. No se envía automáticamente.</p>
    <label className="block space-y-1"><span className="text-label text-fg-muted">Pasos para reproducir el problema</span>
      <Textarea aria-label="Pasos para reproducir el problema" rows={5} maxLength={4000} value={pasos} onChange={e => { setPasos(e.target.value); setMensaje('') }} placeholder="1. Abrí… 2. Pulsé… Esperaba… Ocurrió…" />
    </label>
    <p className="text-caption text-fg-muted">El diagnóstico técnico no incluye tus registros, cuenta, mensajes de error ni ubicación. Evita escribir datos personales en los pasos.</p>
    <Button variant="secondary" onClick={() => { setDatos(entorno()); setMensaje(''); setError('') }}>Actualizar datos del diagnóstico</Button>
    <label className="block space-y-1"><span className="text-label text-fg-muted">Diagnóstico para revisar y copiar</span>
      <Textarea aria-label="Diagnóstico para revisar y copiar" readOnly rows={12} value={texto} onFocus={e => e.currentTarget.select()} />
    </label>
    <Button block onClick={() => { void copiar() }}>Copiar diagnóstico</Button>
    {mensaje && <p role="status" className="text-body-sm text-fg-muted">{mensaje}</p>}
    {error && <ErrorState>{error}</ErrorState>}
  </div>
}
