import { formatNumber } from '../../../shared/lib/format'
import type { ReactNode } from 'react'
import { AVISO_ORIENTATIVO, ECUACIONES, KCAL_POR_KG, METODO_TMB, NIVELES_ACTIVIDAD, SUELO_KCAL } from '../../perfil/lib/energia'
import { enlaceFuente, FUENTES_ENERGIA } from '../../perfil/lib/fuentesEnergia'
import { ALTURA_MAX, ALTURA_MIN, EDAD_AVISO, EDAD_MAX, EDAD_MIN } from '../../perfil/lib/validacionPerfil'

const AVISO_COMPLETO = 'Estimación orientativa basada en ecuaciones poblacionales (error típico ±10 %). No es una prescripción médica ni sirve para menores de 18 años, embarazo o lactancia, enfermedades que alteran el metabolismo o trastornos de la conducta alimentaria: en esos casos, consulta a un profesional sanitario. Ajusta según la evolución real de tu peso.'

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <section className="space-y-2 border-t border-line pt-4"><h3 className="text-title font-semibold text-fg">{titulo}</h3>{children}</section>
}

const signo = (n: number) => (n < 0 ? '−' : '+')
function formula(id: 'mifflin' | 'rozaShizgal', sexo: 'hombre' | 'mujer') {
  const c = ECUACIONES[id].coeficientes[sexo]
  const n = (x: number) => formatNumber(Math.abs(x), 3)
  return `${c.constante < 0 ? '−' : ''}${n(c.constante)} ${signo(c.kg)} ${n(c.kg)}·kg ${signo(c.cm)} ${n(c.cm)}·cm ${signo(c.anio)} ${n(c.anio)}·años`
}

