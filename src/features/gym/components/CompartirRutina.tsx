import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import type { Exercise, Routine } from '../../../shared/db/types'
import CrearPublicacion from '../../social/components/CrearPublicacion'
import { SiPuedePublicar } from '../../social/components/Publicar'
import { useConsulta } from '../../social/hooks/useConsulta'
import { resumenRutinaCompartida } from '../../social/lib/publicacion'
import { cargarSocial } from '../../social/servicio'
import { datosRutinaCompartida } from '../lib/rutinaCompartida'

interface Props {
  rutina: Routine
  ejercicios: ReadonlyMap<number, Exercise>
}

/**
 * «Compartir rutina» en su ficha (ADR 055): publica su estructura (ejercicios, series, repeticiones, descansos y
 * calentamientos), nunca cargas. Solo con Amigos y si el servidor ya acepta rutinas (0022). Cada vez es una
 * publicación nueva: la rutina no anota nada.
 */
export default function CompartirRutina(props: Props) {
  return <SiPuedePublicar><ConServidor {...props} /></SiPuedePublicar>
}

function ConServidor({ rutina, ejercicios }: Props) {
  const capacidades = useConsulta(async () => (await cargarSocial()).capacidades(), 0)
  const [editor, setEditor] = useState<{ fecha: number } | null>(null)
  const [publicada, setPublicada] = useState(false)
  const datos = datosRutinaCompartida(rutina, ejercicios)
  if (!capacidades.datos?.rutinaCompartida || !datos.ejercicios.length) return null
  return (
    <section aria-label="Compartir rutina" className="space-y-2">
      <Button variant="secondary" block aria-haspopup="dialog" onClick={() => { setPublicada(false); setEditor({ fecha: Date.now() }) }}>
        <Icon name="compartir" size={18} />Compartir rutina
      </Button>
      <p className="text-caption text-fg-muted">Se comparten los ejercicios, las series, las repeticiones y los descansos. Nunca tus cargas.</p>
      {publicada && <p role="status" className="flex items-center gap-2 text-body-sm font-semibold text-fg"><Icon name="check" size={18} className="text-accent-strong" />Rutina compartida en Social</p>}
      {editor && <CrearPublicacion adjunto={{ resumen: resumenRutinaCompartida(datos), fecha: editor.fecha }} onClose={() => setEditor(null)} onPublicada={() => setPublicada(true)} />}
    </section>
  )
}
