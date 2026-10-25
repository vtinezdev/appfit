import { useId, useState } from 'react'
import Icon from '../../../shared/components/Icon'
import { formatInt } from '../../../shared/lib/format'
import MiniaturaEjercicio from '../../gym/components/MiniaturaEjercicio'
import { panelEjercicio } from '../lib/presentacion'
import { mejorasDePeso } from '../lib/records'
import { textoEjercicios, type ResumenEntreno } from '../lib/publicacion'
import PanelEjercicioPublicacion from './PanelEjercicioPublicacion'
import RecordsPublicacion from './RecordsPublicacion'

/**
 * Los ejercicios del entreno como mosaico: imagen del catálogo y nombre, con el número de récords de peso junto al
 * título. Los que subieron de peso llevan un trofeo; la liga no se pinta en la imagen. Al tocar uno se despliega debajo
 * su liga, sus series y en cuál batió récord. Las publicaciones antiguas, sin `catalogIds`, se quedan en una línea de
 * texto con las subidas debajo.
 */
export default function EjerciciosPublicacion({ resumen: r }: { resumen: ResumenEntreno }) {
  const [abierto, setAbierto] = useState<string | null>(null)
  const idPanel = useId()
  if (!r.ejercicios.length) return null
  const porEjercicio = mejorasDePeso(r.records)
  const total = [...porEjercicio.values()].reduce((n, m) => n + m.length, 0)
  const paneles = r.ejercicios.map((_, i) => panelEjercicio(r, i))
  const indice = abierto !== null ? r.ejercicios.indexOf(abierto) : -1
  const seleccionado = indice >= 0 ? paneles[indice] : null
  return <section aria-label="Ejercicios" className="space-y-2">
    <h3 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-fg-muted">
      Ejercicios
      {total > 0 && <span className="inline-flex items-center gap-1 text-accent-strong"><Icon name="trophy" size={16} />{`${formatInt(total)} ${total === 1 ? 'récord' : 'récords'}`}</span>}
    </h3>
    {r.catalogIds
      ? <ul className="publicacion-ejercicios grid gap-x-2 gap-y-3">
        {r.ejercicios.map((e, i) => {
          const contenido = <>
            <span className="relative block aspect-square overflow-hidden rounded-md">
              <MiniaturaEjercicio catalogId={r.catalogIds?.[i] ?? undefined} mosaico />
              {(porEjercicio.has(e) || paneles[i]?.series.some(s => s.mejora)) && <span className="publicacion-ejercicio-record"><Icon name="trophy" size={14} /></span>}
            </span>
            <span className="mt-1 line-clamp-2 break-words text-caption text-fg">{e}</span>
          </>
          return <li key={e} className="min-w-0">
            {paneles[i]
              ? <button type="button" className="publicacion-ejercicio-boton" aria-expanded={abierto === e} aria-controls={abierto === e ? idPanel : undefined}
                aria-label={`${e}: ver detalle`} onClick={() => setAbierto(abierto === e ? null : e)}>{contenido}</button>
              : contenido}
          </li>
        })}
      </ul>
      : <>
        <p className="break-words text-body-sm text-fg-muted">{textoEjercicios(r.ejercicios, r.ejercicios.length)}</p>
        {[...porEjercicio].map(([e, mejoras]) => <RecordsPublicacion key={e} ejercicio={e} mejoras={mejoras} />)}
      </>}
    {abierto !== null && seleccionado && <div id={idPanel}><PanelEjercicioPublicacion ejercicio={abierto} panel={seleccionado} /></div>}
  </section>
}