/** Metodología y fuentes de la estimación energética. Es la única explicación larga; Perfil enlaza aquí. */
export default function EnergiaReferencias() {
  return <div className="space-y-section text-body-sm text-fg-muted">
    <p>{AVISO_COMPLETO}</p>
    <p>La estimación se calcula siempre en tu dispositivo con los datos de Perfil y tu último pesaje. No se envía nada a ningún servidor; los enlaces de las fuentes solo se abren cuando los pulsas.</p>

    <Seccion titulo="Gasto en reposo (TMB)">
      <p>AppFit calcula la media de {formatNumber(METODO_TMB.ecuaciones.length)} ecuaciones: Mifflin-St Jeor (1990) y Harris-Benedict revisada por Roza y Shizgal (1984). Ninguna publicación valida esa media como ecuación propia: es un criterio de AppFit apoyado en dos ecuaciones citadas, no un método publicado. Con datos habituales, Roza-Shizgal da unas decenas de kcal más que Mifflin, así que la media queda entre las dos.</p>
      <ul className="space-y-2">
        {(['mifflin', 'rozaShizgal'] as const).map((id) => <li key={id} className="space-y-1">
          <p className="font-semibold text-fg">{ECUACIONES[id].nombre}</p>
          <p className="tabular break-words">Hombre: {formula(id, 'hombre')}</p>
          <p className="tabular break-words">Mujer: {formula(id, 'mujer')}</p>
        </li>)}
      </ul>
      <p>Mifflin-St Jeor se obtuvo con 498 adultos sanos de 19 a 78 años (calorimetría indirecta) y la revisión sistemática de Frankenfield (2005) la señala como la más fiable de las comparadas. Harris-Benedict (1918–1919) usó 239 personas en Boston y sobreestima en población actual; Roza-Shizgal (337 personas) mejora el ajuste con la misma estructura y es la que se usa aquí. La ecuación de Henry/Oxford (2005), que usa EFSA para valores poblacionales, y las de Cunningham o Katch-McArdle, que necesitan la masa magra, no se usan: no se pide ni se guarda composición corporal.</p>
      <p>Las ecuaciones son binarias (hombre o mujer) y se calculan en kg, cm y años cumplidos desde tu fecha de nacimiento. En deportistas con mucha masa muscular pueden quedarse cortas (ten Haaf y Weijs, 2014).</p>
    </Seccion>

    <Seccion titulo="Factor de actividad: ¿cuánto deporte haces?">
      <p>Gasto diario = gasto en reposo × factor. Los cinco niveles se atribuyen al manual de McArdle, Katch y Katch (1996) y son una convención de uso extendido, no un método validado: no se ha podido comprobar la edición concreta ni localizar una derivación experimental publicada.</p>
      <ul className="divide-y divide-line border-y border-line">
        {Object.values(NIVELES_ACTIVIDAD).map((n) => <li key={n.etiqueta} className="flex items-start justify-between gap-3 py-2">
          <span className="min-w-0"><span className="block font-semibold text-fg">{n.etiqueta}</span><span className="block">{n.descripcion}</span></span>
          <span className="tabular shrink-0 font-semibold text-fg">× {formatNumber(n.factor, 3)}</span>
        </li>)}
      </ul>
      <p>Como contexto oficial, FAO/OMS/UNU (2004) agrupa la actividad física (PAL) en 1,40–1,69, 1,70–1,99 y 2,00–2,40, y EFSA (2013) usa 1,4, 1,6, 1,8 y 2,0. FAO considera que un PAL inferior a 1,40 solo es propio de personas encamadas: los dos primeros niveles pueden quedarse cortos para quien no entrena pero camina o trabaja de pie. El factor mide el deporte, no el resto del día.</p>
    </Seccion>

    <Seccion titulo="Ajuste según tu objetivo">
      <p>Definición resta y volumen suma entre 200 y 600 kcal al día, en pasos de 100, según elijas (por defecto 400). Mantenimiento no ajusta. El rango lo fija AppFit; la literatura solo es contexto:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>NICE: un déficit de unas 600 kcal/día equivale a unos 0,5 kg por semana (coincide con el máximo de AppFit).</li>
        <li>Helms et al. (2014): perder entre el 0,5 y el 1 % del peso por semana para conservar músculo; Garthe et al. (2011): 0,7 % por semana conservó mejor la masa magra que 1,4 %.</li>
        <li>Slater et al. (2019): empezar con +1.500–2.000 kJ/día (unas 360–480 kcal); Iraki et al. (2019): +10–20 % y ganancias de 0,25–0,5 % del peso por semana.</li>
      </ul>
      <p>El ritmo que se muestra es orientativo: kcal × 7 / {formatNumber(KCAL_POR_KG)} kg por semana. Hall (2008) advierte de que {formatNumber(KCAL_POR_KG)} kcal por kg es una aproximación que pierde validez con el tiempo. En definición, si el ritmo supera el 1 % del peso por semana se avisa, sin bloquear.</p>
    </Seccion>

    <Seccion titulo="Límites de prudencia">
      <ul className="list-disc space-y-1 pl-5">
        <li>Con un IMC inferior a 18,5 (bajo peso según la OMS) no se calcula déficit: se muestra el mantenimiento.</li>
        <li>El objetivo nunca baja de tu gasto en reposo ni de {formatNumber(SUELO_KCAL)} kcal. Es un criterio de prudencia de AppFit, no un dato científico; {formatNumber(SUELO_KCAL)} kcal es el umbral de las dietas de muy bajo valor calórico, que NICE no recomienda sin supervisión.</li>
        <li>Solo para adultos: se exige una edad de {formatNumber(EDAD_MIN)} a {formatNumber(EDAD_MAX)} años. Por encima de {formatNumber(EDAD_AVISO)} años se calcula con aviso, porque queda fuera de la muestra de las ecuaciones.</li>
        <li>Altura entre {formatNumber(ALTURA_MIN)} y {formatNumber(ALTURA_MAX)} cm y peso entre 20 y 300 kg: son controles de plausibilidad de la entrada, no afirmaciones clínicas.</li>
      </ul>
      <p>El objetivo se redondea a 10 kcal: la ecuación no tiene más precisión que eso.</p>
    </Seccion>

    <Seccion titulo="Cómo se usa en la app">
      <p>Con perfil completo y objetivo elegido, las calorías de Hoy, Resumen, Inicio y Ajustes salen de Perfil y se recalculan al registrar un peso, cambiar un dato o cumplir años. Los macros conservan el reparto en % de Ajustes, por lo que al bajar las calorías baja también la proteína. Sin perfil completo siguen tus objetivos de Ajustes. No hay histórico de objetivos: los días pasados se comparan con el objetivo vigente. En Perfil se guardan solo la fecha de nacimiento, el sexo, la altura, la actividad y el objetivo; el peso sale de tus pesajes y lo demás se deriva al leer. El backup JSON incluye la fecha de nacimiento.</p>
    </Seccion>

    <Seccion titulo="Fuentes">
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
    </Seccion>
  </div>
}
