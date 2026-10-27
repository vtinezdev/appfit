import { claveRef } from '../../../shared/db/foodRef'
import Icon from '../../../shared/components/Icon'
import { formatInt } from '../../../shared/lib/format'
import { normalizeName } from '../../../shared/lib/text'
import type { AlimentoElegible } from '../lib/alimentos'
import { etiquetaFuente } from '../lib/catalogo/textos'
import { iconoDeCategoria } from '../lib/iconosCategoria'
import { partesNombre } from '../lib/ordenBusqueda'
import PreparacionAlimento from './PreparacionAlimento'

interface Props {
  alimentos: AlimentoElegible[]
  onElegir: (alimento: AlimentoElegible) => void
  /** Lo buscado, para resaltarlo en el nombre. */
  consulta?: string
}

const fuente = (a: AlimentoElegible) => (a.ref.tipo === 'user' ? 'Tuyo' : etiquetaFuente(a.ref.id.split(':')[0]))

/** Las palabras buscadas, resaltadas dentro del nombre. */
function Resaltado({ texto, consulta }: { texto: string; consulta?: string }) {
  const palabras = (consulta ?? '').split(/\s+/).map(normalizeName).filter((p) => p.length > 1)
  if (palabras.length === 0) return <>{texto}</>
  return <>{texto.split(/(\s+)/).map((t, i) => palabras.some((p) => normalizeName(t).startsWith(p))
    ? <mark key={i} className="rounded-sm bg-accent-subtle px-0.5 text-fg">{t}</mark>
    : <span key={i}>{t}</span>)}</>
}

function Pastilla({ color, children }: { color: string; children: string }) {
  return <span className="tabular flex items-center gap-1 rounded-pill bg-surface-muted px-2 py-0.5 text-caption text-fg"><span aria-hidden className={`h-2 w-2 rounded-pill ${color}`} />{children}</span>
}

/**
 * Alimentos para elegir, en una tarjeta con una fila por alimento: icono de su categoría, el nombre en dos partes (lo
 * principal en negrita y el detalle debajo, lo buscado resaltado), la fuente y cuatro pastillas por 100 g o 100 ml
 * (kcal, proteína, hidratos y grasa).
 */
export default function ListaElegibles({ alimentos, onElegir, consulta }: Props) {
  const r = (n: number) => formatInt(Math.round(n))
  return (
    <ul className="animate-fade-in divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {alimentos.map((a) => {
        const [cabeza, detalle] = partesNombre(a.nombre)
        return <li key={claveRef(a.ref)}>
          <button type="button" onClick={() => onElegir(a)} className="app-button flex w-full items-start gap-3 px-card py-3 text-left enabled:hover:bg-surface-muted">
            <span aria-hidden className="icono-pastilla shrink-0 text-fg-muted"><Icon name={iconoDeCategoria(a.categoria) ?? 'utensils'} size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 min-w-0 break-words text-body font-semibold text-fg"><Resaltado texto={cabeza} consulta={consulta} /></span>
                <span className="shrink-0 pt-0.5 text-caption text-fg-subtle">{fuente(a)}</span>
              </span>
              {detalle && <span className="line-clamp-1 block break-words text-body-sm text-fg-muted">{detalle}</span>}
              <PreparacionAlimento nombre={a.nombre} />
              {a.detalle && <span className="block truncate text-caption text-fg-subtle">{a.detalle}</span>}
              <span className="mt-2 flex flex-wrap gap-1.5">
                <Pastilla color="bg-kcal">{`${formatInt(a.kcal100)} kcal`}</Pastilla>
                <Pastilla color="bg-protein">{`P ${r(a.prot100)}`}</Pastilla>
                <Pastilla color="bg-carbs">{`C ${r(a.carb100)}`}</Pastilla>
                <Pastilla color="bg-fat">{`G ${r(a.grasa100)}`}</Pastilla>
              </span>
            </span>
          </button>
        </li>
      })}
    </ul>
  )
}
