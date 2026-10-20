import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import Button from '../../../shared/components/Button'
import { formatInt } from '../../../shared/lib/format'
import Campo from '../../../shared/components/Campo'
import { Select, Textarea } from '../../../shared/components/Input'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { useConsulta } from '../hooks/useConsulta'
import { conNota, MAX_PUBLICACION, resumenTexto, sinImagenes, validarPublicacion, type Resumen } from '../lib/publicacion'
import { puedePublicarEnComunidad, type Comunidad } from '../lib/comunidad'
import { cargarSocial } from '../servicio'
import { crearIdDeEnvio } from '../lib/intento'
import NotaPublicacion from './NotaPublicacion'
import TarjetaPublicacion from './TarjetaPublicacion'

interface Props {
  onClose: () => void
  /** `comunidad`: la copia fue para un grupo (no anota el registro: solo la de seguidores lo marca como publicado). */
  onPublicada?: (id: string, comunidad?: string) => void | Promise<void>
  adjunto?: { resumen: Resumen; fecha: number }
  comunidad?: Comunidad
  soloComunidades?: boolean
}

/** Composición explícita con destinatario y vista previa. El UUID se mantiene si falla la red y se reintenta. */
export default function CrearPublicacion({ onClose, onPublicada, adjunto, comunidad, soloComunidades = false }: Props) {
  const [idPara] = useState(crearIdDeEnvio)
  const [fecha] = useState(() => Date.now())
  const [nota, setNota] = useState('')
  const [texto, setTexto] = useState('')
  const [destino, setDestino] = useState(comunidad?.id ?? (soloComunidades ? '' : 'seguidores'))
  const [paso, setPaso] = useState<'editar' | 'vista'>('editar')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [descartar, setDescartar] = useState(false)
  const confirmacionRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const veniaDeConfirmacion = useRef(false)
  useLayoutEffect(() => {
    if (descartar) confirmacionRef.current?.querySelector('button')?.focus()
    else if (veniaDeConfirmacion.current) editorRef.current?.querySelector<HTMLElement>('textarea,select,button')?.focus()
    veniaDeConfirmacion.current = descartar
  }, [descartar])
  const enviando = useRef(false)
  const grupos = useConsulta(async () => (await cargarSocial()).comunidades('', true), 0)
  const destinoGrupo = comunidad ?? grupos.datos?.find(c => c.id === destino)
  const publicables = grupos.datos?.filter(puedePublicarEnComunidad)
  const capacidades = useConsulta(async () => (await cargarSocial()).capacidades(), 0)
  // Un entreno o una actividad se comparte entero o no se comparte: sin elegir qué partes van.
  const elegido = adjunto?.resumen
  // La vista previa enseña exactamente lo que se envía: sin la capacidad (o mientras se consulta), sin imágenes.
  const resumen = elegido ? conNota(capacidades.datos?.imagenesPublicacion ? elegido : sinImagenes(elegido), nota) : resumenTexto(texto)
  // Un entreno espera a saber si caben sus imágenes; si la consulta falla, sigue sin ellas.
  const esperandoCapacidades = !!adjunto && capacidades.estado === 'cargando' && !capacidades.datos

  const enviar = async () => {
    if (enviando.current || !resumen) return
    if (destino !== 'seguidores' && (!destinoGrupo || !puedePublicarEnComunidad(destinoGrupo) || destinoGrupo.id !== destino)) {
      setError('Elige una comunidad en la que puedas publicar.'); return
    }
    enviando.current = true; setOcupado(true); setError(null)
    try {
      const fechaPublicacion = adjunto?.fecha ?? fecha
      const id=idPara([destino, fechaPublicacion, resumen])
      await (await cargarSocial()).publicar(id, fechaPublicacion, resumen, destino === 'seguidores' ? undefined : destino)
      await onPublicada?.(id, destino === 'seguidores' ? undefined : destino); onClose()
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
    if (!destino || (destino !== 'seguidores' && (!destinoGrupo || !puedePublicarEnComunidad(destinoGrupo)))) { setError('Elige una comunidad en la que puedas publicar o tus seguidores.'); return }
    setPaso('vista')
  }

  const tieneCambios = texto.length > 0 || nota.length > 0 || destino !== (comunidad?.id ?? (soloComunidades ? '' : 'seguidores'))
  return <Sheet open title={descartar ? '¿Descartar los cambios?' : paso === 'vista' ? 'Vista previa' : adjunto ? 'Compartir' : 'Crear publicación'}
    onClose={onClose} onBeforeClose={() => {
      if (ocupado) return false
      if (tieneCambios) { setDescartar(true); return false }
      return true
    }}>
    {descartar && <div ref={confirmacionRef} className="space-y-stack">
      <p className="text-body-sm text-fg-muted">Todavía no has publicado. Si sales, perderás lo que has escrito.</p>
      <Button variant="secondary" block onClick={() => setDescartar(false)}>Seguir escribiendo</Button>
      <Button variant="danger" block onClick={onClose}>Descartar</Button>
    </div>}
    <div ref={editorRef} className="space-y-stack" hidden={descartar}>
      {paso === 'editar' ? <form onSubmit={previsualizar} noValidate className="space-y-stack">
        {!adjunto && <Campo etiqueta="Tu publicación" ayuda={`Hasta ${formatInt(MAX_PUBLICACION)} caracteres.`}>
          <Textarea rows={5} maxLength={MAX_PUBLICACION} value={texto} onChange={e => { setTexto(e.target.value); setError(null) }} />
        </Campo>}
        {comunidad ? <p className="break-words text-body font-semibold text-fg">En {comunidad.nombre}</p> : <Campo etiqueta="Publicar para">
          <Select aria-label="Publicar para" value={destino} onChange={e => setDestino(e.target.value)}>
            {!soloComunidades && <option value="seguidores">Tus seguidores</option>}
            {soloComunidades && <option value="">Elige una comunidad</option>}
            {publicables?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Select>
        </Campo>}
        {grupos.estado === 'cargando' && !comunidad && <LoadingState />}
        {grupos.estado === 'error' && !comunidad && <div className="space-y-2"><ErrorState>{grupos.error}</ErrorState><Button variant="secondary" size="sm" onClick={grupos.recargar}>Reintentar comunidades</Button></div>}
        {soloComunidades && grupos.estado === 'listo' && publicables?.length === 0 && <p className="text-body-sm text-fg-muted">No tienes comunidades en las que puedas publicar. Únete a una que permita publicar a sus miembros o crea la tuya desde Social.</p>}
        {adjunto && <><NotaPublicacion valor={nota} onChange={setNota} disabled={ocupado} />{resumen && <TarjetaPublicacion resumen={resumen} fecha={adjunto.fecha} />}</>}
        <Button type="submit" variant="primary" block disabled={!destino || esperandoCapacidades}>Ver vista previa</Button>
      </form> : <>
        <p className="break-words text-body-sm font-semibold text-fg">{destino === 'seguidores' ? 'Para tus seguidores aprobados' : `Para los miembros de ${destinoGrupo?.nombre}`}</p>
        {resumen && <TarjetaPublicacion resumen={resumen} fecha={adjunto?.fecha ?? fecha} />}
        <p className="text-caption text-fg-muted">{destino === 'seguidores' ? 'Solo lo verán las personas que te siguen.' : 'Lo verán los miembros de esta comunidad, aunque no os sigáis.'}</p>
        <p className="text-caption text-fg-muted">Los cambios en tu diario no actualizan esta publicación.</p>
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
