import { useState } from 'react'
import Anillo from '../../../shared/components/Anillo'
import IconoLogro from './IconoLogro'
import Sheet from '../../../shared/components/Sheet'
import ListGroup from '../../../shared/components/ListGroup'
import ProgressBar from '../../../shared/components/ProgressBar'
import SectionHeader from '../../../shared/components/SectionHeader'
import { formatFriendly } from '../../../shared/lib/dates'
import { formatInt } from '../../../shared/lib/format'
import {
  conseguido, GRUPOS_LOGRO, nivelDe, NUMERALES, recuentoPiezas, siguienteUmbral, ultimaVez, type GrupoLogro, type Logro,
} from '../lib/logros'

function FilaLogro({ l }: { l: Logro }) {
  const hecho = conseguido(l)
  if (l.oculto && !hecho) {
    return <li className="flex items-center gap-3 py-3">
      <IconoLogro logro={l} />
      <span className="min-w-0">
        <span className="block break-words text-body font-medium text-fg-muted">Logro oculto</span>
        <span className="block break-words text-body-sm text-fg-muted">Se revela al conseguirlo</span>
      </span>
    </li>
  }
  const nivel = nivelDe(l)
  const siguiente = siguienteUmbral(l)
  const fecha = ultimaVez(l)
  const veces = l.veces?.length ?? 0
  const estado = l.umbrales
    ? l.umbrales.length > 1 ? (nivel ? `Nivel ${NUMERALES[nivel - 1]} de ${NUMERALES[l.umbrales.length - 1]}` : 'Sin conseguir') : nivel ? 'Conseguido' : 'Sin conseguir'
    : veces ? `${formatInt(veces)} ${veces === 1 ? 'vez' : 'veces'}` : 'Sin conseguir'
  return <li className="space-y-2 py-3">
    <div className="flex items-start gap-3">
      <IconoLogro logro={l} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="min-w-0 max-w-full break-words text-body font-semibold text-fg">{l.nombre}</span>
          <span className="tabular min-w-0 max-w-full break-words text-body-sm text-fg-muted">{estado}</span>
        </span>
        <span className="block break-words text-body-sm text-fg-muted">{l.descripcion}</span>
        {fecha && <span className="tabular block text-caption text-fg-muted">{l.umbrales && l.umbrales.length > 1 ? `Nivel ${NUMERALES[nivel - 1]}` : veces > 1 ? 'Última vez' : 'Conseguido'}: {formatFriendly(fecha)}</span>}
      </span>
    </div>
    {siguiente !== null && l.progreso !== undefined && <div className="pl-9">
      <ProgressBar value={l.progreso} goal={siguiente} colorClass="bg-fg" label={`${l.nombre}: progreso`}
        valueText={`${formatInt(l.progreso)} de ${formatInt(siguiente)} ${l.unidad ?? ''}`.trim()} />
      <p className="tabular mt-1 text-caption text-fg-muted">{formatInt(l.progreso)} de {formatInt(siguiente)} {l.unidad}</p>
    </div>}
  </li>
}

/** Texto corto bajo la medalla: nivel, veces, «Conseguido» o lo que falta. */
function estadoCorto(l: Logro): string {
  const nivel = nivelDe(l)
  const veces = l.veces?.length ?? 0
  if (l.umbrales && l.umbrales.length > 1) return nivel ? `Nivel ${NUMERALES[nivel - 1]}` : progresoCorto(l)
  if (l.umbrales) return nivel ? 'Conseguido' : progresoCorto(l)
  return veces ? `${formatInt(veces)} ${veces === 1 ? 'vez' : 'veces'}` : 'Sin conseguir'
}
function progresoCorto(l: Logro): string {
  const siguiente = siguienteUmbral(l)
  return siguiente !== null && l.progreso !== undefined ? `${formatInt(l.progreso)} de ${formatInt(siguiente)}` : 'Sin conseguir'
}

/**
 * Insignia topográfica de un logro (ADR 038) con el anillo de progreso al siguiente nivel.
 * Conserva la rejilla y la hoja de detalle; un oculto sin conseguir solo revela el candado común.
 */
function Medalla({ l, onAbrir }: { l: Logro; onAbrir: () => void }) {
  const hecho = conseguido(l)
  const oculto = l.oculto && !hecho
  const siguiente = siguienteUmbral(l)
  const fraccion = !oculto && siguiente !== null && l.progreso !== undefined && siguiente > 0 ? l.progreso / siguiente : 0
  const nombre = oculto ? 'Logro oculto' : l.nombre
  const estado = oculto ? 'Se revela al conseguirlo' : estadoCorto(l)
  return <li className="min-w-0">
    <button type="button" onClick={onAbrir} aria-haspopup="dialog" aria-label={`${nombre}: ${estado}`}
      className="app-button flex min-h-touch w-full flex-col items-center gap-1.5 rounded-md px-1 py-2 text-center hover:bg-surface-muted">
      <Anillo fraccion={hecho && siguiente === null ? 0 : fraccion} className="medalla-anillo" trazo="stroke-fg" carril={hecho && siguiente === null ? 'stroke-transparent' : 'stroke-line'} grosor={2.5}>
        <IconoLogro logro={l} />
      </Anillo>
      <span className={`w-full break-words text-caption font-semibold leading-tight ${oculto ? 'text-fg-muted' : 'text-fg'}`}>{nombre}</span>
      <span className="tabular w-full break-words text-caption leading-tight text-fg-muted">{estado}</span>
    </button>
  </li>
}

/** Logros por grupo en medallas; cada una abre su detalle (lo conseguido con su fecha y el progreso al siguiente nivel). */
export default function LogrosVista({ logros }: { logros: Logro[] }) {
  const { conseguidas, total } = recuentoPiezas(logros)
  const grupos = (Object.keys(GRUPOS_LOGRO) as GrupoLogro[]).filter((g) => logros.some((l) => l.grupo === g))
  // El logro se conserva al cerrar: la hoja anima su salida con su contenido.
  const [abierto, setAbierto] = useState<Logro | null>(null)
  const [hoja, setHoja] = useState(false)
  return <div className="space-y-section">
    <p className="tabular text-body text-fg"><span className="font-numeric text-heading">{formatInt(conseguidas)}</span> de {formatInt(total)} piezas</p>
    {grupos.map((g) => <section key={g} aria-label={GRUPOS_LOGRO[g]} className="logros-grupo space-y-stack">
      <SectionHeader variant="section">{GRUPOS_LOGRO[g]}</SectionHeader>
      <ul aria-label={`Logros de ${GRUPOS_LOGRO[g]}`} className="logros-rejilla grid grid-cols-3 gap-2">
        {logros.filter((l) => l.grupo === g).map((l) => <Medalla key={l.id} l={l} onAbrir={() => { setAbierto(l); setHoja(true) }} />)}
      </ul>
    </section>)}
    <Sheet open={hoja} onClose={() => setHoja(false)} title={abierto && !(abierto.oculto && !conseguido(abierto)) ? abierto.nombre : 'Logro oculto'}>
      {abierto && <ListGroup variante="plana" aria-label="Detalle del logro"><FilaLogro l={abierto} /></ListGroup>}
    </Sheet>
  </div>
}
