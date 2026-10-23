import { useState, type FormEvent } from 'react'
import Button from '../../../shared/components/Button'
import Campo from '../../../shared/components/Campo'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import { Input } from '../../../shared/components/Input'
import ModalPage from '../../../shared/components/ModalPage'
import Sheet from '../../../shared/components/Sheet'
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import ViewTabs from '../../../shared/components/ViewTabs'
import { formatInt } from '../../../shared/lib/format'
import { haceCuanto } from '../../cuenta/lib/estado'
import { useConsulta } from '../hooks/useConsulta'
import { normalizarAlias, validarAlias } from '../lib/alias'
import { accionesDenuncia, describirDenuncia, textoMotivos, type AccionDenuncia, type Denuncia } from '../lib/moderacion'
import { nombreVisible } from '../lib/relacion'
import { cargarSocial } from '../servicio'

type Vista = 'denuncias' | 'suspendidos'

/** Lo que hay que confirmar antes de hacerlo: borrar o suspender desde una denuncia, o suspender por alias. */
type Confirmacion = { denuncia: Denuncia; accion: Exclude<AccionDenuncia, 'descartar'> } | { alias: string }

/** Título, mensaje y botón de la confirmación de cada acción sobre una denuncia. */
function textosConfirmacion(d: Denuncia, accion: Exclude<AccionDenuncia, 'descartar'>): { titulo: string; mensaje: string; boton: string } {
  switch (accion) {
    case 'borrar': return { titulo: d.tipo === 'publicacion' ? 'Borrar publicación' : 'Borrar comentario', boton: 'Borrar',
      mensaje: `Se borrará ${d.tipo === 'publicacion' ? 'la publicación, con sus ánimos y comentarios,' : 'el comentario'} para todos. No se puede deshacer.` }
    case 'suspender_comunidad': return { titulo: 'Suspender comunidad', boton: 'Suspender comunidad',
      mensaje: 'La comunidad dejará de verse para todos, también para sus miembros. Podrás reactivarla desde Suspendidos.' }
    case 'cerrar': return { titulo: 'Cerrar comunidad', boton: 'Cerrar comunidad',
      mensaje: 'Se borrará la comunidad con sus publicaciones y sus miembros, para todos. No se puede deshacer.' }
    case 'suspender': return { titulo: 'Suspender perfil', boton: 'Suspender perfil',
      mensaje: `@${d.autor} dejará de ver Social y Amigos, y lo suyo dejará de verse. Podrás readmitirlo desde Suspendidos.` }
  }
}

const HECHO: Record<AccionDenuncia, string> = { borrar: 'Borrado.', suspender: '', suspender_comunidad: 'Comunidad suspendida.', cerrar: 'Comunidad cerrada.', descartar: 'Denuncia descartada.' }

/**
 * Moderación (solo administradores, 0017): las denuncias sin revisar con lo denunciado y sus acciones, y los perfiles y
 * las comunidades suspendidos para readmitirlos (0026). Borrar, suspender y cerrar piden confirmación; descartar,
 * readmitir y reactivar no destruyen nada. Al actuar, quien denunció recibe un aviso sin detalles (0026).
 */
