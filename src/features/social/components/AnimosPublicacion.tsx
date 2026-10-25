import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'
import { useAvatares } from '../hooks/useAvatares'
import { useConsulta } from '../hooks/useConsulta'
import type { CursorSocial } from '../lib/feed'
import { nombreVisible } from '../lib/relacion'
import { cargarSocial } from '../servicio'
import AvatarPersona from './AvatarPersona'
import NombrePersona from './NombrePersona'

/** En lo propio: las caras de quién te dio ánimo (solo el autor puede verlas) y su lista completa en una hoja. */
export default function AnimosPublicacion({ id, total }: { id: string; total: number }) {
  const [abierto, setAbierto] = useState(false)
  const consulta = useConsulta(async () => (await cargarSocial()).animos(id), total)
  const caras = consulta.datos?.items.slice(0, 3) ?? []
  const avatares = useAvatares(caras.map(p => p.alias))
  const primera = caras[0]

  return <>
    <button type="button" aria-haspopup="dialog" className="app-button flex min-h-touch w-full items-center gap-3 rounded-md text-left" onClick={() => setAbierto(true)}>
      {caras.length > 0 && <span className="flex shrink-0 -space-x-2">{caras.map(p => <span key={p.id} className="avatar-apilado rounded-pill"><AvatarPersona persona={p} avatar={avatares[p.alias]} tamano="sm" /></span>)}</span>}
      <span className="min-w-0 flex-1 break-words text-body-sm text-fg-muted">{primera
        ? <>Ánimo de <span className="font-semibold text-fg">{nombreVisible(primera)}</span>{total > 1 ? ` y ${formatInt(total - 1)} ${total === 2 ? 'persona más' : 'personas más'}` : ''}</>
        : 'Ver quién te dio ánimo'}</span>
    </button>
    {abierto && <ListaAnimos id={id} onClose={() => setAbierto(false)} />}
  </>
}

function ListaAnimos({ id, onClose }: { id: string; onClose: () => void }) {
  const [lista, setLista] = useState<{ id: string; alias: string; nombre: string | null }[]>([])
  const [cursor, setCursor] = useState<CursorSocial | null>(null)
  const [fin, setFin] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const avatares = useAvatares(lista.map(p => p.alias))
  const consulta = useConsulta(async () => {
    const pagina = await (await cargarSocial()).animos(id)
    setLista(pagina.items); setCursor(pagina.cursor); setFin(!pagina.hayMas)
    return pagina
  }, id)
  async function mas() {
    setOcupado(true); setError(null)
    try {
      const pagina = await (await cargarSocial()).animos(id, cursor)
      setLista(ls => [...ls, ...pagina.items.filter(p => !ls.some(v => v.id === p.id))]); setCursor(pagina.cursor); setFin(!pagina.hayMas)
    } catch(e) { setError(e instanceof Error ? e.message : 'No se ha podido cargar.') }
    finally { setOcupado(false) }
  }
  return <Sheet open onClose={onClose} title="Te dieron ánimo"><div className="space-y-stack">
    {consulta.estado === 'cargando' && <LoadingState />}
    {(error || consulta.estado === 'error') && <div className="space-y-2"><ErrorState>{error ?? (consulta.estado === 'error' ? consulta.error : '')}</ErrorState><Button variant="secondary" onClick={consulta.estado === 'error' ? consulta.recargar : () => void mas()}>Reintentar</Button></div>}
    <ul className="divide-y divide-line">{lista.map(p => <li className="flex items-center gap-3 py-2" key={p.id}><AvatarPersona persona={p} avatar={avatares[p.alias]} tamano="sm" /><NombrePersona persona={p} /></li>)}</ul>
    {!fin && consulta.estado === 'listo' && <Button variant="secondary" block loading={ocupado} onClick={() => void mas()}>Cargar más</Button>}
  </div></Sheet>
}
