import { useState } from 'react'
import Button from '../../shared/components/Button'
import Card from '../../shared/components/Card'
import Disclosure from '../../shared/components/Disclosure'
import ListGroup from '../../shared/components/ListGroup'
import Metric from '../../shared/components/Metric'
import PageHeader from '../../shared/components/PageHeader'
import ProgressBar from '../../shared/components/ProgressBar'
import SectionHeader from '../../shared/components/SectionHeader'
import { EmptyState, LoadingState } from '../../shared/components/StateMessage'
import { addDays, formatFriendly, todayISO } from '../../shared/lib/dates'
import { formatInt } from '../../shared/lib/format'
import FilasXp from './components/FilasXp'
import { useAtributos } from './hooks/useAtributos'
import {
  ATRIBUTOS, PROPORCION_PROTEINA, RECORDS_POR_SESION, SERIES_COMPLETAS, SERIES_MINIMAS, TITULOS, XP,
  entrenoHoy, nivelDeXp, textoEntrenoHoy, tituloDe, xpDeEntreno, xpEntre, xpPorDia, type Atributo,
} from './lib/atributos'

/** Días de XP que se muestran de entrada y en cada «Ver más días». */
const DIAS_POR_PAGINA = 14

const xpTexto = (xp: number) => `${formatInt(xp)} XP`