export default function Moderacion({ onClose, onCambio }: { onClose: () => void; onCambio: () => void }) {
  const [vista, setVista] = useState<Vista>('denuncias')
  const [version, setVersion] = useState(0)
  const [confirmacion, setConfirmacion] = useState<{ open: boolean; datos: Confirmacion | null }>({ open: false, datos: null })
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hecho, setHecho] = useState<string | null>(null)
  const [alias, setAlias] = useState('')
  const denuncias = useConsulta(async () => (await cargarSocial()).denuncias(), `d-${version}`)
  const suspendidos = useConsulta(async () => (await cargarSocial()).suspendidos(), `s-${version}`)
  const comunidades = useConsulta(async () => (await cargarSocial()).comunidadesSuspendidas(), `c-${version}`)

  async function ejecutar(fn: () => Promise<void>, mensaje: string) {
    if (ocupado) return
    setOcupado(true); setError(null); setHecho(null)
    try {
      await fn()
      setConfirmacion(c => ({ ...c, open: false }))
      setHecho(mensaje); setVersion(v => v + 1); onCambio()
    } catch (e) { setError(e instanceof Error ? e.message : 'No se ha podido completar. Inténtalo de nuevo.') }
    finally { setOcupado(false) }
  }
  const resolver = (d: Denuncia, accion: AccionDenuncia) => ejecutar(async () => { await (await cargarSocial()).resolverDenuncia(d.id, accion) },
    accion === 'suspender' ? `@${d.autor} queda suspendido.` : HECHO[accion])
  const reactivar = (id: string, nombre: string) => ejecutar(async () => { await (await cargarSocial()).reactivarComunidad(id) }, `${nombre} vuelve a verse.`)
  const suspender = (a: string, si: boolean) => ejecutar(async () => { await (await cargarSocial()).suspender(a, si) },
    si ? `@${a} queda suspendido.` : `@${a} vuelve a tener acceso.`)
  const confirmar = (datos: Confirmacion) => { setError(null); setConfirmacion({ open: true, datos }) }

  function pedirSuspension(e: FormEvent) {
    e.preventDefault()
    const invalido = validarAlias(alias)
    if (invalido) { setError(invalido); return }
    confirmar({ alias: normalizarAlias(alias) })
  }

  const datos = confirmacion.datos
  const textos = !datos ? null : 'alias' in datos
    ? { titulo: 'Suspender perfil', boton: 'Suspender perfil', mensaje: `@${datos.alias} dejará de ver Social y Amigos, y sus publicaciones, comentarios y comunidades dejarán de verse. Podrás readmitirlo desde aquí.` }
    : textosConfirmacion(datos.denuncia, datos.accion)

  return <ModalPage title="Moderación" closeLabel="Social" onClose={onClose} busy={ocupado}>
    <div className="space-y-stack">
      {hecho && <p role="status" className="text-body-sm text-fg">{hecho}</p>}
      {error && !confirmacion.open && <ErrorState>{error}</ErrorState>}
      <ViewTabs label="Moderación" valor={vista} onChange={setVista} opciones={[{ valor: 'denuncias', label: 'Denuncias' }, { valor: 'suspendidos', label: 'Suspendidos' }]}>
        {vista === 'denuncias' ? (
          denuncias.estado === 'error' && !denuncias.datos ? <div className="space-y-2"><ErrorState>{denuncias.error}</ErrorState><Button variant="secondary" size="sm" onClick={denuncias.recargar}>Reintentar</Button></div>
            : !denuncias.datos ? <LoadingState />
              : denuncias.datos.length === 0 ? <EmptyState icon="escudo" title="No hay denuncias pendientes">Cuando alguien denuncie un perfil, una publicación, un comentario o una comunidad, aparecerá aquí.</EmptyState>
                : <ul className="divide-y divide-line" aria-label="Denuncias pendientes">
                  {denuncias.datos.map(d => <FilaDenuncia key={d.id} d={d} ocupado={ocupado}
                    onAccion={accion => accion === 'descartar' ? void resolver(d, accion) : confirmar({ denuncia: d, accion })} />)}
                </ul>
        ) : <div className="space-y-section">
          <form className="flex flex-wrap items-end gap-2" onSubmit={pedirSuspension} noValidate>
            <div className="min-w-0 flex-1 basis-48"><Campo etiqueta="Suspender por alias"><Input autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={21} value={alias} onChange={e => setAlias(e.target.value)} /></Campo></div>
            <Button type="submit" variant="secondary" disabled={ocupado}>Suspender</Button>
          </form>
          {suspendidos.estado === 'error' && !suspendidos.datos ? <div className="space-y-2"><ErrorState>{suspendidos.error}</ErrorState><Button variant="secondary" size="sm" onClick={suspendidos.recargar}>Reintentar</Button></div>
            : !suspendidos.datos ? <LoadingState />
              : suspendidos.datos.length === 0 ? <EmptyState title="Ningún perfil suspendido" />
                : <ul className="divide-y divide-line" aria-label="Perfiles suspendidos">
                  {suspendidos.datos.map(s => <li key={s.alias} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3">
                    <span className="min-w-0 flex-1 basis-40">
                      <span className="block break-words text-body font-semibold text-fg">{nombreVisible(s)}</span>
                      <span className="block break-words text-caption text-fg-muted">@{s.alias}{s.desde !== null ? ` · desde ${haceCuanto(s.desde, Date.now())}` : ''}{s.conPerfil ? '' : ' · borró su perfil'}</span>
                    </span>
                    <Button variant="secondary" size="sm" disabled={ocupado} aria-label={`Readmitir a @${s.alias}`} onClick={() => void suspender(s.alias, false)}>Readmitir</Button>
                  </li>)}
                </ul>}
          {(comunidades.datos?.length ?? 0) > 0 && <section aria-labelledby="comunidades-suspendidas" className="space-y-1">
            <h3 id="comunidades-suspendidas" className="text-rotulo text-fg-muted">Comunidades suspendidas</h3>
            <ul className="divide-y divide-line">
              {comunidades.datos!.map(c => <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3">
                <span className="min-w-0 flex-1 basis-40 break-words text-body font-semibold text-fg">{c.nombre}</span>
                <Button variant="secondary" size="sm" disabled={ocupado} aria-label={`Reactivar ${c.nombre}`} onClick={() => void reactivar(c.id, c.nombre)}>Reactivar</Button>
              </li>)}
            </ul>
          </section>}
          {comunidades.estado === 'error' && <ErrorState>{comunidades.error}</ErrorState>}
        </div>}
      </ViewTabs>
    </div>
    <Sheet open={confirmacion.open} onClose={() => setConfirmacion(c => ({ ...c, open: false }))} onBeforeClose={() => !ocupado}
      title={textos?.titulo ?? ''}>
      <div className="space-y-stack">
        <ConfirmacionDestructiva mensaje={textos?.mensaje ?? ''} confirmar={textos?.boton ?? ''} ocupado={ocupado}
          onCancelar={() => setConfirmacion(c => ({ ...c, open: false }))}
          onConfirmar={() => { if (!datos) return; if ('alias' in datos) void suspender(datos.alias, true).then(() => setAlias('')); else void resolver(datos.denuncia, datos.accion) }} />
        {error && <ErrorState>{error}</ErrorState>}
      </div>
    </Sheet>
  </ModalPage>
}

