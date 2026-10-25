import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Button from '../../../shared/components/Button'
import Sheet from '../../../shared/components/Sheet'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import { Input } from '../../../shared/components/Input'
import { ErrorState } from '../../../shared/components/StateMessage'
import Pista from '../../../shared/components/Pista'
import * as gimnasiosRepo from '../data/gimnasiosRepo'
import { LONGITUD_MAXIMA_NOMBRE } from '../lib/gimnasios'
import { useNombresGimnasio } from '../hooks/useNombresGimnasio'
import ChipAjuste from './ChipAjuste'

const HABITUAL = 'habitual'
const clave = (id: number | undefined) => (id === undefined ? HABITUAL : String(id))
const mensaje = (e: unknown, otro: string) => (e instanceof Error && e.message ? e.message : otro)

/** Chip con el gimnasio de la sesión; al tocarlo abre `GimnasioSheet`. */
export function ChipGimnasio({ gimnasioId, disabled, onElegir }: { gimnasioId?: number; disabled?: boolean; onElegir: (id: number | undefined) => Promise<void> }) {
  const [abierto, setAbierto] = useState(false)
  const nombreGimnasio = useNombresGimnasio()
  return <>
    <ChipAjuste label="Gimnasio" texto={nombreGimnasio(gimnasioId)} apagado={gimnasioId === undefined} disabled={disabled} onClick={() => setAbierto(true)} />
    {abierto && <GimnasioSheet actual={gimnasioId} onElegir={onElegir} onClose={() => setAbierto(false)} />}
  </>
}

/**
 * Elegir dónde se entrena (ADR 054): el habitual o uno guardado con nombre, y añadir, renombrar o borrar gimnasios.
 * El habitual también se puede nombrar (sin nombre, «Gimnasio habitual»), pero no borrar.
 * Se monta al abrir: parte siempre del gimnasio vigente.
 */
export default function GimnasioSheet({ actual, onElegir, onClose }: { actual?: number; onElegir: (id: number | undefined) => Promise<void>; onClose: () => void }) {
  const gimnasios = useLiveQuery(() => gimnasiosRepo.listar(), [])
  const habitual = useLiveQuery(async () => ({ nombre: await gimnasiosRepo.nombreHabitual() }), [])
  const [elegido, setElegido] = useState(clave(actual))
  const [nuevo, setNuevo] = useState('')
  const [nombre, setNombre] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [borrado, setBorrado] = useState<string | null>(null)
  const seleccion = elegido === HABITUAL ? undefined : gimnasios?.find(g => String(g.id) === elegido)
  const enUso = useLiveQuery(() => (seleccion ? gimnasiosRepo.enUso(seleccion.id) : false), [seleccion?.id])

  async function accion(fn: () => Promise<void>, otro: string) {
    if (ocupado) return
    setOcupado(true); setError(null)
    try { await fn() } catch (e) { setError(mensaje(e, otro)) } finally { setOcupado(false) }
  }
  const usar = () => accion(async () => { await onElegir(seleccion?.id); onClose() }, 'No se ha podido cambiar el gimnasio. Inténtalo de nuevo.')
  const anadir = () => accion(async () => { const id = await gimnasiosRepo.crear(nuevo); setNuevo(''); setBorrado(null); setElegido(String(id)) }, 'No se ha podido añadir el gimnasio.')
  const renombrar = () => accion(async () => {
    if (nombre === null) return
    if (seleccion) await gimnasiosRepo.renombrar(seleccion.id, nombre)
    else if (elegido === HABITUAL) await gimnasiosRepo.renombrarHabitual(nombre)
    setNombre(null)
  }, 'No se ha podido renombrar.')
  const nombreActual = seleccion?.nombre ?? habitual?.nombre ?? ''
  const borrar = () => accion(async () => {
    if (!seleccion) return
    await gimnasiosRepo.borrar(seleccion.id)
    setBorrado(seleccion.nombre); setNombre(null); setElegido(clave(actual === seleccion.id ? undefined : actual))
  }, 'No se ha podido borrar el gimnasio.')
  const deshacer = () => accion(async () => { if (borrado) { const id = await gimnasiosRepo.crear(borrado); setBorrado(null); setElegido(String(id)) } }, 'No se ha podido recuperar el gimnasio.')

  return (
    <Sheet open onClose={() => { if (!ocupado) onClose() }} title="Gimnasio"
      footer={<div className="space-y-2"><Button block loading={ocupado} disabled={gimnasios === undefined} onClick={usar}>Entrenar aquí</Button><Button variant="ghost" block disabled={ocupado} onClick={onClose}>Cancelar</Button></div>}>
      <div className="space-y-section">
        <Pista id="entreno-gimnasio" />
        {gimnasios && <SegmentedControl variante="vertical" label="Dónde entrenas" valor={elegido} onChange={v => { setElegido(v); setNombre(null); setError(null) }}
          opciones={[{ valor: HABITUAL, label: habitual?.nombre ?? 'Gimnasio habitual', descripcion: habitual?.nombre ? 'Tu gimnasio habitual' : 'Donde entrenas siempre' },
            ...gimnasios.map(g => ({ valor: String(g.id), label: g.nombre, descripcion: 'Sus máquinas llevan historial propio' }))]} />}
        {borrado && <p role="status" className="flex flex-wrap items-center gap-x-2 text-body-sm text-fg-muted">«{borrado}» borrado.
          <Button variant="ghost" size="sm" disabled={ocupado} onClick={deshacer}>Deshacer</Button></p>}
        {(seleccion || (elegido === HABITUAL && habitual)) && <section aria-label={`Editar ${seleccion?.nombre ?? 'gimnasio habitual'}`} className="space-y-2">
          <label className="block space-y-2"><span className="text-label text-fg-muted">Nombre</span>
            <Input value={nombre ?? nombreActual} maxLength={LONGITUD_MAXIMA_NOMBRE} placeholder={seleccion ? undefined : 'Por ejemplo, Basic-Fit Centro'} disabled={ocupado} onChange={e => setNombre(e.target.value)} /></label>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" disabled={ocupado || nombre === null || nombre.trim() === nombreActual} onClick={renombrar}>Guardar nombre</Button>
            {seleccion && enUso === false && <Button variant="ghost" size="sm" disabled={ocupado} onClick={borrar}>Borrar gimnasio</Button>}
          </div>
          {seleccion && enUso && <p className="text-caption text-fg-muted">Tiene entrenos registrados: puedes renombrarlo, pero no borrarlo.</p>}
          {!seleccion && <p className="text-caption text-fg-muted">Sale en el historial y en Progreso. Déjalo vacío para volver a «Gimnasio habitual».</p>}
        </section>}
        <section aria-label="Añadir gimnasio" className="space-y-2">
          <label className="block space-y-2"><span className="text-label text-fg-muted">Añadir gimnasio</span>
            <Input value={nuevo} maxLength={LONGITUD_MAXIMA_NOMBRE} placeholder="Por ejemplo, Gym Playa" disabled={ocupado} onChange={e => setNuevo(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && nuevo.trim()) { e.preventDefault(); void anadir() } }} /></label>
          <Button variant="secondary" size="sm" disabled={ocupado || !nuevo.trim()} onClick={anadir}>Añadir</Button>
        </section>
        <p className="text-body-sm text-fg-muted">Solo las máquinas, poleas y smith se separan por gimnasio. Barra, mancuernas y peso corporal comparten historial en todos.</p>
        {error && <ErrorState>{error}</ErrorState>}
      </div>
    </Sheet>
  )
}