/** Atributos (en Más): nivel y título, los tres atributos, la semana frente al plan y la XP de cada día con su porqué. */
export default function AtributosTab({ onIrAAjustes }: { onIrAAjustes: () => void }) {
  const hoy = todayISO()
  const estado = useAtributos(hoy)
  const [diasVisibles, setDiasVisibles] = useState(DIAS_POR_PAGINA)

  if (!estado) return <div className="px-page pt-5"><LoadingState /></div>
  if (!estado.visible) {
    return <div className="space-y-section px-page pt-5">
      <PageHeader title="Atributos" />
      <EmptyState title="Atributos ocultos" action={<Button variant="secondary" onClick={onIrAAjustes}>Ir a Ajustes</Button>}>
        Los has ocultado en Ajustes: no aparecen en Inicio ni al terminar un entreno.
      </EmptyState>
    </div>
  }

  const { resultado: r, plan, conNutricion, nombres } = estado
  const n = nivelDeXp(r.total)
  const semana = r.semanaActual
  const dias = xpPorDia(r)
  const atributos: Atributo[] = conNutricion ? ['fuerza', 'nutricion', 'constancia'] : ['fuerza', 'constancia']
  const faltan = [
    semana.entrenos < plan.entrenos ? `${formatInt(plan.entrenos - semana.entrenos)} ${plan.entrenos - semana.entrenos === 1 ? 'entreno' : 'entrenos'}` : null,
    semana.diasRegistrados !== null && semana.diasRegistrados < plan.diasRegistro
      ? `${formatInt(plan.diasRegistro - semana.diasRegistrados)} ${plan.diasRegistro - semana.diasRegistrados === 1 ? 'día registrado' : 'días registrados'}` : null,
  ].filter(Boolean)

  return <div className="space-y-section px-page pt-5">
    <PageHeader title="Atributos" overline="Tu nivel por lo que entrenas y registras" />

    <Card className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <Metric size="hero" label="Nivel" valor={n.nivel} />
        <p className="break-words pb-2 text-title text-fg">{tituloDe(n.nivel)}</p>
      </div>
      <ProgressBar size="lg" value={n.xpEnNivel} goal={n.xpSiguiente} colorClass="bg-fg" label={`Experiencia del nivel ${n.nivel}`}
        valueText={`${formatInt(n.xpEnNivel)} de ${formatInt(n.xpSiguiente)} XP`} />
      <p className="tabular text-body-sm text-fg-muted">{formatInt(n.xpEnNivel)} de {formatInt(n.xpSiguiente)} XP para el nivel {formatInt(n.nivel + 1)} · {xpTexto(r.total)} en total</p>
      <p className="break-words text-body-sm text-fg">{textoEntrenoHoy(entrenoHoy(r, hoy))}</p>
    </Card>

    <section aria-label="Atributos" className="space-y-stack">
      <SectionHeader variant="section">Atributos</SectionHeader>
      <ListGroup aria-label="Nivel de cada atributo">
        {atributos.map((a) => {
          const na = nivelDeXp(r.porAtributo[a])
          return <li key={a} className="space-y-2 py-3">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-body font-semibold text-fg">{ATRIBUTOS[a].nombre}</span>
              <span className="tabular text-body-sm text-fg-muted">Nivel {formatInt(na.nivel)} · {xpTexto(r.porAtributo[a])}</span>
            </p>
            <ProgressBar value={na.xpEnNivel} goal={na.xpSiguiente} colorClass="bg-fg" label={`${ATRIBUTOS[a].nombre}, nivel ${na.nivel}`}
              valueText={`${formatInt(na.xpEnNivel)} de ${formatInt(na.xpSiguiente)} XP para el nivel ${na.nivel + 1}`} />
            <p className="text-caption text-fg-muted">{ATRIBUTOS[a].fuente}</p>
          </li>
        })}
      </ListGroup>
    </section>

    <section aria-label="Esta semana" className="space-y-stack">
      <SectionHeader variant="section">Esta semana</SectionHeader>
      <Card className="space-y-3">
        <dl className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <dt className="text-body-sm text-fg-muted">Entrenos</dt>
            <dd className="tabular text-body font-semibold text-fg">{formatInt(semana.entrenos)} de {formatInt(plan.entrenos)}</dd>
          </div>
          {semana.diasRegistrados !== null && <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <dt className="text-body-sm text-fg-muted">Días registrados</dt>
            <dd className="tabular text-body font-semibold text-fg">{formatInt(semana.diasRegistrados)} de {formatInt(plan.diasRegistro)}</dd>
          </div>}
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <dt className="text-body-sm text-fg-muted">XP de la semana</dt>
            <dd className="tabular text-body font-semibold text-fg">{xpTexto(xpEntre(r.eventos, semana.lunes, addDays(semana.lunes, 6)))}</dd>
          </div>
        </dl>
        <p className="break-words text-body-sm text-fg">
          {semana.cumplida ? `Semana cumplida: +${xpTexto(XP.semanaCumplida)} de Constancia.` : `Para cumplirla: ${faltan.join(' y ')} más (+${xpTexto(XP.semanaCumplida)}).`}
        </p>
      </Card>
    </section>

    <section aria-label="XP de cada día" className="space-y-stack">
      <SectionHeader variant="section">Cada día</SectionHeader>
      {dias.length === 0
        ? <EmptyState>Aún no hay XP. Termina un entreno o registra una comida y aparecerá aquí con su porqué.</EmptyState>
        : <>
          {dias.slice(0, diasVisibles).map((d) => <section key={d.fecha} aria-label={formatFriendly(d.fecha)} className="space-y-2">
            <h3 className="flex flex-wrap items-baseline justify-between gap-x-3 px-1">
              <span className="text-body-sm font-semibold text-fg">{formatFriendly(d.fecha)}</span>
              <span className="tabular text-body-sm text-fg-muted">+{xpTexto(d.total)}</span>
            </h3>
            <ListGroup aria-label={`XP del ${formatFriendly(d.fecha)}`}>
              <FilasXp eventos={d.eventos} sinXp={d.sinXp} nombres={nombres} hoy={hoy} />
            </ListGroup>
          </section>)}
          {dias.length > diasVisibles && <Button variant="subtle" block onClick={() => setDiasVisibles((v) => v + DIAS_POR_PAGINA)}>Ver más días</Button>}
        </>}
    </section>

    <section aria-label="Reglas" className="space-y-stack">
      <div>
        <Disclosure title="Cómo se gana XP">
          <ul className="list-disc space-y-2 pl-5 text-body-sm text-fg">
            <li>Entreno terminado: {xpTexto(XP.entreno)} con {formatInt(SERIES_COMPLETAS)} series efectivas o más; con menos, la parte proporcional ({formatInt(3)} series, {xpTexto(xpDeEntreno(3))}). Los kilos no puntúan.</li>
            <li>Suma un entreno por día (el de más series) y, cada semana, los de tu plan: con el plan completo, los demás no suman. Para el plan cuentan los de {formatInt(SERIES_MINIMAS)} series efectivas o más.</li>
            <li>Récord personal: {xpTexto(XP.record)}, hasta {formatInt(RECORDS_POR_SESION)} por sesión.</li>
            {conNutricion && <li>Día registrado: {xpTexto(XP.diaRegistrado)} con dos comidas o más ({xpTexto(XP.diaUnaComida)} con una).</li>}
            {conNutricion && <li>Proteína al {formatInt(PROPORCION_PROTEINA * 100)} % del objetivo del día o más: {xpTexto(XP.proteina)}.</li>}
            <li>Semana cumplida (lunes a domingo): {xpTexto(XP.semanaCumplida)}. Se cumple con {formatInt(plan.entrenos)} entrenos{conNutricion ? ` y ${formatInt(plan.diasRegistro)} días con comidas registradas` : ''}.</li>
            <li>Entrenar o registrar de más no suma. Las kcal, el peso y el déficit no dan ni quitan XP.</li>
            <li>El nivel no baja por descansar o dejarlo una temporada. La XP sale de tus registros: si borras uno, desaparece la que daba.</li>
          </ul>
          <Button variant="ghost" size="sm" className="mt-3" onClick={onIrAAjustes}>Cambiar el plan en Ajustes</Button>
        </Disclosure>
        <Disclosure title="Títulos">
          <ul className="space-y-1 text-body-sm">
            {TITULOS.map((t) => <li key={t.desde} className={`flex justify-between gap-3 ${n.nivel >= t.desde ? 'text-fg' : 'text-fg-muted'}`}>
              <span>{t.titulo}</span><span className="tabular">Nivel {formatInt(t.desde)}</span>
            </li>)}
          </ul>
        </Disclosure>
      </div>
    </section>
  </div>
}
