import type { ReactNode } from 'react'
import { formatNumber } from '../../../shared/lib/format'
import { objetivoAguaPorDefecto } from '../../inicio/lib/agua'
import { PROTEINA_KG_DEFECTO, PROTEINA_KG_MAX, PROTEINA_KG_MIN } from '../../perfil/lib/proteina'
import { FUENTES_PROTEINA_AGUA } from '../lib/fuentesProteinaAgua'

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <section className="space-y-2 border-t border-line pt-4"><h3 className="text-title font-semibold text-fg">{titulo}</h3>{children}</section>
}

function autoresCortos(autores: string): string {
  const lista = autores.split(',')
  return lista.length > 3 ? `${lista.slice(0, 3).join(',')} et al.` : autores
}

/** Proteína por kg (Perfil) y objetivo de agua (Inicio): qué hace AppFit, de dónde sale cada cifra y qué se ha comprobado. */
export default function ProteinaAguaReferencias() {
  return <div className="space-y-section text-body-sm text-fg-muted">
    <p>Orientación general para adultos, no una prescripción médica. Si tienes una enfermedad renal o hepática, estás embarazada o en lactancia, o sigues un tratamiento, consulta a un profesional sanitario antes de basarte en estas cifras.</p>

    <Seccion titulo="Proteína por kg de peso">
      <p>Con peso registrado, la proteína diaria es gramos por kg × tu último pesaje; por defecto {formatNumber(PROTEINA_KG_DEFECTO, 1)} g/kg, ajustable entre {formatNumber(PROTEINA_KG_MIN, 1)} y {formatNumber(PROTEINA_KG_MAX, 1)} g/kg en Perfil, donde también se puede desactivar. Las calorías restantes se reparten entre hidratos y grasa con el reparto que tengas en Ajustes. Sin peso o con la opción desactivada, mandan las proteínas de Ajustes.</p>
      <p>El rango sale de dos fuentes: el meta-análisis de Morton et al. (2018) situó el punto a partir del cual más proteína no aportó más masa libre de grasa en 1,62 g/kg/día (IC 95 % 1,03–2,20), y la postura de la ISSN (Jäger et al., 2017) considera suficiente 1,4–2,0 g/kg/día para la mayoría de las personas que hacen ejercicio. El valor por defecto ({formatNumber(PROTEINA_KG_DEFECTO, 1)} g/kg) es una elección de AppFit dentro de ese rango. Son estudios sobre entrenamiento de fuerza: no hay un valor «correcto» para todo el mundo.</p>
    </Seccion>

    <Seccion titulo="Objetivo de agua">
      <p>EFSA (2010) fija una ingesta adecuada de agua total de {formatNumber(2.5, 1)} L/día para hombres y {formatNumber(2.0, 1)} L/día para mujeres adultos. Esa cifra incluye el agua de los alimentos y solo vale para temperatura moderada y actividad física moderada: el calor y el ejercicio aumentan la necesidad.</p>
      <p>AppFit propone como objetivo de bebida {formatNumber((objetivoAguaPorDefecto('hombre') ?? 0) / 1000, 1)} L (hombre) y {formatNumber((objetivoAguaPorDefecto('mujer') ?? 0) / 1000, 1)} L (mujer) según el sexo de Perfil: descuenta un 20 % por la humedad de los alimentos. Ese 20 % es un criterio de AppFit, no una cifra de EFSA. Sin sexo en Perfil no hay objetivo, y lo que escribas en Ajustes manda sobre el recomendado.</p>
    </Seccion>

    <Seccion titulo="Fuentes y qué se ha comprobado">
      <ul className="space-y-3">
        {FUENTES_PROTEINA_AGUA.map((f) => <li key={f.id} className="space-y-1">
          <p><span className="font-semibold text-fg">{autoresCortos(f.autores)} ({f.anio}).</span> {f.titulo}. {f.publicacion}.</p>
          <p>{f.uso}</p>
          <p>Comprobado: {f.verificado}</p>
          {'noVerificado' in f && f.noVerificado && <p className="text-warning">No comprobado: {f.noVerificado}</p>}
          <a href={`https://doi.org/${f.doi}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-touch items-center break-all font-semibold text-accent-strong underline">DOI {f.doi}</a>
        </li>)}
      </ul>
    </Seccion>
  </div>
}
