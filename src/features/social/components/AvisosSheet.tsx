import { useEffect, useRef, useState } from 'react'
import Button from '../../../shared/components/Button'
import type { Consulta } from '../hooks/useConsulta'
import Solicitudes from './Solicitudes'
import Icon, { type IconName } from '../../../shared/components/Icon'
import Sheet from '../../../shared/components/Sheet'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { haceCuanto } from '../../cuenta/lib/estado'
import { useAvatares } from '../hooks/useAvatares'
import { textoAviso, type Aviso, type Avisos } from '../lib/feed'
import { agruparPorPeriodo } from '../lib/presentacion'
import { nombreVisible } from '../lib/relacion'
import { cargarSocial } from '../servicio'
import AvatarPersona from './AvatarPersona'

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

const ICONO: Record<Aviso['tipo'], IconName> = { reaccion: 'llama', comentario: 'comentario', respuesta: 'comentario', aceptada: 'check', comunidad: 'users' }

/**
 * Solicitudes y, por días, reacciones, comentarios y novedades en lo mío, con los nuevos marcados. Se vuelve a leer al
 * abrirla y, cuando llega, pasan a vistos (la lista conserva sus marcas de «nuevo» mientras está abierta).
 */
export default function AvisosSheet({ open, consulta, onReintentar, onAmigos, onClose, onAbrir, onVistos, onExited }: Props) {
  const [version, setVersion] = useState(0)
  const [error, setError] = useState<string | null>(null)
  // La lista de cuando se abrió, ya releída: al marcarlos vistos, el padre la vuelve a leer y los «nuevo» desaparecerían.
  const [instantanea, setInstantanea] = useState<Aviso[] | null>(null)
  const releida = useRef(false)
  useEffect(() => { onReintentar() }, []) // eslint-disable-line react-hooks/exhaustive-deps -- solo al abrir
  if (consulta.estado === 'cargando') releida.current = true
  useEffect(() => {
    if (consulta.estado === 'listo' && releida.current && instantanea === null) setInstantanea(consulta.datos.lista)
  }, [consulta, instantanea])
  const lista = instantanea ?? consulta.datos?.lista ?? []
  const logros = useAvatares(lista.filter(a => a.tipo !== 'comunidad').map(a => a.alias))
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
      <div className="space-y-stack">
        <Solicitudes variante="hoja" version={version} onAbrir={onAmigos} onCambio={() => { setVersion(v => v + 1); onVistos() }} onError={setError} />
        {error && <ErrorState>{error}</ErrorState>}
        {consulta.estado === 'error' && <div className="space-y-stack"><ErrorState>{navigator.onLine ? consulta.error : 'Necesitas conexión para cargar los avisos.'}</ErrorState><Button variant="secondary" block onClick={onReintentar}>Reintentar</Button></div>}
        {consulta.estado === 'cargando' && !consulta.datos && <LoadingState />}
        {lista.length === 0 ? consulta.estado === 'listo' ? <EmptyState>Aquí verás quién comenta o te da ánimo en lo que publicas.</EmptyState> : null
          : agruparPorPeriodo(lista, Date.now()).map(({ periodo, items }) => (
            <section key={periodo} aria-label={periodo} className="space-y-1">
              <h3 className="text-rotulo text-fg-muted">{periodo}</h3>
              <ul className="divide-y divide-line">
                {items.map((a, i) => (
                  <li key={`${a.tipo}-${a.publicacion}-${a.alias}-${a.creado}-${i}`}>
                    <button type="button" className="app-button flex min-h-touch w-full items-start gap-3 rounded-md py-3 text-left hover:bg-surface-muted" onClick={() => onAbrir(a)}>
                      <span className="relative mt-0.5 shrink-0">
                        <AvatarPersona persona={a} logro={a.tipo !== 'comunidad' ? logros[a.alias] : undefined} tamano="sm" />
                        <span aria-hidden className="aviso-tipo absolute -bottom-1 -right-1 flex items-center justify-center rounded-pill bg-surface-elevated text-accent-strong shadow-control">
                          <Icon name={ICONO[a.tipo]} size={12} className={a.tipo === 'reaccion' ? 'fill-current' : ''} />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-body-sm text-fg"><span className="font-semibold">{nombreVisible(a)}{(a.personas ?? 1) > 1 ? ` y ${(a.personas ?? 1) - 1} más` : ''}</span> · {textoAviso(a)}</span>
                        {a.texto && <span className="block break-words text-caption text-fg-muted">«{a.texto}»</span>}
                        <span className="block text-caption text-fg-muted">{haceCuanto(a.creado, Date.now())}</span>
                      </span>
                      {a.nuevo && <><span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-pill bg-accent-strong" /><span className="sr-only">Nuevo</span></>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </Sheet>
  )
}
