import { useState } from 'react'
import Button from '../../shared/components/Button'
import Card from '../../shared/components/Card'
import Disclosure from '../../shared/components/Disclosure'
import ListGroup from '../../shared/components/ListGroup'
import Metric from '../../shared/components/Metric'
import PageHeader from '../../shared/components/PageHeader'
import SectionHeader from '../../shared/components/SectionHeader'
import { EmptyState, LoadingState } from '../../shared/components/StateMessage'
import type { ConfigCumbres } from '../../shared/db/types'
import { useAviso } from '../../shared/hooks/useAviso'
import { addDays, formatFriendly, startOfWeek, todayISO } from '../../shared/lib/dates'
import { formatInt } from '../../shared/lib/format'
import { pausaActiva } from '../ritmo/lib/pausas'
import CambiarMontanaSheet from './components/CambiarMontanaSheet'
import ListaMontanas from './components/ListaMontanas'
import PerfilMontana from './components/PerfilMontana'
import * as cumbresRepo from './data/cumbresRepo'
import { useCumbres } from './hooks/useCumbres'
import {
  cambiarMontana, diasDeExpedicion, empezar, hitosDe, METROS_POR_HITO, metrosEntre, metrosTexto, montanasParaCambiar,
} from './lib/cumbres'
import { FUENTE_ALTITUDES, MONTANAS, type Montana } from './lib/montanas'

const diasTexto = (n: number) => (n === 1 ? '1 día' : `${formatInt(n)} días`)

function desdeTexto(inicio: string, hoy: string): string {
  if (inicio === hoy) return 'Desde hoy'
  if (inicio === addDays(hoy, -1)) return 'Desde ayer'
  return `Desde el ${formatFriendly(inicio)}`
}

