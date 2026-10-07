import { congelarObjetivoDia } from '../../perfil/data/objetivosDiaRepo'
import { useState } from 'react'
import Sheet from '../../../shared/components/Sheet'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import type { Comida, Entry } from '../../../shared/db/types'
import { COMIDAS } from '../lib/comidas'
import { todayISO } from '../../../shared/lib/dates'
import * as entriesRepo from '../data/entriesRepo'
import * as mealsRepo from '../data/mealsRepo'
import { copiaEsNoOp } from '../lib/plantillas'
import ListRow from '../../../shared/components/ListRow'
import { Input } from '../../../shared/components/Input'
import Button from '../../../shared/components/Button'
import { ErrorState } from '../../../shared/components/StateMessage'


const LABELS: Record<Comida, string> = { desayuno: 'Desayuno', comida: 'Comida', cena: 'Cena', snack: 'Snack' }

interface Props {
  fecha: string
  comida: Comida
  entries: Entry[]
  /** Si está presente, las acciones afectan solo al plato, no a toda la comida. */
  plato?: { id: string; nombre: string }
  onClose: () => void
  onCopiado: (ids: number[]) => void
  onPlantillaGuardada: (nombre: string) => void
}

type Paso = 'menu' | 'copiar' | 'copiar-comida' | 'plantilla'

/**
 * Acciones de una comida o plato en Hoy: copiar a otra comida/día o guardar como plantilla.
 * Se monta de nuevo cada vez que se abre (el padre lo renderiza solo mientras hay una comida elegida),
 * así que su estado interno siempre empieza limpio.
 */
export default function AccionesComidaSheet({ fecha, comida, entries, plato, onClose, onCopiado, onPlantillaGuardada }: Props) {
  const [paso, setPaso] = useState<Paso>('menu')
  const [fechaDestino, setFechaDestino] = useState(fecha)
  const [comidaDestino, setComidaDestino] = useState<Comida>(comida)
  const [nombrePlantilla, setNombrePlantilla] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [copiando, setCopiando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hayEntradas = entries.length > 0
  const copiaNoOp = copiaEsNoOp({ fecha, comida }, { fecha: fechaDestino, comida: comidaDestino })

  function irA(p: Paso) {
    setError(null)
    if (p === 'copiar-comida') {
      setFechaDestino(fecha)
      setComidaDestino(comida)
    }
    setPaso(p)
  }

  async function copiar() {
    if (copiando || !hayEntradas || copiaNoOp) return
    setCopiando(true)
    setError(null)
    try {
      const ids = await entriesRepo.copiar({ origen: { fecha, comida, platoId: plato?.id }, destino: { fecha: paso === 'copiar-comida' ? fecha : fechaDestino, comida: comidaDestino } })
      if (ids.length > 0) void congelarObjetivoDia(paso === 'copiar-comida' ? fecha : fechaDestino)
      if (ids.length === 0) {
        setError('Ya no hay alimentos disponibles para copiar.')
        return
      }
      onClose()
      onCopiado(ids)
    } catch {
      setError('No se ha podido copiar. Inténtalo de nuevo.')
    } finally {
      setCopiando(false)
    }
  }

  async function guardarPlantilla() {
    const nombre = nombrePlantilla.trim()
    if (!nombre || guardando || !hayEntradas) return
    setGuardando(true)
    setError(null)
    try {
      await mealsRepo.crearDesdeEntradas({ nombre, comida, entries })
      onClose()
      onPlantillaGuardada(nombre)
    } catch {
      setError('No se ha podido guardar la plantilla. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  const titulos: Record<Paso, string> = { menu: plato ? 'Acciones del plato' : 'Acciones', copiar: 'Copiar a otro día', 'copiar-comida': 'Copiar a otra comida', plantilla: 'Guardar como plantilla' }

  return (
    <Sheet open onClose={onClose} title={titulos[paso]}>
      {plato && <p className="mb-3 break-words text-body font-semibold text-fg">{plato.nombre}</p>}
      {paso === 'menu' && (
        <div className="space-y-2">
          <ListRow tone="muted"
            onClick={() => irA('copiar-comida')}
            disabled={!hayEntradas}
            className="font-medium disabled:opacity-40"
          >
            Copiar a otra comida…
          </ListRow>
          <ListRow tone="muted"
            onClick={() => irA('copiar')}
            disabled={!hayEntradas}
            className="font-medium disabled:opacity-40"
          >
            Copiar a otro día…
          </ListRow>
          <ListRow tone="muted"
            onClick={() => irA('plantilla')}
            disabled={!hayEntradas}
            className="font-medium disabled:opacity-40"
          >
            Guardar como plantilla…
          </ListRow>
        </div>
      )}

      {(paso === 'copiar' || paso === 'copiar-comida') && (
        <div className="space-y-3">
          {paso === 'copiar-comida' ? (
            <p className="text-body-sm text-fg-muted">Copia a otra comida del mismo día. El original se mantiene.</p>
          ) : <label className="block space-y-1"><span className="text-label text-fg-muted">Fecha de destino</span><Input
            type="date"
            value={fechaDestino}
            max={todayISO()}
            onChange={(e) => setFechaDestino(e.target.value)}
          /></label>}
          <SegmentedControl label="Comida de destino" opciones={COMIDAS} valor={comidaDestino} onChange={setComidaDestino} />
          {copiaNoOp && <p className="text-body-sm text-warning">El origen y el destino son iguales.</p>}
          {error && <ErrorState>{error}</ErrorState>}
          <Button block loading={copiando}
            onClick={copiar}
            disabled={!hayEntradas || !fechaDestino || fechaDestino > todayISO() || copiaNoOp || copiando}
          >
            {copiando ? 'Copiando…' : 'Copiar'}
          </Button>
        </div>
      )}

      {paso === 'plantilla' && (
        <div className="space-y-3">
          <label className="block space-y-1"><span className="text-label text-fg-muted">Nombre de la plantilla</span><Input
            value={nombrePlantilla}
            onChange={(e) => setNombrePlantilla(e.target.value)}
            placeholder={`Mi ${LABELS[comida].toLowerCase()} de siempre`}
          /></label>
          {error && <ErrorState>{error}</ErrorState>}
          <Button block loading={guardando} onClick={guardarPlantilla} disabled={!hayEntradas || !nombrePlantilla.trim() || guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      )}
    </Sheet>
  )
}
