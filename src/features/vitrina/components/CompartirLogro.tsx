import { useState } from 'react'
import Button from '../../../shared/components/Button'
import CrearPublicacion from '../../social/components/CrearPublicacion'
import { SiPuedePublicar } from '../../social/components/Publicar'
import { resumenLogro } from '../../social/lib/publicacion'
import { nivelDe, ultimaVez, type Logro } from '../lib/logros'

/** Compartir explícitamente una pieza alcanzada. Los pendientes, también los ocultos, no generan resumen. */
export default function CompartirLogro({ logro, nivel = nivelDe(logro) || null }: { logro: Logro; nivel?: number | null }) {
  const [abierto, setAbierto] = useState(false)
  const [publicado, setPublicado] = useState(false)
  const resumen = resumenLogro(logro, nivel)
  const dia = nivel !== null ? logro.niveles[nivel - 1]?.fecha : ultimaVez(logro)
  if (!resumen || !dia) return null
  return <SiPuedePublicar>
    <Button variant="secondary" size="sm" aria-haspopup="dialog" onClick={() => setAbierto(true)}>Compartir logro</Button>
    {publicado && <p role="status" className="text-body-sm text-fg-muted">Logro compartido</p>}
    {abierto && <CrearPublicacion adjunto={{ resumen, fecha: Date.parse(`${dia}T12:00:00Z`) }} onClose={() => setAbierto(false)} onPublicada={() => setPublicado(true)} />}
  </SiPuedePublicar>
}
