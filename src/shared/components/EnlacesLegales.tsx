import { PAGINAS_LEGALES } from '../lib/legal'

type Pagina = keyof typeof PAGINAS_LEGALES

interface Props {
  paginas?: Pagina[]
  className?: string
}

/**
 * Enlaces a las páginas legales estáticas (`shared/lib/legal`). Se abren aparte (`_blank`): en la PWA instalada y en la
 * TWA de Android salen en una hoja del navegador y la app conserva su estado debajo.
 */
export default function EnlacesLegales({ paginas = ['privacidad', 'condiciones'], className = '' }: Props) {
  return (
    <ul className={`flex flex-wrap gap-x-4 ${className}`}>
      {paginas.map((p) => <li key={p}>
        <a href={PAGINAS_LEGALES[p].ruta} target="_blank" rel="noopener" className="inline-flex min-h-touch items-center text-body-sm font-semibold text-accent-strong underline">
          {PAGINAS_LEGALES[p].nombre}
        </a>
      </li>)}
    </ul>
  )
}
