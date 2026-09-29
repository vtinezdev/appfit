import { useRef, useState } from 'react'
import Icon from './Icon'

interface Props {
  onGrabado: (audioBase64: string, mimeType: string) => void
  onError: (mensaje: string) => void
  disabled?: boolean
}

const MIME_CANDIDATES = ['audio/mp4', 'audio/aac', 'audio/webm', 'audio/ogg']

function elegirMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  for (const mime of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return ''
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export default function VoiceRecorder({ onGrabado, onError, disabled }: Props) {
  const [grabando, setGrabando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  async function iniciar() {
    if (!navigator.mediaDevices?.getUserMedia) {
      onError('Este navegador no soporta grabación de audio. Usa el dictado del teclado.')
      return
    }
    const mime = elegirMime()
    if (mime === null) {
      onError('MediaRecorder no disponible. Usa el dictado del teclado.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        setProcesando(true)
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mime || 'audio/webm' })
          const base64 = await blobToBase64(blob)
          onGrabado(base64, recorder.mimeType || mime || 'audio/webm')
        } catch {
          onError('No se ha podido procesar el audio grabado.')
        } finally {
          setProcesando(false)
          streamRef.current?.getTracks().forEach((t) => t.stop())
          streamRef.current = null
        }
      }
      recorder.start()
      recorderRef.current = recorder
      setGrabando(true)
    } catch {
      onError('No se ha podido acceder al micrófono. Revisa los permisos.')
    }
  }

  function detener() {
    recorderRef.current?.stop()
    setGrabando(false)
  }

  return (
    <button
      type="button"
      disabled={disabled || procesando}
      onClick={grabando ? detener : iniciar}
      // Grabar no es un error: en reposo es una acción secundaria y grabando pasa al acento (con icono de parar), sin rojo.
      className={`flex h-touch w-touch shrink-0 items-center justify-center rounded-pill transition-[background-color,transform] duration-short enabled:active:scale-95 disabled:opacity-50 ${
        grabando ? 'bg-accent text-accent-on' : 'bg-surface-muted text-fg'
      }`}
      aria-pressed={grabando}
      aria-label={grabando ? 'Detener grabación' : 'Grabar audio'}
      title={grabando ? 'Detener grabación' : 'Grabar audio'}
    >
      <Icon name={procesando ? 'loader' : grabando ? 'stop' : 'mic'} size={22} />
    </button>
  )
}
