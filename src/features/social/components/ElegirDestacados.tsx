import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import SegmentedControl from '../../../shared/components/SegmentedControl'
import Sheet from '../../../shared/components/Sheet'
import { ErrorState, LoadingState } from '../../../shared/components/StateMessage'
import { todayISO } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import type { PerfilDeportivo } from '../data/social'
import IconoLogro from '../../vitrina/components/IconoLogro'
import { useVitrina } from '../../vitrina/hooks/useVitrina'
import { conseguido, type Logro } from '../../vitrina/lib/logros'
import { alternarDestacado, logrosNoElegibles, MAX_DESTACADOS } from '../lib/destacados'
import { MedallaPublicada } from './PerfilDeportivo'

type Pieza = PerfilDeportivo['destacados'][number]

interface Props {
  /** Logros publicados que se pueden destacar (`logrosElegibles`). */
  logros: Pieza[]
  destacados: Pieza[]
  onChange: (destacados: Pieza[]) => void
  /** Quedan publicaciones anteriores por leer. */
  hayMas: boolean
  /** Lee la página siguiente de tus publicaciones; si falla, el error se ve dentro de la hoja. */
  onCargarMas: () => Promise<void>
}

/**
 * «Logros destacados» del perfil deportivo: en el formulario, solo los tres huecos con sus medallas; todos los logros
 * publicados se eligen en una hoja aparte, en rejilla, para que muchos no alarguen el formulario.
 */
export default function ElegirDestacados({ logros, destacados, onChange, hayMas, onCargarMas }: Props) {
  const [abierta, setAbierta] = useState(false)
  const [ver, setVer] = useState<'compartidos' | 'todos'>('compartidos')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function cargarMas() {
    if (cargando) return
    setCargando(true); setError(null)
    try { await onCargarMas() } catch (e) { setError(e instanceof Error ? e.message : 'No se han podido leer tus publicaciones.') }
    finally { setCargando(false) }
  }
  const huecos = Array.from({ length: MAX_DESTACADOS }, (_, i) => destacados[i])
  return <fieldset className="space-y-stack">
    <legend className="text-label text-fg-muted">Logros destacados · Hasta tres</legend>
    {!logros.length && !hayMas ? <p className="text-body-sm text-fg-muted">Comparte un logro de tu Vitrina para destacarlo aquí.</p> : <>
      <ul aria-label="Logros destacados elegidos" className="grid grid-cols-3 gap-2">
        {huecos.map((p, i) => <li key={p?.id ?? `hueco-${i}`} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
          {p?.resumen.tipo === 'logro'
            ? <><MedallaPublicada resumen={p.resumen} /><span className="w-full break-words text-caption font-semibold leading-tight text-fg">{p.resumen.titulo}</span></>
            : <><span aria-hidden="true" className="destacado-hueco rounded-md border border-dashed border-line-strong" /><span className="text-caption text-fg-muted">Libre</span></>}
        </li>)}
      </ul>
      <Button variant="secondary" block aria-haspopup="dialog" onClick={() => setAbierta(true)}>
        {destacados.length ? 'Cambiar logros destacados' : 'Elegir logros destacados'}<Icon name="chevron-right" size={18} />
      </Button>
    </>}
    <Sheet open={abierta} onClose={() => setAbierta(false)} title="Logros destacados"
      footer={<Button block onClick={() => setAbierta(false)}>Hecho</Button>}>
      <div className="space-y-stack">
        <p className="tabular text-body-sm text-fg-muted" aria-live="polite">{formatInt(destacados.length)} de {formatInt(MAX_DESTACADOS)} elegidos. Se guardan con «Guardar perfil deportivo».</p>
        <SegmentedControl label="Logros que se ven" size="sm" valor={ver} onChange={setVer}
          opciones={[{ valor: 'compartidos', label: 'Solo compartidos' }, { valor: 'todos', label: 'Todos mis logros' }]} />
        {ver === 'todos' && <h3 className="text-rotulo text-fg-muted">Compartidos · se pueden destacar</h3>}
        {logros.length > 0 && <ul aria-label="Logros publicados" className="logros-rejilla grid grid-cols-3 gap-2">
          {logros.map(p => {
            if (p.resumen.tipo !== 'logro') return null
            const elegido = destacados.some(d => d.id === p.id)
            return <li key={p.id} className="min-w-0">
              <button type="button" aria-pressed={elegido} disabled={!elegido && destacados.length >= MAX_DESTACADOS} onClick={() => onChange(alternarDestacado(destacados, p))}
                className={`app-button relative flex min-h-touch w-full flex-col items-center gap-1.5 rounded-md border px-1 py-2 text-center disabled:opacity-40 ${elegido ? 'border-accent-strong bg-accent-subtle' : 'border-transparent hover:bg-surface-muted'}`}>
                <MedallaPublicada resumen={p.resumen} />
                <span className="w-full break-words text-caption font-semibold leading-tight text-fg">{p.resumen.titulo}</span>
                {elegido && <span aria-hidden="true" className="absolute right-1 top-1 flex rounded-pill bg-accent-strong p-0.5 text-surface"><Icon name="check" size={14} /></span>}
              </button>
            </li>
          })}
        </ul>}
        {hayMas && <Button variant="subtle" size="sm" block loading={cargando} onClick={() => void cargarMas()}>Buscar en publicaciones anteriores</Button>}
        {error && <ErrorState>{error}</ErrorState>}
        {!logros.length && !hayMas && <p className="text-body-sm text-fg-muted">Comparte un logro de tu Vitrina para destacarlo aquí.</p>}
        {ver === 'todos' && <OtrosLogros publicados={logros} hayMas={hayMas} />}
      </div>
    </Sheet>
  </fieldset>
}

