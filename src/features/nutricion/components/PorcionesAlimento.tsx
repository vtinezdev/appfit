import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button, { IconButton } from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import { ErrorState } from '../../../shared/components/StateMessage'
import type { Porcion } from '../../../shared/db/types'
import { formatNumber } from '../../../shared/lib/format'
import * as porcionesRepo from '../data/porcionesRepo'

interface Props {
  /** Clave estable del alimento (`user:<id>` o `catalog:<id>`). */
  refAlimento: string
  /** Gramos que se proponen al crear una ración nueva. */
  gramosIniciales?: number
  /** Se llama tras crear una ración (la revisión la selecciona). */
  onCreada?: (id: number) => void
}

/**
 * Raciones propias de un alimento: lista, alta y borrado. Se usa dentro de un Sheet y de la revisión (ModalPage),
 * donde el Toast queda debajo, así que el «Deshacer» del borrado va en línea.
 */
export default function PorcionesAlimento({ refAlimento, gramosIniciales = 30, onCreada }: Props) {
  const porciones = useLiveQuery(() => porcionesRepo.delAlimento(refAlimento), [refAlimento])
  const [nombre, setNombre] = useState('')
  const [gramos, setGramos] = useState(String(Math.round(gramosIniciales)))
  const [error, setError] = useState<string | null>(null)
  const [borrada, setBorrada] = useState<Porcion | null>(null)

  async function anadir() {
    setError(null)
    try {
      const id = await porcionesRepo.crear(refAlimento, nombre, Number(gramos.replace(',', '.')))
      setNombre('')
      onCreada?.(id)
    } catch (e) {
      setError(e instanceof porcionesRepo.PorcionInvalidaError ? e.message : 'No se ha podido guardar la ración. Inténtalo de nuevo.')
    }
  }

  async function borrar(p: Porcion) {
    setError(null)
    try {
      setBorrada((await porcionesRepo.borrar(p.id)) ?? null)
    } catch {
      setError('No se ha podido borrar la ración. Inténtalo de nuevo.')
    }
  }

  async function deshacer() {
    if (!borrada) return
    try {
      await porcionesRepo.restaurar(borrada)
      setBorrada(null)
    } catch (e) {
      setError(e instanceof porcionesRepo.PorcionInvalidaError ? e.message : 'No se ha podido deshacer.')
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-body-sm text-fg-muted">Define cuánto pesa «una rebanada», «un bol»… de este alimento y úsalo al escribir («2 rebanadas de pan bimbo»).</p>
      {borrada && (
        <div role="status" className="flex min-h-touch items-center justify-between gap-3 rounded-md bg-surface-muted px-3 text-body-sm text-fg">
          <span className="min-w-0 break-words">Ración «{borrada.nombre}» borrada</span>
          <Button variant="ghost" size="sm" onClick={deshacer}>Deshacer</Button>
        </div>
      )}
      {!!porciones?.length && (
        <ul className="divide-y divide-line" aria-label="Raciones propias">
          {porciones.map((p) => (
            <li key={p.id} className="flex min-h-touch items-center justify-between gap-3">
              <span className="min-w-0 break-words text-body text-fg">{p.nombre}</span>
              <span className="flex items-center gap-1">
                <span className="tabular text-body font-semibold text-fg">{formatNumber(p.gramos, 1)} <span className="font-normal text-fg-muted">g</span></span>
                <IconButton icon="trash" variant="ghost" size="sm" label={`Borrar ración ${p.nombre}`} onClick={() => borrar(p)} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-3 gap-2">
        <label className="col-span-2 block min-w-0 space-y-1"><span className="text-label text-fg-muted">Nombre de la ración</span>
          <Input value={nombre} maxLength={24} placeholder="rebanada" onChange={(e) => setNombre(e.target.value)} /></label>
        <label className="block min-w-0 space-y-1"><span className="text-label text-fg-muted">Gramos</span>
          <Input type="number" inputMode="decimal" min={0} value={gramos} onChange={(e) => setGramos(e.target.value)} className="tabular no-spin" /></label>
      </div>
      {error && <ErrorState>{error}</ErrorState>}
      <Button variant="secondary" block disabled={!nombre.trim()} onClick={anadir}>Añadir ración</Button>
    </div>
  )
}
