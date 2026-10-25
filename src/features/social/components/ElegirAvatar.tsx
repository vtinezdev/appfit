import { useState, type ReactNode } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import Sheet from '../../../shared/components/Sheet'
import ViewTabs from '../../../shared/components/ViewTabs'
import { EmptyState, LoadingState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'
import IconoLogro from '../../vitrina/components/IconoLogro'
import type { EstadoVitrina } from '../../vitrina/hooks/useVitrina'
import { conseguido, type Logro } from '../../vitrina/lib/logros'
import { DISCIPLINAS_AVATAR, estadoPaisajes, logrosPorGrupo, mismoAvatar, nombreAvatar, TONO_INICIAL, TONOS_AVATAR, type Avatar, type AvatarExclusivo, type TonoAvatar } from '../lib/avatar'
import { imagenAvatarExclusivo } from '../lib/imagenAvatarExclusivo'
import ArteAvatar from './ArteAvatar'
import AvatarPersona from './AvatarPersona'

type Pestana = 'paisajes' | 'disciplinas' | 'logros'
const PESTANAS: { valor: Pestana; label: string }[] = [
  { valor: 'paisajes', label: 'Paisajes' }, { valor: 'disciplinas', label: 'Disciplinas' }, { valor: 'logros', label: 'Logros' },
]

interface Props {
  persona: { alias: string; nombre: string | null }
  avatar: Avatar | null
  onChange: (avatar: Avatar | null) => void
  exclusivos: AvatarExclusivo[]
}

interface PropsElegir extends Props {
  /** La Vitrina del dispositivo, para saber qué está desbloqueado (`undefined` mientras carga). */
  vitrina: EstadoVitrina | undefined
}

/**
 * «Avatar» del perfil deportivo: en el formulario, la cara actual y «Cambiar avatar»; el catálogo entero (paisajes,
 * disciplinas y logros, con lo que falta por desbloquear) se elige en una hoja. Se guarda con «Guardar perfil».
 */
export default function ElegirAvatar({ persona, avatar, onChange, vitrina: estado, exclusivos }: PropsElegir) {
  const [abierta, setAbierta] = useState(false)
  // Sin Vitrina (desactivada en Ajustes) no hay paisajes ni logros que desbloquear; los exclusivos dependen de la cuenta.
  const logros = estado?.visible ? estado.vitrina.logros : []
  return <div className="space-y-2">
    <p className="text-label text-fg-muted">Avatar</p>
    <div className="flex items-center gap-3">
      <AvatarPersona persona={persona} avatar={avatar} />
      <p className="min-w-0 flex-1 break-words text-body-sm text-fg">{nombreAvatar(avatar, logros)}</p>
    </div>
    <Button variant="secondary" block aria-haspopup="dialog" onClick={() => setAbierta(true)}>Cambiar avatar<Icon name="chevron-right" size={18} /></Button>
    <Sheet open={abierta} onClose={() => setAbierta(false)} title="Avatar" footer={<Button block onClick={() => setAbierta(false)}>Hecho</Button>}>
      <Catalogo persona={persona} avatar={avatar} onChange={onChange} exclusivos={exclusivos} estado={estado === undefined ? 'cargando' : estado.visible ? 'lista' : 'sin-vitrina'} logros={logros} />
    </Sheet>
  </div>
}

function Catalogo({ persona, avatar, onChange, exclusivos, estado, logros }: Props & { estado: 'cargando' | 'lista' | 'sin-vitrina'; logros: Logro[] }) {
  const [pestana, setPestana] = useState<Pestana>(avatar?.tipo === 'paisaje' ? 'paisajes' : avatar?.tipo === 'logro' ? 'logros' : 'disciplinas')
  const [tono, setTono] = useState<TonoAvatar>(avatar?.tipo === 'disciplina' ? avatar.tono : TONO_INICIAL)
  const elegirTono = (t: TonoAvatar) => {
    setTono(t)
    if (avatar?.tipo === 'disciplina') onChange({ ...avatar, tono: t })
  }
  const elegido = (a: Avatar) => mismoAvatar(a, avatar)
  const paisajes = estadoPaisajes(logros)
  const grupos = logrosPorGrupo(logros)
  const conseguidos = logros.filter(conseguido).length
  const personales = exclusivos.flatMap(a => {
    const imagen = imagenAvatarExclusivo(a)
    return imagen ? [{ avatar: a, imagen }] : []
  })

  return <div className="avatar-catalogo space-y-stack">
    <div className="flex items-center gap-3">
      <AvatarPersona persona={persona} avatar={avatar} tamano="lg" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="break-words text-body font-semibold text-fg" aria-live="polite">{nombreAvatar(avatar, logros)}</p>
        <p className="text-caption text-fg-muted">Se guarda con «Guardar perfil». Lo ve cualquiera que vea tu nombre en Social.</p>
      </div>
    </div>
    <Button variant="ghost" size="sm" aria-pressed={avatar === null} onClick={() => onChange(null)}>
      {avatar === null && <Icon name="check" size={18} />}Usar mis iniciales
    </Button>

    {personales.length > 0 && <section className="space-y-2" aria-label="Tus avatares exclusivos">
      <h3 className="text-rotulo text-fg-muted">Solo para ti</h3>
      <Rejilla etiqueta="Tus avatares exclusivos">
        {personales.map(({ avatar: a, imagen }) => <Opcion key={a.id} nombre={nombreAvatar(a)} elegido={elegido(a)} onElegir={() => onChange(a)}
          cara={<img src={imagen} alt="" className="h-full w-full object-cover" />} circular />)}
      </Rejilla>
    </section>}

    <ViewTabs opciones={PESTANAS} valor={pestana} onChange={setPestana} label="Tipo de avatar">
      {pestana === 'disciplinas' && <div className="space-y-stack">
        <fieldset className="space-y-2">
          <legend className="text-label text-fg-muted">Color de fondo</legend>
          <div className="flex flex-wrap gap-2">
            {TONOS_AVATAR.map(t => <button key={t.id} type="button" aria-pressed={tono === t.id} aria-label={t.nombre} onClick={() => elegirTono(t.id)}
              className="avatar-tono app-button flex min-h-touch min-w-touch items-center justify-center rounded-pill">
              <span aria-hidden className={`avatar-tono-muestra avatar-tono-${t.id} rounded-pill`} />
            </button>)}
          </div>
        </fieldset>
        <Rejilla etiqueta="Disciplinas">
          {DISCIPLINAS_AVATAR.map(d => {
            const a: Avatar = { tipo: 'disciplina', disciplina: d.id, tono }
            return <Opcion key={d.id} nombre={d.nombre} elegido={elegido(a)} onElegir={() => onChange(a)} cara={<ArteAvatar avatar={a} />} circular />
          })}
        </Rejilla>
      </div>}

      {pestana === 'paisajes' && (estado === 'cargando' ? <LoadingState /> : <div className="space-y-stack">
        <p className="tabular text-body-sm text-fg-muted">{formatInt(paisajes.filter(p => p.desbloqueado).length)} de {formatInt(paisajes.length)} desbloqueados. Cada uno se gana con un logro de la Vitrina.</p>
        {estado === 'sin-vitrina' && <SinVitrina />}
        <Rejilla etiqueta="Paisajes">
          {paisajes.map(p => {
            const a: Avatar = { tipo: 'paisaje', paisaje: p.id }
            return <Opcion key={p.id} nombre={p.nombre} detalle={p.desbloqueado ? undefined : p.requisito} bloqueado={!p.desbloqueado}
              elegido={elegido(a)} onElegir={() => onChange(a)} cara={<ArteAvatar avatar={a} />} circular />
          })}
        </Rejilla>
      </div>)}

      {pestana === 'logros' && (estado === 'cargando' ? <LoadingState /> : estado === 'sin-vitrina' ? <SinVitrina /> : <div className="space-y-section">
        <p className="tabular text-body-sm text-fg-muted">{formatInt(conseguidos)} de {formatInt(logros.length)} conseguidos.</p>
        {grupos.map(g => <section key={g.grupo} className="space-y-2" aria-label={g.nombre}>
          <h3 className="text-rotulo text-fg-muted">{g.nombre}</h3>
          <Rejilla etiqueta={g.nombre}>
            {g.logros.map(l => {
              const hecho = conseguido(l)
              const a: Avatar = { tipo: 'logro', logro: l.id, grupo: l.grupo }
              // Un oculto sin conseguir no enseña ni su nombre (como en la Vitrina).
              const nombre = l.oculto && !hecho ? 'Logro oculto' : l.nombre
              return <Opcion key={l.id} nombre={nombre} detalle={hecho ? undefined : 'Sin conseguir'} bloqueado={!hecho}
                elegido={elegido(a)} onElegir={() => onChange(a)} cara={<IconoLogro logro={l} />} />
            })}
          </Rejilla>
        </section>)}
      </div>)}
    </ViewTabs>
  </div>
}

function SinVitrina() {
  return <EmptyState>La Vitrina está desactivada en Ajustes. Actívala para desbloquear paisajes y usar tus logros.</EmptyState>
}

function Rejilla({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return <ul aria-label={etiqueta} className="avatar-rejilla grid grid-cols-3 gap-2">{children}</ul>
}

interface OpcionProps {
  nombre: string
  /** Lo que pide si está bloqueado. */
  detalle?: string
  bloqueado?: boolean
  elegido: boolean
  onElegir: () => void
  cara: ReactNode
  /** Arte cuadrado que se recorta en círculo (disciplinas y paisajes); los logros llevan su propia silueta. */
  circular?: boolean
}

function Opcion({ nombre, detalle, bloqueado = false, elegido, onElegir, cara, circular = false }: OpcionProps) {
  return <li className="min-w-0">
    <button type="button" aria-pressed={elegido} aria-disabled={bloqueado || undefined} onClick={bloqueado ? undefined : onElegir}
      className="avatar-opcion app-button flex w-full min-w-0 flex-col items-center gap-1.5 rounded-md p-1.5 text-center">
      <span aria-hidden className={`avatar-opcion-cara ${circular ? 'overflow-hidden rounded-pill' : ''} ${circular && bloqueado ? 'avatar-opcion-bloqueada' : ''}`}>{cara}</span>
      <span className="w-full break-words text-caption font-semibold leading-tight text-fg">{nombre}</span>
      {detalle && <span className="w-full break-words text-caption leading-tight text-fg-muted">{detalle}</span>}
    </button>
  </li>
}
