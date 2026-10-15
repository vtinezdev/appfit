import { useState } from 'react'
import Button from '../../../shared/components/Button'
import ListGroup from '../../../shared/components/ListGroup'
import SectionHeader from '../../../shared/components/SectionHeader'
import { useConsulta } from '../hooks/useConsulta'
import { cargarSocial } from '../servicio'
import type { Persona } from '../lib/relacion'
import NombrePersona from './NombrePersona'

interface Props {
  version: number
  onAbrir: (persona: Persona) => void
  onCambio: () => void
  onError: (mensaje: string) => void
}

/** Solicitudes recibidas, arriba de todo y solo si hay: aceptar o rechazar sin abrir la persona. */
export default function Solicitudes({ version, onAbrir, onCambio, onError }: Props) {
  const consulta = useConsulta(async () => (await cargarSocial()).personas('solicitudes'), version)
  const [ocupada, setOcupada] = useState<string | null>(null)
  const lista = consulta.datos ?? []
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

  return (
    <section className="space-y-3" aria-label="Solicitudes">
      <SectionHeader variant="section">Solicitudes</SectionHeader>
      <ListGroup>
        {lista.map((p) => (
          <li key={p.alias} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
            {/* Con poco ancho, los botones pasan debajo en lugar de estrujar el nombre. */}
            <button type="button" className="app-button min-h-touch min-w-0 grow basis-48 text-left" onClick={() => onAbrir(p)}>
              <NombrePersona persona={p} detalle="Quiere seguirte" />
            </button>
            <div className="ml-auto flex gap-1">
              <Button variant="subtle" size="sm" disabled={ocupada !== null} onClick={() => void responder(p.alias, false)}>Rechazar</Button>
              <Button variant="primary" size="sm" loading={ocupada === p.alias} disabled={ocupada !== null} onClick={() => void responder(p.alias, true)}>Aceptar</Button>
            </div>
          </li>
        ))}
      </ListGroup>
    </section>
  )
}
