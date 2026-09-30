import { useState } from 'react'
import Sheet from '../../../shared/components/Sheet'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import type { Comida, Entry } from '../../../shared/db/types'
import { todayISO } from '../../../shared/lib/dates'
import * as entriesRepo from '../data/entriesRepo'
import * as mealsRepo from '../data/mealsRepo'
import { copiaEsNoOp } from '../lib/plantillas'
import ListRow from '../../../shared/components/ListRow'
import { Input } from '../../../shared/components/Input'
import Button from '../../../shared/components/Button'
import { ErrorState } from '../../../shared/components/StateMessage'

const COMIDAS: { valor: Comida; label: string }[] = [
  { valor: 'desayuno', label: 'Desayuno' },
  { valor: 'comida', label: 'Comida' },
  { valor: 'cena', label: 'Cena' },
  { valor: 'snack', label: 'Snack' },
]

const LABELS: Record<Comida, string> = { desayuno: 'Desayuno', comida: 'Comida', cena: 'Cena', snack: 'Snack' }

interface Props {
  fecha: string
  comida: Comida
  entries: Entry[]
  onClose: () => void
  onCopiado: (ids: number[]) => void
  onPlantillaGuardada: (nombre: string) => void
}

type Paso = 'menu' | 'copiar' | 'plantilla'

/**
 * «⋯» de la cabecera de una comida en Hoy: copiar a otro día (A2) o guardar como plantilla (A1).
 * Se monta de nuevo cada vez que se abre (el padre lo renderiza solo mientras hay una comida elegida),
 * así que su estado interno siempre empieza limpio.
 */
export default function AccionesComidaSheet({ fecha, comida, entries, onClose, onCopiado, onPlantillaGuardada }: Props) {
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
    setPaso(p)
  }

  async function copiar() {
    if (copiando) return
    setCopiando(true)
    setError(null)
    try {
      const ids = await entriesRepo.copiar({ origen: { fecha, comida }, destino: { fecha: fechaDestino, comida: comidaDestino } })
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
    if (!nombre || guardando) return
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

  const titulos: Record<Paso, string> = { menu: 'Acciones', copiar: 'Copiar a otro día', plantilla: 'Guardar como plantilla' }

  return (
    <Sheet open onClose={onClose} title={titulos[paso]}>
      {paso === 'menu' && (
        <div className="space-y-2">
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

      {paso === 'copiar' && (
        <div className="space-y-3">
          <Input
            type="date"
            value={fechaDestino}
            max={todayISO()}
            onChange={(e) => setFechaDestino(e.target.value)}
          />
          <SegmentedControl opciones={COMIDAS} valor={comidaDestino} onChange={setComidaDestino} />
          {copiaNoOp && <p className="text-body-sm text-warning">El origen y el destino son iguales.</p>}
          {error && <ErrorState>{error}</ErrorState>}
          <Button block loading={copiando}
            onClick={copiar}
            disabled={!fechaDestino || fechaDestino > todayISO() || copiaNoOp || copiando}
          >
            {copiando ? 'Copiando…' : 'Copiar'}
          </Button>
        </div>
      )}

      {paso === 'plantilla' && (
        <div className="space-y-3">
          <Input
            value={nombrePlantilla}
            onChange={(e) => setNombrePlantilla(e.target.value)}
            placeholder={`Mi ${LABELS[comida].toLowerCase()} de siempre`}
          />
          {error && <ErrorState>{error}</ErrorState>}
          <Button block loading={guardando} onClick={guardarPlantilla} disabled={!nombrePlantilla.trim() || guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      )}
    </Sheet>
  )
}
