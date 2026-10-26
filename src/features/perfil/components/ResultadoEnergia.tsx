import type { ReactNode } from 'react'
import Ayuda from '../../../shared/components/Ayuda'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import Metric from '../../../shared/components/Metric'
import SectionHeader from '../../../shared/components/SectionHeader'
import { formatNumber } from '../../../shared/lib/format'
import {
  AVISO_ORIENTATIVO, ECUACIONES, ETIQUETAS_OBJETIVO, formatSigned, formulaSustituida, KCAL_POR_KG, METODO_TMB, NIVELES_ACTIVIDAD, SUELO_KCAL,
  type EnergiaOk, type ResultadoEnergia,
} from '../lib/energia'
import type { Objetivos } from '../../../shared/db/types'
import { tramosEnergia, type EstiloTramo } from '../lib/tramosEnergia'
import { CAMPOS_ENERGIA, listaCampos, type CampoPerfil } from '../lib/validacionPerfil'

interface Props {
  energia: ResultadoEnergia
  onElegirObjetivo: () => void
  onVerMetodo: () => void
  /** Abre el editor del dato que falta (el mismo que la fila de «Tus datos»). */
  onCompletar: (campo: CampoPerfil) => void
  /** Objetivos de macros que salen de este objetivo (los que usa Nutrición); sin ellos no se pinta el reparto. */
  macros?: Pick<Objetivos, 'prot' | 'carb' | 'grasa'>
}

const ACCION_CAMPO: Partial<Record<CampoPerfil, string>> = {
  sexo: 'Indicar sexo', fechaNacimiento: 'Añadir fecha de nacimiento', alturaCm: 'Añadir altura', peso: 'Registrar peso', actividad: 'Elegir actividad',
}

/** Perfil incompleto: un bloque pequeño con lo que falta y una acción para el siguiente dato, sin cifras. */
function PerfilIncompleto({ faltan, onCompletar }: { faltan: CampoPerfil[]; onCompletar: (campo: CampoPerfil) => void }) {
  const siguiente = faltan[0]
  const total = CAMPOS_ENERGIA.length
  return <section aria-labelledby="perfil-incompleto">
    <Card className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 id="perfil-incompleto" className="min-w-0 break-words text-body font-semibold text-fg">Completa tu perfil</h2>
        <span className="tabular text-body-sm text-fg-muted">{formatNumber(total - faltan.length)} de {formatNumber(total)} datos</span>
      </div>
      <p className="text-body-sm text-fg-muted">{faltan.length === 1 ? 'Falta' : 'Faltan'}: {listaCampos(faltan)}. Con ellos se estima tu energía diaria.</p>
      {siguiente && <Button variant="primary" size="sm" onClick={() => onCompletar(siguiente)}>{ACCION_CAMPO[siguiente]}<Icon name="chevron-right" size={16} /></Button>}
    </Card>
  </section>
}

/** «Volumen · unos +270 g por semana»: el objetivo y, si cambia el peso, el ritmo aproximado (el detalle, tras la «i»). */
function textoObjetivo(e: EnergiaOk): string {
  const objetivo = ETIQUETAS_OBJETIVO[e.objetivoAplicado!]
  return e.ritmo ? `${objetivo} · unos ${formatSigned(e.ritmo.kgSemana * 1000)} g por semana` : objetivo
}

/** Color de cada parte, el mismo en la barra y en la leyenda: el gasto en grises y el ajuste en el color de la energía. */
const COLOR_TRAMO: Record<EstiloTramo, string> = {
  reposo: 'bg-fg-muted', actividad: 'bg-fg-subtle', observado: 'bg-fg-muted', superavit: 'bg-kcal', deficit: 'border border-dashed border-fg-subtle',
}

/**
 * De qué se compone la energía diaria: una barra con sus partes y, debajo, cada parte en su columna con su color, su cifra
 * y de dónde sale (punto 9).
 */
