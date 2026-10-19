import { useRef, useState, type FormEvent } from 'react'
import Avatar from '../../../shared/components/Avatar'
import Badge from '../../../shared/components/Badge'
import Button, { IconButton } from '../../../shared/components/Button'
import Disclosure from '../../../shared/components/Disclosure'
import Icon from '../../../shared/components/Icon'
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
import { MAX_NOMBRE_COMUNIDAD, MAX_DESCRIPCION_COMUNIDAD, puedePublicarEnComunidad, validarComunidad, validarDescripcionComunidad, type Comunidad } from '../lib/comunidad'
import { cargarSocial } from '../servicio'
import { crearIdDeEnvio } from '../lib/intento'
import CrearPublicacion from './CrearPublicacion'
import FormDenuncia from './FormDenuncia'
import GestionarComunidad from './GestionarComunidad'
import PublicacionesPersona from './PublicacionesPersona'
import ListaFeed from './ListaFeed'

interface Props { onCambio?: () => void; descubrirInicial?: boolean; onError: (mensaje: string) => void }

/** Descubrir comunidades y unirse sin seguir a sus miembros. El contenido se abre después de unirse. */
export default function Comunidades({ onError, descubrirInicial = false, onCambio }: Props) {
  const [vista, setVista] = useState<'mias' | 'descubrir'>(descubrirInicial ? 'descubrir' : 'mias')
  const [busqueda, setBusqueda] = useState('')
  const [consulta, setConsulta] = useState('')
  const [version, setVersion] = useState(0)
  const [crear, setCrear] = useState(false)
  const [elegida, setElegida] = useState<Comunidad | null>(null)
  const novedades = useConsulta(async () => (await cargarSocial()).novedadesComunidades(), version, true)
  const lista = useConsulta(async () => (await cargarSocial()).comunidades(consulta, vista === 'mias'), `${vista}-${consulta}-${version}`)
  const refrescar = () => { setVersion(v => v + 1); onCambio?.() }
  const [uniendo, setUniendo] = useState<string | null>(null)
  async function unirse(c: Comunidad) {
    setUniendo(c.id)
    try { await (await cargarSocial()).unirseComunidad(c.id); setElegida({ ...c, unida: true, miembros: c.miembros + 1 }); refrescar() }
    catch (e) { onError(e instanceof Error ? e.message : 'No se ha podido unir a la comunidad.') }
    finally { setUniendo(null) }
  }
  if (elegida) return <DetalleComunidad onCambio={onCambio} comunidad={elegida} onError={onError} onVolver={() => { setElegida(null); refrescar() }} />
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
        </EmptyState> : <ListGroup aria-label="Lista de comunidades">{lista.datos.map(c => {
          const nuevas = novedades.datos?.[c.id] ?? 0
          return <li key={c.id} className="flex flex-wrap items-center gap-x-2">
            <ListRow className="min-w-0 flex-1 basis-56" onClick={() => { setElegida(c); if(c.unida) void cargarSocial().then(s => s.verComunidad(c.id)).catch(() => undefined) }}>
              <span className="flex min-w-0 items-center gap-3">
                <Avatar nombre={c.nombre} forma="cuadrado" />
                <span className="min-w-0"><span className="block break-words text-body font-semibold text-fg">{c.nombre}</span>{c.descripcion && <span className="line-clamp-2 block break-words text-body-sm text-fg-muted">{c.descripcion}</span>}<span className="block text-caption text-fg-muted">{formatInt(c.miembros)} {c.miembros === 1 ? 'miembro' : 'miembros'}{c.soloCreadorPublica ? ' · Solo publica el creador' : ''}</span></span>
              </span>
              {c.unida && (nuevas > 0 ? <Badge tone="accent" className="shrink-0">{formatInt(nuevas)} {nuevas === 1 ? 'nueva' : 'nuevas'}</Badge> : <Icon name="chevron-right" size={18} className="shrink-0 text-fg-subtle" />)}
            </ListRow>
            {!c.unida && <Button variant="secondary" size="sm" className="ml-auto shrink-0" loading={uniendo === c.id} disabled={uniendo !== null} aria-label={`Unirme a ${c.nombre}`} onClick={() => void unirse(c)}>Unirme</Button>}
          </li>
        })}</ListGroup>}
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

type TareaComunidad = 'editar' | 'gestionar' | 'denunciar'

