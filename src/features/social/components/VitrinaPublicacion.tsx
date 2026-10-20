import { formatInt } from '../../../shared/lib/format'
import IconoLogro from '../../vitrina/components/IconoLogro'
import type { InsigniaPublicada, ResumenEntreno } from '../lib/publicacion'

/** En el vistazo caben estas insignias; con más, una menos y «+N» para verlas todas en el detalle. */
const MAX_VISTAZO = 3

interface Props {
  resumen: ResumenEntreno
  dia: string
  /** Vistazo de la tarjeta: solo las insignias, en pequeño y recortadas; «+N» llama aquí (abre el detalle). */
  verTodas?: () => void
  vistazo?: boolean
}

const icono = (ins: InsigniaPublicada, nombre: string, dia: string, vistazo: boolean) =>
  <IconoLogro alcanzado tamano={vistazo ? 'sm' : 'md'} logro={{ id: ins.id, grupo: ins.grupo, nombre, descripcion: '', niveles: [{ fecha: dia }] }} />

/** Piezas nuevas de la Vitrina con su insignia; las publicaciones antiguas, sin insignias, se quedan en texto. */
export default function VitrinaPublicacion({ resumen: r, dia, verTodas, vistazo = false }: Props) {
  if (!r.logros.length) return null
  const recortar = vistazo && r.logros.length > MAX_VISTAZO
  const visibles = recortar ? MAX_VISTAZO - 1 : r.logros.length
  const titulo = <h3 className="text-label text-fg-muted">Nuevo en la Vitrina</h3>
  if (!r.insignias) {
    return <section aria-label="Nuevo en la Vitrina" className="min-w-0 space-y-1">{titulo}
      <p className="break-words text-body-sm text-fg">{r.logros.slice(0, visibles).join(' · ')}{recortar ? ` y ${formatInt(r.logros.length - visibles)} más` : ''}</p>
    </section>
  }
  if (vistazo) {
    return <section aria-label="Nuevo en la Vitrina" className="min-w-0 space-y-2">{titulo}
      <ul className="flex flex-wrap items-center gap-2">
        {r.insignias.slice(0, visibles).map((ins, i) => <li key={`${ins.id}-${ins.nivel ?? 'vez'}`} className="flex">
          {icono(ins, r.logros[i], dia, true)}<span className="sr-only">{r.logros[i]}</span>
        </li>)}
        {recortar && <li className="flex">
          {verTodas
            ? <button type="button" onClick={verTodas} aria-label={`Ver los ${formatInt(r.logros.length)} logros`} className="publicacion-insignias-mas tabular">+{formatInt(r.logros.length - visibles)}</button>
            : <span className="publicacion-insignias-mas tabular">+{formatInt(r.logros.length - visibles)}</span>}
        </li>}
      </ul>
    </section>
  }
  return <section aria-label="Nuevo en la Vitrina" className="min-w-0 space-y-2">{titulo}
    <ul className="publicacion-insignias grid gap-x-2 gap-y-3">
      {r.insignias.map((ins, i) => <li key={`${ins.id}-${ins.nivel ?? 'vez'}`} className="flex min-w-0 flex-col items-center gap-1 text-center">
        {icono(ins, r.logros[i], dia, false)}
        <span className="line-clamp-2 max-w-full break-words text-caption text-fg">{r.logros[i]}</span>
      </li>)}
    </ul>
  </section>
}
