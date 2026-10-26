import Ayuda from '../../../shared/components/Ayuda'
import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Icon from '../../../shared/components/Icon'
import Metric from '../../../shared/components/Metric'
import SectionHeader from '../../../shared/components/SectionHeader'
import { formatNumber } from '../../../shared/lib/format'
import {
  AVISO_ORIENTATIVO, ECUACIONES, ETIQUETAS_OBJETIVO, formatSigned, formulaSustituida, KCAL_POR_KG, METODO_TMB, SUELO_KCAL,
  type EnergiaOk, type ResultadoEnergia,
} from '../lib/energia'
import { tramosEnergia, type EstiloTramo } from '../lib/tramosEnergia'
import { CAMPOS_ENERGIA, listaCampos, type CampoPerfil } from '../lib/validacionPerfil'

interface Props {
  energia: ResultadoEnergia
  onElegirObjetivo: () => void
  onVerMetodo: () => void
  /** Abre el editor del dato que falta (el mismo que la fila de «Tus datos»). */
  onCompletar: (campo: CampoPerfil) => void
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

/** Cómo se ha calculado, tras la «i» del título: las fórmulas con tus datos, el ritmo y el acceso al método. */
function ComoSeCalcula({ e, onVerMetodo }: { e: EnergiaOk; onVerMetodo: () => void }) {
  return <Ayuda titulo="Tu energía diaria">
    {METODO_TMB.ecuaciones.map((id) => <p key={id}><span className="block font-semibold text-fg">{ECUACIONES[id].nombre}</span><span className="tabular break-words">{formulaSustituida(id, e.datos)} kcal</span></p>)}
    <p className="tabular"><span className="block font-semibold text-fg">Gasto en reposo</span>Media de las dos: {formatNumber(e.tmb.valor, 1)} kcal</p>
    <p className="tabular"><span className="block font-semibold text-fg">Gasto diario</span>{formatNumber(e.tmb.valor, 1)} × {formatNumber(e.factor, 3)} = {formatNumber(e.getEstimado, 1)} kcal</p>
    <p className="tabular"><span className="block font-semibold text-fg">Tus datos</span>{formatNumber(e.edad)} años · {formatNumber(e.datos.alturaCm, 1)} cm · {formatNumber(e.datos.pesoKg, 1)} kg · IMC {formatNumber(e.imc, 1)}</p>
    {e.ritmo && <p><span className="block font-semibold text-fg">Ritmo aproximado</span>
      <span className="tabular">{formatSigned(e.ritmo.kgSemana * 1000)} g por semana ({e.ritmo.pctPesoSemana > 0 ? '+' : '−'}{formatNumber(Math.abs(e.ritmo.pctPesoSemana), 1)} % del peso)</span>, con {formatNumber(KCAL_POR_KG)} kcal por kg. Es una aproximación que pierde validez con el tiempo (Hall, 2008): ajusta según tu peso real.</p>}
    <p>El objetivo se redondea a 10 kcal y nunca baja de {formatNumber(SUELO_KCAL)} kcal ni de tu gasto en reposo (criterio de prudencia de AppFit).</p>
    <Button variant="ghost" size="sm" onClick={onVerMetodo}>Ver método y fuentes<Icon name="chevron-right" size={16} /></Button>
  </Ayuda>
}

/**
 * Resultado arriba, datos debajo: esta card solo lee; la edición vive en «Tus datos». El objetivo en grande y, debajo, de qué
 * se compone (reposo, actividad y ajuste) en una barra con su leyenda; cómo se ha calculado, tras la «i» del título.
 */
export default function ResultadoEnergia({ energia, onElegirObjetivo, onVerMetodo, onCompletar }: Props) {
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
        {energia.avisos.map((a) => <p key={a.tipo} className="flex items-start gap-2 text-body-sm text-warning"><Icon name="alert" size={16} className="mt-0.5" /><span className="min-w-0">{a.texto}</span></p>)}
      </>}
    </Card>
    <p className="px-1 text-caption text-fg-muted">{AVISO_ORIENTATIVO}.</p>
  </section>
}
