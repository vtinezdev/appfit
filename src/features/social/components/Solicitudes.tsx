import { useState } from 'react'
import Button from '../../../shared/components/Button'
import ListGroup from '../../../shared/components/ListGroup'
import SectionHeader from '../../../shared/components/SectionHeader'
import { formatInt } from '../../../shared/lib/format'
import { useAvatares } from '../hooks/useAvatares'
import { useConsulta } from '../hooks/useConsulta'
import { cargarSocial } from '../servicio'
import type { Persona } from '../lib/relacion'
import AvatarPersona from './AvatarPersona'
import NombrePersona from './NombrePersona'

interface Props {
  version: number
  onAbrir: (persona: Persona) => void
  onCambio: () => void
  onError: (mensaje: string) => void
  /** `hoja`: dentro de Avisos, como rótulo y sobre `surface-muted`; `pagina`: sección de Amigos. */
  variante?: 'pagina' | 'hoja'
}

/** Solicitudes recibidas, arriba de todo y solo si hay: aceptar o rechazar en la propia fila. */
export default function Solicitudes({ version, onAbrir, onCambio, onError, variante = 'pagina' }: Props) {
  const consulta = useConsulta(async () => (await cargarSocial()).personas('solicitudes'), version)
  const [ocupada, setOcupada] = useState<string | null>(null)
  const lista = consulta.datos ?? []
  const avatares = useAvatares(lista.map(p => p.alias))
  if (lista.length === 0) return null

  async function responder(alias: string, aceptar: boolean) {
    setOcupada(alias)
    try {
      await (await cargarSocial()).responderSolicitud(alias, aceptar)
      onCambio()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se ha podido responder. Inténtalo de nuevo.')
    } finally {
      setOcupada(null)
    }
  }

  const filas = lista.map((p) => (
    <li key={p.alias} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
      {/* Con poco ancho, los botones pasan debajo en lugar de estrujar el nombre. */}
      <button type="button" className="app-button flex min-h-touch min-w-0 grow basis-48 items-center gap-3 rounded-md text-left" onClick={() => onAbrir(p)}>
        <AvatarPersona persona={p} avatar={avatares[p.alias]} tamano="sm" />
        <NombrePersona persona={p} detalle="Quiere seguirte" />
      </button>
      <div className="ml-auto flex gap-1">
        <Button variant="subtle" size="sm" disabled={ocupada !== null} onClick={() => void responder(p.alias, false)}>Rechazar</Button>
        <Button variant="secondary" size="sm" loading={ocupada === p.alias} disabled={ocupada !== null} onClick={() => void responder(p.alias, true)}>Aceptar</Button>
      </div>
    </li>
  ))

  if (variante === 'hoja') {
    return <section className="space-y-1 rounded-md bg-surface-muted px-3 py-2" aria-label="Solicitudes">
      <h3 className="text-rotulo text-fg-muted">Solicitudes · {formatInt(lista.length)}</h3>
      <ul className="divide-y divide-line">{filas}</ul>
    </section>
  }
  return (
    <section className="space-y-3" aria-label="Solicitudes">
      <SectionHeader variant="section">Solicitudes</SectionHeader>
      <ListGroup>{filas}</ListGroup>
    </section>
  )
}
