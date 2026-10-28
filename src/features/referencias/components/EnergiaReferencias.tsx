import type { ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Card from '../../../shared/components/Card'
import Disclosure from '../../../shared/components/Disclosure'
import Icon, { type IconName } from '../../../shared/components/Icon'
import { todayISO } from '../../../shared/lib/dates'
import { formatInt, formatNumber } from '../../../shared/lib/format'
import { estadoEnergetico } from '../../perfil/data/perfilRepo'
import { pasosEnergia } from '../lib/pasosEnergia'
import SeccionReferencia, { AvisoReferencia } from './SeccionReferencia'
import { AVISO_ORIENTATIVO, ECUACIONES, formatSigned, IMC_BAJO_PESO, INTENSIDADES_KCAL, KCAL_POR_KG, METODO_TMB, NIVELES_ACTIVIDAD, SUELO_KCAL, type EnergiaOk } from '../../perfil/lib/energia'
import { enlaceFuente, FUENTES_ENERGIA } from '../../perfil/lib/fuentesEnergia'
import { ALTURA_MAX, ALTURA_MIN, EDAD_AVISO, EDAD_MAX, EDAD_MIN } from '../../perfil/lib/validacionPerfil'



/** Lo que pasa a ser opcional: la bibliografía de cada sección, plegada. */
const Apoyo = ({ children }: { children: ReactNode }) => <Disclosure title="En qué se apoya"><div className="space-y-2 text-body-sm text-fg-muted">{children}</div></Disclosure>

/** Una cifra en una casilla: rótulo arriba y valor grande. */
function Casilla({ rotulo, valor, unidad, destacada = false }: { rotulo: string; valor: string; unidad?: string; destacada?: boolean }) {
  return <div className={`min-w-0 rounded-md p-3 ${destacada ? 'bg-accent-subtle' : 'bg-surface-muted'}`}>
    <p className="break-words text-caption text-fg-muted">{rotulo}</p>
    <p className="tabular flex flex-wrap items-baseline gap-1"><span className="font-numeric text-heading text-fg">{valor}</span>{unidad && <span className="text-caption text-fg-muted">{unidad}</span>}</p>
  </div>
}

/**
 * Cabecera de la página: el objetivo en cuatro pasos numerados, cada uno con su regla y, con perfil completo, tu cifra a la
 * derecha. Los mismos números encabezan las secciones de debajo.
 */
function CuatroPasos({ e }: { e: EnergiaOk | null }) {
  const pasos = pasosEnergia(e)
  return <Card className="space-y-3">
    <div>
      <p className="text-rotulo text-fg-muted">{e ? 'Tu cálculo' : 'El cálculo'}</p>
      <h2 className="text-title text-fg">Cómo sale tu objetivo</h2>
    </div>
    <ol className="space-y-3">
      {pasos.map((p, i) => <li key={p.titulo} className="flex gap-3">
        <span aria-hidden className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-surface-muted text-caption font-semibold text-fg">{formatInt(i + 1)}</span>
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
          <span className="min-w-0">
            <span className="block text-body-sm font-semibold text-fg">{p.titulo}</span>
            <span className="block break-words text-caption text-fg-muted">{p.regla}</span>
          </span>
          {p.tuyo && <span className={`tabular shrink-0 text-body-sm ${i === pasos.length - 1 ? 'font-semibold text-fg' : 'text-fg'}`}>{p.tuyo}</span>}
        </span>
      </li>)}
    </ol>
    {!e && <p className="border-t border-line pt-3 text-caption text-fg-muted">Completa tu Perfil para ver aquí tus cifras.</p>}
  </Card>
}

/** Regla del ajuste: de −600 a +600 kcal, con las zonas de definición y volumen y, con perfil, tu marca. */
function ReglaAjuste({ ajuste }: { ajuste: number | null }) {
  const max = Math.max(...INTENSIDADES_KCAL)
  const min = Math.min(...INTENSIDADES_KCAL)
  const x = (kcal: number) => `${((kcal + max) / (2 * max)) * 100}%`
  return <div className="space-y-1 pt-6">
    <div className="relative h-3 rounded-pill bg-surface-muted">
      <span aria-hidden className="absolute inset-y-0 rounded-pill bg-fg-subtle" style={{ left: x(-max), width: `${((max - min) / (2 * max)) * 100}%` }} />
      <span aria-hidden className="absolute inset-y-0 rounded-pill bg-fg-subtle" style={{ left: x(min), width: `${((max - min) / (2 * max)) * 100}%` }} />
      <span aria-hidden className="absolute -inset-y-1 w-0.5 -translate-x-1/2 bg-fg" style={{ left: x(0) }} />
      {ajuste !== null && <span aria-hidden className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-surface bg-accent" style={{ left: x(Math.max(-max, Math.min(max, ajuste))) }} />}
      {ajuste !== null && <span aria-hidden className="absolute -top-6 -translate-x-1/2 whitespace-nowrap rounded-pill bg-accent px-2 text-caption font-semibold text-accent-on" style={{ left: x(Math.max(-max, Math.min(max, ajuste))) }}>Tú</span>}
    </div>
    <div className="tabular grid grid-cols-3 text-caption text-fg-muted">
      <span>Definición<br />−{formatInt(max)} a −{formatInt(min)}</span>
      <span className="text-center">Mantener<br />0</span>
      <span className="text-right">Volumen<br />+{formatInt(min)} a +{formatInt(max)}</span>
    </div>
  </div>
}

const signo = (n: number) => (n < 0 ? '−' : '+')
function formula(id: 'mifflin' | 'rozaShizgal', sexo: 'hombre' | 'mujer') {
  const c = ECUACIONES[id].coeficientes[sexo]
  const n = (x: number) => formatNumber(Math.abs(x), 3)
  return `${c.constante < 0 ? '−' : ''}${n(c.constante)} ${signo(c.kg)} ${n(c.kg)}·kg ${signo(c.cm)} ${n(c.cm)}·cm ${signo(c.anio)} ${n(c.anio)}·años`
}

/**
 * Metodología y fuentes de la estimación energética (punto 33): arriba el cálculo en cuatro pasos con tus cifras y, en cada
 * sección, lo visual primero (las dos ecuaciones, la escala de factores, la regla del ajuste, los límites) y la bibliografía
 * plegada en «En qué se apoya». Es la única explicación larga; Perfil enlaza aquí.
 */
export default function EnergiaReferencias() {
  const estado = useLiveQuery(() => estadoEnergetico(todayISO()), [])
  const e = estado?.energia.estado === 'ok' ? estado.energia : null
  const kcal = (n: number) => formatInt(Math.round(n))
  const LIMITES: { icono: IconName; texto: string }[] = [
    { icono: 'alert', texto: `Nunca menos de ${formatInt(SUELO_KCAL)} kcal` },
    { icono: 'scale', texto: 'Nunca por debajo de tu gasto en reposo' },
    { icono: 'stop', texto: `Con IMC bajo ${formatNumber(IMC_BAJO_PESO, 1)}, sin déficit` },
    { icono: 'user', texto: `Solo adultos, de ${formatInt(EDAD_MIN)} a ${formatInt(EDAD_MAX)} años` },
  ]
  return <div className="space-y-stack text-body-sm text-fg-muted">
    <CuatroPasos e={e} />

    <AvisoReferencia>
      <p>Orientativo (error típico ±10 %), no una prescripción médica. Ajusta según cómo cambia tu peso.</p>
      <p className="text-fg-muted">No sirve para menores de 18 años, embarazo o lactancia, enfermedades que alteran el metabolismo ni trastornos de la conducta alimentaria: consulta a un profesional sanitario.</p>
    </AvisoReferencia>

    <SeccionReferencia titulo="1 · Gasto en reposo" resumen="La media de dos ecuaciones con tu sexo, edad, altura y peso.">
      <div className="grid grid-cols-2 gap-2">
        {METODO_TMB.ecuaciones.map((id) => <Casilla key={id} rotulo={ECUACIONES[id].nombre} valor={e ? kcal(e.tmb.parciales[id]) : '—'} unidad={e ? 'kcal' : undefined} />)}
      </div>
      <Casilla rotulo={e ? 'Media: tu gasto en reposo' : 'AppFit usa la media de las dos'} valor={e ? kcal(e.tmb.valor) : '½ + ½'} unidad={e ? 'kcal' : undefined} destacada />
      <Disclosure title="Las fórmulas">
        <ul className="space-y-2">
          {(['mifflin', 'rozaShizgal'] as const).map((id) => <li key={id} className="space-y-1">
            <p className="font-semibold text-fg">{ECUACIONES[id].nombre}</p>
            <p className="tabular break-words">Hombre: {formula(id, 'hombre')}</p>
            <p className="tabular break-words">Mujer: {formula(id, 'mujer')}</p>
          </li>)}
        </ul>
      </Disclosure>
      <Apoyo>
        <p>Mifflin-St Jeor (1990) se obtuvo con 498 adultos sanos de 19 a 78 años y la revisión de Frankenfield (2005) la señala como la más fiable. Harris-Benedict (1918–1919) sobreestima en población actual; la revisión de Roza y Shizgal (1984) mejora el ajuste. La media de las dos es un criterio de AppFit, no un método publicado.</p>
        <p>No se usan Henry/Oxford (la de EFSA) ni Cunningham o Katch-McArdle, que piden masa magra: no se guarda composición corporal. Son ecuaciones binarias (hombre o mujer) y en deportistas muy musculados pueden quedarse cortas (ten Haaf y Weijs, 2014).</p>
      </Apoyo>
    </SeccionReferencia>

    <SeccionReferencia titulo="2 · Factor de actividad" resumen={`Tu gasto en reposo × un factor de ${formatNumber(Math.min(...Object.values(NIVELES_ACTIVIDAD).map((n) => n.factor)), 3)} a ${formatNumber(Math.max(...Object.values(NIVELES_ACTIVIDAD).map((n) => n.factor)), 3)}, según cuánto deporte haces.`}>
      <ul className="space-y-1">
        {Object.entries(NIVELES_ACTIVIDAD).map(([id, n]) => {
          const tuyo = e?.actividad === id
          return <li key={id} className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 ${tuyo ? 'bg-accent-subtle' : ''}`}>
            <span className="min-w-0"><span className="block font-semibold text-fg">{n.etiqueta}{tuyo ? ' · tú' : ''}</span><span className="block text-caption">{n.descripcion}</span></span>
            <span className="tabular shrink-0 font-semibold text-fg">× {formatNumber(n.factor, 3)}</span>
          </li>
        })}
      </ul>
      <Apoyo>
        <p>Los cinco niveles se atribuyen a McArdle, Katch y Katch (1996): una convención muy usada, no un método validado.</p>
        <p>Como contexto, FAO/OMS/UNU (2004) y EFSA (2013) usan niveles de actividad de 1,4 a 2,4. Los dos primeros niveles pueden quedarse cortos para quien camina mucho o trabaja de pie; el gasto observado de Perfil lo corrige con tus datos.</p>
      </Apoyo>
    </SeccionReferencia>

    <SeccionReferencia titulo="3 · Ajuste según tu objetivo" resumen={`Definición resta y volumen suma de ${formatInt(Math.min(...INTENSIDADES_KCAL))} a ${formatInt(Math.max(...INTENSIDADES_KCAL))} kcal al día.`}>
      <ReglaAjuste ajuste={e && e.objetivoAplicado ? e.ajusteKcal : null} />
      <div className="grid grid-cols-2 gap-2">
        <Casilla rotulo="Tu ajuste" valor={e && e.objetivoAplicado ? formatSigned(e.ajusteKcal) : '—'} unidad={e && e.objetivoAplicado ? 'kcal' : undefined} />
        <Casilla rotulo="Ritmo aproximado" valor={e?.ritmo ? `${e.ritmo.kgSemana > 0 ? '+' : e.ritmo.kgSemana < 0 ? '−' : ''}${formatNumber(Math.abs(e.ritmo.kgSemana), 2)}` : '—'} unidad={e?.ritmo ? 'kg/semana' : undefined} />
      </div>
      <Apoyo>
        <p>Ritmo = kcal × 7 / {formatInt(KCAL_POR_KG)} kg por semana. En definición, por encima del 1 % del peso por semana avisa, sin bloquear.</p>
        <p>El rango lo fija AppFit; la literatura es contexto. NICE: unas 600 kcal/día menos son unos 0,5 kg por semana. Helms et al. (2014) y Garthe et al. (2011): perder un 0,5–1 % del peso por semana conserva mejor el músculo. Slater et al. (2019) e Iraki et al. (2019): en volumen, unas 360–480 kcal más o un 10–20 %.</p>
        <p>Hall (2008): {formatInt(KCAL_POR_KG)} kcal por kg es una aproximación que pierde validez con el tiempo.</p>
      </Apoyo>
    </SeccionReferencia>

    <SeccionReferencia titulo="4 · Límites de prudencia" resumen={`Nunca por debajo de tu gasto en reposo ni de ${formatInt(SUELO_KCAL)} kcal; solo para adultos.`}>
      <ul className="grid grid-cols-2 gap-2">
        {LIMITES.map((l) => <li key={l.texto} className="flex min-w-0 flex-col gap-2 rounded-md bg-surface-muted p-3">
          <Icon name={l.icono} size={20} className="text-fg-muted" />
          <span className="break-words text-body-sm font-semibold text-fg">{l.texto}</span>
        </li>)}
      </ul>
      <Apoyo>
        <p>Son criterios de prudencia de AppFit, no datos científicos. {formatInt(SUELO_KCAL)} kcal es el umbral de las dietas de muy bajo valor calórico, que NICE no recomienda sin supervisión; un IMC por debajo de 18,5 es bajo peso según la OMS. Por encima de {formatInt(EDAD_AVISO)} años se calcula con aviso, fuera de la muestra de las ecuaciones.</p>
        <p>Altura de {formatInt(ALTURA_MIN)} a {formatInt(ALTURA_MAX)} cm y peso de 20 a 300 kg son controles de la entrada. El objetivo se redondea a 10 kcal.</p>
      </Apoyo>
    </SeccionReferencia>

    <SeccionReferencia titulo="Cómo se usa en la app" resumen="Tus calorías de Hoy, Resumen e Inicio salen de aquí y se recalculan solas.">
      <ul className="list-disc space-y-1 pl-5">
        <li>Con el perfil completo, tus calorías salen de aquí y se recalculan al pesarte, cambiar un dato o cumplir años.</li>
        <li>Los macros siguen tu reparto de Objetivos diarios; la proteína, por kg si la tienes activa.</li>
        <li>Se calcula en tu móvil: no se envía nada.</li>
      </ul>
    </SeccionReferencia>

    <SeccionReferencia titulo="Fuentes" resumen={`${formatNumber(FUENTES_ENERGIA.length)} publicaciones, con su enlace y para qué se usa cada una.`}>
      <ul className="space-y-3">
        {FUENTES_ENERGIA.map((f) => {
          const url = enlaceFuente(f)
          return <li key={f.id} className="space-y-1">
            <p><span className="font-semibold text-fg">{f.autores} ({f.anio}).</span> {f.titulo}. {f.publicacion}.</p>
            <p>{f.uso}</p>
            {'nota' in f && f.nota && <p className="text-warning">{f.nota}</p>}
            {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-touch items-center break-all font-semibold text-accent-strong underline">{'doi' in f && f.doi ? `DOI ${f.doi}` : 'Consultar fuente'}</a>}
          </li>
        })}
      </ul>
      <p>{AVISO_ORIENTATIVO}.</p>
    </SeccionReferencia>
  </div>
}
