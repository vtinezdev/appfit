import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import FilterChips from '../../../shared/components/FilterChips'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import ModalPage from '../../../shared/components/ModalPage'
import SectionHeader from '../../../shared/components/SectionHeader'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import { ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { addDays, formatShort } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import * as foodsRepo from '../data/foodsRepo'
import * as planificadasRepo from '../data/planificadasRepo'
import { agruparCompra, alternarMarca, cantidadCompra, listaCompra, nombreSemana, rangoSemana, textoListaCompra } from '../lib/planificadas'

type Modo = 'semana' | 'dias'
const OPCIONES_MODO: { valor: Modo; label: string }[] = [{ valor: 'semana', label: 'Toda la semana' }, { valor: 'dias', label: 'Elegir días' }]

/**
 * Lista de la compra de una semana del Plan (desde hoy, nunca días pasados): gramos sumados por alimento y agrupados por
 * categoría. Lo marcado como comprado se guarda en el dispositivo (`settings.compraMarcada`) hasta que se desmarca.
 */
export default function ListaCompra({ hoy, lunes, onClose }: { hoy: string; lunes: string; onClose: () => void }) {
  const dias = Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).filter((f) => f >= hoy)
  const [modo, setModo] = useState<Modo>('semana')
  const [elegidos, setElegidos] = useState<string[]>(dias)
  const [copiada, setCopiada] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fechas = modo === 'semana' ? dias : dias.filter((f) => elegidos.includes(f))

  const datos = useLiveQuery(async () => {
    const filas = fechas.length ? (await planificadasRepo.entreFechas(fechas[0], fechas[fechas.length - 1])).filter((f) => fechas.includes(f.fecha)) : []
    const articulos = listaCompra(filas)
    const [categorias, marcadas] = await Promise.all([foodsRepo.categoriasDeEntradas(filas), planificadasRepo.marcasCompra()])
    return { articulos, grupos: agruparCompra(articulos, categorias), marcadas }
  }, [fechas.join(',')])

  const marcadas = new Set(datos?.marcadas ?? [])
  const pendientes = datos?.articulos.filter((a) => !marcadas.has(a.clave)) ?? []
  const hayMarcadas = datos?.articulos.some((a) => marcadas.has(a.clave)) ?? false

  function marcar(clave: string) {
    if (!datos) return
    setError(null)
    planificadasRepo.guardarMarcasCompra(alternarMarca(datos.marcadas, clave)).catch(() => setError('No se ha podido guardar la marca. Inténtalo de nuevo.'))
  }

  function desmarcarTodo() {
    if (!datos) return
    setError(null)
    const visibles = new Set(datos.articulos.map((a) => a.clave))
    planificadasRepo.guardarMarcasCompra(datos.marcadas.filter((c) => !visibles.has(c))).catch(() => setError('No se ha podido desmarcar. Inténtalo de nuevo.'))
  }

  function copiar() {
    if (!pendientes.length) return
    setError(null)
    const texto = `Lista de la compra (AppFit)\n${textoListaCompra(pendientes)}`
    if (!navigator.clipboard) { setError('No se ha podido copiar. Apúntala a mano.'); return }
    navigator.clipboard.writeText(texto).then(() => setCopiada(true), () => setError('No se ha podido copiar. Apúntala a mano.'))
  }

  return (
    <ModalPage title="Lista de la compra" onClose={onClose}
      footer={datos && datos.articulos.length > 0 && <div className="space-y-2">
        {error && <ErrorState>{error}</ErrorState>}
        <Button size="lg" block disabled={!pendientes.length} onClick={copiar}>
          <Icon name={copiada ? 'check' : 'copy'} size={18} />{copiada ? 'Lista copiada' : pendientes.length ? 'Copiar lo que falta' : 'Ya lo tienes todo'}
        </Button>
      </div>}>
      <div className="space-y-section">
        <div className="space-y-stack">
          <p className="text-body-sm text-fg-muted">{nombreSemana(lunes, hoy)} · <span className="tabular">{rangoSemana(lunes)}</span>{lunes < hoy ? ' · desde hoy' : ''}</p>
          <SegmentedControl label="Días de la lista" size="sm" opciones={OPCIONES_MODO} valor={modo} onChange={(v) => { setModo(v); setCopiada(false) }} />
          {modo === 'dias' && <FilterChips label="Días" opciones={Object.fromEntries(dias.map((f) => [f, formatShort(f)]))} seleccion={elegidos} onChange={(v) => { setElegidos(v); setCopiada(false) }} />}
        </div>

        {!datos ? <LoadingState /> : datos.articulos.length === 0
          ? <p className="text-body-sm text-fg-muted">{fechas.length ? 'No hay nada planificado en estos días.' : 'Elige al menos un día.'}</p>
          : <>
            {datos.grupos.map((g) => <section key={g.categoria} aria-label={g.categoria} className="space-y-1">
              <SectionHeader>{g.categoria}</SectionHeader>
              <ListGroup>
                {g.articulos.map((a) => {
                  const hecho = marcadas.has(a.clave)
                  return <li key={a.clave}>
                    <label className="flex min-h-touch cursor-pointer items-center gap-3 py-2">
                      <input type="checkbox" checked={hecho} onChange={() => marcar(a.clave)} className="h-5 w-5 shrink-0 accent-accent" />
                      <span className={`min-w-0 flex-1 break-words text-body ${hecho ? 'text-fg-subtle line-through' : 'text-fg'}`}>{a.nombre}</span>
                      <span className={`tabular shrink-0 text-body-sm ${hecho ? 'text-fg-subtle' : 'text-fg-muted'}`}>{cantidadCompra(a.gramos)}</span>
                    </label>
                  </li>
                })}
              </ListGroup>
            </section>)}
            <div className="space-y-2">
              <p className="tabular text-caption text-fg-muted">{formatInt(pendientes.length)} de {formatInt(datos.articulos.length)} por comprar. Suma los gramos de lo planificado; las kcal rápidas no salen.</p>
              {hayMarcadas && <Button variant="ghost" size="sm" className="-ml-3" onClick={desmarcarTodo}>Desmarcar todo</Button>}
            </div>
          </>}
      </div>
    </ModalPage>
  )
}
