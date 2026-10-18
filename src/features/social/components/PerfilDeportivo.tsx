import type { ReactNode } from 'react'
import { formatInt } from '../../../shared/lib/format'
import { leerResumen } from '../lib/publicacion'
import { nombreVisible } from '../lib/relacion'
import { useConsulta } from '../hooks/useConsulta'
import { cargarSocial } from '../servicio'
import type { PerfilDeportivo as Datos } from '../data/social'
import IconoLogro from '../../vitrina/components/IconoLogro'
import { ErrorState } from '../../../shared/components/StateMessage'
import Button from '../../../shared/components/Button'
import AvatarPersona from './AvatarPersona'

export const DISCIPLINAS = { fuerza: 'Fuerza', caminar: 'Caminar', correr: 'Correr', senderismo: 'Senderismo' }

interface CabeceraProps {
  persona: { alias: string; nombre: string | null }
  /** Sin perfil deportivo aún (cargando o sin leer): solo la identidad. */
  perfil?: Datos
  /** «Os seguís», «Te sigue»… */
  relacion?: string | null
  /** El botón de la relación o «Editar perfil», bajo las cifras. */
  acciones?: ReactNode
}

/**
 * La cabecera de un perfil (el de otra persona o «Así te ven»): insignia o monograma grande, nombre, alias y relación,
 * biografía, disciplinas, dos cifras (solo lo compartido, no el historial) y los logros destacados como medallas.
 */
export function CabeceraPerfil({ persona, perfil, relacion, acciones }: CabeceraProps) {
  const avatar = perfil ? leerResumen(perfil.avatar) : null
  const segunda = [persona.nombre && `@${persona.alias}`, relacion].filter(Boolean).join(' · ')
  const disciplinas = (perfil?.disciplinas ?? []).map(d => DISCIPLINAS[d as keyof typeof DISCIPLINAS]).filter(Boolean)
  const destacados = (perfil?.destacados ?? []).flatMap(p => { const r = leerResumen(p.resumen); return r?.tipo === 'logro' ? [{ id: p.id, r }] : [] })
  return <div className="space-y-section">
    <div className="flex flex-col items-center gap-3 text-center">
      <AvatarPersona persona={persona} logro={avatar?.tipo === 'logro' ? avatar : undefined} tamano="lg" />
      <div className="min-w-0 max-w-full">
        <p className="break-words text-heading text-fg">{nombreVisible(persona)}</p>
        {segunda && <p className="break-words text-body-sm text-fg-muted">{segunda}</p>}
      </div>
      {perfil?.bio && <p className="max-w-prose whitespace-pre-wrap break-words text-body-sm text-fg">{perfil.bio}</p>}
      {disciplinas.length > 0 && <ul aria-label="Disciplinas" className="flex flex-wrap justify-center gap-2">{disciplinas.map(d => <li key={d} className="rounded-pill bg-surface-muted px-3 py-1 text-body-sm font-semibold text-fg">{d}</li>)}</ul>}
      {perfil && <dl className="cifras-filetes grid w-full max-w-xs grid-cols-2 text-center">
        <div className="min-w-0"><dt className="sr-only">Publicaciones compartidas</dt><dd className="font-numeric text-heading tabular text-fg">{formatInt(perfil.publicadas)}</dd><dd aria-hidden className="text-caption text-fg-muted">{perfil.publicadas === 1 ? 'compartida' : 'compartidas'}</dd></div>
        <div className="min-w-0"><dt className="sr-only">Logros destacados</dt><dd className="font-numeric text-heading tabular text-fg">{formatInt(destacados.length)}</dd><dd aria-hidden className="text-caption text-fg-muted">{destacados.length === 1 ? 'logro destacado' : 'logros destacados'}</dd></div>
      </dl>}
      {acciones && <div className="w-full">{acciones}</div>}
    </div>
    {destacados.length > 0 && <section aria-label="Logros destacados" className="space-y-3">
      <h2 className="text-rotulo text-fg-muted">Logros destacados</h2>
      <ul className="flex flex-wrap justify-center gap-4">
        {destacados.map(({ id, r }) => <li key={id} className="flex w-24 min-w-0 flex-col items-center gap-2 text-center">
          <IconoLogro alcanzado logro={{ id: r.logroId, grupo: r.grupo, nombre: r.titulo, descripcion: r.descripcion, niveles: [] }} />
          <span className="break-words text-caption text-fg">{r.titulo}</span>
        </li>)}
      </ul>
    </section>}
  </div>
}

/** El perfil deportivo de alguien, leído del servidor; mientras llega, su identidad. */
export default function PerfilDeportivo({ persona, comunidad, relacion, acciones }: Omit<CabeceraProps, 'perfil'> & { comunidad?: string }) {
  const consulta = useConsulta(async () => (await cargarSocial()).perfilDeportivo(persona.alias, comunidad), `${persona.alias}-${comunidad}`)
  return <div className="space-y-stack">
    <CabeceraPerfil persona={persona} perfil={consulta.datos} relacion={relacion} acciones={acciones} />
    {consulta.estado === 'error' && <div className="space-y-2"><ErrorState>{consulta.error}</ErrorState><Button variant="secondary" size="sm" onClick={consulta.recargar}>Reintentar perfil</Button></div>}
  </div>
}
