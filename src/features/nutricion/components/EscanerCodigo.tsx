import { useEffect, useRef, useState, type FormEvent } from 'react'
import Button from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import Sheet from '../../../shared/components/Sheet'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import type { CatalogFood } from '../../../shared/db/types'
import type { Por100 } from '../lib/alimentos'
import { crearDetector, primerCodigoValido, type Detector } from '../lib/escaner/detector'
import { buscarProducto, type ResultadoProducto } from '../lib/off/buscarProducto'

interface Props {
  open: boolean
  onClose: () => void
  /** Producto con todos sus valores (del dispositivo o recién descargado): se añade como cualquier alimento. */
  onEncontrado: (food: CatalogFood) => void
  /** Producto al que le faltan datos: se revisa a mano y acaba como alimento propio. */
  onIncompleto: (producto: { nombre: string; valores: Partial<Por100> }) => void
  onKcalRapidas?: () => void
  /** Crear el alimento a mano (revisión vacía). */
  onManual: () => void
}

/** Cada cuánto se analiza un fotograma: de sobra para leer un código y sin gastar batería. */
const INTERVALO_MS = 200

/** Por qué no hay cámara, en un texto que dice qué hacer. */
function mensajeCamara(e: unknown): string {
  const nombre = e instanceof DOMException ? e.name : ''
  if (nombre === 'NotAllowedError' || nombre === 'SecurityError') return 'Sin permiso para usar la cámara. Puedes escribir el código a mano o darle permiso en los ajustes del navegador.'
  if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError') return 'No se encuentra ninguna cámara. Escribe el código a mano.'
  if (nombre === 'NotReadableError') return 'La cámara está ocupada por otra app. Ciérrala o escribe el código a mano.'
  return 'No se pudo abrir la cámara. Escribe el código a mano.'
}

/**
 * Vista de la cámara que busca un código de barras. Al desmontarse (o al detectar uno) apaga la cámara:
 * se detienen todos los tracks.
 */
function VisorCamara({ onCodigo }: { onCodigo: (gtin: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onCodigoRef = useRef(onCodigo)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    onCodigoRef.current = onCodigo
  })

  useEffect(() => {
    let activo = true
    let stream: MediaStream | null = null
    let temporizador: ReturnType<typeof setTimeout> | undefined

    function apagar() {
      activo = false
      clearTimeout(temporizador)
      stream?.getTracks().forEach((t) => t.stop())
      stream = null
    }

    async function arrancar() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Este navegador no da acceso a la cámara (hace falta HTTPS). Escribe el código a mano.')
        return
      }
      const detectorPromesa = crearDetector()
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      } catch (e) {
        if (activo) setError(mensajeCamara(e))
        return
      }
      const video = videoRef.current
      if (!activo || !video) return apagar()
      video.srcObject = stream
      await video.play().catch(() => undefined)

      let detector: Detector
      try {
        detector = await detectorPromesa
      } catch {
        if (activo) setError('No se pudo cargar el lector de códigos (la primera vez necesita conexión). Escribe el código a mano.')
        return apagar()
      }
      if (!activo) return
      setListo(true)

      const analizar = async () => {
        if (!activo) return
        try {
          if (video.readyState >= 2) {
            const gtin = primerCodigoValido(await detector.detect(video))
            if (gtin && activo) {
              apagar()
              onCodigoRef.current(gtin)
              return
            }
          }
        } catch {
          // Un fotograma que no se puede analizar no es un error: se prueba con el siguiente.
        }
        if (activo) temporizador = setTimeout(analizar, INTERVALO_MS)
      }
      void analizar()
    }

    void arrancar()
    return apagar
  }, [])

  if (error) return <ErrorState>{error}</ErrorState>
  return (
    <div className="space-y-2">
      <video ref={videoRef} muted playsInline aria-label="Cámara: apunta al código de barras" className="aspect-video w-full rounded-md bg-surface-muted object-cover" />
      <p className="text-caption text-fg-subtle">{listo ? 'Apunta al código de barras del envase.' : 'Abriendo la cámara…'}</p>
    </div>
  )
}

type Estado = { tipo: 'camara' } | { tipo: 'buscando' } | Exclude<ResultadoProducto, { tipo: 'encontrado' } | { tipo: 'incompleto' }>

/**
 * Escanear un producto de marca: cámara (o código escrito a mano) → producto guardado en el dispositivo u
 * Open Food Facts. A Open Food Facts solo se le envía el código de barras.
 */
export default function EscanerCodigo({ open, onClose, onEncontrado, onIncompleto, onKcalRapidas, onManual }: Props) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'camara' })
  const [codigo, setCodigo] = useState('')

  function cerrar() {
    setEstado({ tipo: 'camara' })
    setCodigo('')
    onClose()
  }

  async function buscar(gtin: string) {
    setEstado({ tipo: 'buscando' })
    const resultado = await buscarProducto(gtin)
    if (resultado.tipo === 'encontrado' || resultado.tipo === 'incompleto') {
      setEstado({ tipo: 'camara' })
      setCodigo('')
      if (resultado.tipo === 'encontrado') onEncontrado(resultado.food)
      else onIncompleto(resultado)
      return
    }
    setEstado(resultado)
  }

  function enviarCodigo(e: FormEvent) {
    e.preventDefault()
    if (codigo.trim()) void buscar(codigo)
  }

  return (
    <Sheet open={open} onClose={cerrar} title="Escanear producto">
      <div className="space-y-4">
        {estado.tipo === 'camara' && <VisorCamara onCodigo={(gtin) => void buscar(gtin)} />}
        {estado.tipo === 'buscando' && <LoadingState>Buscando el producto…</LoadingState>}
        {estado.tipo === 'codigo-invalido' && <ErrorState>Ese código no es válido: debe tener entre 8 y 14 cifras.</ErrorState>}
        {estado.tipo === 'error' && <ErrorState>{estado.mensaje}</ErrorState>}
        {estado.tipo === 'no-encontrado' && (
          <EmptyState
            action={
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={onManual}>
                  Escribir valores
                </Button>
                {onKcalRapidas && <Button variant="secondary" className="flex-1" onClick={onKcalRapidas}>
                  Kcal rápidas
                </Button>}
              </div>
            }
          >
            El código {estado.gtin} no está en Open Food Facts. Puedes añadirlo a mano.
          </EmptyState>
        )}
        {estado.tipo !== 'camara' && estado.tipo !== 'buscando' && (
          <Button variant="ghost" size="sm" className="-ml-3" onClick={() => setEstado({ tipo: 'camara' })}>
            Escanear otro
          </Button>
        )}

        <form onSubmit={enviarCodigo} className="space-y-1">
          <label htmlFor="codigo-barras" className="block px-1 text-caption text-fg-subtle">
            O escribe el código
          </label>
          <div className="flex gap-2">
            <Input
              id="codigo-barras"
              inputMode="numeric"
              pattern="[0-9 ]*"
              autoComplete="off"
              enterKeyHint="search"
              placeholder="8410000000000"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
            <Button type="submit" variant="secondary" loading={estado.tipo === 'buscando'} disabled={!codigo.trim()}>
              Buscar
            </Button>
          </div>
        </form>
      </div>
    </Sheet>
  )
}