function DetalleComunidad({ comunidad, onVolver, onError, onCambio }: Props & { comunidad: Comunidad; onVolver: () => void }) {
  const [persona, setPersona] = useState<{ alias: string; nombre: string | null } | null>(null)
  const [tarea, setTarea] = useState<TareaComunidad | null>(null)
  const [c, setC] = useState(comunidad)
  const [editor, setEditor] = useState(false)
  const [menu, setMenu] = useState({ open: false, borrar: false })
  // Una tarea elegida en «Más acciones» se abre cuando la hoja termina de cerrarse: nunca dos capas a la vez.
  const siguiente = useRef<TareaComunidad | null>(null)
  const [denunciada, setDenunciada] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const gestion = useConsulta(async () => (await cargarSocial()).gestionComunidad(c.id), `${c.unida}-${version}`)
  async function cambiar(accion: 'unirse' | 'salir' | 'borrar') {
    if (ocupado) return
    setOcupado(true); setError(null)
    try {
      const s = await cargarSocial()
      if (accion === 'borrar') { await s.borrarComunidad(c.id); onVolver(); return }
      if (accion === 'unirse') await s.unirseComunidad(c.id)
      else await s.salirComunidad(c.id)
      setC(a => ({ ...a, unida: accion === 'unirse', miembros: Math.max(0, a.miembros + (accion === 'unirse' ? 1 : -1)) })); setVersion(v => v + 1); onCambio?.()
      setMenu(m => ({ ...m, open: false }))
    } catch (e) { setError(e instanceof Error ? e.message : 'No se ha podido completar.') } finally { setOcupado(false) }
  }
  const elegir = (t: TareaComunidad) => { siguiente.current = t; setMenu(m => ({ ...m, open: false })) }
  const modera = gestion.datos?.modera === true
  const hayNormas = Boolean(gestion.datos?.bienvenida || gestion.datos?.reglas || c.soloCreadorPublica)
  const hayAcciones = c.mia || modera || c.unida
  return <section aria-label="Comunidad" className="space-y-stack">
    <Button variant="ghost" size="sm" className="-ml-3" onClick={onVolver}><Icon name="arrow-left" size={18} />Comunidades</Button>
    {/* Con el texto ampliado, el nombre baja bajo el escudo en lugar de estrecharse a una letra por línea. */}
    <div className="flex flex-wrap items-start gap-3">
      <Avatar nombre={c.nombre} forma="cuadrado" tamano="lg" />
      <div className="min-w-0 flex-1 basis-40 space-y-1">
        <h2 className="break-words text-heading text-fg">{c.nombre}</h2>
        <p className="text-caption text-fg-muted">{formatInt(c.miembros)} {c.miembros === 1 ? 'miembro' : 'miembros'} · {c.soloCreadorPublica ? 'Solo publica el creador' : 'Todos pueden publicar'}</p>
      </div>
      {hayAcciones && <IconButton icon="more" label="Más acciones de la comunidad" variant="ghost" aria-haspopup="dialog" onClick={() => { setError(null); setMenu({ open: true, borrar: false }) }} />}
    </div>
    {c.descripcion && <p className="whitespace-pre-wrap break-words text-body-sm text-fg-muted">{c.descripcion}</p>}
    {c.unida ? <div className="flex flex-wrap items-center gap-2">
      <p className="inline-flex min-h-touch items-center gap-2 rounded-md bg-surface-muted px-4 text-body-sm font-semibold text-fg"><Icon name="check" size={18} className="text-success" />{c.mia ? 'Creada por ti' : 'Miembro'}</p>
      {puedePublicarEnComunidad(c) && <Button variant="secondary" aria-haspopup="dialog" onClick={() => setEditor(true)}><Icon name="plus" size={18} />Publicar</Button>}
    </div> : <div className="space-y-2">
      <p className="text-body-sm text-fg-muted">Únete para ver y compartir publicaciones con los miembros.</p>
      <Button variant="secondary" loading={ocupado} onClick={() => void cambiar('unirse')}>Unirme a la comunidad</Button>
    </div>}
    {hayNormas && <Disclosure title={c.unida ? 'Antes de publicar' : 'Bienvenida y reglas'}>
      <div className="space-y-stack">
        {gestion.datos?.bienvenida && <p className="whitespace-pre-wrap break-words text-body-sm text-fg">{gestion.datos.bienvenida}</p>}
        {gestion.datos?.reglas && <div className="space-y-1"><h3 className="text-label text-fg-muted">Reglas de la comunidad</h3><p className="whitespace-pre-wrap break-words text-body-sm text-fg">{gestion.datos.reglas}</p></div>}
        {c.soloCreadorPublica && <p className="text-body-sm text-fg-muted">Solo quien creó esta comunidad puede publicar. Todos los miembros pueden comentar y dar ánimo.</p>}
      </div>
    </Disclosure>}
    {gestion.estado === 'error' && <ErrorState>{gestion.error}</ErrorState>}
    {error && !menu.open && <ErrorState>{error}</ErrorState>}
    {denunciada && <p role="status" className="text-body-sm text-fg-muted">Denuncia enviada. La revisaremos.</p>}
    {c.unida && <ListaFeed puedoModerar={modera} comunidad={c.id} onAbrirPersona={setPersona} version={`${c.id}-${version}`} onError={onError} cargar={async antes => (await cargarSocial()).publicacionesComunidad(c.id, antes)} vacio={<EmptyState title="Aún no hay publicaciones">{puedePublicarEnComunidad(c) ? 'Comparte la primera con la comunidad.' : 'Aquí verás las publicaciones de quien creó la comunidad.'}</EmptyState>} />}
    {!c.mia && !c.unida && <Button variant="ghost" size="sm" className="-ml-3" onClick={() => setTarea('denunciar')}>Denunciar comunidad</Button>}

    <Sheet open={menu.open} onClose={() => setMenu(m => ({ ...m, open: false }))} title={menu.borrar ? 'Borrar comunidad' : c.nombre}
      onExited={() => { const t = siguiente.current; siguiente.current = null; if (t) setTarea(t) }}>
      <div className="space-y-stack">
        {menu.borrar ? <ConfirmacionDestructiva mensaje="Se borrarán esta comunidad y todas sus publicaciones, reacciones y comentarios. No se puede deshacer." confirmar="Borrar comunidad" ocupado={ocupado} onCancelar={() => setMenu({ open: true, borrar: false })} onConfirmar={() => void cambiar('borrar')} />
          : <>
            {c.mia && <Button variant="secondary" block aria-haspopup="dialog" onClick={() => elegir('editar')}>{c.descripcion ? 'Editar descripción' : 'Añadir descripción'}</Button>}
            {modera && <Button variant="secondary" block aria-haspopup="dialog" onClick={() => elegir('gestionar')}>Gestionar comunidad</Button>}
            {c.unida && !c.mia && <Button variant="secondary" block loading={ocupado} onClick={() => void cambiar('salir')}>Salir de la comunidad</Button>}
            {!c.mia && <Button variant="secondary" block aria-haspopup="dialog" onClick={() => elegir('denunciar')}>Denunciar comunidad</Button>}
            {c.mia && <Button variant="destructive" block onClick={() => setMenu({ open: true, borrar: true })}>Borrar comunidad</Button>}
          </>}
        {error && <ErrorState>{error}</ErrorState>}
      </div>
    </Sheet>
    {tarea === 'gestionar' && gestion.datos && <GestionarComunidad id={c.id} gestion={gestion.datos} onClose={() => setTarea(null)} onCambio={() => { onVolver() }}
      onAnadido={() => { setC(a => ({ ...a, miembros: a.miembros + 1 })); setVersion(v => v + 1); onCambio?.() }} />}
    {persona && <PublicacionesPersona onCambio={() => setVersion(v => v + 1)} persona={persona} comunidad={c.id} volver={c.nombre} onClose={() => setPersona(null)} />}
    {tarea === 'editar' && <EditarDescripcion comunidad={c} onClose={() => setTarea(null)} onGuardada={descripcion => setC(a => ({ ...a, descripcion }))} />}
    {editor && <CrearPublicacion comunidad={c} onClose={() => setEditor(false)} onPublicada={() => setVersion(v => v + 1)} />}
    {tarea === 'denunciar' && <Sheet open title="Denunciar comunidad" onClose={() => setTarea(null)}><FormDenuncia onCancelar={() => setTarea(null)} onEnviar={async (motivo, detalle) => { await (await cargarSocial()).denunciarComunidad(c.id, motivo, detalle); setTarea(null); setDenunciada(true) }} /></Sheet>}
  </section>
}

