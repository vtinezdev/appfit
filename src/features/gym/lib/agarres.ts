import type { Agarre, Exercise } from '../../../shared/db/types'
import { catalogoDeLocal } from './selectorEjercicios'

export const ORIENTACIONES = { prono: 'Prono', supino: 'Supino', neutro: 'Neutro', mixto: 'Mixto' } as const
export const ANCHURAS = { estrecho: 'Estrecho', medio: 'Medio', ancho: 'Ancho' } as const
export const ACCESORIOS = { barra: 'Barra', 'barra-v': 'Agarre en V', cuerda: 'Cuerda', individual: 'Agarre individual', maquina: 'Agarre de máquina' } as const
export const CAMPOS_AGARRE = { orientacion: ORIENTACIONES, anchura: ANCHURAS, accesorio: ACCESORIOS }
export type CampoAgarre = keyof Agarre
interface PerfilAgarre {
  orientacion: readonly NonNullable<Agarre['orientacion']>[]
  anchura: readonly NonNullable<Agarre['anchura']>[]
  accesorio: readonly NonNullable<Agarre['accesorio']>[]
}
const ninguno: PerfilAgarre = { orientacion: [], anchura: [], accesorio: [] }
const ancho = ['estrecho', 'medio', 'ancho'] as const
const tres = ['prono', 'supino', 'neutro'] as const
const perfiles = {
  dominadas: { orientacion: tres, anchura: ancho, accesorio: [] },
  barra: { orientacion: ['prono', 'supino'], anchura: ancho, accesorio: [] },
  pressBarra: { orientacion: ['prono'], anchura: ancho, accesorio: [] },
  mancuerna: { orientacion: tres, anchura: [], accesorio: [] },
  pressMancuerna: { orientacion: ['prono', 'neutro'], anchura: [], accesorio: [] },
  neutro: { orientacion: ['neutro'], anchura: [], accesorio: [] },
  neutroAncho: { orientacion: ['neutro'], anchura: ancho, accesorio: [] },
  supino: { orientacion: ['supino'], anchura: [], accesorio: [] },
  supinoAncho: { orientacion: ['supino'], anchura: ancho, accesorio: [] },
  prono: { orientacion: ['prono'], anchura: [], accesorio: [] },
  muerto: { orientacion: ['prono', 'mixto'], anchura: ancho, accesorio: [] },
  polea: { orientacion: tres, anchura: ancho, accesorio: ['barra', 'barra-v', 'cuerda', 'individual'] },
  poleaIndividual: { orientacion: tres, anchura: [], accesorio: ['individual'] },
  cuerda: { orientacion: ['neutro'], anchura: [], accesorio: ['cuerda'] },
  tricepsBarra: { orientacion: ['prono', 'supino'], anchura: ['estrecho', 'medio'], accesorio: ['barra'] },
  maquina: { orientacion: tres, anchura: ancho, accesorio: ['maquina'] },
  anillas: { orientacion: tres, anchura: [], accesorio: [] },
  flexion: { orientacion: ['prono'], anchura: ancho, accesorio: [] },
} satisfies Record<string, PerfilAgarre>

/** Asignación editorial explícita: los nombres no deciden qué combinaciones admite un ejercicio. */
const porId = new Map<string, PerfilAgarre>()
function asignar(perfil: PerfilAgarre, slugs: string) {
  for (const slug of slugs.split(' ')) porId.set(`appfit:${slug}`, perfil)
}
asignar(perfiles.dominadas, 'dominadas dominadas-asistidas dominadas-banda dominadas-escapulares remo-invertido colgar-barra')
asignar(perfiles.neutroAncho, 'dominadas-neutras jalon-neutro')
asignar(perfiles.supinoAncho, 'dominadas-supinas jalon-supino')
asignar(perfiles.barra, 'remo-barra remo-pendlay remo-seal remo-t curl-barra curl-barra-z curl-predicador rodillo-muneca')
asignar(perfiles.pressBarra, 'press-banca press-inclinado-barra press-declinado-barra press-banca-smith press-inclinado-smith press-militar press-militar-sentado press-hombro-smith press-z press-frances')
asignar(perfiles.mancuerna, 'remo-mancuerna curl-mancuernas curl-inclinado curl-concentrado curl-predicador-mancuerna curl-arana remo-kettlebell')
asignar(perfiles.pressMancuerna, 'press-mancuernas press-inclinado-mancuernas press-declinado-mancuernas press-hombro-mancuernas press-suelo-mancuernas press-unilateral-mancuerna press-frances-mancuernas rumano-mancuernas rumano-unilateral remo-meadows press-pecho-bandas')
asignar(perfiles.neutro, 'curl-martillo encogimientos farmer-walk paseo-maleta remo-gorila remo-renegado peso-muerto-trap-bar press-squeeze l-sit fondos-anillas fondos-triceps fondos-pecho fondos-banco')
asignar(perfiles.supino, 'curl-muneca curl-muneca-espalda')
asignar(perfiles.prono, 'extension-muneca encogimientos-barra remo-menton fondos-barra-recta')
asignar(perfiles.muerto, 'peso-muerto peso-muerto-sumo peso-muerto-rumano peso-muerto-rigidas rumano-smith rack-pull')
asignar(perfiles.polea, 'pullover-polea jalon-pecho remo-polea curl-polea extension-triceps-polea-cabeza')
asignar(perfiles.poleaIndividual, 'jalon-unilateral remo-polea-unilateral curl-bayesiano curl-polea-alta extension-triceps-unilateral patada-triceps-polea press-pecho-unilateral-polea')
asignar(perfiles.cuerda, 'extension-triceps-cuerda curl-martillo-cuerda face-pull pull-through')
asignar(perfiles.tricepsBarra, 'extension-triceps-barra')
asignar(perfiles.maquina, 'remo-maquina remo-alto-maquina jalon-maquina press-pecho-maquina press-inclinado-maquina press-hombro-maquina curl-maquina fondos-maquina')
asignar(perfiles.anillas, 'remo-anillas flexiones-anillas curl-biceps-anillas extension-triceps-anillas remo-trx curl-trx')
asignar(perfiles.dominadas, 'remo-bandas')
asignar(perfiles.pressBarra, 'cargada-barra')
asignar(perfiles.prono, 'swing-kettlebell peso-muerto-kettlebell')
asignar(perfiles.pressMancuerna, 'reverse-pec-deck pajaros')
asignar(perfiles.flexion, 'flexiones flexiones-inclinadas flexiones-declinadas flexiones-rodillas flexiones-pike flexiones-hindu flexiones-escapulares')
// Los movimientos que ya nombran una variante conservan ese detalle.
porId.set('appfit:dominadas-arqueras', { ...perfiles.barra, anchura: ['ancho'] })
porId.set('appfit:curl-inverso', { ...perfiles.pressBarra })
porId.set('appfit:press-cerrado', { ...perfiles.pressBarra, anchura: ['estrecho'] })
porId.set('appfit:flexiones-diamante', { ...perfiles.flexion, anchura: ['estrecho'] })
porId.set('appfit:flexiones-arqueras', { ...perfiles.flexion, anchura: ['ancho'] })
porId.set('appfit:flexiones-pseudo-plancha', { ...perfiles.flexion, anchura: ['medio'] })
// Este remo usa mancuernas y permite variar su orientación.
porId.set('appfit:remo-pecho-apoyado', perfiles.mancuerna)
porId.set('appfit:extension-triceps-bandas', perfiles.mancuerna)

