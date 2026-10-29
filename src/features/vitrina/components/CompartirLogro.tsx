import { useState } from 'react'
import Button, { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import CrearPublicacion from '../../social/components/CrearPublicacion'
import { SiPuedePublicar } from '../../social/components/Publicar'
import { resumenLogro } from '../../social/lib/publicacion'
import { nivelDe, nombreConNivel, ultimaVez, type Logro } from '../lib/logros'

/**
 * Compartir explícitamente una pieza alcanzada. Los pendientes, también los ocultos, no generan resumen. `forma`: botón
 * pequeño con su confirmación (detalle de un logro), botón grande para el pie de una hoja junto a «Genial» (`pie`) o
 * icono al final de una fila (`icono`); en las dos últimas, al publicar el propio botón pasa a «Compartido».
 */
export default function CompartirLogro({ logro, nivel = nivelDe(logro) || null, forma = 'boton' }: { logro: Logro; nivel?: number | null; forma?: 'boton' | 'pie' | 'icono' }) {
  const [abierto, setAbierto] = useState(false)
  const [publicado, setPublicado] = useState(false)
  const resumen = resumenLogro(logro, nivel)
  const dia = nivel !== null ? logro.niveles[nivel - 1]?.fecha : ultimaVez(logro)
  if (!resumen || !dia) return null
  const abrir = () => setAbierto(true)
  return <SiPuedePublicar>
    {forma === 'pie'
      ? <Button variant="secondary" size="lg" className="flex-1" aria-haspopup="dialog" disabled={publicado} onClick={abrir}>
          <Icon name={publicado ? 'check' : 'compartir'} size={18} />{publicado ? 'Compartido' : 'Compartir'}
        </Button>
      : forma === 'icono'
        ? <IconButton icon={publicado ? 'check' : 'compartir'} variant="ghost" aria-haspopup="dialog" disabled={publicado} onClick={abrir}
            label={publicado ? `${nombreConNivel({ logro, nivel })}: compartido` : `Compartir ${nombreConNivel({ logro, nivel })}`} />
        : <>
            <Button variant="secondary" size="sm" aria-haspopup="dialog" onClick={abrir}>Compartir logro</Button>
            {publicado && <p role="status" className="text-body-sm text-fg-muted">Logro compartido</p>}
          </>}
    {abierto && <CrearPublicacion adjunto={{ resumen, fecha: Date.parse(`${dia}T12:00:00Z`) }} onClose={() => setAbierto(false)} onPublicada={() => setPublicado(true)} />}
  </SiPuedePublicar>
}
