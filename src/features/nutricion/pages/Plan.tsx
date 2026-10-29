import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Anillo from '../../../shared/components/Anillo'
import Ayuda from '../../../shared/components/Ayuda'
import Button, { IconButton } from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import ProgressBar from '../../../shared/components/ProgressBar'
import { LoadingState } from '../../../shared/components/StateMessage'
import type { Comida, Planificada } from '../../../shared/db/types'
import { useAviso } from '../../../shared/hooks/useAviso'
import { addDays, formatFriendly, parseISODate, startOfWeek } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { objetivosPorFecha } from '../../perfil/data/objetivosDiaRepo'
import ListaCompra from '../components/ListaCompra'
import { marcarComido } from '../components/Planificadas'
import * as planificadasRepo from '../data/planificadasRepo'
import { COMIDAS, nombreComida } from '../lib/comidas'
import { resumenMacros, sumMacros } from '../lib/nutrition'
import { diaInicialPlan, nombreDia, nombreSemana, rangoSemana, semanaPlan } from '../lib/planificadas'
import { fraccionAnillo } from '../lib/semanaKcal'

const fechaLarga = (iso: string) => parseISODate(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

interface Props {
  hoy: string
  /** Abre Añadir comida en modo planificar para ese día y esa comida. */
  onAnadir: (fecha: string, comida: Comida) => void
}

/**
 * Plan de comidas (B16, ADR 059): una semana navegable sin límite hacia delante (nunca hacia semanas pasadas), el día
 * elegido con sus cuatro comidas y la lista de la compra. Lo planificado no cuenta en nada hasta «Lo he comido».
 */
export default function Plan({ hoy, onAnadir }: Props) {
  const lunesHoy = startOfWeek(hoy)
  const [lunesElegido, setLunes] = useState(lunesHoy)
  const [elegido, setElegido] = useState(hoy)
  const [lista, setLista] = useState(false)
  const [ocupado, setOcupado] = useState<Comida | null>(null)
  const { avisar, avisarError, toast } = useAviso()
  // Al cruzar medianoche (o el domingo), nunca se queda en un día ni en una semana ya pasados.
  const lunes = lunesElegido < lunesHoy ? lunesHoy : lunesElegido
  const fecha = elegido < hoy ? hoy : elegido < lunes || elegido > addDays(lunes, 6) ? diaInicialPlan(lunes, hoy) : elegido

  const datos = useLiveQuery(async () => {
    const fechas = Array.from({ length: 7 }, (_, i) => addDays(lunes, i))
    const [filas, objetivos] = await Promise.all([planificadasRepo.entreFechas(fechas[0], fechas[6]), objetivosPorFecha(fechas, hoy)])
    return { filas, objetivos, dias: semanaPlan(lunes, hoy, filas) }
  }, [lunes, hoy])

  function irASemana(nuevo: string) {
    setLunes(nuevo)
    setElegido(diaInicialPlan(nuevo, hoy))
  }

  async function comido(comida: Comida) {
    if (ocupado) return
    setOcupado(comida)
    try {
      const hecho = await marcarComido(fecha, comida, hoy)
      if (hecho) avisar({ mensaje: `Añadida a ${nombreComida(comida).toLowerCase()} del Diario`, onDeshacer: () => planificadasRepo.deshacerComido(hecho) })
    } catch {
      avisarError('No se ha podido añadir. Inténtalo de nuevo.')
    } finally {
      setOcupado(null)
    }
  }

  async function quitar(fila: Planificada) {
    try {
      const borradas = await planificadasRepo.borrar([fila.id])
      if (borradas.length) avisar({ mensaje: `Quitado «${fila.nombre}» del plan`, onDeshacer: () => planificadasRepo.restaurar(borradas) })
    } catch {
      avisarError('No se ha podido quitar. Inténtalo de nuevo.')
    }
  }

  const delDia = datos?.filas.filter((f) => f.fecha === fecha) ?? []
  const totales = sumMacros(delDia)
  const objetivo = datos?.objetivos.get(fecha)?.kcal ?? 0
  // `formatFriendly` ya dice «Hoy»; mañana lleva también la fecha.
  const tituloDia = fecha === addDays(hoy, 1) ? `${nombreDia(fecha, hoy)} · ${formatFriendly(fecha)}` : formatFriendly(fecha)

  return (
    <div className="space-y-section">
      <section aria-label="Semana del plan" className="semana-diario space-y-2">
        <div className="flex items-center gap-1">
          <IconButton icon="chevron-left" label="Semana anterior" variant="ghost" disabled={lunes <= lunesHoy} onClick={() => irASemana(addDays(lunes, -7))} />
          <h2 aria-live="polite" className="min-w-0 flex-1 text-center">
            <span className="block break-words text-body font-semibold text-fg">{nombreSemana(lunes, hoy)}</span>
            <span className="tabular block text-caption text-fg-muted">{rangoSemana(lunes)}</span>
          </h2>
          <IconButton icon="chevron-right" label="Semana siguiente" variant="ghost" onClick={() => irASemana(addDays(lunes, 7))} />
        </div>
        <div className="semana-scroll">
          <ul className="semana-kcal" aria-label="Días de la semana">
            {(datos?.dias ?? []).map((d) => {
              const objetivoDia = datos?.objetivos.get(d.fecha)?.kcal ?? 0
              const texto = `${fechaLarga(d.fecha)}${d.hoy ? ' (hoy)' : ''}${d.pasado ? '' : d.planificados ? `: ${formatInt(d.kcal)} kcal planificadas` : ': nada planificado'}`
              return <li key={d.fecha}>
                <button type="button" className="semana-dia app-button" aria-label={texto} aria-current={d.fecha === fecha ? 'date' : undefined} data-hoy={d.hoy} disabled={d.pasado} onClick={() => setElegido(d.fecha)}>
                  <span className="semana-letra" aria-hidden="true">{d.letra}</span>
                  <Anillo fraccion={fraccionAnillo(d.kcal, objetivoDia)} className="semana-anillo" trazo="stroke-kcal" carril="stroke-line">
                    <span className="semana-num tabular" aria-hidden="true">{d.numero}</span>
                  </Anillo>
                </button>
              </li>
            })}
          </ul>
        </div>
      </section>

      {!datos ? <LoadingState /> : <>
        <section aria-label="Día planificado" className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0 flex-1 basis-40">
              <div className="flex items-center gap-1">
                <h2 className="min-w-0 break-words text-title text-fg first-letter:uppercase">{tituloDia}</h2>
                <Ayuda titulo="Planificar"><p>Lo planificado no cuenta en el Diario hasta que, ese día, pulses «Lo he comido».</p></Ayuda>
              </div>
              <p className="tabular text-body-sm text-fg-muted"><span className="font-semibold text-fg">{formatInt(totales.kcal)}</span>{objetivo > 0 ? ` de ${formatInt(objetivo)}` : ''} kcal planificadas</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setLista(true)}><Icon name="carrito" size={18} />Lista de la compra</Button>
          </div>
          {objetivo > 0 && <ProgressBar value={totales.kcal} goal={objetivo} colorClass="bg-kcal" label="Calorías planificadas" valueText={`${formatInt(totales.kcal)} de ${formatInt(objetivo)} kcal planificadas`} />}
          {delDia.length > 0 && <p className="tabular text-caption text-fg-muted">{resumenMacros(totales)}</p>}
        </section>

        {COMIDAS.map((c) => {
          const filas = delDia.filter((f) => f.comida === c.valor)
          const kcal = filas.reduce((s, f) => s + f.kcal, 0)
          const nombre = c.label.toLowerCase()
          return <section key={c.valor} aria-label={c.label}>
            <Card padded={false}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 pt-3">
                <h3 className="text-body font-semibold text-fg">{c.label}</h3>
                <span className="tabular text-body-sm text-fg-muted">{filas.length ? `${formatInt(kcal)} kcal` : 'Sin planificar'}</span>
              </div>
              {filas.length > 0 && <ul aria-label={`Planificado para ${nombre}`} className="divide-y divide-line px-4">
                {filas.map((f) => <li key={f.id} className="flex min-h-touch items-center gap-2 py-1">
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-body-sm text-fg">{f.nombre}</span>
                    <span className="tabular block text-caption text-fg-muted">{f.rapida ? 'Registro rápido' : `${formatNumber(f.gramos, 1)} g`} · {formatInt(f.kcal)} kcal</span>
                  </span>
                  <IconButton icon="close" label={`Quitar ${f.nombre} del plan`} variant="ghost" size="sm" onClick={() => void quitar(f)} />
                </li>)}
              </ul>}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2">
                <Button variant="subtle" size="sm" aria-label={`Planificar ${nombre}`} onClick={() => onAnadir(fecha, c.valor)}><Icon name="plus" size={18} />Añadir</Button>
                {fecha === hoy && filas.length > 0 && <Button variant="secondary" size="sm" loading={ocupado === c.valor} disabled={ocupado !== null} onClick={() => void comido(c.valor)}><Icon name="check" size={16} />Lo he comido</Button>}
              </div>
            </Card>
          </section>
        })}
      </>}

      {lista && <ListaCompra hoy={hoy} lunes={lunes} onClose={() => setLista(false)} />}
      {toast}
    </div>
  )
}