export function perfilAgarre(e: Exercise, valor?: Agarre): PerfilAgarre {
  const c = catalogoDeLocal(e)
  const perfil = c ? porId.get(c.id) ?? ninguno : { orientacion: tres, anchura: ancho, accesorio: Object.keys(ACCESORIOS) as NonNullable<Agarre['accesorio']>[] }
  // El accesorio limita combinaciones: una cuerda no se convierte en una barra ancha/pronada.
  if (valor?.accesorio === 'cuerda') return { ...perfil, orientacion: perfil.orientacion.includes('neutro') ? ['neutro'] : [], anchura: [] }
  if (valor?.accesorio === 'barra-v') return { ...perfil, orientacion: ['neutro'], anchura: ['estrecho'] }
  if (valor?.accesorio === 'individual') return { ...perfil, anchura: [] }
  if (valor?.accesorio === 'barra') return { ...perfil, orientacion: perfil.orientacion.filter(o => o !== 'neutro') }
  return perfil
}
export function opcionesAgarre(e: Exercise) {
  const p = perfilAgarre(e)
  return { orientacion: p.orientacion.length > 1, anchura: p.anchura.length > 1, accesorio: p.accesorio.length > 1 }
}
export function admiteElegirAgarre(e: Exercise): boolean { return Object.values(opcionesAgarre(e)).some(Boolean) }
export function textoAgarre(a?: Agarre | null): string {
  return [a?.orientacion && ORIENTACIONES[a.orientacion], a?.anchura && ANCHURAS[a.anchura], a?.accesorio && ACCESORIOS[a.accesorio]].filter(Boolean).join(' · ')
}
export function claveAgarre(a?: Agarre | null): string { return JSON.stringify([a?.orientacion ?? '', a?.anchura ?? '', a?.accesorio ?? '']) }

/** Se llama solo ante una elección nueva, nunca para reescribir datos históricos. */
export function cambiarAgarre(e: Exercise, actual: Agarre | undefined, campo: CampoAgarre, valor?: string): Agarre | undefined {
  const siguiente = { ...actual, [campo]: valor } as Agarre
  if (!valor) delete siguiente[campo]
  const perfil = perfilAgarre(e, siguiente)
  for (const k of Object.keys(CAMPOS_AGARRE) as CampoAgarre[]) {
    if (siguiente[k] && !(perfil[k] as readonly string[]).includes(siguiente[k]!)) delete siguiente[k]
  }
  if (!Object.keys(siguiente).length) return undefined
  // Una dimensión fija se conoce al concretar cualquier parte de la variante.
  for (const k of Object.keys(CAMPOS_AGARRE) as CampoAgarre[]) if (perfil[k].length === 1) Object.assign(siguiente, { [k]: perfil[k][0] })
  return siguiente
}
export function validarAgarreEjercicio(e: Exercise, agarre?: Agarre | null): void {
  if (!agarre) return
  const p = perfilAgarre(e, agarre)
  for (const k of Object.keys(agarre) as CampoAgarre[]) {
    if (!p[k] || !(p[k] as readonly unknown[]).includes(agarre[k])) throw new Error('El agarre no es compatible con este ejercicio.')
  }
}
