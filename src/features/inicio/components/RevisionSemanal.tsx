import { lazy, Suspense, useState, type ReactNode } from 'react'
import { IconButton } from '../../../shared/components/Button'
import ListGroup from '../../../shared/components/ListGroup'
import Metric from '../../../shared/components/Metric'
import ModalPage from '../../../shared/components/ModalPage'
import { EmptyState, LoadingState } from '../../../shared/components/StateMessage'
import { addDays, etiquetaPeriodo } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import RecordsSesion from '../../gym/components/RecordsSesion'
import { formatDuracion } from '../../gym/lib/workout'
import { useRevision, useSemanasCruzadas } from '../hooks/useRevisionSemanal'
import { useExperiencia } from '../../experiencia/hooks/useExperiencia'
import { semanaRitmo } from '../../ritmo/lib/ritmo'
import { cifrasSemana, textoEstado, textoHilo } from '../../ritmo/lib/textos'
import Card from '../../../shared/components/Card'
import Icon, { type IconName } from '../../../shared/components/Icon'
import ProgressBar from '../../../shared/components/ProgressBar'
import { formatAgua, partesAgua } from '../lib/agua'
import { formatDiferencia, semanaARevisar, type Revision } from '../lib/revisionSemanal'
import { notaCheatDays } from '../../nutricion/lib/cheatDays'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../../shared/db/settings'
import type { Settings } from '../../../shared/db/types'
import { moduloActivo } from '../../../shared/lib/modulos'

/** Récords que se listan; el resto se resume en «y N más». */
const RECORDS_VISIBLES = 3
const MINUTO_MS = 60_000

interface Props {
  /** Lunes de la semana que se abre. */
  lunes: string
  hoy: string
  onClose: () => void
  /** Destino del botón de cerrar (por defecto «Inicio»; desde Ritmo, «Ritmo»). */
  closeLabel?: string
}

/** Un bloque de la revisión en su tarjeta (punto 2): icono y título; las etiquetas de cambio comparan con la semana anterior. */
function Bloque({ titulo, icono, children }: { titulo: string; icono: IconName; children: ReactNode }) {
  return (
    <Card>
      <section aria-label={titulo} className="space-y-4">
        <h2 className="flex items-center gap-2 text-title text-fg"><Icon name={icono} size={20} className="text-fg-muted" />{titulo}</h2>
        {children}
      </section>
    </Card>
  )
}

/** El cambio frente a la semana anterior como etiqueta pequeña y neutra (sin juicio de valor): «↑ +0,4 kg». */
function Cambio({ diferencia, texto }: { diferencia: number; texto: string }) {
  return <span className="tabular inline-flex items-center gap-1 rounded-pill bg-surface-muted px-2 py-0.5 text-caption text-fg-muted">
    <span aria-hidden>{texto === 'Sin cambios' ? '=' : diferencia > 0 ? '↑' : '↓'}</span>{texto}<span className="sr-only"> frente a la semana anterior</span>
  </span>
}

// Recharts solo se carga al llegar a «Tus 8 semanas».
const LecturasCruzadas = lazy(() => import('./LecturasCruzadas'))


/**
 * Revisión de una semana cerrada (lunes-domingo) frente a la anterior: peso, nutrición, entreno, récords y agua.
 * Cifras y diferencias sin juicio de valor; cada bloque sin datos lo dice en su sitio.
 */
