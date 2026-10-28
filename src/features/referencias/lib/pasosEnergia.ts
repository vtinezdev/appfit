import { formatNumber } from '../../../shared/lib/format'
import { ETIQUETAS_OBJETIVO, formatSigned, METODO_TMB, NIVELES_ACTIVIDAD, SUELO_KCAL, type EnergiaOk } from '../../perfil/lib/energia'

export interface PasoEnergia {
  /** Qué hace el paso: «En reposo», «Con tu deporte»… */
  titulo: string
  /** La regla de AppFit, igual para todos. */
  regla: string
  /** Tu cifra en ese paso; `null` sin perfil completo. */
  tuyo: string | null
}

const kcal = (n: number) => `${formatNumber(Math.round(n))} kcal`
const factores = Object.values(NIVELES_ACTIVIDAD).map((n) => n.factor)

/**
 * Cómo sale el objetivo de energía, en cuatro pasos (punto 33, Energía y objetivo): reposo, deporte, objetivo y límites,
 * cada uno con su regla y, con perfil completo, tu cifra. Es la cabecera de la página; el detalle de cada paso va debajo.
 */
export function pasosEnergia(e: EnergiaOk | null): PasoEnergia[] {
  const observado = e?.origenGet === 'observado'
  return [
    {
      titulo: 'En reposo',
      regla: `Media de ${formatNumber(METODO_TMB.ecuaciones.length)} ecuaciones con tu sexo, edad, altura y peso`,
      tuyo: e ? kcal(e.tmb.valor) : null,
    },
    {
      titulo: 'Con tu deporte',
      regla: observado ? 'Usas el gasto observado: lo que comes frente a cómo cambia tu peso'
        : `× ${formatNumber(Math.min(...factores), 3)} a ${formatNumber(Math.max(...factores), 3)} según cuánto deporte haces`,
      tuyo: !e ? null : observado ? kcal(e.get) : `× ${formatNumber(e.factor, 3)} = ${kcal(e.get)}`,
    },
    {
      titulo: 'Según tu objetivo',
      regla: 'Definición resta y volumen suma de 200 a 600 kcal; mantenimiento, nada',
      tuyo: !e ? null : e.objetivoAplicado === null ? 'Sin elegir' : `${ETIQUETAS_OBJETIVO[e.objetivoAplicado]} · ${formatSigned(e.ajusteKcal)} kcal`,
    },
    {
      titulo: 'Con límites',
      regla: `Nunca por debajo de tu gasto en reposo ni de ${formatNumber(SUELO_KCAL)} kcal; redondeado a 10`,
      tuyo: e?.objetivoKcal != null ? `= ${kcal(e.objetivoKcal)}` : null,
    },
  ]
}
