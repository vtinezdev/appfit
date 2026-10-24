import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button, { IconButton } from '../../../shared/components/Button'
import Icon, { type IconName } from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ModalPage from '../../../shared/components/ModalPage'
import Sheet from '../../../shared/components/Sheet'
import { LoadingState } from '../../../shared/components/StateMessage'
import { desplazarPeriodo, esPeriodoActual, etiquetaPeriodo, monthDates, parseISODate, startOfMonth, todayISO } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import * as actividadesRepo from '../../actividades/data/actividadesRepo'
import { cifrasActividad, tituloActividad } from '../../actividades/lib/actividad'
import * as setsRepo from '../../gym/data/setsRepo'
import * as workoutsRepo from '../../gym/data/workoutsRepo'
import * as routinesRepo from '../../gym/data/routinesRepo'
import { formatDuracion, volumenSets } from '../../gym/lib/workout'
import * as aguaRepo from '../../inicio/data/aguaRepo'
import * as pesosRepo from '../../inicio/data/pesosRepo'
import { formatAgua } from '../../inicio/lib/agua'
import * as entriesRepo from '../../nutricion/data/entriesRepo'
import { calendarioRegistros, conRegistros, resumenDia, type DiaRegistros } from '../lib/calendario'

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const fechaLarga = (iso: string) => parseISODate(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
const MARCAS: { clave: 'entreno' | 'actividad' | 'comidas' | 'peso'; icon: IconName; nombre: string; tiene: (d: DiaRegistros) => boolean }[] = [
  { clave: 'entreno', icon: 'dumbbell', nombre: 'Entreno', tiene: (d) => d.entrenos.length > 0 },
  { clave: 'actividad', icon: 'footprints', nombre: 'Actividad', tiene: (d) => d.actividades.length > 0 },
  { clave: 'comidas', icon: 'utensils', nombre: 'Comidas', tiene: (d) => d.comidas > 0 },
  { clave: 'peso', icon: 'scale', nombre: 'Peso', tiene: (d) => d.peso !== null },
]

/** Lo de un día, en una hoja: entrenos (resumen de Gym), actividades, comidas (con «Ver en Nutrición»), peso y agua. */
function HojaDia({ dia, onClose, onIrANutricion }: { dia: DiaRegistros; onClose: () => void; onIrANutricion: (fecha: string) => void }) {
  const detalle = useLiveQuery(async () => {
    const [workouts, rutinas, actividades] = await Promise.all([workoutsRepo.listar(), routinesRepo.listar(), actividadesRepo.entreFechas(dia.fecha, dia.fecha)])
    const entrenos = await Promise.all(workouts.filter((w) => dia.entrenos.includes(w.id)).map(async (w) => {
      const sets = await setsRepo.delWorkout(w.id)
      return { id: w.id, nombre: rutinas.find((r) => r.id === w.routineId)?.nombre ?? 'Entreno libre', duracion: w.fin ? formatDuracion(w.fin - w.inicio) : '', series: sets.filter((s) => s.tipo !== 'calentamiento' && s.realizada !== false).length, volumen: volumenSets(sets) }
    }))
    return { entrenos, actividades: actividades.filter((a) => !a.enCurso) }
  }, [dia.fecha])
  return (
    <Sheet open onClose={onClose} title={fechaLarga(dia.fecha).replace(/^./, (c) => c.toUpperCase())}>
      {!detalle ? <LoadingState /> : <div className="space-y-stack">
        {!conRegistros(dia) && <p className="text-body-sm text-fg-muted">Sin registros este día.</p>}
        {detalle.entrenos.length > 0 && <ListGroup variante="plana" aria-label="Entrenos">
          {detalle.entrenos.map((e) => <li key={e.id} className="flex min-h-touch flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <Icon name="dumbbell" size={18} className="shrink-0 text-fg-muted" />
            <span className="min-w-0 flex-1 basis-32 break-words text-body font-semibold text-fg">{e.nombre}</span>
            <span className="tabular text-caption text-fg-muted">{[e.duracion, `${formatInt(e.series)} series`, `${formatInt(e.volumen)} kg`].filter(Boolean).join(' · ')}</span>
          </li>)}
        </ListGroup>}
        {detalle.actividades.length > 0 && <ListGroup variante="plana" aria-label="Actividades">
          {detalle.actividades.map((a) => <li key={a.id} className="flex min-h-touch flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <Icon name="footprints" size={18} className="shrink-0 text-fg-muted" />
            <span className="min-w-0 flex-1 basis-32 break-words text-body font-semibold text-fg">{tituloActividad(a)}</span>
            <span className="tabular text-caption text-fg-muted">{cifrasActividad(a)}</span>
          </li>)}
        </ListGroup>}
        {(dia.comidas > 0 || dia.peso !== null || dia.aguaMl > 0) && <ListGroup variante="plana" aria-label="Comidas, peso y agua">
          {dia.comidas > 0 && <li className="flex min-h-touch flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <Icon name="utensils" size={18} className="shrink-0 text-fg-muted" />
            <span className="tabular min-w-0 flex-1 basis-32 text-body text-fg">{formatInt(dia.kcal)} kcal · {formatInt(dia.prot)} g de proteína</span>
            <Button variant="ghost" size="sm" onClick={() => onIrANutricion(dia.fecha)}>Ver en Nutrición</Button>
          </li>}
          {dia.peso !== null && <li className="flex min-h-touch items-center gap-3 py-2"><Icon name="scale" size={18} className="shrink-0 text-fg-muted" /><span className="tabular text-body text-fg">{formatNumber(dia.peso, 1)} kg</span></li>}
          {dia.aguaMl > 0 && <li className="flex min-h-touch items-center gap-3 py-2"><Icon name="droplet" size={18} className="shrink-0 text-fg-muted" /><span className="tabular text-body text-fg">{formatAgua(dia.aguaMl)} de agua</span></li>}
        </ListGroup>}
      </div>}
    </Sheet>
  )
}

/**
 * Calendario único de registros (B14), en Progreso: el mes con una marca por lo registrado cada día (entreno, actividad,
 * comidas, peso) y, al tocar un día, una hoja con todo. Por debajo de 20 rem pasa a lista, como el de Entreno.
 */
export default function CalendarioRegistros({ onClose, onIrANutricion }: { onClose: () => void; onIrANutricion: (fecha: string) => void }) {
  const hoy = todayISO()
  const [mes, setMes] = useState(startOfMonth(hoy))
  const [abierto, setAbierto] = useState<DiaRegistros | null>(null)
  const semanas = useLiveQuery(async () => {
    const dias = monthDates(mes)
    const desde = dias[0], hasta = dias[dias.length - 1]
    const [workouts, actividades, entries, pesos, agua] = await Promise.all([
      workoutsRepo.listar(), actividadesRepo.entreFechas(desde, hasta), entriesRepo.entreFechas(desde, hasta), pesosRepo.delRango(desde, hasta), aguaRepo.entreFechas(desde, hasta),
    ])
    return calendarioRegistros(mes, { workouts, actividades, entries, pesos, agua }, hoy)
  }, [mes, hoy])
  const conDatos = (semanas ?? []).flat().filter((d) => d.delMes && conRegistros(d))

  return (
    <ModalPage title="Calendario" closeLabel="Progreso" onClose={onClose}>
      <section aria-label="Calendario de registros" className="calendario-registros space-y-stack">
        <div className="flex items-center justify-between gap-2">
          <IconButton icon="chevron-left" label="Mes anterior" variant="ghost" onClick={() => setMes(desplazarPeriodo('mes', mes, -1))} />
          <h2 className="min-w-0 text-center text-title text-fg first-letter:uppercase" aria-live="polite">{etiquetaPeriodo('mes', mes)}</h2>
          <IconButton icon="chevron-right" label="Mes siguiente" variant="ghost" disabled={esPeriodoActual('mes', mes)} onClick={() => setMes(desplazarPeriodo('mes', mes, 1))} />
        </div>
        {!semanas ? <LoadingState /> : <>
          <div className="cal-vista-mes space-y-2">
            <div className="cal-grid" aria-hidden="true">{DIAS.map((d) => <span key={d} className="text-center text-caption text-fg-muted">{d}</span>)}</div>
            <ul className="cal-grid" aria-label={`Días de ${etiquetaPeriodo('mes', mes)}`}>
              {semanas.flat().map((dia) => {
                if (!dia.delMes) return <li key={dia.fecha} aria-hidden="true" />
                const marcas = MARCAS.filter((m) => m.tiene(dia))
                return <li key={dia.fecha}>
                  <button type="button" className="cal-registro app-button tabular" data-hoy={dia.hoy} data-futuro={dia.futuro} data-con={marcas.length > 0}
                    aria-label={`${fechaLarga(dia.fecha)}${dia.hoy ? ' (hoy)' : ''}: ${resumenDia(dia)}`} onClick={() => setAbierto(dia)} disabled={dia.futuro}>
                    <span aria-hidden="true">{parseISODate(dia.fecha).getDate()}</span>
                    <span className="cal-marcas" aria-hidden="true">{marcas.map((m) => <Icon key={m.clave} name={m.icon} size={10} />)}</span>
                  </button>
                </li>
              })}
            </ul>
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-fg-muted" aria-label="Leyenda">
              {MARCAS.map((m) => <li key={m.clave} className="flex items-center gap-1"><Icon name={m.icon} size={14} />{m.nombre}</li>)}
            </ul>
          </div>
          <div className="cal-lista">
            <ListGroup variante="plana" aria-label="Días con registros">
              {conDatos.map((d) => <li key={d.fecha}>
                <button type="button" onClick={() => setAbierto(d)} className="app-button flex min-h-touch w-full flex-wrap items-center justify-between gap-2 py-2 text-left">
                  <span className="text-body-sm text-fg first-letter:uppercase">{fechaLarga(d.fecha)}</span>
                  <span className="text-caption text-fg-muted">{resumenDia(d)}</span>
                </button>
              </li>)}
            </ListGroup>
            {conDatos.length === 0 && <p className="py-2 text-body-sm text-fg-muted">Sin registros este mes.</p>}
          </div>
        </>}
      </section>
      {abierto && <HojaDia dia={abierto} onClose={() => setAbierto(null)} onIrANutricion={(f) => { setAbierto(null); onIrANutricion(f) }} />}
    </ModalPage>
  )
}
