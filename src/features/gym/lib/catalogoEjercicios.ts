/** Catálogo editorial local: ids estables, independiente de los ejercicios guardados por el usuario. */
import { type Musculo } from './musculos'
export { MUSCULOS, type Musculo } from './musculos'
export const EQUIPAMIENTO = {
  corporal: 'Peso corporal', mancuernas: 'Mancuernas', barra: 'Barra', maquina: 'Máquina', polea: 'Polea',
  smith: 'Smith / Multipower', kettlebell: 'Kettlebell', bandas: 'Bandas', trx: 'TRX', otros: 'Otros',
} as const
export type Equipo = keyof typeof EQUIPAMIENTO
export interface CatalogExercise {
  id: string
  name: string
  primaryMuscles: Musculo[]
  secondaryMuscles: Musculo[]
  equipment: Equipo[]
  aliases?: string[]
  /** Agrupación de búsqueda, separada de la participación anatómica. */
  filterGroups?: Musculo[]
}

/** Los ids son editoriales, no se recalculan al cambiar una etiqueta. Banco es auxiliar, no equipo principal. */
function grupo(primary: Musculo, rows: string[]): CatalogExercise[] {
  return rows.map(row => {
    const [id, name, equipment, secondary = '', aliases = ''] = row.split('|')
    return { id: `appfit:${id}`, name, primaryMuscles: [primary], secondaryMuscles: secondary ? secondary.split(',') as Musculo[] : [], equipment: equipment.split(',') as Equipo[], aliases: aliases ? aliases.split(',') : [] }
  })
}

/** Cuerpo completo agrupa la búsqueda; el mapa necesita músculos concretos, no pintar todo por defecto. */
const PARTICIPACION_COMPLETA: Record<string, Pick<CatalogExercise, 'primaryMuscles' | 'secondaryMuscles'>> = {
  'appfit:peso-muerto': { primaryMuscles: ['gluteos', 'isquiotibiales'], secondaryMuscles: ['espalda', 'antebrazo', 'cuadriceps', 'core'] },
  'appfit:peso-muerto-sumo': { primaryMuscles: ['gluteos', 'cuadriceps'], secondaryMuscles: ['isquiotibiales', 'espalda', 'antebrazo', 'core'] },
  'appfit:swing-kettlebell': { primaryMuscles: ['gluteos', 'isquiotibiales'], secondaryMuscles: ['core', 'espalda', 'hombros'] },
  'appfit:thruster': { primaryMuscles: ['cuadriceps', 'hombros'], secondaryMuscles: ['gluteos', 'core', 'triceps'] },
  'appfit:burpee': { primaryMuscles: ['pecho', 'cuadriceps'], secondaryMuscles: ['triceps', 'hombros', 'gluteos', 'core'] },
  'appfit:farmer-walk': { primaryMuscles: ['antebrazo'], secondaryMuscles: ['hombros', 'espalda', 'core'] },
  'appfit:cargada-barra': { primaryMuscles: ['cuadriceps', 'gluteos'], secondaryMuscles: ['isquiotibiales', 'espalda', 'hombros', 'antebrazo', 'core'] },
  'appfit:turkish-get-up': { primaryMuscles: ['core', 'hombros'], secondaryMuscles: ['cuadriceps', 'gluteos', 'triceps'] },
}

