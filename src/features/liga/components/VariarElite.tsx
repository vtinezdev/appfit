import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Disclosure from '../../../shared/components/Disclosure'
import { Select } from '../../../shared/components/Input'
import ListGroup from '../../../shared/components/ListGroup'
import { ErrorState } from '../../../shared/components/StateMessage'
import type { Routine } from '../../../shared/db/types'
import MiniaturaEjercicio from '../../gym/components/MiniaturaEjercicio'
import * as routinesRepo from '../../gym/data/routinesRepo'
import { ErrorSustitucion } from '../../gym/lib/rutinas'
import { ErrorSeleccionEjercicio } from '../../gym/lib/selectorEjercicios'
import * as ligaRepo from '../data/ligaRepo'
import type { Alternativa } from '../lib/alternativas'

interface Props {
  exerciseId: number
  nombre: string
  alternativas: Alternativa[]
  basico: boolean
  mantenido: boolean
  /** Rutinas que incluyen el ejercicio: cada alternativa puede sustituirlo en una de ellas. */
  rutinas?: Routine[]
  /** Aclaración bajo la lista (en el entreno activo: la sesión en curso no cambia). */
  notaRutina?: string
}

/**
 * En Élite: alternativas con el mismo músculo principal (con «Usar» si el ejercicio está en una rutina) y «Mantener»
 * (deja de avisar durante el entreno) o «Volver a avisar». En los básicos, que no avisan, las alternativas quedan en un
 * desplegable y no hay nada que mantener. Errores y «Deshacer» en línea: también se usa dentro de una hoja.
 */
export default function VariarElite({ exerciseId, nombre, alternativas, basico, mantenido, rutinas = [], notaRutina }: Props) {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rutinaElegida, setRutinaElegida] = useState<number | null>(null)
  const [hecho, setHecho] = useState<{ texto: string; antes: Routine } | null>(null)
  const rutina = rutinas.find((r) => r.id === rutinaElegida) ?? rutinas[0]

  async function intentar(f: () => Promise<void>) {
    setOcupado(true); setError(null)
    try { await f() } catch (e) {
      setError(e instanceof ErrorSustitucion || e instanceof ErrorSeleccionEjercicio ? e.message : 'No se ha podido guardar. Inténtalo de nuevo.')
    } finally { setOcupado(false) }
  }
  const usar = (a: Alternativa) => intentar(async () => {
    if (!rutina) return
    const antes = await routinesRepo.sustituirEjercicio(rutina.id, exerciseId, a.seleccion)
    setHecho({ texto: `En «${rutina.nombre}», ${a.nombre} sustituye a ${nombre}, con su mismo objetivo.`, antes })
  })
  const deshacer = () => intentar(async () => {
    if (!hecho) return
    await routinesRepo.restaurar(hecho.antes)
    setHecho(null)
  })

  const lista = alternativas.length
    ? <ListGroup variante="plana" aria-label="Alternativas con el mismo músculo principal">
        {alternativas.map((a) => <li key={a.key} className="flex min-h-touch items-center gap-3 py-2">
          <MiniaturaEjercicio catalogId={a.catalogId} />
          <span className="min-w-0 flex-1">
            <span className="block break-words text-body font-medium text-fg">{a.nombre}</span>
            <span className="block break-words text-caption text-fg-muted">{[a.subtitulo, a.estado].filter(Boolean).join(' · ')}</span>
          </span>
          {rutina && <Button variant="subtle" size="sm" className="shrink-0" disabled={ocupado} aria-label={`Usar ${a.nombre} en lugar de ${nombre} en ${rutina.nombre}`} onClick={() => usar(a)}>Usar</Button>}
        </li>)}
      </ListGroup>
    : <p className="text-body-sm text-fg-muted">No hay alternativas con el mismo músculo principal en el catálogo.</p>
  const sustitucion = <>
    {rutinas.length > 1 && <label className="block space-y-2"><span className="text-label text-fg-muted">Rutina en la que cambiarlo</span>
      <Select value={rutina?.id ?? ''} onChange={(e) => setRutinaElegida(Number(e.target.value))}>
        {rutinas.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
      </Select></label>}
    {lista}
    {hecho && <div role="status" className="flex flex-wrap items-center justify-between gap-x-3 text-body-sm text-fg">
      <span className="min-w-0 break-words">{hecho.texto}</span>
      <Button variant="ghost" size="sm" disabled={ocupado} onClick={deshacer}>Deshacer</Button>
    </div>}
    <p className="text-caption text-fg-muted">
      Con el mismo músculo principal; primero las que llevas menos tiempo haciendo.{' '}
      {rutina ? `«Usar» lo cambia en la rutina «${rutina.nombre}».${notaRutina ? ` ${notaRutina}` : ''}` : 'Para cambiar, añade la que quieras al entreno o a una rutina.'}
    </p>
  </>
  const errorEnLinea = error && <ErrorState>{error}</ErrorState>

  if (basico) {
    return <Disclosure title="Si aun así quieres variar"><div className="space-y-2">{sustitucion}{errorEnLinea}</div></Disclosure>
  }
  return <div className="space-y-3">
    {(!mantenido || hecho) && <div className="space-y-2">
      <h3 className="text-label text-fg-muted">Si te apetece variar</h3>
      {sustitucion}
    </div>}
    {mantenido
      ? <div className="space-y-1">
          <Button variant="secondary" block loading={ocupado} onClick={() => intentar(async () => { await ligaRepo.volverAAvisar(exerciseId) })}>Volver a avisar</Button>
          <p className="text-caption text-fg-muted">Ahora no te avisa de {nombre} durante el entreno.</p>
        </div>
      : <div className="space-y-1">
          <Button variant="secondary" block loading={ocupado} onClick={() => intentar(async () => { await ligaRepo.mantener(exerciseId) })}>Mantener este ejercicio</Button>
          <p className="text-caption text-fg-muted">Deja de avisarte durante el entreno; sigue en su liga y puedes volver a activarlo aquí.</p>
        </div>}
    {errorEnLinea}
  </div>
}
