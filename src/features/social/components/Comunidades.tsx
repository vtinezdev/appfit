import { useState, type FormEvent } from 'react'
import Button from '../../../shared/components/Button'
import Campo from '../../../shared/components/Campo'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import { Input, Select, Textarea } from '../../../shared/components/Input'
import ListGroup from '../../../shared/components/ListGroup'
import ListRow from '../../../shared/components/ListRow'
import Sheet from '../../../shared/components/Sheet'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import ViewTabs from '../../../shared/components/ViewTabs'
import { formatInt } from '../../../shared/lib/format'
import { useConsulta } from '../hooks/useConsulta'
import { MAX_NOMBRE_COMUNIDAD, MAX_DESCRIPCION_COMUNIDAD, puedePublicarEnComunidad, validarComunidad, type Comunidad } from '../lib/comunidad'
import { cargarSocial } from '../servicio'
import { crearIdDeEnvio } from '../lib/intento'
import CrearPublicacion from './CrearPublicacion'
import FormDenuncia from './FormDenuncia'
import ListaFeed from './ListaFeed'

interface Props { onError: (mensaje: string) => void }

/** Descubrir comunidades y unirse sin seguir a sus miembros. El contenido se abre después de unirse. */
export default function Comunidades({ onError }: Props) {
  const [vista, setVista] = useState<'mias' | 'descubrir'>('mias')
  const [busqueda, setBusqueda] = useState('')
  const [consulta, setConsulta] = useState('')
  const [version, setVersion] = useState(0)
  const [crear, setCrear] = useState(false)
  const [elegida, setElegida] = useState<Comunidad | null>(null)
  const lista = useConsulta(async () => (await cargarSocial()).comunidades(consulta, vista === 'mias'), `${vista}-${consulta}-${version}`)
  const refrescar = () => setVersion(v => v + 1)
  if (elegida) return <DetalleComunidad comunidad={elegida} onError={onError} onVolver={() => { setElegida(null); refrescar() }} />
  return <div className="space-y-stack">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-body-sm text-fg-muted">Comparte con gente con tus mismos intereses.</p>
      <Button variant="secondary" size="sm" aria-haspopup="dialog" onClick={() => setCrear(true)}>Crear comunidad</Button>
    </div>
    <ViewTabs label="Comunidades" valor={vista} onChange={setVista} opciones={[{ valor: 'mias', label: 'Mis comunidades' }, { valor: 'descubrir', label: 'Descubrir' }]}>
      <div className="space-y-stack">
        <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); setConsulta(busqueda.trim()); refrescar() }}>
          <div className="min-w-0 flex-1"><Campo etiqueta="Buscar comunidad"><Input maxLength={MAX_NOMBRE_COMUNIDAD} value={busqueda} onChange={e => setBusqueda(e.target.value)} /></Campo></div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        {lista.estado === 'cargando' ? <LoadingState /> : lista.estado === 'error' ? <div className="space-y-2"><ErrorState>{lista.error}</ErrorState><Button variant="secondary" size="sm" onClick={lista.recargar}>Reintentar</Button></div> : !lista.datos.length ? <EmptyState title={vista === 'mias' ? 'Aún no te has unido a ninguna comunidad' : 'No hay comunidades con esa búsqueda'}>
          {vista === 'mias' ? 'Busca una en Descubrir o crea la tuya.' : 'Puedes crear la primera.'}
        </EmptyState> : <ListGroup aria-label="Lista de comunidades">{lista.datos.map(c => <li key={c.id}><ListRow onClick={() => setElegida(c)}>
          <span className="min-w-0"><span className="block break-words text-body font-semibold text-fg">{c.nombre}</span><span className="block break-words text-body-sm text-fg-muted">{c.descripcion}</span><span className="block text-caption text-fg-muted">{formatInt(c.miembros)} {c.miembros === 1 ? 'miembro' : 'miembros'}{c.unida ? ' · Miembro' : ''}{c.soloCreadorPublica ? ' · Solo publica el creador' : ''}</span></span>
        </ListRow></li>)}</ListGroup>}
      </div>
    </ViewTabs>
    {crear && <CrearComunidad onClose={() => setCrear(false)} onCreada={c => { setElegida(c); refrescar() }} />}
  </div>
}