export const CATALOGO_EJERCICIOS: CatalogExercise[] = [
  ...grupo('pecho', [
    'press-banca|Press banca|barra|triceps,hombros|bench press',
    'press-inclinado-barra|Press inclinado con barra|barra|triceps,hombros',
    'press-declinado-barra|Press declinado con barra|barra|triceps,hombros',
    'press-mancuernas|Press con mancuernas|mancuernas|triceps,hombros',
    'press-inclinado-mancuernas|Press inclinado con mancuernas|mancuernas|triceps,hombros',
    'aperturas-mancuernas|Aperturas con mancuernas|mancuernas|hombros',
    'pullover-mancuerna|Pullover con mancuerna|mancuernas|espalda,triceps|pull over',
    'cruce-poleas|Cruce de poleas|polea|hombros',
    'pec-deck|Aperturas en máquina|maquina||pec deck',
    'press-pecho-maquina|Press de pecho en máquina|maquina|triceps,hombros',
    'flexiones|Flexiones|corporal|triceps,hombros,core|push ups',
    'fondos-pecho|Fondos en paralelas para pecho|corporal|triceps,hombros',
    'press-banca-smith|Press banca en multipower|smith|triceps,hombros',
    'press-pecho-bandas|Press de pecho con bandas|bandas|triceps,hombros',
  ]),
  ...grupo('espalda', [
    'dominadas|Dominadas|corporal|biceps,antebrazo|pull ups',
    'dominadas-asistidas|Dominadas asistidas en máquina|maquina,corporal|biceps',
    'jalon-pecho|Jalón al pecho|polea|biceps|lat pulldown',
    'jalon-neutro|Jalón con agarre neutro|polea|biceps',
    'remo-barra|Remo con barra|barra|biceps,core|bent over row',
    'remo-mancuerna|Remo con mancuerna|mancuernas|biceps|remo unilateral',
    'remo-polea|Remo sentado en polea|polea|biceps',
    'remo-maquina|Remo en máquina|maquina|biceps',
    'remo-pecho-apoyado|Remo con pecho apoyado|mancuernas|biceps',
    'remo-t|Remo en T|barra|biceps|t bar row',
    'pullover-polea|Pullover en polea|polea|triceps',
    'remo-trx|Remo en TRX|trx|biceps,core',
    'remo-invertido|Remo invertido|corporal|biceps,core',
    'remo-bandas|Remo con bandas|bandas|biceps',
    'extension-lumbar|Extensiones lumbares|corporal|gluteos,isquiotibiales|hiperextensiones',
    'encogimientos|Encogimientos con mancuernas|mancuernas|antebrazo|shrugs',
  ]),
  ...grupo('hombros', [
    'press-militar|Press militar|barra|triceps,core|overhead press',
    'press-hombro-mancuernas|Press de hombros con mancuernas|mancuernas|triceps',
    'press-arnold|Press Arnold|mancuernas|triceps',
    'press-hombro-maquina|Press de hombros en máquina|maquina|triceps',
    'elevacion-lateral|Elevaciones laterales|mancuernas||lateral raise',
    'elevacion-lateral-polea|Elevaciones laterales en polea|polea',
    'elevacion-frontal|Elevaciones frontales|mancuernas',
    'pajaros|Pájaros con mancuernas|mancuernas|espalda|reverse fly',
    'reverse-pec-deck|Aperturas inversas en máquina|maquina|espalda',
    'face-pull|Face pull|polea|espalda',
    'press-landmine|Press landmine|barra|triceps,core',
    'separacion-bandas|Separaciones con banda|bandas|espalda|band pull apart',
  ]),
  ...grupo('biceps', [
    'curl-barra|Curl con barra|barra|antebrazo',
    'curl-mancuernas|Curl con mancuernas|mancuernas|antebrazo',
    'curl-martillo|Curl martillo|mancuernas|antebrazo',
    'curl-inclinado|Curl inclinado con mancuernas|mancuernas',
    'curl-predicador|Curl predicador con barra|barra',
    'curl-polea|Curl en polea|polea',
    'curl-concentrado|Curl concentrado|mancuernas',
    'curl-maquina|Curl en máquina|maquina',
  ]),
  ...grupo('triceps', [
    'extension-triceps-cuerda|Extensión de tríceps con cuerda|polea',
    'extension-triceps-barra|Extensión de tríceps en polea con barra|polea',
    'extension-triceps-cabeza|Extensión de tríceps sobre la cabeza|mancuernas',
    'extension-triceps-polea-cabeza|Extensión de tríceps sobre la cabeza en polea|polea',
    'press-frances|Press francés|barra|hombros|skull crusher',
    'press-cerrado|Press banca con agarre cerrado|barra|pecho,hombros',
    'patada-triceps|Patada de tríceps|mancuernas',
    'fondos-triceps|Fondos en paralelas para tríceps|corporal|pecho,hombros',
  ]),
  ...grupo('antebrazo', [
    'curl-muneca|Curl de muñeca|mancuernas',
    'extension-muneca|Extensión de muñeca|mancuernas',
    'curl-inverso|Curl inverso con barra|barra|biceps',
    'colgar-barra|Colgarse de la barra|corporal|espalda',
    'agarre-disco|Agarre de disco en pinza|otros',
  ]),
  ...grupo('cuadriceps', [
    'sentadilla|Sentadilla|barra|gluteos,core|back squat,sentadilla trasera',
    'sentadilla-frontal|Sentadilla frontal|barra|gluteos,core|front squat',
    'sentadilla-goblet|Sentadilla goblet|kettlebell|gluteos,core',
    'prensa-piernas|Prensa de piernas|maquina|gluteos',
    'hack-squat|Sentadilla hack|maquina|gluteos',
    'sentadilla-smith|Sentadilla en multipower|smith|gluteos,core',
    'extension-cuadriceps|Extensión de cuádriceps|maquina',
    'zancadas|Zancadas con mancuernas|mancuernas|gluteos,isquiotibiales',
    'sentadilla-bulgara|Sentadilla búlgara|mancuernas|gluteos,core',
    'step-up|Subida al cajón con mancuernas|mancuernas|gluteos|step up',
    'sentadilla-corporal|Sentadilla con peso corporal|corporal|gluteos',
    'sentadilla-trx|Sentadilla en TRX|trx|gluteos',
  ]),
  ...grupo('isquiotibiales', [
    'peso-muerto-rumano|Peso muerto rumano|barra|gluteos,espalda|rdl',
    'rumano-mancuernas|Peso muerto rumano con mancuernas|mancuernas|gluteos,espalda',
    'curl-femoral-tumbado|Curl femoral tumbado|maquina|gemelos',
    'curl-femoral-sentado|Curl femoral sentado|maquina|gemelos',
    'curl-nordico|Curl nórdico|corporal|gluteos',
    'buenos-dias|Buenos días|barra|gluteos,espalda|good morning',
    'rumano-unilateral|Peso muerto rumano a una pierna|mancuernas|gluteos,core',
    'curl-femoral-trx|Curl femoral en TRX|trx|gluteos,core',
  ]),
  ...grupo('gluteos', [
    'hip-thrust|Hip thrust con barra|barra|isquiotibiales,core',
    'hip-thrust-maquina|Hip thrust en máquina|maquina|isquiotibiales',
    'puente-gluteos|Puente de glúteos|corporal|isquiotibiales',
    'patada-gluteo|Patada de glúteo en polea|polea|isquiotibiales',
    'abduccion-maquina|Abducción de cadera en máquina|maquina',
    'abduccion-bandas|Abducción de cadera con banda|bandas',
    'pull-through|Pull through en polea|polea|isquiotibiales',
    'zancada-inversa|Zancada inversa con mancuernas|mancuernas|cuadriceps,core',
  ]),
  ...grupo('gemelos', [
    'gemelos-maquina|Elevación de gemelos de pie en máquina|maquina',
    'gemelos-sentado|Elevación de gemelos sentado|maquina',
    'gemelos-prensa|Elevación de gemelos en prensa|maquina',
    'gemelos-unilateral|Elevación de gemelos a una pierna|corporal',
    'gemelos-smith|Elevación de gemelos en multipower|smith',
  ]),
  ...grupo('core', [
    'plancha|Plancha|corporal|hombros,gluteos',
    'plancha-lateral|Plancha lateral|corporal|hombros,gluteos',
    'crunch|Crunch abdominal|corporal',
    'crunch-polea|Crunch en polea|polea',
    'elevacion-piernas|Elevaciones de piernas colgado|corporal|antebrazo',
    'dead-bug|Dead bug|corporal',
    'bird-dog|Bird dog|corporal|espalda,gluteos',
    'pallof-press|Pallof press|polea',
    'rueda-abdominal|Rueda abdominal|otros|hombros,espalda|ab wheel',
    'woodchop|Woodchop en polea|polea|hombros',
    'crunch-inverso|Crunch inverso|corporal',
    'encogimiento-trx|Encogimientos de rodillas en TRX|trx|hombros',
  ]),
  ...grupo('completo', [
    'peso-muerto|Peso muerto convencional|barra|gluteos,isquiotibiales,espalda,antebrazo',
    'peso-muerto-sumo|Peso muerto sumo|barra|gluteos,cuadriceps,isquiotibiales,espalda',
    'swing-kettlebell|Swing con kettlebell|kettlebell|gluteos,isquiotibiales,core',
    'thruster|Thruster con mancuernas|mancuernas|cuadriceps,hombros,core',
    'burpee|Burpees|corporal|pecho,cuadriceps,core',
    'farmer-walk|Paseo del granjero|mancuernas|antebrazo,core|farmer carry',
    'cargada-barra|Cargada con barra|barra|cuadriceps,gluteos,espalda|power clean',
    'turkish-get-up|Levantamiento turco|kettlebell|core,hombros,gluteos|turkish get up',
  ]).map(e => ({ ...e, ...PARTICIPACION_COMPLETA[e.id], filterGroups: ['completo'] as Musculo[] })),
]
export const CATALOGO_POR_ID = new Map(CATALOGO_EJERCICIOS.map(e => [e.id, e]))