export default function RevisionSemanal({ lunes: lunesInicial, hoy, onClose, closeLabel = 'Inicio' }: Props) {
  const [lunes, setLunes] = useState(lunesInicial)
  const ultima = semanaARevisar(hoy).lunes
  const revision = useRevision(lunes, hoy)
  const experiencia = useExperiencia(hoy)
  const ritmo = experiencia?.visible ? semanaRitmo(experiencia.resultado.ritmo, lunes) : undefined
  const cargada = revision?.semana.lunes === lunes ? revision : undefined
  const settings = useLiveQuery(() => getSettings(), [])
  const cruzadas = useSemanasCruzadas(lunes, hoy)

  return (
    <ModalPage title="Revisión semanal" closeLabel={closeLabel} onClose={onClose}>
      <div className="space-y-section">
        <div className="flex items-center justify-between gap-2">
          <IconButton icon="chevron-left" label="Semana anterior" variant="ghost" onClick={() => setLunes(addDays(lunes, -7))} />
          <p className="tabular min-w-0 text-center text-title text-fg" aria-live="polite">{etiquetaPeriodo('semana', lunes)}</p>
          <IconButton icon="chevron-right" label="Semana siguiente" variant="ghost" disabled={lunes >= ultima} onClick={() => setLunes(addDays(lunes, 7))} />
        </div>
        {!cargada ? <LoadingState /> : !cargada.hayDatos ? (
          <EmptyState title="Sin registros esta semana">Las comidas, pesajes, entrenos y el agua de la semana aparecerán aquí.</EmptyState>
        ) : <>
          {ritmo && <Card tone="muted" className="space-y-1">
            <p className="text-label text-fg-muted">Ritmo</p>
            <p className="text-title text-fg">{textoEstado(ritmo)}</p>
            <p className="tabular break-words text-body-sm text-fg-muted">{cifrasSemana(ritmo)} · {textoHilo(ritmo.hilo).toLocaleLowerCase('es')}</p>
          </Card>}
          <Contenido revision={cargada} modulos={settings} />
          {/* «Tus 8 semanas» (B11): al final, con la gráfica en su propio trozo. */}
          {cruzadas && <Suspense fallback={null}><LecturasCruzadas semanas={cruzadas}
            usa={{ nutricion: moduloActivo(settings, 'nutricion'), gym: moduloActivo(settings, 'gym'), peso: moduloActivo(settings, 'peso') }} /></Suspense>}
        </>}
      </div>
    </ModalPage>
  )
}

