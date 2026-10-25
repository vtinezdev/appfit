import { useState } from 'react'
import Button from '../../../shared/components/Button'
import Icon from '../../../shared/components/Icon'
import Sheet from '../../../shared/components/Sheet'
import { LoadingState } from '../../../shared/components/StateMessage'
import { formatInt } from '../../../shared/lib/format'
import IconoLogro from '../../vitrina/components/IconoLogro'
import type { EstadoVitrina } from '../../vitrina/hooks/useVitrina'
import type { Logro } from '../../vitrina/lib/logros'
import { alternarDestacado, MAX_DESTACADOS, opcionesDestacados } from '../lib/destacados'
import type { ResumenLogro } from '../lib/publicacion'
import { MedallaPublicada } from './PerfilDeportivo'

interface Props {
  /** La Vitrina del dispositivo: de ella salen los logros que se pueden destacar (`undefined` mientras carga). */
  vitrina: EstadoVitrina | undefined
  /** Los elegidos, ya al día (`destacadosAlDia`). */
  destacados: ResumenLogro[]
  onChange: (destacados: ResumenLogro[]) => void
}

/**
 * «Logros destacados» del perfil deportivo: en el formulario, solo los tres huecos con sus medallas; se eligen en una
 * hoja aparte, en rejilla, entre los logros desbloqueados de la Vitrina, sin tener que publicarlos antes.
 */
export default function ElegirDestacados({ vitrina, destacados, onChange }: Props) {
  const [abierta, setAbierta] = useState(false)
  const locales = vitrina?.visible ? vitrina.vitrina.logros : []
  const { desbloqueados, bloqueados } = opcionesDestacados(locales, destacados)
  const huecos = Array.from({ length: MAX_DESTACADOS }, (_, i) => destacados[i])
  const sinNada = vitrina !== undefined && !desbloqueados.length
  return <fieldset className="space-y-stack">
    <legend className="text-label text-fg-muted">Logros destacados · Hasta tres</legend>
    {sinNada ? <p className="text-body-sm text-fg-muted">{vitrina.visible ? 'Consigue un logro de tu Vitrina para destacarlo aquí.' : 'Vitrina está oculta en Ajustes: actívala para destacar tus logros.'}</p> : <>
      <div className="logros-grupo"><ul aria-label="Logros destacados elegidos" className="logros-rejilla grid grid-cols-3 gap-2">
        {huecos.map((r, i) => <li key={r?.logroId ?? `hueco-${i}`} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
          {r
            ? <><MedallaPublicada resumen={r} /><span className="w-full break-words text-caption font-semibold leading-tight text-fg">{r.titulo}</span></>
            : <><span aria-hidden="true" className="destacado-hueco rounded-md border border-dashed border-line-strong" /><span className="text-caption text-fg-muted">Libre</span></>}
        </li>)}
      </ul></div>
      <Button variant="secondary" block aria-haspopup="dialog" onClick={() => setAbierta(true)}>
        {destacados.length ? 'Cambiar logros destacados' : 'Elegir logros destacados'}<Icon name="chevron-right" size={18} />
      </Button>
    </>}
    <Sheet open={abierta} onClose={() => setAbierta(false)} title="Logros destacados"
      footer={<Button block onClick={() => setAbierta(false)}>Hecho</Button>}>
      <div className="space-y-section">
        <p className="tabular text-body-sm text-fg-muted" aria-live="polite">{formatInt(destacados.length)} de {formatInt(MAX_DESTACADOS)} elegidos. Se guardan con «Guardar perfil».</p>
        {vitrina === undefined ? <LoadingState /> : <>
          {!vitrina.visible && <p className="text-body-sm text-fg-muted">Vitrina está oculta en Ajustes: aquí solo están los logros que ya tenías destacados.</p>}
          {desbloqueados.length > 0 && <section aria-label="Desbloqueados" className="logros-grupo space-y-2">
            <h3 className="tabular text-rotulo text-fg-muted">Desbloqueados · {formatInt(desbloqueados.length)}</h3>
            <ul className="logros-rejilla grid grid-cols-3 gap-2">
              {desbloqueados.map(r => {
                const elegido = destacados.some(d => d.logroId === r.logroId)
                return <li key={r.logroId} className="min-w-0">
                  <button type="button" aria-pressed={elegido} disabled={!elegido && destacados.length >= MAX_DESTACADOS} onClick={() => onChange(alternarDestacado(destacados, r))}
                    className={`app-button relative flex min-h-touch w-full flex-col items-center gap-1.5 rounded-md border px-1 py-2 text-center disabled:opacity-40 ${elegido ? 'border-accent-strong bg-accent-subtle' : 'border-transparent hover:bg-surface-muted'}`}>
                    <MedallaPublicada resumen={r} />
                    <span className="w-full break-words text-caption font-semibold leading-tight text-fg">{r.titulo}</span>
                    {elegido && <span aria-hidden="true" className="absolute right-1 top-1 flex rounded-pill bg-accent-strong p-0.5 text-surface"><Icon name="check" size={14} /></span>}
                  </button>
                </li>
              })}
            </ul>
          </section>}
          {bloqueados.length > 0 && <section aria-label="Por desbloquear" className="logros-grupo space-y-2">
            <h3 className="tabular text-rotulo text-fg-muted">Por desbloquear · {formatInt(bloqueados.length)}</h3>
            <RejillaBloqueados logros={bloqueados} />
          </section>}
          {vitrina.visible && !desbloqueados.length && <p className="text-body-sm text-fg-muted">Aún no has desbloqueado ningún logro.</p>}
        </>}
      </div>
    </Sheet>
  </fieldset>
}

/** Lo que falta por conseguir: solo se ve; los ocultos no dicen qué son. */
function RejillaBloqueados({ logros }: { logros: Logro[] }) {
  return <ul className="logros-rejilla grid grid-cols-3 gap-2">
    {logros.map(l => <li key={l.id} className="flex min-w-0 flex-col items-center gap-1.5 px-1 py-2 text-center">
      <IconoLogro logro={l} />
      <span className="w-full break-words text-caption font-semibold leading-tight text-fg-muted">{l.oculto ? 'Logro oculto' : l.nombre}</span>
    </li>)}
  </ul>
}
