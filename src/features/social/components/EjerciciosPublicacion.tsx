import Icon from '../../../shared/components/Icon'
import { formatInt } from '../../../shared/lib/format'
import MiniaturaEjercicio from '../../gym/components/MiniaturaEjercicio'
import { textoEjercicios, type ResumenEntreno } from '../lib/publicacion'

/**
 * Los ejercicios del entreno como mosaico: imagen del catálogo y nombre, con un trofeo en los que tuvieron récord y
 * el recuento de récords junto al título. Las publicaciones antiguas, sin imágenes, se quedan en una línea de texto.
 */
export default function EjerciciosPublicacion({ resumen: r }: { resumen: ResumenEntreno }) {
  if (!r.ejercicios.length) return null
  const conRecord = new Set(r.records.map(l => l.ejercicio))
  const total = r.recordsTotal ?? r.records.length
  return <section aria-label="Ejercicios" className="space-y-2">
    <h3 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-fg-muted">
      Ejercicios
      {total > 0 && <span className="inline-flex items-center gap-1 text-accent-strong"><Icon name="trophy" size={16} />{`${formatInt(total)} ${total === 1 ? 'récord' : 'récords'}`}</span>}
    </h3>
    {r.catalogIds
      ? <ul className="publicacion-ejercicios grid gap-x-2 gap-y-3">
        {r.ejercicios.map((e, i) => <li key={e} className="min-w-0">
          <span className="relative block aspect-square overflow-hidden rounded-md">
            <MiniaturaEjercicio catalogId={r.catalogIds?.[i] ?? undefined} mosaico />
            {conRecord.has(e) && <span className="publicacion-ejercicio-record"><Icon name="trophy" size={14} /></span>}
          </span>
          <span className="mt-1 line-clamp-2 break-words text-caption text-fg">{e}{conRecord.has(e) && <span className="sr-only"> (récord)</span>}</span>
        </li>)}
      </ul>
      : <p className="break-words text-body-sm text-fg-muted">{textoEjercicios(r.ejercicios, r.ejercicios.length)}</p>}
  </section>
}
