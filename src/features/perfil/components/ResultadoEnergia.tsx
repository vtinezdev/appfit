import Button from '../../../shared/components/Button'
import Card from '../../../shared/components/Card'
import Disclosure from '../../../shared/components/Disclosure'
import Icon from '../../../shared/components/Icon'
import ListGroup from '../../../shared/components/ListGroup'
import Metric from '../../../shared/components/Metric'
import SectionHeader from '../../../shared/components/SectionHeader'
import { EmptyState } from '../../../shared/components/StateMessage'
import { formatNumber } from '../../../shared/lib/format'
import {
  AVISO_ORIENTATIVO, ECUACIONES, ETIQUETAS_OBJETIVO, formatSigned, formulaSustituida, KCAL_POR_KG, METODO_TMB, NIVELES_ACTIVIDAD, SUELO_KCAL,
  type EnergiaOk, type ResultadoEnergia,
} from '../lib/energia'
import { listaCampos, perfilVacio } from '../lib/validacionPerfil'
import type { Perfil } from '../../../shared/db/types'

interface Props {
  perfil: Perfil
  energia: ResultadoEnergia
  onElegirObjetivo: () => void
  onVerMetodo: () => void
}

function Fila({ etiqueta, detalle, valor }: { etiqueta: string; detalle?: string; valor: string }) {
  return <li className="flex items-baseline justify-between gap-3 py-3">
    <span className="min-w-0"><span className="block break-words text-body-sm text-fg">{etiqueta}</span>{detalle && <span className="block break-words text-caption text-fg-muted">{detalle}</span>}</span>
    <span className="tabular shrink-0 text-body font-semibold text-fg">{valor} <span className="text-caption font-normal text-fg-muted">kcal</span></span>
  </li>
}

function Cadena({ e }: { e: EnergiaOk }) {
  const nivel = NIVELES_ACTIVIDAD[e.actividad]
  const objetivo = e.objetivoAplicado
  return <ListGroup variante="plana" aria-label="Cálculo de tu energía diaria">
    <Fila etiqueta={`Gasto en reposo (media de ${formatNumber(METODO_TMB.ecuaciones.length)} ecuaciones)`} valor={formatNumber(e.tmb.valor)} />
    <Fila etiqueta="Gasto diario estimado" detalle={`× ${formatNumber(e.factor, 3)} · ${nivel.etiqueta.toLowerCase()}`} valor={formatNumber(e.get)} />
    {objetivo && <Fila etiqueta={`Ajuste · ${ETIQUETAS_OBJETIVO[objetivo].toLowerCase()}`} valor={formatSigned(e.ajusteKcal)} />}
  </ListGroup>
}

function Detalle({ e, onVerMetodo }: { e: EnergiaOk; onVerMetodo: () => void }) {
  return <Disclosure title="Cómo se ha calculado">
    <div className="space-y-3 text-body-sm text-fg-muted">
      {METODO_TMB.ecuaciones.map((id) => <p key={id}><span className="block font-semibold text-fg">{ECUACIONES[id].nombre}</span><span className="tabular break-words">{formulaSustituida(id, e.datos)} kcal</span></p>)}
      <p className="tabular"><span className="block font-semibold text-fg">Gasto en reposo</span>Media de las dos: {formatNumber(e.tmb.valor, 1)} kcal</p>
      <p className="tabular"><span className="block font-semibold text-fg">Gasto diario</span>{formatNumber(e.tmb.valor, 1)} × {formatNumber(e.factor, 3)} = {formatNumber(e.get, 1)} kcal</p>
      <p className="tabular"><span className="block font-semibold text-fg">Tus datos</span>{formatNumber(e.edad)} años · {formatNumber(e.datos.alturaCm, 1)} cm · {formatNumber(e.datos.pesoKg, 1)} kg · IMC {formatNumber(e.imc, 1)}</p>
      {e.ritmo && <p><span className="block font-semibold text-fg">Ritmo aproximado</span>
        <span className="tabular">{formatSigned(e.ritmo.kgSemana * 1000)} g por semana ({e.ritmo.pctPesoSemana > 0 ? '+' : '−'}{formatNumber(Math.abs(e.ritmo.pctPesoSemana), 1)} % del peso)</span>, con {formatNumber(KCAL_POR_KG)} kcal por kg. Es una aproximación que pierde validez con el tiempo (Hall, 2008): ajusta según tu peso real.</p>}
      <p>El objetivo se redondea a 10 kcal y nunca baja de {formatNumber(SUELO_KCAL)} kcal ni de tu gasto en reposo (criterio de prudencia de AppFit).</p>
      <Button variant="ghost" size="sm" onClick={onVerMetodo}>Ver método y fuentes<Icon name="chevron-right" size={16} /></Button>
    </div>
  </Disclosure>
}

/** Resultado arriba, datos debajo: esta card solo lee; la edición vive en «Tus datos». */
export default function ResultadoEnergia({ perfil, energia, onElegirObjetivo, onVerMetodo }: Props) {
  return <Card className="space-y-stack">
    <SectionHeader variant="section">Tu energía diaria</SectionHeader>
    {energia.estado === 'incompleto' && (perfilVacio(perfil) && energia.faltan.length >= 5
      ? <EmptyState icon="user" title="Completa tus datos para estimar tu energía diaria">Añade tu sexo, fecha de nacimiento, altura, peso y actividad. Todo se queda en este dispositivo.</EmptyState>
      : <p className="text-body-sm text-fg-muted">Faltan: {listaCampos(energia.faltan)}.</p>)}
    {energia.estado === 'no-calculable' && <p role="alert" className="flex items-start gap-2 text-body-sm text-warning"><Icon name="alert" size={16} className="mt-0.5" /><span className="min-w-0">{energia.motivo}</span></p>}
    {energia.estado === 'ok' && <>
      {energia.objetivoKcal !== null
        ? <Metric size="hero" label="Objetivo diario" valor={energia.objetivoKcal} unidad="kcal/día"
            caption={energia.objetivoAplicado === 'mantenimiento' && energia.objetivoElegido === 'definicion' ? 'Mantenimiento (déficit no disponible)' : ETIQUETAS_OBJETIVO[energia.objetivoAplicado!]} />
        : <div className="space-y-3">
            <Metric size="hero" label="Gasto diario estimado" valor={energia.get} unidad="kcal/día" />
            <Button variant="secondary" onClick={onElegirObjetivo}>Elige tu objetivo</Button>
          </div>}
      <Cadena e={energia} />
      {energia.avisos.map((a) => <p key={a.tipo} className="flex items-start gap-2 text-body-sm text-warning"><Icon name="alert" size={16} className="mt-0.5" /><span className="min-w-0">{a.texto}</span></p>)}
      <Detalle e={energia} onVerMetodo={onVerMetodo} />
    </>}
    <p className="text-caption text-fg-muted">{AVISO_ORIENTATIVO}.</p>
  </Card>
}
