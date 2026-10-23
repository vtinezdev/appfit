import { useEffect, useRef, useState } from 'react'
import Button, { IconButton } from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import ConfirmacionDestructiva from '../../../shared/components/ConfirmacionDestructiva'
import Icon from '../../../shared/components/Icon'
import ListRow from '../../../shared/components/ListRow'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import { startOfWeek, todayISO } from '../../../shared/lib/dates'
import { useVitrina } from '../../vitrina/hooks/useVitrina'
import { useAvatares } from '../hooks/useAvatares'
import { useConsulta } from '../hooks/useConsulta'
import { animosRecibidos, candidatos, conAnimo, hayQueSubir, heAnimado, plazasLibres, semanaPropia, situacion, textoSituacion, type Compania, type Companias, type InvitacionCompania, type SemanaCompanero } from '../lib/compania'
import { nombreVisible } from '../lib/relacion'
import { cargarSocial } from '../servicio'
import AvatarPersona from './AvatarPersona'

const QUE_SE_COMPARTE = 'Cada uno cuenta contra su propio plan de Ritmo. Del tuyo solo se comparte cómo va la semana («2 de 3», «Semana cumplida» o «En pausa»), mientras estés en un grupo: nada de kilos, kcal ni ranking.'

interface Props {
  /** Ir a Amigos (para seguir a alguien cuando aún no hay con quién). */
  onAmigos: () => void
  onError: (mensaje: string) => void
}

/**
 * Arriba de Siguiendo: la semana en compañía (ADR 057). Tus grupos de 2 o 3 personas, cada una con cómo va su semana
 * de Ritmo y «Ánimo»; las invitaciones que te esperan; e invitar, pausar o salir sin reproche. Solo si el servidor ya
 * lo tiene (`semanaCompania`, 0024). Al abrirlo, si tu semana cambió, se sube (solo el agregado y solo si estás dentro).
 */
export default function SemanaCompania(props: Props) {
  const capacidades = useConsulta(async () => (await cargarSocial()).capacidades(), 0)
  if (!capacidades.datos?.semanaCompania) return null
  return <ConCompania {...props} />
}

function ConCompania({ onAmigos, onError }: Props) {
  const [hoy] = useState(todayISO)
  const lunes = startOfWeek(hoy)
  const vitrina = useVitrina(hoy)
  const local = vitrina && 'resultado' in vitrina ? semanaPropia(vitrina.resultado.ritmo) : null
  const [version, setVersion] = useState(0)
  const consulta = useConsulta(async () => (await cargarSocial()).companias(), version, true)
  // Copia local para pintar el ánimo al momento; vuelve a la del servidor en cuanto llega otra lectura.
  const [copia, setCopia] = useState<{ de: Companias; datos: Companias } | null>(null)
  const datos = copia && copia.de === consulta.datos ? copia.datos : consulta.datos
  const [invitar, setInvitar] = useState<{ grupo?: Compania; n: number } | null>(null)
  const abrirInvitar = (grupo?: Compania) => setInvitar(i => ({ grupo, n: (i?.n ?? 0) + 1 }))
  const recargar = () => setVersion(v => v + 1)
  useSubirSemana(consulta.estado === 'listo' ? consulta.datos : undefined, local, recargar)
  const alias = datos ? [...new Set([...datos.grupos.flatMap(g => g.miembros.map(m => m.alias)), ...datos.invitaciones.flatMap(i => i.miembros.map(m => m.alias))])] : []
  const avatares = useAvatares(alias)

  if (!datos) {
    if (consulta.estado !== 'error') return null
    return <Card className="space-y-2">
      <ErrorState>No se ha podido cargar tu semana en compañía. {consulta.error}</ErrorState>
      <Button variant="secondary" size="sm" onClick={consulta.recargar}>Reintentar</Button>
    </Card>
  }

  const animar = async (g: Compania, para: string, dar: boolean) => {
    const base = datos
    setCopia({ de: consulta.datos!, datos: { ...base, grupos: base.grupos.map(x => x.id === g.id ? conAnimo(x, para, lunes, dar) : x) } })
    try { await (await cargarSocial()).animarCompanero(g.id, para, lunes, dar) }
    catch (e) { setCopia(null); onError(e instanceof Error ? e.message : 'No se ha podido dar ánimo.') }
  }

  const vacio = !datos.grupos.length && !datos.invitaciones.length
  return <Card className="space-y-3">
    {vacio ? (
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden className="flex h-touch w-touch shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg-muted"><Icon name="users" size={20} /></span>
        <p className="min-w-0 flex-1 basis-28">
          <span className="block break-words text-body-sm font-semibold text-fg">Semana en compañía</span>
          <span className="block break-words text-caption text-fg-muted">Con una o dos personas que os seguís</span>
        </p>
        <Button variant="secondary" size="sm" className="ml-auto" aria-haspopup="dialog" onClick={() => abrirInvitar()}>Empezar</Button>
      </div>
    ) : <h2 className="text-body-sm font-semibold text-fg">Semana en compañía</h2>}
    {datos.invitaciones.map(i => <Invitacion key={i.id} invitacion={i} avatares={avatares} onRespondida={recargar} />)}
    {datos.grupos.map(g => <Grupo key={g.id} grupo={g} lunes={lunes} local={local} sinRitmo={vitrina !== undefined && !local} avatares={avatares}
      onAnimar={(para, dar) => void animar(g, para, dar)} onInvitar={() => abrirInvitar(g)} onCambio={recargar} />)}
    {invitar && <InvitarSheet key={invitar.n} grupo={invitar.grupo} onClose={() => setInvitar(null)} onAmigos={onAmigos} onInvitado={recargar} />}
  </Card>
}