function FilaDenuncia({ d, ocupado, onAccion }: { d: Denuncia; ocupado: boolean; onAccion: (a: AccionDenuncia) => void }) {
  const { etiqueta, titulo, texto } = describirDenuncia(d)
  const acciones = accionesDenuncia(d)
  const estado = !d.vigente ? 'Ya no existe' : d.autorSuspendido ? `@${d.autor} ya está suspendido` : null
  return <li className="space-y-2 py-3">
    <p className="break-words text-caption text-fg-muted">{etiqueta} · {d.denuncias === 1 ? '1 denuncia' : `${formatInt(d.denuncias)} denuncias`} · {haceCuanto(d.creada, Date.now())}</p>
    {titulo && <p className="break-words text-body font-semibold text-fg">{titulo}</p>}
    {texto && <p className="line-clamp-4 whitespace-pre-wrap break-words text-body-sm text-fg">{texto}</p>}
    <p className="break-words text-caption text-fg-muted">{textoMotivos(d)}</p>
    {d.detalles.map((t, i) => <p key={i} className="break-words text-caption text-fg-muted">«{t}»</p>)}
    {estado && <p className="text-caption text-fg-muted">{estado}</p>}
    <div className="-ml-1 flex flex-wrap gap-1">
      {acciones.includes('borrar') && <Button variant="destructive" size="sm" disabled={ocupado} onClick={() => onAccion('borrar')}>Borrar</Button>}
      {acciones.includes('suspender_comunidad') && <Button variant="destructive" size="sm" disabled={ocupado} onClick={() => onAccion('suspender_comunidad')}>Suspender comunidad</Button>}
      {acciones.includes('cerrar') && <Button variant="destructive" size="sm" disabled={ocupado} onClick={() => onAccion('cerrar')}>Cerrar comunidad</Button>}
      {acciones.includes('suspender') && <Button variant="destructive" size="sm" disabled={ocupado} onClick={() => onAccion('suspender')}>Suspender a @{d.autor}</Button>}
      <Button variant="subtle" size="sm" disabled={ocupado} onClick={() => onAccion('descartar')}>Descartar</Button>
    </div>
  </li>
}
