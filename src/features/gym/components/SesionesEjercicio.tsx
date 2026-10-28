import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import { formatFechaHora } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { marcasSesiones } from '../lib/progreso'

export interface FilaSesionEjercicio {
  id: number
  inicio: number
  /** La mejor serie («77,5 kg × 8»). */
  mejor: string
  /** La cifra de la métrica elegida. */
  valor: number
  gimnasio?: string
}

/** Sesiones a la vista antes de «Ver las N sesiones». */
const PRIMERAS = 8
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const conSigno = (v: number) => `${v > 0 ? '+' : '−'}${formatNumber(Math.abs(v), 1)}`

/**
 * Las sesiones de un ejercicio en la métrica elegida (punto 40, opción elegida por Víctor): por meses, una línea cada una
 * con el día, la mejor serie, una barra corta frente a las demás y la cifra con su cambio frente a la anterior; el trofeo
 * cuando supera a todas las anteriores. Se lee como una tabla y se ve la progresión. Las últimas, hasta «Ver las N sesiones».
 */
export default function SesionesEjercicio({ filas, unidad, nombre }: { filas: FilaSesionEjercicio[]; unidad: string; nombre: string }) {
  const [todas, setTodas] = useState(false)
  const marcas = marcasSesiones(filas.map(f => f.valor))
  const meses: { clave: string; nombre: string; indices: number[] }[] = []
  ;(todas ? filas : filas.slice(0, PRIMERAS)).forEach((f, i) => {
    const d = new Date(f.inicio)
    const clave = `${d.getFullYear()}-${d.getMonth()}`
    const mes = meses.at(-1)
    if (mes?.clave === clave) mes.indices.push(i)
    else meses.push({ clave, nombre: `${MESES[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''}`, indices: [i] })
  })

  return <div className="space-y-stack">
    {meses.map(m => <div key={m.clave} className="space-y-2">
      <h3 className="px-1 text-rotulo text-fg-muted">{m.nombre}</h3>
      <ListGroup aria-label={`Sesiones de ${nombre} en ${m.nombre}`}>
        {m.indices.map(i => {
          const f = filas[i]
          const { record, cambio, ancho } = marcas[i]
          const fecha = new Date(f.inicio)
          // Con el texto ampliado, la barra y la cifra bajan a otra línea.
          return <li key={f.id} className="flex min-h-touch flex-wrap items-center gap-x-3 gap-y-1 py-2"
            aria-label={`${formatFechaHora(f.inicio)}${f.gimnasio ? `, ${f.gimnasio}` : ''}. Mejor serie: ${f.mejor}. ${formatNumber(f.valor, 1)} ${unidad}${cambio ? `, ${conSigno(cambio)} frente a la anterior` : ''}${record ? '. Récord' : ''}`}>
            <span aria-hidden className="w-12 shrink-0 text-body-sm font-semibold text-fg">{fecha.getDate()} <span className="font-normal text-fg-muted">{fecha.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')}</span></span>
            <span aria-hidden className="tabular min-w-0 flex-1 basis-24 break-words text-body-sm text-fg-muted">{f.mejor}{f.gimnasio ? ` · ${f.gimnasio}` : ''}</span>
            <span aria-hidden className="h-1.5 w-12 shrink-0 overflow-hidden rounded-pill bg-surface-muted">
              <span className={`block h-full rounded-pill ${record ? 'bg-accent-strong' : 'bg-line-strong'}`} style={{ width: `${ancho}%` }} />
            </span>
            <span aria-hidden className="tabular w-20 shrink-0 text-right">
              <span className="flex items-center justify-end gap-1 text-body-sm font-semibold text-fg">{record && <Icon name="trophy" size={14} className="text-accent-strong" />}{formatNumber(f.valor, 1)}<span className="font-normal text-fg-muted">{unidad}</span></span>
              {cambio !== null && cambio !== 0 && <span className={`block text-caption ${cambio > 0 ? 'text-success' : 'text-fg-muted'}`}>{conSigno(cambio)}</span>}
            </span>
          </li>
        })}
      </ListGroup>
    </div>)}
    {!todas && filas.length > PRIMERAS && <Button variant="secondary" block onClick={() => setTodas(true)}>Ver las {formatInt(filas.length)} sesiones</Button>}
  </div>
}
