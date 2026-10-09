import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as setsRepo from '../data/setsRepo'
import * as workoutsRepo from '../data/workoutsRepo'
import { IconButton } from '../../../shared/components/Button'
import ListGroup from '../../../shared/components/ListGroup'
import Metric from '../../../shared/components/Metric'
import { LoadingState } from '../../../shared/components/StateMessage'
import Disclosure from '../../../shared/components/Disclosure'
import { desplazarPeriodo, esPeriodoActual, etiquetaPeriodo, fechasPeriodo, todayISO } from '../../../shared/lib/dates'
import { formatNumber } from '../../../shared/lib/format'
import { resumenSemanal } from '../lib/resumenSemanal'
import { formatDuracion } from '../lib/workout'

/** Semanas navegables bajo el calendario: sesiones, tiempo y volumen; las series por grupo muscular, desplegables. Sin rangos recomendados. */
export default function ResumenSemanalGym() {
  const [ancla, setAncla] = useState(todayISO)
  const datos = useLiveQuery(async () => ({ w: await workoutsRepo.listar(), s: await setsRepo.todas(), e: await exercisesRepo.listar() }), [])
  const fechas = fechasPeriodo('semana', ancla)
  const resumen = datos ? resumenSemanal(fechas[0], fechas[6], datos.w, datos.s, datos.e) : null

  return (
    <div className="space-y-stack">
      <div className="flex items-center justify-between gap-2">
        <IconButton icon="chevron-left" label="Semana anterior" variant="ghost" onClick={() => setAncla(desplazarPeriodo('semana', ancla, -1))} />
        <p className="tabular min-w-0 text-center text-title text-fg" aria-live="polite">{etiquetaPeriodo('semana', ancla)}</p>
        <IconButton icon="chevron-right" label="Semana siguiente" variant="ghost" disabled={esPeriodoActual('semana', ancla)} onClick={() => setAncla(desplazarPeriodo('semana', ancla, 1))} />
      </div>
      {!resumen ? <LoadingState /> : resumen.sesiones === 0 ? (
        <p className="text-body-sm text-fg-muted">Sin entrenos terminados esta semana.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Metric size="title" label="Sesiones" valor={resumen.sesiones} />
            <Metric size="title" label="Tiempo" valor={formatDuracion(resumen.duracionMs)} />
            <Metric size="title" label="Volumen" valor={formatNumber(resumen.volumen, 0)} unidad="kg" />
          </div>
          <Disclosure title={`Series por grupo muscular · ${formatNumber(resumen.series, 0)} efectivas`}>
            <div className="space-y-2">
              {resumen.porMusculo.length === 0 ? <p className="text-body-sm text-fg-muted">Los ejercicios de esta semana no tienen músculo clasificado.</p> : (
                <ListGroup variante="plana" aria-label="Series efectivas por músculo">
                  {resumen.porMusculo.map((m) => (
                    <li key={m.musculo} className="flex min-h-touch items-center justify-between gap-3 py-2">
                      <span className="min-w-0 break-words text-body text-fg">{m.nombre}</span>
                      <span className="tabular shrink-0 text-body font-semibold text-fg">{formatNumber(m.series, 1)}</span>
                    </li>
                  ))}
                </ListGroup>
              )}
              <p className="text-caption text-fg-muted">Cada serie efectiva cuenta 1 para el músculo principal y 0,5 para los secundarios. Los calentamientos no cuentan. Son series registradas, sin objetivos recomendados.</p>
              {resumen.sinClasificar > 0 && <p className="text-caption text-fg-muted">{resumen.sinClasificar} {resumen.sinClasificar === 1 ? 'serie' : 'series'} de ejercicios sin músculo clasificado no se reparten.</p>}
            </div>
          </Disclosure>
        </>
      )}
    </div>
  )
}