function CrearComunidad({ onClose, onCreada }: { onClose: () => void; onCreada: (c: Comunidad) => void }) {
  const [idPara] = useState(crearIdDeEnvio)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [soloCreadorPublica, setSoloCreadorPublica] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function enviar(e: FormEvent) {
    e.preventDefault(); if (ocupado) return
    const invalido = validarComunidad(nombre, descripcion)
    if (invalido) { setError(invalido); return }
    setOcupado(true); setError(null)
    try {
      const id = idPara([nombre.trim(), descripcion.trim(), soloCreadorPublica])
      await (await cargarSocial()).crearComunidad(id, nombre.trim(), descripcion.trim(), soloCreadorPublica)
      onCreada({ id, nombre: nombre.trim(), descripcion: descripcion.trim(), miembros: 1, unida: true, mia: true, soloCreadorPublica }); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'No se ha podido crear la comunidad.') } finally { setOcupado(false) }
  }
  return <Sheet open title="Crear comunidad" onClose={() => { if (!ocupado) onClose() }}>
    <form className="space-y-stack" onSubmit={enviar} noValidate>
      <Campo etiqueta="Nombre de la comunidad"><Input value={nombre} maxLength={MAX_NOMBRE_COMUNIDAD} onChange={e => setNombre(e.target.value)} /></Campo>
      <Campo etiqueta="Descripción"><Textarea rows={3} value={descripcion} maxLength={MAX_DESCRIPCION_COMUNIDAD} onChange={e => setDescripcion(e.target.value)} /></Campo>
      <Campo etiqueta="Quién puede publicar" ayuda="Todos los miembros podrán comentar y dar ánimo.">
        <Select value={soloCreadorPublica ? 'creador' : 'miembros'} onChange={e => setSoloCreadorPublica(e.target.value === 'creador')}>
          <option value="miembros">Todos los miembros</option>
          <option value="creador">Solo yo, como creador</option>
        </Select>
      </Campo>
      <p className="text-body-sm text-fg-muted">Cualquier persona con perfil social podrá encontrarla y unirse. Las publicaciones las verán sus miembros.</p>
      {error && <ErrorState>{error}</ErrorState>}
      <Button type="submit" variant="primary" block loading={ocupado}>Crear comunidad</Button>
    </form>
  </Sheet>
}

function DetalleComunidad({ comunidad, onVolver, onError }: Props & { comunidad: Comunidad; onVolver: () => void }) {
  const [c, setC] = useState(comunidad)
  const [editor, setEditor] = useState(false)
  const [denunciar, setDenunciar] = useState(false)
  const [denunciada, setDenunciada] = useState(false)
  const [borrar, setBorrar] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  async function cambiar(accion: 'unirse' | 'salir' | 'borrar') {
    if (ocupado) return
    setOcupado(true); setError(null)
    try {
      const s = await cargarSocial()
      if (accion === 'borrar') { await s.borrarComunidad(c.id); onVolver(); return }
      if (accion === 'unirse') await s.unirseComunidad(c.id)
      else await s.salirComunidad(c.id)
      setC(a => ({ ...a, unida: accion === 'unirse', miembros: Math.max(0, a.miembros + (accion === 'unirse' ? 1 : -1)) })); setVersion(v => v + 1)
    } catch (e) { setError(e instanceof Error ? e.message : 'No se ha podido completar.') } finally { setOcupado(false) }
  }
  return <section aria-label="Comunidad" className="space-y-stack">
    <Button variant="ghost" size="sm" onClick={onVolver}>Volver a comunidades</Button>
    <div className="space-y-1"><h2 className="break-words text-heading text-fg">{c.nombre}</h2><p className="whitespace-pre-wrap break-words text-body-sm text-fg-muted">{c.descripcion}</p><p className="text-caption text-fg-muted">{formatInt(c.miembros)} {c.miembros === 1 ? 'miembro' : 'miembros'}</p></div>
    {c.soloCreadorPublica && <p className="text-body-sm text-fg-muted">Solo quien creó esta comunidad puede publicar. Todos los miembros pueden comentar y dar ánimo.</p>}
    {error && <ErrorState>{error}</ErrorState>}
    {c.unida ? <>
      <div className="flex flex-wrap gap-2">
        {puedePublicarEnComunidad(c) && <Button variant="secondary" aria-haspopup="dialog" onClick={() => setEditor(true)}>Crear publicación</Button>}
        {!c.mia && <Button variant="subtle" loading={ocupado} onClick={() => void cambiar('salir')}>Salir de la comunidad</Button>}
      </div>
      <ListaFeed version={`${c.id}-${version}`} onError={onError} cargar={async antes => (await cargarSocial()).publicacionesComunidad(c.id, antes)} vacio={<EmptyState title="Aún no hay publicaciones">{puedePublicarEnComunidad(c) ? 'Comparte la primera con la comunidad.' : 'Aquí verás las publicaciones de quien creó la comunidad.'}</EmptyState>} />
    </> : <>
      <p className="text-body-sm text-fg-muted">Únete para ver y compartir publicaciones con los miembros.</p>
      <Button variant="secondary" loading={ocupado} onClick={() => void cambiar('unirse')}>Unirme a la comunidad</Button>
    </>}
    {c.mia ? borrar ? <ConfirmacionDestructiva mensaje="Se borrarán esta comunidad y todas sus publicaciones, reacciones y comentarios. No se puede deshacer." confirmar="Borrar comunidad" ocupado={ocupado} onCancelar={() => setBorrar(false)} onConfirmar={() => void cambiar('borrar')} /> : <Button variant="ghost" size="sm" onClick={() => setBorrar(true)}>Borrar comunidad</Button> : <Button variant="ghost" size="sm" onClick={() => setDenunciar(true)}>Denunciar comunidad</Button>}
    {denunciada && <p role="status" className="text-body-sm text-fg-muted">Denuncia enviada. La revisaremos.</p>}
    {editor && <CrearPublicacion comunidad={c} onClose={() => setEditor(false)} onPublicada={() => setVersion(v => v + 1)} />}
    {denunciar && <Sheet open title="Denunciar comunidad" onClose={() => setDenunciar(false)}><FormDenuncia onCancelar={() => setDenunciar(false)} onEnviar={async (motivo, detalle) => { await (await cargarSocial()).denunciarComunidad(c.id, motivo, detalle); setDenunciar(false); setDenunciada(true) }} /></Sheet>}
  </section>
}