/** Cumbres (en Más): la montaña actual con su perfil y sus hitos, las siguientes y las coronadas. */
export default function CumbresTab({ onIrAAjustes }: { onIrAAjustes: () => void }) {
  const hoy = todayISO()
  const estado = useCumbres(hoy)
  const { avisar, avisarError, toast } = useAviso()
  const [cambiando, setCambiando] = useState(false)
  const [aperturas, setAperturas] = useState(0)

  if (!estado) return <div className="px-page pt-5"><LoadingState /></div>
  if (!estado.visible) {
    return <div className="space-y-section px-page pt-5">
      <PageHeader title="Cumbres" />
      <EmptyState title="Cumbres ocultas" action={<Button variant="secondary" onClick={onIrAAjustes}>Ir a Ajustes</Button>}>
        Las has ocultado en Ajustes junto con Atributos, Ritmo y Vitrina.
      </EmptyState>
    </div>
  }

  const { cumbres: c, config, conNutricion } = estado
  const deshacer = (antes: ConfigCumbres | undefined) => () => cumbresRepo.guardar(antes)

  async function empezarCon(m: Montana) {
    try {
      avisar({ mensaje: `Empiezas el ${m.nombre}`, onDeshacer: deshacer(await cumbresRepo.guardar(empezar(hoy, m.id))) })
    } catch {
      avisarError('No se ha podido elegir la montaña. Inténtalo de nuevo.')
    }
  }

  const comoFunciona = <Disclosure title="Cómo funciona">
    <ul className="list-disc space-y-2 pl-5 text-body-sm text-fg">
      <li>Cada XP de Atributos es un metro de subida: entrenos, récords{conNutricion ? ', comidas registradas, proteína' : ''} y semanas cumplidas. Entrenar o registrar de más no suma, como en Atributos.</li>
      <li>Se sube del nivel del mar a la cima, con un hito cada {metrosTexto(METROS_POR_HITO)}. No hay plazo ni se puede fallar: la montaña dura lo que tardes.</li>
      <li>Al hacer cumbre, los metros que sobran no pasan a la siguiente: empieza otra vez desde el nivel del mar.</li>
      <li>Las montañas siguen la ruta de menor a mayor altitud: el Techo de España, el Mont Blanc y las Siete Cumbres. Puedes cambiar la actual por otra sin coronar más alta que lo ya subido.</li>
      <li>En una pausa de Ritmo estás en el refugio. Cuenta la XP desde el día en que eliges la primera montaña y sale de tus registros: si borras uno, se recalcula.</li>
      <li>{FUENTE_ALTITUDES}</li>
    </ul>
  </Disclosure>

  if (!c || !config) {
    return <div className="space-y-section px-page pt-5">
      <PageHeader title="Cumbres" overline="Montañas reales con tu experiencia" />
      <p className="break-words text-body text-fg">Cada XP que ganas es un metro de subida. Elige la primera montaña: empiezas hoy desde el nivel del mar, sin plazo.</p>
      <section aria-label="Elige tu primera montaña" className="space-y-stack">
        <SectionHeader variant="section">Elige tu primera montaña</SectionHeader>
        <ListGroup aria-label="Montañas"><ListaMontanas montanas={MONTANAS} sugerida={MONTANAS[0].id} onElegir={empezarCon} /></ListGroup>
      </section>
      {comoFunciona}
      {toast}
    </div>
  }

  const { actual } = c
  const enPausa = pausaActiva(estado.pausas, hoy) !== null
  const lunes = startOfWeek(hoy)
  const semana = metrosEntre(c.tramos, lunes, addDays(lunes, 6))
  const opciones = montanasParaCambiar(c)

  async function cambiarA(m: Montana) {
    const nueva = config && c ? cambiarMontana(config, c, m.id) : null
    if (!nueva) throw new Error('Montaña no válida')
    const antes = await cumbresRepo.guardar(nueva)
    setCambiando(false)
    avisar({ mensaje: `Ahora subes el ${m.nombre}`, onDeshacer: deshacer(antes) })
  }

  return <div className="space-y-section px-page pt-5">
    <PageHeader title="Cumbres" overline="Montañas reales con tu experiencia" />

    {actual
      ? <Card className="space-y-3">
        <div>
          <h2 className="break-words text-heading text-fg">{actual.montana.nombre}</h2>
          <p className="break-words text-body-sm text-fg-muted">{actual.montana.zona}</p>
        </div>
        <PerfilMontana expedicion={actual} />
        <Metric valor={actual.metros} unidad={`de ${metrosTexto(actual.montana.altitud)}`} />
        <p className="tabular break-words text-body-sm text-fg-muted">
          Faltan {metrosTexto(actual.montana.altitud - actual.metros)} · {semana > 0 ? `+${metrosTexto(semana)} esta semana` : 'Esta semana aún no has subido'}
        </p>
        {enPausa && <p className="break-words text-body-sm text-fg">En el refugio mientras dure la pausa de Ritmo.</p>}
        {opciones.length > 0 && <Button variant="secondary" size="sm" onClick={() => { setAperturas((n) => n + 1); setCambiando(true) }}>Cambiar montaña</Button>}
      </Card>
      : <Card className="space-y-2">
        <p className="text-title text-fg">Todas las cumbres coronadas</p>
        <p className="break-words text-body-sm text-fg-muted">Has subido las {formatInt(MONTANAS.length)} montañas de la ruta.</p>
      </Card>}

    {actual && <section aria-label="Hitos" className="space-y-stack">
      <SectionHeader variant="section">Hitos</SectionHeader>
      <ListGroup aria-label={`Hitos del ${actual.montana.nombre}`}>
        {hitosDe(actual).map((h) => <li key={h.metros} className="flex min-h-touch items-center justify-between gap-3 py-2">
          <span className={`tabular text-body ${h.cumbre ? 'font-semibold' : 'font-medium'} ${h.alcanzado ? 'text-fg' : 'text-fg-muted'}`}>{h.cumbre ? `Cumbre · ${metrosTexto(h.metros)}` : metrosTexto(h.metros)}</span>
          <span className="tabular shrink-0 text-body-sm text-fg-muted">{h.alcanzado ? formatFriendly(h.alcanzado.fecha) : `Faltan ${metrosTexto(h.metros - actual.metros)}`}</span>
        </li>)}
      </ListGroup>
    </section>}

    <section aria-label="Tu expedición" className="space-y-stack">
      <SectionHeader variant="section">Tu expedición</SectionHeader>
      <div className="grid grid-cols-2 gap-stack">
        <Card><Metric size="title" label="Cumbres" valor={c.coronadas.length} unidad={`de ${formatInt(MONTANAS.length)}`} /></Card>
        <Card><Metric size="title" label="Subidos" valor={c.metrosTotales} unidad="m" caption={desdeTexto(c.inicio, hoy)} /></Card>
      </div>
    </section>

    {c.siguientes.length > 0 && <section aria-label="Siguientes" className="space-y-stack">
      <SectionHeader variant="section">Siguientes</SectionHeader>
      <ListGroup aria-label="Montañas siguientes">
        {c.siguientes.map((m, i) => <li key={m.id} className="flex min-h-touch items-center justify-between gap-3 py-2">
          <span className="min-w-0">
            <span className="block break-words text-body font-medium text-fg">{m.nombre}{i === 0 && <span className="ml-2 text-caption font-normal text-fg-muted">La próxima</span>}</span>
            <span className="block break-words text-body-sm text-fg-muted">{m.zona}</span>
          </span>
          <span className="tabular shrink-0 text-body-sm text-fg-muted">{metrosTexto(m.altitud)}</span>
        </li>)}
      </ListGroup>
    </section>}

    <section aria-label="Mis cumbres" className="space-y-stack">
      <SectionHeader variant="section">Mis cumbres</SectionHeader>
      {c.coronadas.length === 0
        ? <EmptyState>Aún ninguna. Al llegar a la cima, la montaña queda aquí con su fecha y lo que tardaste.</EmptyState>
        : <ListGroup aria-label="Cumbres coronadas">
          {[...c.coronadas].reverse().map((x) => {
            const dias = diasDeExpedicion(x)
            return <li key={x.montana.id} className="flex min-h-touch items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block break-words text-body font-semibold text-fg">{x.montana.nombre}</span>
                <span className="tabular block break-words text-body-sm text-fg-muted">{x.cumbre ? formatFriendly(x.cumbre.fecha) : ''}{dias !== null ? ` · en ${diasTexto(dias)}` : ''}</span>
              </span>
              <span className="tabular shrink-0 text-body-sm text-fg">{metrosTexto(x.montana.altitud)}</span>
            </li>
          })}
        </ListGroup>}
    </section>

    {comoFunciona}

    {actual && <CambiarMontanaSheet key={`cambiar-${aperturas}`} open={cambiando} onClose={() => setCambiando(false)} actual={actual} opciones={opciones} onElegir={cambiarA} />}
    {toast}
  </div>
}
