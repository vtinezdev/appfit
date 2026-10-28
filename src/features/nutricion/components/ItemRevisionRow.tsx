import { useId, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import { Select } from '../../../shared/components/Input'
import Sheet from '../../../shared/components/Sheet'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { envioDisponible } from '../../cuenta/mensajes'
import * as porcionesRepo from '../data/porcionesRepo'
import { faltanValores, medidaPendiente, pendienteRevision, procedencia, type ItemRevision } from '../lib/alimentos'
import { etiquetaFuente } from '../lib/catalogo/textos'
import { iconoDeCategoria } from '../lib/iconosCategoria'
import { elegirMedida, preguntaMedida, textoOpcionMedida, type MedidaAmbigua } from '../lib/interprete/medidas'
import { macrosPorGramos } from '../lib/nutrition'
import { partesNombre } from '../lib/ordenBusqueda'
import DetallesAlimento from './DetallesAlimento'
import { CantidadesRapidas, PastillasMacros } from './PiezasCantidad'
import PreparacionAlimento from './PreparacionAlimento'
import ProponerAlimentoSheet from './ProponerAlimentoSheet'

interface Props {
  item: ItemRevision
  onChange: (patch: Partial<ItemRevision>) => void
  onQuitar?: () => void
  onCambiar?: () => void
  aviso?: string
  nombreCorto?: string
  onCambioNombreCorto?: (editando: boolean) => void
  nombreCortoBloqueado?: boolean
  /** El ítem creará un alimento propio: se muestra (y exige) su categoría. */
  pedirCategoria?: boolean
  editarInicial?: boolean
  /**
   * El ítem es una receta: tocarlo abre su hoja (versión, cantidad, ingredientes) en lugar del editor de alimento.
   * Quitarla o cambiarla se hace desde esa hoja.
   */
  onAbrirReceta?: () => void
}
function textoProcedencia(item: ItemRevision): string | undefined {
  switch (procedencia(item)) {
    case 'tuyo': return 'Tuyo'
    case 'catalogo': return etiquetaFuente(item.origen.catalogId!.split(':')[0])
    default: return undefined
  }
}
function SelectorMedida({ medida, onElegir }: { medida: MedidaAmbigua; onElegir: (gramosPorUnidad: number) => void }) {
  return (
    <label className="block space-y-1">
      <span className="block text-label text-fg-muted">{preguntaMedida(medida)}</span>
      <Select value={medida.elegida ?? ''} onChange={(e) => onElegir(Number(e.target.value))} aria-invalid={medida.elegida === undefined}>
        <option value="" disabled>Elige una cantidad</option>
        {medida.opciones.map((g) => <option key={g} value={g}>{textoOpcionMedida(medida, g)}</option>)}
      </Select>
    </label>
  )
}
/**
 * Un alimento de la revisión: icono, nombre en dos partes con su fuente, kcal y gramos, y sus macros en pastillas. Nada
 * se abre solo: lo que le falta sale en rojo (`pendienteRevision`). Abierto, solo la cantidad y Cambiar, Detalles y
 * Quitar (sin encontrar: buscar otro, escribir sus valores, proponérselo a AppFit con lo escrito o quitarlo); los detalles van en una hoja. Una receta no se
 * despliega: tocarla abre su hoja (`onAbrirReceta`).
 */
export default function ItemRevisionRow({ item, onChange, onQuitar, onCambiar, aviso, nombreCorto, onCambioNombreCorto, nombreCortoBloqueado, pedirCategoria, editarInicial = false, onAbrirReceta }: Props) {
  const aporte = macrosPorGramos(item, item.gramos)
  const [abierto, setAbierto] = useState(editarInicial)
  const [verDetalles, setVerDetalles] = useState(false)
  const [proponiendo, setProponiendo] = useState<string | null>(null)
  const editorId = useId()
  const clave = useLiveQuery(() => porcionesRepo.refDeItem(item.origen), [item.origen.guardado, item.origen.nombreNorm, item.origen.catalogId])
  const [cabeza, detalle] = partesNombre(item.nombre || 'Alimento sin nombre')
  const icono = iconoDeCategoria(item.categoria)
  const fuente = textoProcedencia(item)
  const pendiente = pendienteRevision(item, pedirCategoria)
  const sinEncontrar = !!item.sinCoincidencia && faltanValores(item)
  const nombre = item.nombre || 'alimento'
  // Al cerrarlo, la cantidad estimada ya se ha visto: deja de marcarse.
  const alternar = () => {
    if (onAbrirReceta) { onAbrirReceta(); return }
    if (abierto && item.gramosEstimados) onChange({ gramosEstimados: false })
    setAbierto(!abierto)
  }
  const lineaReceta = onAbrirReceta && `Receta · ${item.origen.receta?.info.origen === 'tuya' ? 'Tuya' : 'AppFit'} · toca para ver`
  const cerrarDetalles = () => { setVerDetalles(false); onCambioNombreCorto?.(false) }

  return <div className="relative min-w-0 px-card py-3">
    {pendiente && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-destructive" />}
    <button type="button" aria-label={onAbrirReceta ? `Ver receta ${nombre}` : `Editar ${nombre}`} aria-expanded={onAbrirReceta ? undefined : abierto} aria-controls={onAbrirReceta ? undefined : editorId} onClick={alternar}
      className="flex w-full items-start gap-3 text-left">
      <span aria-hidden className="icono-pastilla shrink-0 text-fg-muted">{onAbrirReceta ? <Icon name="recetario" size={18} /> : icono ? <Icon name={icono} size={18} /> : <span className="text-body-sm font-semibold">{(item.nombre || '?').slice(0, 1).toLocaleUpperCase('es')}</span>}</span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block break-words text-body font-semibold text-fg">{cabeza}</span>
        {lineaReceta ? <span className="block break-words text-caption font-medium text-fg-muted">{lineaReceta}</span>
          : (detalle || fuente) && <span className="line-clamp-1 block break-words text-caption text-fg-muted">{[detalle, fuente].filter(Boolean).join(' · ')}</span>}
      </span>
      <span className="tabular shrink-0 text-right">
        <span className="block"><span className="font-numeric text-title text-fg">{formatInt(Math.round(aporte.kcal))}</span><span className="text-caption text-fg-muted"> kcal</span></span>
        <span className="mt-1 inline-block rounded-pill border border-line-strong px-2 py-0.5 text-caption font-semibold text-fg">{medidaPendiente(item) ? 'Elige cantidad' : `${formatNumber(item.gramos, 1)} g`}</span>
      </span>
      <Icon name={onAbrirReceta ? 'chevron-right' : 'chevron-down'} size={18} className={`mt-1 shrink-0 text-fg-subtle transition-transform duration-short ${abierto ? 'rotate-180' : ''}`} />
    </button>
    <div aria-hidden className="mt-2 pl-12"><PastillasMacros macros={aporte} compactas /></div>
    {pendiente && <p className="mt-2 pl-12"><span className="inline-flex items-center gap-1 rounded-pill border border-destructive px-2 py-0.5 text-caption font-semibold text-destructive"><Icon name="alert" size={14} />{pendiente}</span></p>}
    <div id={editorId} hidden={!abierto} className="mt-3 space-y-4 border-t border-line pt-3">
      {sinEncontrar ? <>
        <p className="text-body-sm text-fg">No está en el catálogo ni en tus alimentos.</p>
        <div className="grid gap-2">
          {onCambiar && <Button variant="secondary" block onClick={onCambiar}><Icon name="search" size={18} />Buscar otro alimento</Button>}
          <Button variant="secondary" block onClick={() => setVerDetalles(true)}><Icon name="pencil" size={18} />Escribir sus valores</Button>
          {envioDisponible && <Button variant="secondary" block aria-haspopup="dialog" onClick={() => setProponiendo(item.nombre)}><Icon name="enviar" size={18} />Propónselo a AppFit</Button>}
          {onQuitar && <Button variant="ghost" block onClick={onQuitar} aria-label={`Quitar ${nombre}`}><Icon name="trash" size={18} />Quitar</Button>}
        </div>
      </> : <>
        <PreparacionAlimento nombre={item.nombre} explicar />
        {item.gramosEstimados && <p className="text-body-sm text-fg-muted">No dijiste la cantidad: he puesto {formatNumber(item.gramos, 1)} g. Ajústala.</p>}
        {aviso && <p className="text-caption text-fg-muted">{aviso}</p>}
        {item.medida && <SelectorMedida medida={item.medida} onElegir={(g) => onChange(elegirMedida(item.medida!, g))} />}
        {!medidaPendiente(item) && <CantidadesRapidas clave={clave} nombre={item.nombre} gramos={item.gramos} onGramos={(v) => onChange({ gramos: v, gramosEstimados: false })} />}
        <div className="grid auto-cols-fr grid-flow-col gap-2">
          {onCambiar && <Button variant="secondary" size="sm" onClick={onCambiar} aria-label={`Cambiar ${nombre}`}><Icon name="search" size={16} />Cambiar</Button>}
          <Button variant="secondary" size="sm" aria-haspopup="dialog" onClick={() => setVerDetalles(true)}><Icon name="pencil" size={16} />Detalles</Button>
          {onQuitar && <Button variant="secondary" size="sm" onClick={onQuitar} aria-label={`Quitar ${nombre}`}><Icon name="trash" size={16} />Quitar</Button>}
        </div>
      </>}
    </div>
    {sinEncontrar && <ProponerAlimentoSheet nombre={proponiendo} onClose={() => setProponiendo(null)} />}
    <Sheet open={verDetalles} onClose={cerrarDetalles} title="Detalles del alimento" footer={<Button block onClick={cerrarDetalles}>Listo</Button>}>
      <DetallesAlimento item={item} onChange={onChange} pedirCategoria={pedirCategoria} nombreCorto={nombreCorto} onCambioNombreCorto={onCambioNombreCorto} nombreCortoBloqueado={nombreCortoBloqueado} />
    </Sheet>
  </div>
}
