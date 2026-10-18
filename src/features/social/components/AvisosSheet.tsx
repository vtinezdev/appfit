import { useEffect, useState } from 'react'
import Button from '../../../shared/components/Button'
import type { Consulta } from '../hooks/useConsulta'
import Solicitudes from './Solicitudes'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import Sheet from '../../../shared/components/Sheet'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { haceCuanto } from '../../cuenta/lib/estado'
import { textoAviso, type Aviso, type Avisos } from '../lib/feed'
import { nombreVisible } from '../lib/relacion'
import { cargarSocial } from '../servicio'

interface Props {
  open: boolean
  consulta: Consulta<Avisos>
  onReintentar: () => void
  onAmigos: () => void
  onClose: () => void
  /** Abre los comentarios de la publicación del aviso (la hoja se cierra antes). */
  onAbrir: (aviso: Aviso) => void
  /** Se marcaron como vistos: el recuento se vuelve a leer. */
  onVistos: () => void
  onExited?: () => void
}

/** Reacciones y comentarios recientes en lo mío, con los nuevos marcados. Al abrirla, pasan a vistos. */
export default function AvisosSheet({ open, consulta, onReintentar, onAmigos, onClose, onAbrir, onVistos, onExited }: Props) {
  // La lista de cuando se abrió: al marcarlos vistos, el padre la vuelve a leer y los «Nuevo» desaparecerían a la vista.
  const [version, setVersion] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [instantanea, setInstantanea] = useState<Aviso[] | null>(null)
  const lista = instantanea ?? consulta.datos?.lista ?? []
  useEffect(() => {
    if (consulta.estado === 'listo' && instantanea === null) setInstantanea(consulta.datos.lista)
  }, [consulta, instantanea])
  const hayNuevos = lista.some((a) => a.nuevo)
  useEffect(() => {
    if (!open || !hayNuevos || instantanea === null) return
    // Si falla (sin red), seguirán como nuevos la próxima vez: no hace falta decir nada.
    cargarSocial().then((s) => s.marcarAvisosVistos()).then(onVistos, () => undefined)
    // Solo al abrirla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, instantanea])

  return (
    <Sheet open={open} onClose={onClose} onExited={onExited} title="Avisos">
      <Button variant="subtle" size="sm" onClick={onReintentar}>Actualizar avisos</Button>
      <Solicitudes version={version} onAbrir={onAmigos} onCambio={() => { setVersion(v => v + 1); onVistos() }} onError={setError} />
      {error && <ErrorState>{error}</ErrorState>}
      {consulta.estado === 'error' && <div className="space-y-stack"><ErrorState>{navigator.onLine ? consulta.error : 'Necesitas conexión para cargar los avisos.'}</ErrorState><Button variant="secondary" block onClick={onReintentar}>Reintentar</Button></div>}
      {consulta.estado === 'cargando' && !consulta.datos && <LoadingState />}
      {lista.length === 0 ? consulta.estado === 'listo' ? <EmptyState>Aquí verás quién comenta o te da ánimo en lo que publicas.</EmptyState> : null : (
        <ListGroup variante="plana" aria-label="Avisos">
          {lista.map((a, i) => (
            <li key={`${a.tipo}-${a.publicacion}-${a.alias}-${a.creado}-${i}`}>
              <ListRow onClick={() => onAbrir(a)}>
                <span className="flex min-w-0 items-start gap-3">
                  <Icon name={a.tipo === 'reaccion' ? 'llama' : 'comentario'} size={20} className={a.nuevo ? 'mt-0.5 text-accent-strong' : 'mt-0.5 text-fg-muted'} />
                  <span className="min-w-0">
                    <span className="block break-words text-body-sm font-semibold text-fg">{nombreVisible(a)}{(a.personas ?? 1) > 1 ? ` y ${(a.personas ?? 1) - 1} más` : ''}</span>
                    <span className="block break-words text-body-sm text-fg">{textoAviso(a)}</span>
                    {a.texto && <span className="block break-words text-caption text-fg-muted">«{a.texto}»</span>}
                    <span className="block text-caption text-fg-muted">{a.nuevo ? 'Nuevo · ' : ''}{haceCuanto(a.creado, Date.now())}</span>
                  </span>
                </span>
              </ListRow>
            </li>
          ))}
        </ListGroup>
      )}
    </Sheet>
  )
}