function EditarDescripcion({ comunidad, onClose, onGuardada }: { comunidad: Comunidad; onClose: () => void; onGuardada: (descripcion: string) => void }) {
  const [descripcion, setDescripcion] = useState(comunidad.descripcion)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function enviar(e: FormEvent) {
    e.preventDefault(); if (ocupado) return
    const invalido = validarDescripcionComunidad(descripcion)
    if (invalido) { setError(invalido); return }
    setOcupado(true); setError(null)
    try {
      await (await cargarSocial()).editarDescripcionComunidad(comunidad.id, descripcion.trim())
      onGuardada(descripcion.trim()); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'No se ha podido guardar la descripción.') } finally { setOcupado(false) }
  }
  return <Sheet open title="Descripción de la comunidad" onClose={() => { if (!ocupado) onClose() }}>
    <form className="space-y-stack" onSubmit={enviar} noValidate>
      <Campo etiqueta="Descripción" ayuda="La verán quienes busquen la comunidad y sus miembros."><Textarea rows={4} value={descripcion} maxLength={MAX_DESCRIPCION_COMUNIDAD} onChange={e => setDescripcion(e.target.value)} /></Campo>
      {error && <ErrorState>{error}</ErrorState>}
      <Button type="submit" variant="primary" block loading={ocupado}>Guardar descripción</Button>
    </form>
  </Sheet>
}
