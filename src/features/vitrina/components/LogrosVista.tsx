import Icon from '../../../shared/components/Icon'
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
      <Icon name="trophy" size={22} className="text-fg-subtle" />
      <span className="min-w-0">
        <span className="block text-body font-medium text-fg-muted">Logro oculto</span>
        <span className="block text-body-sm text-fg-muted">Se revela al conseguirlo</span>
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
      <Icon name="trophy" size={22} className={hecho ? 'text-fg' : 'text-fg-subtle'} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="break-words text-body font-semibold text-fg">{l.nombre}</span>
          <span className="tabular text-body-sm text-fg-muted">{estado}</span>
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

/** Logros por grupo: los conseguidos con su fecha y el progreso hacia el siguiente nivel; los ocultos, sin pista. */
export default function LogrosVista({ logros }: { logros: Logro[] }) {
  const { conseguidas, total } = recuentoPiezas(logros)
  const grupos = (Object.keys(GRUPOS_LOGRO) as GrupoLogro[]).filter((g) => logros.some((l) => l.grupo === g))
  return <div className="space-y-section">
    <p className="tabular text-body text-fg"><span className="font-numeric text-heading">{formatInt(conseguidas)}</span> de {formatInt(total)} piezas</p>
    {grupos.map((g) => <section key={g} aria-label={GRUPOS_LOGRO[g]} className="space-y-stack">
      <SectionHeader variant="section">{GRUPOS_LOGRO[g]}</SectionHeader>
      <ListGroup aria-label={`Logros de ${GRUPOS_LOGRO[g]}`}>
        {logros.filter((l) => l.grupo === g).map((l) => <FilaLogro key={l.id} l={l} />)}
      </ListGroup>
    </section>)}
    <p className="text-caption text-fg-muted">Cada nivel de un logro es una pieza; los repetibles cuentan una vez. Salen de tus registros con su fecha real: si borras uno, la pieza puede desaparecer.</p>
  </div>
}
