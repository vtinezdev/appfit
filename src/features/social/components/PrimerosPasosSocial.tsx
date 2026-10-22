import { useId, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { IconButton } from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import ListRow from '../../../shared/components/ListRow'
import ProgressBar from '../../../shared/components/ProgressBar'
import { getSettings, updateSettings } from '../../../shared/db/settings'
import { formatInt } from '../../../shared/lib/format'
import { marcarPistaVista, pistaPendiente } from '../../../shared/lib/pistas'
import { ultimoTerminado } from '../../gym/data/workoutsRepo'
import { useConsulta } from '../hooks/useConsulta'
import { primerosPasos, type IdPaso } from '../lib/primerosPasos'
import { cargarSocial } from '../servicio'

const TEXTOS: Record<IdPaso, { accion: string; hecho: string }> = {
  codigo: { accion: 'Comparte tu código', hecho: 'Ya tienes seguidores' },
  comunidad: { accion: 'Únete a una comunidad', hecho: 'Ya eres miembro' },
  entreno: { accion: 'Comparte tu último entreno', hecho: 'Compartido' },
}

interface Props { version: number; onCodigo: () => void; onComunidades: () => void; onEntreno: (id?: number) => void; onError: (mensaje: string) => void }

/** Primeros pasos plegados con su progreso real; al ampliar, las tres acciones. La X los cierra para siempre (pista vista). */
export default function PrimerosPasosSocial({ version, onCodigo, onComunidades, onEntreno, onError }: Props) {
  const [abierto, setAbierto] = useState(false)
  const id = useId()
  const local = useLiveQuery(async () => ({ settings: await getSettings(), entreno: await ultimoTerminado() }), [])
  const remoto = useConsulta(async () => {
    const social = await cargarSocial()
    const [seguidores, comunidades] = await Promise.all([social.personas('seguidores'), social.comunidades('', true)])
    return { codigo: seguidores.some(p => p.meSigue === 'aceptado'), comunidad: comunidades.some(c => c.unida) }
  }, version)
  if (!local || !pistaPendiente(local.settings.pistasVistas, 'social-primeros-pasos')) return null
  const cerrar = () => updateSettings({ pistasVistas: marcarPistaVista(local.settings.pistasVistas, 'social-primeros-pasos') }).catch(() => onError('No se ha podido guardar el ajuste. Inténtalo de nuevo.'))
  const { pasos, hechos, total } = primerosPasos({ codigo: remoto.datos?.codigo, comunidad: remoto.datos?.comunidad, entreno: !!local.entreno?.publicacion })
  const acciones: Record<IdPaso, () => void> = { codigo: onCodigo, comunidad: onComunidades, entreno: () => onEntreno(local.entreno?.id) }
  const progreso = hechos === null ? null : `${formatInt(hechos)} de ${formatInt(total)}`

  return <Card className="space-y-2">
    {/* Con texto grande la X baja de línea en vez de partir el título. */}
    <div className="flex flex-wrap items-center gap-1">
      <button type="button" aria-expanded={abierto} aria-controls={id} onClick={() => setAbierto(!abierto)}
        className="app-button flex min-h-touch min-w-0 flex-1 basis-40 flex-wrap items-center gap-x-3 rounded-md text-left">
        <span className="text-body font-semibold text-fg">Primeros pasos</span>
        {progreso && <span className="tabular text-body-sm text-fg-muted">{progreso}</span>}
        <Icon name="chevron-right" size={18} className={`ml-auto shrink-0 text-fg-muted transition-transform duration-short motion-reduce:transition-none ${abierto ? 'rotate-90' : ''}`} />
      </button>
      <IconButton icon="close" label="Cerrar primeros pasos" variant="ghost" className="ml-auto" onClick={() => void cerrar()} />
    </div>
    {hechos !== null && <ProgressBar value={hechos} goal={total} colorClass="bg-fg" label="Primeros pasos hechos" valueText={progreso ?? undefined} />}
    <ul id={id} hidden={!abierto} className="divide-y divide-line">
      {pasos.map((p) => <li key={p.id}>
        <ListRow tone="flat" className="justify-start" onClick={acciones[p.id]}>
          <span className="flex min-w-0 items-center gap-3">
            <Icon name={p.hecho ? 'check' : 'plus'} size={18} className={`shrink-0 ${p.hecho ? 'text-accent-strong' : 'text-fg-muted'}`} />
            <span className="min-w-0">
              <span className="block break-words text-body-sm font-semibold text-fg">{TEXTOS[p.id].accion}</span>
              {p.hecho && <span className="block break-words text-caption text-fg-muted">{TEXTOS[p.id].hecho}</span>}
            </span>
          </span>
        </ListRow>
      </li>)}
    </ul>
  </Card>
}