/** Sin los bloques de los módulos ocultos en «Lo que usas» (B9): Entreno y Récords van con el gimnasio. */
function Contenido({ revision, modulos }: { revision: Revision; modulos?: Pick<Settings, 'modulos'> }) {
  const ver = (m: Parameters<typeof moduloActivo>[1]) => moduloActivo(modulos, m)
  const { peso, nutricion, entreno, records, agua } = revision
  const { actual, anterior } = entreno
  return (
    <>
      {ver('peso') && <Bloque titulo="Peso" icono="scale">
        {peso.media === null ? <EmptyState>Sin pesajes esta semana.</EmptyState> : (
          <div className="grid grid-cols-2 gap-4">
            <Metric size="title" label="Peso medio" valor={formatNumber(peso.media, 1)} unidad="kg"
              caption={peso.diferencia === null ? 'Sin pesajes la semana anterior' : <Cambio diferencia={peso.diferencia} texto={formatDiferencia(peso.diferencia, 1, 'kg')} />} />
            <Metric size="title" label="Pesajes" valor={peso.pesajes} caption="de 7 días" />
          </div>
        )}
      </Bloque>}

      {ver('nutricion') && <Bloque titulo="Nutrición" icono="utensils">
        {nutricion.kcalMedia === null ? <EmptyState>{nutricion.cheatDays > 0 ? `Sin comidas registradas fuera de los cheat days (${formatInt(nutricion.cheatDays)}).` : 'Sin comidas registradas esta semana.'}</EmptyState> : (
          <div className="grid grid-cols-2 gap-4">
            {/* Kcal y proteína con su barra hacia el objetivo, en los colores de cada dato. */}
            <div className="space-y-2">
              <Metric size="title" label="Kcal al día" valor={nutricion.kcalMedia} unidad="kcal"
                caption={nutricion.kcalObjetivo !== null ? `Objetivo ${formatInt(nutricion.kcalObjetivo)}` : undefined} />
              {nutricion.kcalObjetivo !== null && <ProgressBar value={nutricion.kcalMedia} goal={nutricion.kcalObjetivo} colorClass="bg-kcal" label="Kcal al día frente al objetivo" />}
              {nutricion.diferenciaKcal !== null && <Cambio diferencia={nutricion.diferenciaKcal} texto={formatDiferencia(nutricion.diferenciaKcal, 0, 'kcal')} />}
            </div>
            <div className="space-y-2">
              <Metric size="title" label="Proteína al día" valor={nutricion.protMedia ?? 0} unidad="g"
                caption={nutricion.protObjetivo !== null ? `Objetivo ${formatInt(nutricion.protObjetivo)} g` : undefined} />
              {nutricion.protObjetivo !== null && <ProgressBar value={nutricion.protMedia ?? 0} goal={nutricion.protObjetivo} colorClass="bg-protein" label="Proteína al día frente al objetivo" />}
            </div>
            <Metric size="title" label="Días registrados" valor={`${formatInt(nutricion.diasRegistrados)} de 7`} caption={notaCheatDays(nutricion.cheatDays) ?? undefined} />
            {nutricion.kcalObjetivo !== null && nutricion.adherencia !== null && (
              <Metric size="title" label="En objetivo" valor={formatInt(nutricion.adherencia)} unidad="%"
                caption={`${formatInt(nutricion.diasEnRango)} de ${formatInt(nutricion.diasRegistrados)} días a ±10 %`} />
            )}
          </div>
        )}
      </Bloque>}

      {ver('gym') && <Bloque titulo="Entreno" icono="dumbbell">
        {actual.sesiones === 0 ? <EmptyState>{anterior.sesiones > 0 ? `Sin entrenos esta semana (${formatInt(anterior.sesiones)} la anterior).` : 'Sin entrenos esta semana.'}</EmptyState> : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Metric size="title" label="Sesiones" valor={actual.sesiones} caption={<Cambio diferencia={actual.sesiones - anterior.sesiones} texto={formatDiferencia(actual.sesiones - anterior.sesiones)} />} />
              <Metric size="title" label="Duración" valor={formatDuracion(actual.duracionMs)}
                caption={<Cambio diferencia={actual.duracionMs - anterior.duracionMs} texto={formatDiferencia(Math.round((actual.duracionMs - anterior.duracionMs) / MINUTO_MS), 0, 'min')} />} />
              <Metric size="title" label="Series efectivas" valor={actual.series} caption={<Cambio diferencia={actual.series - anterior.series} texto={formatDiferencia(actual.series - anterior.series)} />} />
              <Metric size="title" label="Volumen" valor={formatNumber(actual.volumen, 0)} unidad="kg" caption={<Cambio diferencia={actual.volumen - anterior.volumen} texto={formatDiferencia(actual.volumen - anterior.volumen, 0, 'kg')} />} />
            </div>
            {entreno.destacados.length > 0 && (
              <div className="space-y-2">
                <p className="text-rotulo text-fg-muted">Grupos con más series</p>
                <ListGroup variante="plana" aria-label="Grupos con más series">
                  {entreno.destacados.map((g) => (
                    <li key={g.musculo} className="grid min-h-touch grid-cols-3 items-center gap-3 py-2">
                      <span className="min-w-0 break-words text-body-sm text-fg">{g.nombre}</span>
                      <span aria-hidden className="h-2 overflow-hidden rounded-pill bg-surface-muted">
                        <span className="block h-full rounded-pill bg-accent-strong" style={{ width: `${Math.max(6, (g.series / entreno.destacados[0].series) * 100)}%` }} />
                      </span>
                      <span className="tabular text-right text-body-sm font-semibold text-fg">{formatNumber(g.series, 1)} <span className="font-normal text-fg-muted">series</span></span>
                    </li>
                  ))}
                </ListGroup>
              </div>
            )}
          </>
        )}
      </Bloque>}

      {ver('gym') && actual.sesiones > 0 && (records.length ? (
        <div className="space-y-2">
          <RecordsSesion records={records.slice(0, RECORDS_VISIBLES)} total={records.length} nombres={revision.nombres} catalogIds={revision.catalogIds} />
          {records.length > RECORDS_VISIBLES && <p className="text-caption text-fg-muted">y {formatInt(records.length - RECORDS_VISIBLES)} más</p>}
        </div>
      ) : (
        <Bloque titulo="Récords personales" icono="trophy"><EmptyState>Sin récords esta semana.</EmptyState></Bloque>
      ))}

      {ver('agua') && <Bloque titulo="Agua" icono="droplet">
        {agua.mediaMl === null ? <EmptyState>Sin agua registrada esta semana.</EmptyState> : (
          <div className="grid grid-cols-2 gap-4">
            <Metric size="title" label="Agua al día" valor={partesAgua(agua.mediaMl).valor} unidad={partesAgua(agua.mediaMl).unidad}
              caption={`${formatInt(agua.dias)} de 7 días con registro`} />
            {agua.diasEnObjetivo !== null && agua.objetivoMl !== null && (
              <Metric size="title" label="Días en objetivo" valor={`${formatInt(agua.diasEnObjetivo)} de ${formatInt(agua.dias)}`} caption={`Objetivo ${formatAgua(agua.objetivoMl)}`} />
            )}
          </div>
        )}
      </Bloque>}
    </>
  )
}
