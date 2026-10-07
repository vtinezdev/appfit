import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Disclosure from '../../../shared/components/Disclosure'
import NumberStepper from '../../../shared/components/NumberStepper'
import { Select } from '../../../shared/components/Input'
import { formatNumber } from '../../../shared/lib/format'
import * as porcionesRepo from '../data/porcionesRepo'
import type { ItemRevision } from '../lib/alimentos'
import PorcionesAlimento from './PorcionesAlimento'

interface Props {
  item: ItemRevision
  onChange: (patch: Partial<ItemRevision>) => void
}

/**
 * Unidad de la cantidad de un alimento: gramos o una de sus raciones propias («rebanada»). Solo aparece si el
 * alimento es uno guardado o del catálogo. Elegir una ración fija los gramos como cantidad × gramos de la ración.
 */
export default function UnidadRacion({ item, onChange }: Props) {
  const datos = useLiveQuery(async () => {
    const ref = await porcionesRepo.refDeItem(item.origen)
    return ref ? { ref, porciones: await porcionesRepo.delAlimento(ref) } : null
  }, [item.origen.guardado, item.origen.nombreNorm, item.origen.catalogId])
  const [racionId, setRacionId] = useState<number | null>(null)
  const [gestionando, setGestionando] = useState(false)
  if (!datos) return null
  const racion = datos.porciones.find((p) => p.id === racionId)
  const n = racion ? Math.round((item.gramos / racion.gramos) * 100) / 100 : 0

  return (
    <div className="space-y-2">
      <label className="block space-y-1"><span className="text-label text-fg-muted">Unidad</span>
        <Select value={racion ? String(racion.id) : 'g'} onChange={(e) => {
          const p = datos.porciones.find((x) => String(x.id) === e.target.value)
          setRacionId(p?.id ?? null)
          if (p) onChange({ gramos: Math.max(0.5, Math.round(Math.max(1, Math.round(item.gramos / p.gramos)) * p.gramos * 10) / 10) })
        }}>
          <option value="g">Gramos</option>
          {datos.porciones.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({formatNumber(p.gramos, 1)} g)</option>)}
        </Select></label>
      {racion && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <NumberStepper label={`${racion.nombre}s`} value={n} step={0.5} onChange={(v) => onChange({ gramos: Math.round(v * racion.gramos * 10) / 10 })} suffix={racion.nombre.length <= 6 ? racion.nombre : undefined} />
          <span className="tabular text-body-sm text-fg-muted">= {formatNumber(item.gramos, 1)} g</span>
        </div>
      )}
      <Disclosure title="Raciones de este alimento" open={gestionando} onChange={setGestionando}>
        <PorcionesAlimento refAlimento={datos.ref} gramosIniciales={item.gramos} onCreada={(id) => { setRacionId(id); setGestionando(false) }} />
      </Disclosure>
    </div>
  )
}