function Composicion({ e }: { e: EnergiaOk }) {
  const { barra, filas } = tramosEnergia(e)
  return <div className="space-y-3">
    <span aria-hidden className="flex h-4 gap-0.5 overflow-hidden rounded-pill">
      {barra.map((t) => <span key={t.estilo} className={`h-full rounded-sm ${COLOR_TRAMO[t.estilo]}`} style={{ width: `${t.pct}%` }} />)}
    </span>
    <ul aria-label="Cálculo de tu energía diaria" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${filas.length}, minmax(0, 1fr))` }}>
      {filas.map((f, i) => <li key={f.estilo} className={`min-w-0 space-y-0.5 ${i > 0 ? 'border-l border-line pl-2' : ''}`}>
        <span aria-hidden className={`mb-1.5 block h-1.5 w-6 rounded-pill ${COLOR_TRAMO[f.estilo]}`} />
        <span className="block break-words text-caption font-semibold text-fg-muted">{f.etiqueta}</span>
        <span className="tabular block break-words text-title text-fg">{f.kcal}<span className="sr-only"> kcal</span></span>
        <span className="block break-words text-caption text-fg-muted">{f.detalle}</span>
      </li>)}
    </ul>
  </div>
}

const MACROS = [
  { clave: 'prot', etiqueta: 'Proteína', color: 'bg-protein' },
  { clave: 'carb', etiqueta: 'Carbohidratos', color: 'bg-carbs' },
  { clave: 'grasa', etiqueta: 'Grasa', color: 'bg-fat' },
] as const

/** En qué se reparte el objetivo: los gramos de cada macro que usa Nutrición, con la misma forma que las partes. */
function Reparto({ macros }: { macros: Pick<Objetivos, 'prot' | 'carb' | 'grasa'> }) {
  return <div className="space-y-2 border-t border-line pt-3">
    <p className="text-rotulo text-fg-muted">Tu día en macros</p>
    <ul aria-label="Objetivos de macros" className="grid grid-cols-3 gap-2">
      {MACROS.map((m, i) => <li key={m.clave} className={`min-w-0 space-y-0.5 ${i > 0 ? 'border-l border-line pl-2' : ''}`}>
        <span aria-hidden className={`mb-1.5 block h-1.5 w-6 rounded-pill ${m.color}`} />
        <span className="block break-words text-caption font-semibold text-fg-muted">{m.etiqueta}</span>
        <span className="tabular block text-title text-fg">{formatNumber(Math.round(macros[m.clave]))} <span className="text-caption font-normal text-fg-muted">g</span></span>
      </li>)}
    </ul>
  </div>
}

/** Un paso de la cuenta: su número en un círculo unido al siguiente por una línea, qué es, su cifra y de dónde sale. */
function Paso({ n, titulo, valor, detalle, ultimo = false, children }: { n: number; titulo: string; valor: string; detalle: string; ultimo?: boolean; children?: ReactNode }) {
  return <li className="flex gap-3">
    <span className="flex flex-col items-center">
      <span aria-hidden className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-surface-muted text-caption font-semibold text-fg">{n}</span>
      {!ultimo && <span aria-hidden className="w-px flex-1 bg-line-strong" />}
    </span>
    <span className={`min-w-0 flex-1 space-y-2 ${ultimo ? '' : 'pb-5'}`}>
      <span className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-body font-semibold text-fg">{titulo}</span>
        <span className="tabular text-title text-fg">{valor} <span className="text-caption font-normal text-fg-muted">kcal</span></span>
      </span>
      <span className="block text-body-sm text-fg-muted">{detalle}</span>
      {children}
    </span>
  </li>
}

/**
 * Cómo se ha calculado, tras la «i» del título: la cuenta en pasos numerados (reposo, actividad y objetivo) con sus cifras,
 * las ecuaciones con tus datos en un recuadro, el ritmo aproximado y el acceso al método.
 */
function ComoSeCalcula({ e, onVerMetodo }: { e: EnergiaOk; onVerMetodo: () => void }) {
  const nivel = NIVELES_ACTIVIDAD[e.actividad].etiqueta.toLowerCase()
  const conObjetivo = e.objetivoKcal !== null && e.objetivoAplicado !== null
  return <Ayuda titulo="Tu energía diaria">
    <ul aria-label="Tus datos" className="flex flex-wrap gap-2">
      {[`${formatNumber(e.edad)} años`, `${formatNumber(e.datos.alturaCm, 1)} cm`, `${formatNumber(e.datos.pesoKg, 1)} kg`, `IMC ${formatNumber(e.imc, 1)}`].map((d) =>
        <li key={d} className="tabular rounded-pill bg-surface-muted px-3 py-1 text-body-sm text-fg">{d}</li>)}
    </ul>
    <ol aria-label="Cómo se calcula">
      <Paso n={1} titulo="En reposo" valor={formatNumber(Math.round(e.tmb.valor))} detalle={`Lo que gastas sin moverte: la media de ${formatNumber(METODO_TMB.ecuaciones.length)} ecuaciones con tus datos.`}>
        <span className="block space-y-2 rounded-md bg-surface-muted p-3">
          {METODO_TMB.ecuaciones.map((id) => <span key={id} className="block">
            <span className="block text-caption font-semibold text-fg">{ECUACIONES[id].nombre}</span>
            <span className="tabular block break-words text-caption text-fg-muted">{formulaSustituida(id, e.datos)} kcal</span>
          </span>)}
        </span>
      </Paso>
      <Paso n={2} titulo="Con tu actividad" valor={formatNumber(Math.round(e.getEstimado))} ultimo={!conObjetivo}
        detalle={`Gasto en reposo × ${formatNumber(e.factor, 3)}, el factor de un nivel ${nivel}.${e.origenGet === 'observado' ? ` Ahora usas el gasto observado: ${formatNumber(Math.round(e.get))} kcal.` : ''}`} />
      {conObjetivo && <Paso n={3} titulo={ETIQUETAS_OBJETIVO[e.objetivoAplicado!]} valor={formatNumber(e.objetivoKcal!)} ultimo
        detalle={e.ajusteKcal === 0 ? 'Comes lo que gastas.' : `${formatSigned(e.ajusteKcal)} kcal al día, redondeado a 10 kcal.`} />}
    </ol>
    {e.ritmo && <div className="space-y-1 rounded-md border border-line p-3">
      <p className="text-rotulo text-fg-muted">Ritmo aproximado</p>
      <p className="tabular text-title text-fg">{formatSigned(e.ritmo.kgSemana * 1000)} g <span className="text-body-sm font-normal text-fg-muted">por semana · {e.ritmo.pctPesoSemana > 0 ? '+' : '−'}{formatNumber(Math.abs(e.ritmo.pctPesoSemana), 1)} % del peso</span></p>
      <p className="text-caption text-fg-muted">Con {formatNumber(KCAL_POR_KG)} kcal por kg (Hall, 2008). Pierde validez con el tiempo: ajusta según tu peso real.</p>
    </div>}
    <p className="text-caption">Nunca baja de {formatNumber(SUELO_KCAL)} kcal ni de tu gasto en reposo (criterio de prudencia de AppFit).</p>
    <Button variant="ghost" size="sm" onClick={onVerMetodo}>Ver método y fuentes<Icon name="chevron-right" size={16} /></Button>
  </Ayuda>
}

/**
 * Resultado arriba, datos debajo: esta card solo lee; la edición vive en «Tus datos». El objetivo en grande y, debajo, de qué
 * se compone (reposo, actividad y ajuste) en una barra con su leyenda; cómo se ha calculado, tras la «i» del título.
 */
export default function ResultadoEnergia({ energia, onElegirObjetivo, onVerMetodo, onCompletar, macros }: Props) {
  if (energia.estado === 'incompleto') return <PerfilIncompleto faltan={energia.faltan} onCompletar={onCompletar} />
  return <section className="space-y-stack">
    <SectionHeader variant="section" action={energia.estado === 'ok' ? <ComoSeCalcula e={energia} onVerMetodo={onVerMetodo} /> : undefined}>Tu energía diaria</SectionHeader>
    <Card className="space-y-stack">
      {energia.estado === 'no-calculable' && <p role="alert" className="flex items-start gap-2 text-body-sm text-warning"><Icon name="alert" size={16} className="mt-0.5" /><span className="min-w-0">{energia.motivo}</span></p>}
      {energia.estado === 'ok' && <>
        {energia.objetivoKcal !== null
          ? <Metric size="hero" label="Objetivo diario" valor={energia.objetivoKcal} unidad="kcal/día"
              caption={energia.objetivoAplicado === 'mantenimiento' && energia.objetivoElegido === 'definicion' ? 'Mantenimiento (déficit no disponible)' : textoObjetivo(energia)} />
          : <div className="space-y-3">
              <Metric size="hero" label="Gasto diario estimado" valor={energia.get} unidad="kcal/día" />
              <Button variant="secondary" onClick={onElegirObjetivo}>Elige tu objetivo</Button>
            </div>}
        <Composicion e={energia} />
        {energia.objetivoKcal !== null && macros && <Reparto macros={macros} />}
        {energia.avisos.map((a) => <p key={a.tipo} className="flex items-start gap-2 text-body-sm text-warning"><Icon name="alert" size={16} className="mt-0.5" /><span className="min-w-0">{a.texto}</span></p>)}
      </>}
    </Card>
    <p className="px-1 text-caption text-fg-muted">{AVISO_ORIENTATIVO}.</p>
  </section>
}
