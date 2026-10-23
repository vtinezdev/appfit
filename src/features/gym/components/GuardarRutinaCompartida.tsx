import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as exercisesRepo from '../data/exercisesRepo'
import * as routinesRepo from '../data/routinesRepo'
import Button from '../../../shared/components/Button'
import { Input } from '../../../shared/components/Input'
import ListGroup from '../../../shared/components/ListGroup'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState } from '../../../shared/components/StateMessage'
import type { ResumenRutina } from '../../social/lib/publicacion'
import { CATALOGO_POR_ID } from '../lib/catalogoEjercicios'
import { filasRutinaCompartida, textoEjercicioCompartido, type FilaRutinaCompartida } from '../lib/rutinaCompartida'
import { ErrorSeleccionEjercicio, type SeleccionEjercicio } from '../lib/selectorEjercicios'
import MiniaturaEjercicio from './MiniaturaEjercicio'
import SelectorEjercicios from './SelectorEjercicios'

interface Props {
  resumen: ResumenRutina
  onClose: () => void
  /** Ya guardada, con el nombre final (con «(2)» si ya tenías una rutina con ese nombre). */
  onGuardada: (nombre: string) => void
}

/**
 * «Guardar en mis rutinas» desde una rutina compartida en Social (ADR 055): se revisan el nombre y los ejercicios y se
 * guarda con su estructura, sin cargas (las pondrá cada uno al entrenar). Los ejercicios propios de quien la compartió
 * (o del catálogo de una versión más nueva) se eligen del buscador o se quitan.
 */
export default function GuardarRutinaCompartida({ resumen, onClose, onGuardada }: Props) {
  const [nombre, setNombre] = useState(resumen.titulo)
  const [filas, setFilas] = useState<FilaRutinaCompartida[]>(() => filasRutinaCompartida(resumen))
  const [eligiendo, setEligiendo] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const locales = useLiveQuery(() => exercisesRepo.listar(), [])
  const nombreLocal = new Map(locales?.map((e) => [e.id, e.nombre]))

  const nombreDe = (s: SeleccionEjercicio) => s.tipo === 'catalogo' ? CATALOGO_POR_ID.get(s.catalogId)?.name ?? 'Ejercicio' : s.tipo === 'local' ? nombreLocal.get(s.id) ?? 'Ejercicio' : s.nombre.trim()
  const catalogoDe = (s: SeleccionEjercicio) => s.tipo === 'catalogo' ? s.catalogId : s.tipo === 'local' ? locales?.find((e) => e.id === s.id)?.catalogId : undefined
  const cambiar = (i: number, cambio: Partial<FilaRutinaCompartida> | null) => {
    setFilas((f) => cambio ? f.map((x, j) => (j === i ? { ...x, ...cambio } : x)) : f.filter((_, j) => j !== i))
    setError(null)
  }

  async function guardar() {
    if (guardando) return
    if (!nombre.trim()) { setError('Ponle un nombre a la rutina.'); return }
    const pendiente = filas.find((f) => !f.seleccion)
    if (pendiente) { setError(`Elige un ejercicio para «${pendiente.nombre}» o quítalo.`); return }
    setGuardando(true)
    setError(null)
    try {
      const id = await routinesRepo.guardarCompartida(nombre, filas.map((f) => ({ seleccion: f.seleccion!, ...(f.objetivo ? { objetivo: f.objetivo } : {}) })))
      onGuardada((await routinesRepo.obtener(id))?.nombre ?? nombre.trim())
    } catch (e) {
      setError(e instanceof routinesRepo.RutinaVacia || e instanceof ErrorSeleccionEjercicio ? e.message : 'No se ha podido guardar la rutina. Inténtalo de nuevo.')
      setGuardando(false)
    }
  }

  return <>
    <Sheet open={eligiendo === null} onClose={onClose} title="Guardar en mis rutinas"
      footer={<div className="space-y-2">{error && <ErrorState>{error}</ErrorState>}<Button block loading={guardando} disabled={!filas.length} onClick={guardar}>Guardar rutina</Button></div>}>
      <div className="space-y-stack">
        <p className="break-words text-body-sm text-fg-muted">Se guardan los ejercicios, las series, las repeticiones y los descansos. Las cargas serán las tuyas: las pones al entrenar.</p>
        <label className="block space-y-1"><span className="text-label text-fg-muted">Nombre de la rutina</span>
          <Input value={nombre} maxLength={60} onChange={(e) => { setNombre(e.target.value); setError(null) }} /></label>
        <ListGroup aria-label="Ejercicios de la rutina">
          {filas.map((f, i) => {
            const objetivo = textoEjercicioCompartido({ nombre: f.nombre, catalogId: f.catalogId, ...f.objetivo })
            const elegido = f.seleccion && nombreDe(f.seleccion)
            return <li key={`${f.nombre}-${i}`} className="flex flex-wrap items-center gap-3 py-3">
              <MiniaturaEjercicio catalogId={(f.seleccion && catalogoDe(f.seleccion)) ?? undefined} />
              <span className="min-w-0 flex-1 basis-32 space-y-0.5">
                <span className="block break-words text-body font-medium text-fg">{elegido ?? f.nombre}</span>
                {elegido && elegido !== f.nombre && <span className="block break-words text-caption text-fg-muted">En lugar de {f.nombre}</span>}
                {!f.seleccion && <span className="block break-words text-caption text-fg-muted">No está en tu catálogo: elige uno parecido.</span>}
                {objetivo && <span className="tabular block break-words text-caption text-fg-muted">{objetivo}</span>}
              </span>
              <span className="flex flex-wrap gap-1">
                <Button variant={f.seleccion ? 'subtle' : 'secondary'} size="sm" aria-label={`${f.seleccion ? 'Cambiar' : 'Elegir'} ejercicio para ${f.nombre}`} onClick={() => setEligiendo(i)}>{f.seleccion ? 'Cambiar' : 'Elegir'}</Button>
                <Button variant="subtle" size="sm" aria-label={`Quitar ${elegido ?? f.nombre}`} onClick={() => cambiar(i, null)}>Quitar</Button>
              </span>
            </li>
          })}
        </ListGroup>
        {!filas.length && <p className="text-body-sm text-fg-muted">Has quitado todos los ejercicios: no hay nada que guardar.</p>}
      </div>
    </Sheet>
    {eligiendo !== null && filas[eligiendo] && <SelectorEjercicios titulo={`Elegir en lugar de ${filas[eligiendo].nombre}`} verbo="Elegir"
      onClose={() => setEligiendo(null)} onElegir={async (seleccion) => { cambiar(eligiendo, { seleccion }); setEligiendo(null) }} />}
  </>
}
