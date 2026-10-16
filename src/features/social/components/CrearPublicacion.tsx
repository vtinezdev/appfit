import { useRef, useState, type FormEvent } from 'react'
import Button from '../../../shared/components/Button'
import { formatInt } from '../../../shared/lib/format'
import Campo from '../../../shared/components/Campo'
import { Select, Textarea } from '../../../shared/components/Input'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { useConsulta } from '../hooks/useConsulta'
import { MAX_PUBLICACION, resumenTexto, validarPublicacion, type Resumen } from '../lib/publicacion'
import type { Comunidad } from '../lib/comunidad'
import { cargarSocial } from '../servicio'
import { crearIdDeEnvio } from '../lib/intento'
import TarjetaPublicacion from './TarjetaPublicacion'

interface Props {
  onClose: () => void
  onPublicada?: () => void
  adjunto?: { resumen: Resumen; fecha: number }
  comunidad?: Comunidad
  soloComunidades?: boolean
}

/** Composición explícita con destinatario y vista previa. El UUID se mantiene si falla la red y se reintenta. */
export default function CrearPublicacion({ onClose, onPublicada, adjunto, comunidad, soloComunidades = false }: Props) {
  const [idPara] = useState(crearIdDeEnvio)
  const [fecha] = useState(() => Date.now())
  const [texto, setTexto] = useState('')
  const [destino, setDestino] = useState(comunidad?.id ?? (soloComunidades ? '' : 'seguidores'))
  const [paso, setPaso] = useState<'editar' | 'vista'>('editar')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enviando = useRef(false)
  const grupos = useConsulta(async () => (await cargarSocial()).comunidades('', true), 0)
  const destinoGrupo = comunidad ?? grupos.datos?.find(c => c.id === destino)
  const resumen = adjunto?.resumen ?? resumenTexto(texto)

  const enviar = async () => {
    if (enviando.current || !resumen) return
    if (destino !== 'seguidores' && (!destinoGrupo?.unida || destinoGrupo.id !== destino)) {
      setError('Elige una comunidad a la que te hayas unido.'); return
    }
    enviando.current = true; setOcupado(true); setError(null)
    try {
      const fechaPublicacion = adjunto?.fecha ?? fecha
      await (await cargarSocial()).publicar(idPara([destino, fechaPublicacion, resumen]), fechaPublicacion, resumen, destino === 'seguidores' ? undefined : destino)
      onPublicada?.(); onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido publicar. Inténtalo de nuevo.')
    } finally { enviando.current = false; setOcupado(false) }
  }

  function previsualizar(e: FormEvent) {
    e.preventDefault(); setError(null)
    if (!adjunto) {
      const invalido = validarPublicacion(texto)
      if (invalido) { setError(invalido); return }
    }
    if (!destino || (destino !== 'seguidores' && !destinoGrupo?.unida)) { setError('Elige a quién quieres publicar.'); return }
    setPaso('vista')
  }

  return <Sheet open title={paso === 'vista' ? 'Vista previa' : adjunto ? 'Compartir' : 'Crear publicación'} onClose={() => { if (!ocupado) onClose() }}>
    <div className="space-y-stack">
      {paso === 'editar' ? <form onSubmit={previsualizar} noValidate className="space-y-stack">
        {!adjunto && <Campo etiqueta="Tu publicación" ayuda={`Hasta ${formatInt(MAX_PUBLICACION)} caracteres.`}>
          <Textarea rows={5} maxLength={MAX_PUBLICACION} value={texto} onChange={e => setTexto(e.target.value)} />
        </Campo>}
        {comunidad ? <p className="break-words text-body font-semibold text-fg">En {comunidad.nombre}</p> : <Campo etiqueta="Publicar para">
          <Select aria-label="Publicar para" value={destino} onChange={e => setDestino(e.target.value)}>
            {!soloComunidades && <option value="seguidores">Tus seguidores</option>}
            {soloComunidades && <option value="">Elige una comunidad</option>}
            {grupos.datos?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Select>
        </Campo>}
        {grupos.estado === 'cargando' && !comunidad && <LoadingState />}
        {grupos.estado === 'error' && !comunidad && <div className="space-y-2"><ErrorState>{grupos.error}</ErrorState><Button variant="secondary" size="sm" onClick={grupos.recargar}>Reintentar comunidades</Button></div>}
        {soloComunidades && grupos.datos?.length === 0 && <p className="text-body-sm text-fg-muted">Únete a una comunidad desde Social para compartir aquí.</p>}
        {adjunto && <TarjetaPublicacion {...adjunto} />}
        <Button type="submit" variant="primary" block disabled={!destino}>Ver vista previa</Button>
      </form> : <>
        <p className="break-words text-body-sm font-semibold text-fg">{destino === 'seguidores' ? 'Para tus seguidores aprobados' : `Para los miembros de ${destinoGrupo?.nombre}`}</p>
        {resumen && <TarjetaPublicacion resumen={resumen} fecha={adjunto?.fecha ?? fecha} />}
        <p className="text-caption text-fg-muted">{destino === 'seguidores' ? 'Solo lo verán las personas que te siguen.' : 'Lo verán los miembros de esta comunidad, aunque no os sigáis.'}</p>
        <Button variant="primary" block loading={ocupado} onClick={() => void enviar()}>Publicar</Button>
        <Button variant="secondary" block disabled={ocupado} onClick={() => setPaso('editar')}>Volver a editar</Button>
      </>}
      {error && <ErrorState>{error}</ErrorState>}
    </div>
  </Sheet>
}

/** Un resumen ya publicado a seguidores también puede compartirse, por separado, en una comunidad. */
export function CompartirComunidad({ resumen, fecha }: { resumen: Resumen; fecha: number }) {
  const [abierto, setAbierto] = useState(false)
  const [publicado, setPublicado] = useState(false)
  return <>
    <Button variant="secondary" block aria-haspopup="dialog" onClick={() => setAbierto(true)}>Compartir en una comunidad</Button>
    {publicado && <p role="status" className="text-body-sm text-fg-muted">Compartido en la comunidad</p>}
    {abierto && <CrearPublicacion soloComunidades adjunto={{ resumen, fecha }} onClose={() => setAbierto(false)} onPublicada={() => setPublicado(true)} />}
  </>
}
