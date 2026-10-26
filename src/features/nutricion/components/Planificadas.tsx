import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button, { IconButton } from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import SectionHeader from '../../../shared/components/SectionHeader'
import type { Aviso } from '../../../shared/hooks/useAviso'
import type { Comida } from '../../../shared/db/types'
import { formatInt } from '../../../shared/lib/format'
import { congelarObjetivoDia } from '../../perfil/data/objetivosDiaRepo'
import * as planificadasRepo from '../data/planificadasRepo'
import { nombreComida } from '../lib/comidas'
import { agruparPlanificadas, nombreDia, type GrupoPlanificado } from '../lib/planificadas'

/**
 * «Lo he comido»: pasa esa comida planificada al diario y congela el objetivo del día, como al registrar.
 * `null` si no había nada que pasar.
 */
export async function marcarComido(fecha: string, comida: Comida, hoy: string): Promise<planificadasRepo.Comido | null> {
  const hecho = await planificadasRepo.loHeComido(fecha, comida, hoy)
  if (hecho.entradas.length === 0) return null
  void congelarObjetivoDia(fecha, hoy)
  return hecho
}

/**
 * Al pie del Diario de hoy: lo planificado para hoy (y lo de días pasados que quedó sin marcar), atenuado y fuera de
 * los totales hasta «Lo he comido». Planificar y la lista de la compra viven en la vista Plan.
 */
export default function Planificadas({ hoy, avisar, avisarError, onVerPlan }: { hoy: string; avisar: (aviso: Aviso) => void; avisarError: (mensaje: string) => void; onVerPlan: () => void }) {
  const filas = useLiveQuery(() => planificadasRepo.hastaFecha(hoy), [hoy])
  const [ocupado, setOcupado] = useState<string | null>(null)
  if (!filas?.length) return null
  const grupos = agruparPlanificadas(filas)
  const claveGrupo = (g: GrupoPlanificado) => `${g.fecha}|${g.comida}`
  const tituloGrupo = (g: GrupoPlanificado) => `${nombreDia(g.fecha, hoy)} · ${nombreComida(g.comida)}`

  async function comido(g: GrupoPlanificado) {
    if (ocupado) return
    setOcupado(claveGrupo(g))
    try {
      const hecho = await marcarComido(g.fecha, g.comida, hoy)
      if (hecho) avisar({ mensaje: `Añadida a ${nombreComida(g.comida).toLowerCase()}`, onDeshacer: () => planificadasRepo.deshacerComido(hecho) })
    } catch {
      avisarError('No se ha podido añadir. Inténtalo de nuevo.')
    } finally {
      setOcupado(null)
    }
  }

  async function quitar(g: GrupoPlanificado) {
    try {
      const borradas = await planificadasRepo.borrar(g.filas.map((f) => f.id))
      if (borradas.length) avisar({ mensaje: `Quitada la planificada de ${tituloGrupo(g).toLowerCase()}`, onDeshacer: () => planificadasRepo.restaurar(borradas) })
    } catch {
      avisarError('No se ha podido quitar. Inténtalo de nuevo.')
    }
  }

  return (
    <section aria-label="Comidas planificadas" className="space-y-2">
      <SectionHeader variant="section" action={<Button variant="subtle" size="sm" onClick={onVerPlan}><Icon name="calendar" size={18} />Ver plan</Button>}>Planificado para hoy</SectionHeader>
      <ListGroup variante="plana" aria-label="Lo planificado">
        {grupos.map((g) => <li key={claveGrupo(g)} className="flex min-h-touch flex-wrap items-center gap-x-2 gap-y-1 py-2">
          <span className="min-w-0 flex-1 basis-40">
            <span className="block break-words text-body-sm font-semibold text-fg-muted first-letter:uppercase">{tituloGrupo(g)}</span>
            <span className="tabular block break-words text-caption text-fg-subtle">{g.filas.map((f) => f.nombre).join(', ')} · {formatInt(g.kcal)} kcal</span>
          </span>
          <span className="flex items-center gap-1">
            <Button variant="secondary" size="sm" loading={ocupado === claveGrupo(g)} disabled={ocupado !== null} onClick={() => void comido(g)}><Icon name="check" size={16} />Lo he comido</Button>
            <IconButton icon="close" label={`Quitar la planificada de ${tituloGrupo(g).toLowerCase()}`} variant="ghost" onClick={() => void quitar(g)} />
          </span>
        </li>)}
      </ListGroup>
    </section>
  )
}