/** Sube tu semana si estás activo en un grupo y cambió; una sola vez por cada valor, para no repetir si algo falla. */
function useSubirSemana(datos: Companias | undefined, local: SemanaCompanero | null, onSubida: () => void) {
  const subida = useRef<string | null>(null)
  const clave = local ? `${local.lunes}:${local.hechas}:${local.objetivo}` : null
  useEffect(() => {
    if (!datos || !local || !clave || subida.current === clave || !hayQueSubir(datos, local)) return
    subida.current = clave
    void cargarSocial().then(s => s.subirSemanaCompania(local.lunes, local.hechas, local.objetivo)).then(onSubida, () => {})
    // `local` y `onSubida` cambian en cada render; lo que decide es el valor (`clave`) y lo leído del servidor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, clave])
}

function Grupo({ grupo: g, lunes, local, sinRitmo, avatares, onAnimar, onInvitar, onCambio }: {
  grupo: Compania; lunes: string; local: SemanaCompanero | null; sinRitmo: boolean; avatares: ReturnType<typeof useAvatares>
  onAnimar: (para: string, dar: boolean) => void; onInvitar: () => void; onCambio: () => void
}) {
  const [opciones, setOpciones] = useState(false)
  const yo = g.miembros.find(m => m.yo)!
  const otros = g.miembros.filter(m => !m.yo)
  const recibidos = animosRecibidos(g, lunes).map(a => nombreVisible(g.miembros.find(m => m.alias === a)!))
  const etiqueta = `Grupo con ${otros.map(nombreVisible).join(' y ')}`
  return <section aria-label={etiqueta} className="border-t border-line pt-1">
    <ul className="divide-y divide-line">
      {g.miembros.map(m => {
        // Tu fila, con la semana de tu móvil (la del servidor puede ir por detrás).
        const s = situacion(m.yo && m.estado === 'activo' && local ? { estado: 'activo', semana: local } : m, lunes)
        const animado = !m.yo && heAnimado(g, m.alias, lunes)
        // Con letra grande, los botones bajan a otra línea antes de estrechar el nombre.
        return <li key={m.alias} className="flex flex-wrap items-center gap-x-3 py-2">
          <div className="flex min-w-0 flex-1 basis-40 items-center gap-3">
          <AvatarPersona persona={m} avatar={avatares[m.alias]} tamano="sm" />
          <p className="min-w-0 flex-1">
            <span className="block break-words text-body-sm font-semibold text-fg">{m.yo ? 'Tú' : nombreVisible(m)}</span>
            <span className="flex items-center gap-1 break-words text-caption tabular text-fg-muted">
              {s.tipo === 'cumplida' && <Icon name="check" size={14} />}
              {m.yo && sinRitmo && m.estado === 'activo' ? 'Sin Ritmo: tu semana no se cuenta' : textoSituacion(s)}
            </span>
            {m.yo && recibidos.length > 0 && <span className="block break-words text-caption text-fg-muted">Ánimo de {recibidos.join(' y ')}</span>}
          </p>
          </div>
          {m.yo && <IconButton className="ml-auto" icon="more" label={`Opciones del grupo con ${otros.map(nombreVisible).join(' y ')}`} variant="ghost" aria-haspopup="dialog" onClick={() => setOpciones(true)} />}
          {!m.yo && m.estado !== 'invitado' && yo.estado !== 'invitado' && (
            <button type="button" aria-pressed={animado} aria-label={`${animado ? 'Quitar ánimo a' : 'Dar ánimo a'} ${nombreVisible(m)}`} onClick={() => onAnimar(m.alias, !animado)}
              className={`app-button ml-auto inline-flex h-touch w-touch shrink-0 items-center justify-center rounded-md hover:bg-surface-muted ${animado ? 'text-accent-strong' : 'text-fg-muted'}`}>
              <Icon name="llama" size={22} className={animado ? 'fill-current' : ''} />
            </button>
          )}
        </li>
      })}
    </ul>
    <OpcionesGrupo open={opciones} grupo={g} enPausa={yo.estado === 'pausa'} onClose={() => setOpciones(false)} onInvitar={onInvitar} onCambio={onCambio} />
  </section>
}

function OpcionesGrupo({ open, grupo: g, enPausa, onClose, onInvitar, onCambio }: { open: boolean; grupo: Compania; enPausa: boolean; onClose: () => void; onInvitar: () => void; onCambio: () => void }) {
  const [salir, setSalir] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const siguiente = useRef<(() => void) | null>(null)
  const hacer = async (accion: () => Promise<void>) => {
    setOcupado(true); setError(null)
    try { await accion(); siguiente.current = onCambio; onClose() }
    catch (e) { setError(e instanceof Error ? e.message : 'No se ha podido hacer.') }
    finally { setOcupado(false) }
  }
  return <Sheet open={open} title="Tu grupo" onClose={() => { setSalir(false); onClose() }}
    onExited={() => { const fn = siguiente.current; siguiente.current = null; setSalir(false); fn?.() }}>
    <div className="space-y-stack">
      <p className="text-body-sm text-fg-muted">{QUE_SE_COMPARTE} Pausar o salir no avisa a nadie.</p>
      {error && <ErrorState>{error}</ErrorState>}
      <ul className="divide-y divide-line">
        {plazasLibres(g) > 0 && <li><ListRow tone="flat" disabled={ocupado} aria-haspopup="dialog" onClick={() => { siguiente.current = onInvitar; onClose() }}>
          <span className="flex items-center gap-3 text-body text-fg"><Icon name="plus" size={20} />Invitar a alguien</span>
        </ListRow></li>}
        <li><ListRow tone="flat" disabled={ocupado} onClick={() => void hacer(async () => (await cargarSocial()).pausarCompania(g.id, !enPausa))}>
          <span className="flex items-center gap-3 text-body text-fg"><Icon name={enPausa ? 'play' : 'pause'} size={20} />{enPausa ? 'Volver a contar mi semana' : 'Pausar mi semana'}</span>
        </ListRow></li>
        <li>{salir
          ? <div className="py-3"><ConfirmacionDestructiva mensaje="Saldrás del grupo y dejarás de ver cómo van. Las demás personas siguen; no se avisa a nadie." confirmar="Salir del grupo" ocupado={ocupado}
              onCancelar={() => setSalir(false)} onConfirmar={() => void hacer(async () => (await cargarSocial()).salirCompania(g.id))} /></div>
          : <ListRow tone="flat" disabled={ocupado} onClick={() => setSalir(true)}>
              <span className="flex items-center gap-3 text-body text-destructive"><Icon name="close" size={20} />Salir del grupo</span>
            </ListRow>}
        </li>
      </ul>
    </div>
  </Sheet>
}

function Invitacion({ invitacion: i, avatares, onRespondida }: { invitacion: InvitacionCompania; avatares: ReturnType<typeof useAvatares>; onRespondida: () => void }) {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const quien = i.miembros.find(m => m.alias === i.de) ?? i.miembros[0]
  const demas = i.miembros.filter(m => m !== quien)
  const responder = async (aceptar: boolean) => {
    setOcupado(true); setError(null)
    try { await (await cargarSocial()).responderCompania(i.id, aceptar); onRespondida() }
    catch (e) { setError(e instanceof Error ? e.message : 'No se ha podido responder.'); setOcupado(false) }
  }
  return <div className="space-y-2 border-t border-line pt-3">
    <div className="flex items-center gap-3">
      <AvatarPersona persona={quien} avatar={avatares[quien.alias]} tamano="sm" />
      <p className="min-w-0 flex-1">
        <span className="block break-words text-body-sm font-semibold text-fg">{nombreVisible(quien)} te invita a acompañaros</span>
        {demas.length > 0 && <span className="block break-words text-caption text-fg-muted">También está {demas.map(nombreVisible).join(' y ')}</span>}
      </p>
    </div>
    <p className="text-caption text-fg-muted">{QUE_SE_COMPARTE}</p>
    {error && <ErrorState>{error}</ErrorState>}
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" className="flex-1" disabled={ocupado} onClick={() => void responder(false)}>Rechazar</Button>
      <Button size="sm" className="flex-1" disabled={ocupado} onClick={() => void responder(true)}>Aceptar</Button>
    </div>
  </div>
}

function InvitarSheet({ grupo, onClose, onAmigos, onInvitado }: { grupo?: Compania; onClose: () => void; onAmigos: () => void; onInvitado: () => void }) {
  const [open, setOpen] = useState(true)
  const personas = useConsulta(async () => (await cargarSocial()).personas('siguiendo'), 0)
  const [elegidos, setElegidos] = useState<string[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [id] = useState(() => grupo?.id ?? crypto.randomUUID())
  const despues = useRef<(() => void) | null>(null)
  const plazas = plazasLibres(grupo)
  const lista = personas.datos ? candidatos(personas.datos, grupo) : []
  const cerrar = (fn?: () => void) => { despues.current = fn ?? null; setOpen(false) }
  const enviar = async () => {
    setOcupado(true); setError(null)
    try {
      const social = await cargarSocial()
      for (const alias of elegidos) await social.invitarCompania(id, alias)
      cerrar(onInvitado)
    } catch (e) { setError(e instanceof Error ? e.message : 'No se ha podido invitar.') }
    finally { setOcupado(false) }
  }
  return <Sheet open={open} title={grupo ? 'Invitar al grupo' : 'Semana en compañía'} onClose={() => cerrar()}
    onExited={() => { const fn = despues.current; onClose(); fn?.() }}
    footer={lista.length > 0 ? <Button block disabled={!elegidos.length} loading={ocupado} onClick={() => void enviar()}>Invitar</Button> : undefined}>
    <div className="space-y-stack">
      <p className="text-body-sm text-fg-muted">{QUE_SE_COMPARTE} Sigue semana tras semana hasta que alguien sale.</p>
      {error && <ErrorState>{error}</ErrorState>}
      {personas.estado === 'error' && <div className="space-y-2"><ErrorState>{personas.error}</ErrorState><Button variant="secondary" onClick={personas.recargar}>Reintentar</Button></div>}
      {personas.estado === 'listo' && !lista.length && <div className="space-y-2">
        <p className="text-body-sm text-fg">{grupo ? 'No queda nadie más que os sigáis mutuamente.' : 'Aún no os seguís mutuamente con nadie.'}</p>
        <p className="text-caption text-fg-muted">Cuando alguien acepta tu solicitud, os seguís los dos.</p>
        <Button variant="secondary" onClick={() => cerrar(onAmigos)}>Ir a Amigos</Button>
      </div>}
      {lista.length > 0 && <fieldset className="space-y-1">
        <legend className="text-label text-fg-muted">{plazas > 1 ? 'Elige una o dos personas' : 'Elige una persona'}</legend>
        {lista.map(p => {
          const marcado = elegidos.includes(p.alias)
          return <label key={p.alias} className="flex min-h-touch items-center gap-3 text-body text-fg">
            <input type="checkbox" className="h-5 w-5 shrink-0 accent-accent" checked={marcado} disabled={ocupado || (!marcado && elegidos.length >= plazas)}
              onChange={e => setElegidos(es => e.target.checked ? [...es, p.alias] : es.filter(a => a !== p.alias))} />
            <span className="min-w-0 break-words">{nombreVisible(p)}{p.nombre && <span className="text-caption text-fg-muted"> · @{p.alias}</span>}</span>
          </label>
        })}
      </fieldset>}
    </div>
  </Sheet>
}
