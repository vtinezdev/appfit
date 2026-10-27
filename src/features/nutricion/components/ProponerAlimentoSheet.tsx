import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import { Input, Textarea } from '../../../shared/components/Input'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { enviarAlCreador } from '../../cuenta/mensajes'
import { errorPropuesta, LIMITES_PROPUESTA, mensajePropuesta, type PropuestaAlimento } from '../lib/propuestaAlimento'

/**
 * «Proponer un alimento» (ADR 061): nombre, y si se quiere marca, código de barras y una nota. Al enviar llega al
 * creador de AppFit (tabla `mensajes_creador`, tipo `alimento`) para añadirlo al catálogo; no se guarda nada en el móvil.
 */
export default function ProponerAlimentoSheet({ nombre, onClose }: { nombre: string | null; onClose: () => void }) {
  const [p, setP] = useState<PropuestaAlimento>({ nombre: nombre ?? '', marca: '', codigo: '', nota: '' })
  const [abiertoCon, setAbiertoCon] = useState(nombre)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  // Al abrirla con otro nombre, empieza de cero.
  if (nombre !== abiertoCon) { setAbiertoCon(nombre); setP({ nombre: nombre ?? '', marca: '', codigo: '', nota: '' }); setError(null); setEnviado(false) }
  const campo = (k: keyof PropuestaAlimento) => (e: { target: { value: string } }) => { setP({ ...p, [k]: e.target.value }); setError(null) }

  async function enviar() {
    const fallo = errorPropuesta(p)
    if (fallo) { setError(fallo); return }
    setEnviando(true); setError(null)
    const { texto, datos } = mensajePropuesta(p)
    try { await enviarAlCreador({ tipo: 'alimento', texto, datos, version: __APP_VERSION__.id }); setEnviado(true) }
    catch (e) { setError(e instanceof Error ? e.message : 'No se ha podido enviar. Inténtalo de nuevo más tarde.') }
    finally { setEnviando(false) }
  }

  return <Sheet open={nombre !== null} onClose={onClose} title="Proponer un alimento"
    footer={enviado ? <Button block variant="secondary" onClick={onClose}>Cerrar</Button> : <div className="space-y-2">
      {error && <ErrorState>{error}</ErrorState>}
      <Button block loading={enviando} disabled={enviando} onClick={() => { void enviar() }}><Icon name="enviar" size={18} />Enviar propuesta</Button>
    </div>}>
    {enviado
      ? <Card tone="muted" className="flex items-start gap-3" role="status">
          <Icon name="check" size={20} className="mt-0.5 shrink-0 text-success" />
          <p className="min-w-0 text-body-sm text-fg">Enviado. Gracias: el creador de AppFit lo revisará para añadirlo al catálogo.</p>
        </Card>
      : <div className="space-y-stack">
          <label className="block space-y-1"><span className="text-label text-fg-muted">Nombre</span>
            <Input value={p.nombre} maxLength={LIMITES_PROPUESTA.nombre} onChange={campo('nombre')} placeholder="Como sale en la etiqueta" /></label>
          <label className="block space-y-1"><span className="text-label text-fg-muted">Marca (opcional)</span>
            <Input value={p.marca} maxLength={LIMITES_PROPUESTA.marca} onChange={campo('marca')} /></label>
          <label className="block space-y-1"><span className="text-label text-fg-muted">Código de barras (opcional)</span>
            <Input value={p.codigo} inputMode="numeric" maxLength={14} onChange={campo('codigo')} placeholder="8410000000000" /></label>
          <label className="block space-y-1"><span className="text-label text-fg-muted">Nota (opcional)</span>
            <Textarea rows={3} value={p.nota} maxLength={LIMITES_PROPUESTA.nota} onChange={campo('nota')} placeholder="Dónde se compra, de qué tamaño es…" /></label>
          <p className="text-caption text-fg-muted">Llega al creador de AppFit. Si has entrado en tu cuenta, va asociado a ella.</p>
        </div>}
  </Sheet>
}
