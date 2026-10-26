import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import { formatDiaMes, formatFechaHora } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import { formatNumber } from '../../../shared/lib/format'

export interface FilaSesionEjercicio {
  id: number
  inicio: number
  /** La mejor serie («77,5 kg × 8»). */
  mejor: string
  /** La cifra de la métrica elegida. */
  valor: number
  gimnasio?: string
}

const conSigno = (v: number) => `${v > 0 ? '+' : '−'}${formatNumber(Math.abs(v), 1)}`

/**
 * Las sesiones de un ejercicio (de la más reciente a la más antigua) en la métrica elegida (punto 40). `barras`: cada una
 * con una barra de su cifra frente a las demás, así se ve la progresión, y el trofeo cuando supera todo lo anterior.
 * `tabla`: una línea por sesión, con fecha, mejor serie, cifra y cambio frente a la anterior.
 */
/** Sesiones a la vista en `mixta` antes de «Ver todas». */
const PRIMERAS = 8
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function SesionesEjercicio({ filas, unidad, nombre, forma = 'mixta' }: { filas: FilaSesionEjercicio[]; unidad: string; nombre: string; forma?: 'barras' | 'tabla' | 'mixta' }) {
  const [todas, setTodas] = useState(false)
  const valores = filas.map(f => f.valor)
  const max = Math.max(...valores)
  const min = Math.min(...valores)
  // La barra parte un poco por debajo de la peor sesión: así las diferencias se ven sin exagerarlas.
  const base = Math.max(0, min - (max - min || max) * 0.25)
  const ancho = (v: number) => Math.max(8, ((v - base) / Math.max(1e-9, max - base)) * 100)
  // Récord: supera a todas las sesiones anteriores (las filas van de la más reciente a la más antigua).
  const record = (i: number) => i < filas.length - 1 && filas.slice(i + 1).every(f => filas[i].valor > f.valor)

  if (forma === 'mixta') {
    // Una línea por sesión (fecha, mejor serie, una barra corta frente a las demás y la cifra con su cambio), por meses y
    // con las últimas a la vista: se lee como una tabla y se ve la progresión.
    const visibles = todas ? filas : filas.slice(0, PRIMERAS)
    const meses: { clave: string; nombre: string; filas: { f: FilaSesionEjercicio; i: number }[] }[] = []
    visibles.forEach((f, i) => {
      const d = new Date(f.inicio)
      const clave = `${d.getFullYear()}-${d.getMonth()}`
      const mes = meses.at(-1)
      if (mes?.clave === clave) mes.filas.push({ f, i })
      else meses.push({ clave, nombre: `${MESES[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''}`, filas: [{ f, i }] })
    })
    return <div className="space-y-stack">
      {meses.map(m => <div key={m.clave} className="space-y-2">
        <h3 className="px-1 text-rotulo text-fg-muted">{m.nombre}</h3>
        <ListGroup aria-label={`Sesiones de ${nombre} en ${m.nombre}`}>
          {m.filas.map(({ f, i }) => {
            const anterior = filas[i + 1]
            const cambio = anterior ? f.valor - anterior.valor : 0
            return <li key={f.id} aria-label={`${formatFechaHora(f.inicio)}${f.gimnasio ? `, ${f.gimnasio}` : ''}. Mejor serie: ${f.mejor}. ${formatNumber(f.valor, 1)} ${unidad}${cambio ? `, ${conSigno(cambio)} frente a la anterior` : ''}${record(i) ? '. Récord' : ''}`}
              className="flex min-h-touch items-center gap-3 py-2">
              <span aria-hidden className="w-12 shrink-0 text-body-sm font-semibold text-fg">{new Date(f.inicio).getDate()} <span className="font-normal text-fg-muted">{new Date(f.inicio).toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')}</span></span>
              <span aria-hidden className="tabular min-w-0 flex-1 break-words text-body-sm text-fg-muted">{f.mejor}{f.gimnasio ? ` · ${f.gimnasio}` : ''}</span>
              <span aria-hidden className="h-1.5 w-12 shrink-0 overflow-hidden rounded-pill bg-surface-muted">
                <span className={`block h-full rounded-pill ${record(i) ? 'bg-accent-strong' : 'bg-line-strong'}`} style={{ width: `${ancho(f.valor)}%` }} />
              </span>
              <span aria-hidden className="tabular w-20 shrink-0 text-right">
                <span className="flex items-center justify-end gap-1 text-body-sm font-semibold text-fg">{record(i) && <Icon name="trophy" size={14} className="text-accent-strong" />}{formatNumber(f.valor, 1)}<span className="font-normal text-fg-muted">{unidad}</span></span>
                {cambio !== 0 && <span className={`block text-caption ${cambio > 0 ? 'text-success' : 'text-fg-muted'}`}>{conSigno(cambio)}</span>}
              </span>
            </li>
          })}
        </ListGroup>
      </div>)}
      {!todas && filas.length > PRIMERAS && <Button variant="secondary" block onClick={() => setTodas(true)}>Ver las {formatInt(filas.length)} sesiones</Button>}
    </div>
  }

  return <ListGroup aria-label={`Sesiones de ${nombre}`}>
    {filas.map((f, i) => {
      const anterior = filas[i + 1]
      const cambio = anterior ? f.valor - anterior.valor : 0
      const etiqueta = `${formatFechaHora(f.inicio)}${f.gimnasio ? `, ${f.gimnasio}` : ''}. Mejor serie: ${f.mejor}. ${formatNumber(f.valor, 1)} ${unidad}${cambio ? `, ${conSigno(cambio)} frente a la anterior` : ''}${record(i) ? '. Récord' : ''}`
      if (forma === 'tabla') return <li key={f.id} aria-label={etiqueta} className="grid min-h-touch grid-cols-4 items-center gap-2 py-2">
        <span aria-hidden className="tabular text-body-sm font-semibold text-fg">{formatDiaMes(f.inicio)}</span>
        <span aria-hidden className="tabular col-span-2 break-words text-body-sm text-fg-muted">{f.mejor}</span>
        <span aria-hidden className="tabular text-right text-body-sm font-semibold text-fg">{formatNumber(f.valor, 1)}
          {cambio !== 0 && <span className={`block text-caption ${cambio > 0 ? 'text-success' : 'text-fg-muted'}`}>{conSigno(cambio)}</span>}
        </span>
      </li>
      return <li key={f.id} aria-label={etiqueta} className="space-y-1 py-3">
        <div aria-hidden className="flex items-baseline justify-between gap-3">
          <span className="tabular text-body-sm font-semibold text-fg">{formatDiaMes(f.inicio)}{f.gimnasio ? <span className="font-normal text-fg-muted"> · {f.gimnasio}</span> : null}</span>
          <span className="tabular text-caption text-fg-muted">{f.mejor}</span>
        </div>
        <div aria-hidden className="flex items-center gap-3">
          <span className="h-7 flex-1 overflow-hidden rounded-sm bg-surface-muted">
            <span className={`flex h-full items-center justify-end rounded-sm px-2 ${record(i) ? 'bg-accent text-accent-on' : 'bg-line-strong text-fg'}`} style={{ width: `${ancho(f.valor)}%` }}>
              {record(i) && <Icon name="trophy" size={14} />}
            </span>
          </span>
          <span className="tabular w-20 shrink-0 text-right text-body-sm font-semibold text-fg">{formatNumber(f.valor, 1)} <span className="font-normal text-fg-muted">{unidad}</span></span>
        </div>
      </li>
    })}
  </ListGroup>
}