/** Con «Todos mis logros»: lo conseguido sin compartir y lo que falta, de Vitrina. Solo se ven; destacar exige publicarlo. */
function OtrosLogros({ publicados, hayMas }: { publicados: Pieza[]; hayMas: boolean }) {
  const estado = useVitrina(todayISO())
  if (estado === undefined) return <LoadingState />
  if (!estado.visible) return <p className="text-body-sm text-fg-muted">Vitrina está oculta en Ajustes: aquí solo se ven los logros que ya has compartido.</p>
  const { sinCompartir, sinConseguir } = logrosNoElegibles(estado.vitrina.logros, publicados)
  return <>
    {sinCompartir.length > 0 && <section aria-label="Conseguidos sin compartir" className="space-y-2">
      <h3 className="text-rotulo text-fg-muted">Conseguidos sin compartir</h3>
      <p className="text-body-sm text-fg-muted">Compártelos desde Vitrina para poder destacarlos.{hayMas ? ' Alguno puede estar en publicaciones anteriores.' : ''}</p>
      <RejillaLogros logros={sinCompartir} />
    </section>}
    {sinConseguir.length > 0 && <section aria-label="Sin conseguir" className="space-y-2">
      <h3 className="text-rotulo text-fg-muted">Sin conseguir</h3>
      <RejillaLogros logros={sinConseguir} />
    </section>}
  </>
}

function RejillaLogros({ logros }: { logros: Logro[] }) {
  return <ul className="logros-rejilla grid grid-cols-3 gap-2">
    {logros.map(l => {
      const oculto = l.oculto && !conseguido(l)
      return <li key={l.id} className="flex min-w-0 flex-col items-center gap-1.5 px-1 py-2 text-center">
        <IconoLogro logro={l} />
        <span className={`w-full break-words text-caption font-semibold leading-tight ${conseguido(l) ? 'text-fg' : 'text-fg-muted'}`}>{oculto ? 'Logro oculto' : l.nombre}</span>
      </li>
    })}
  </ul>
}
