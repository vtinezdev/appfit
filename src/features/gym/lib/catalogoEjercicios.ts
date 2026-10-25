/** Catálogo editorial local: ids estables, independiente de los ejercicios guardados por el usuario. */
import { type Musculo } from './musculos'
export { MUSCULOS, type Musculo } from './musculos'
export const EQUIPAMIENTO = {
  corporal: 'Peso corporal', mancuernas: 'Mancuernas', barra: 'Barra', maquina: 'Máquina', polea: 'Polea',
  smith: 'Smith / Multipower', kettlebell: 'Kettlebell', bandas: 'Bandas', trx: 'TRX', anillas: 'Anillas', otros: 'Otros',
} as const
export type Equipo = keyof typeof EQUIPAMIENTO
/**
 * Patrón de movimiento: con qué se rellena cada hueco de una rutina del creador (`creadorRutinas.ts`). Primero los
 * compuestos; después, los aislamientos por grupo.
 */
export const PATRONES = {
  'empuje-horizontal': 'Empuje horizontal', 'empuje-vertical': 'Empuje vertical', 'tiron-horizontal': 'Tirón horizontal',
  'tiron-vertical': 'Tirón vertical', sentadilla: 'Sentadilla', bisagra: 'Bisagra de cadera', unilateral: 'Zancada / unilateral',
  'pecho-aislamiento': 'Aperturas de pecho', 'hombro-lateral': 'Elevaciones laterales', 'hombro-frontal': 'Elevaciones frontales',
  'hombro-posterior': 'Deltoides posterior', biceps: 'Bíceps', triceps: 'Tríceps', 'cuadriceps-aislamiento': 'Cuádriceps aislado',
  femoral: 'Femoral', gluteo: 'Glúteo', aductores: 'Aductores', gemelos: 'Gemelos', core: 'Core', antebrazo: 'Antebrazo',
  trapecio: 'Trapecio', completo: 'Cuerpo completo',
} as const
export type Patron = keyof typeof PATRONES
/** `compuesto`: varias articulaciones, va primero en la sesión y con menos repeticiones; `aislamiento`, el resto. */
export type TipoEjercicio = 'compuesto' | 'aislamiento'

export interface CatalogExercise {
  id: string
  name: string
  primaryMuscles: Musculo[]
  secondaryMuscles: Musculo[]
  equipment: Equipo[]
  aliases?: string[]
  /** Palabras de búsqueda sin equivalencia de identidad histórica. */
  searchTerms?: string[]
  /** Agrupación de búsqueda, separada de la participación anatómica. */
  filterGroups?: Musculo[]
  tipo: TipoEjercicio
  patron: Patron
}

/** Los ids son editoriales, no se recalculan al cambiar una etiqueta. Banco es auxiliar, no equipo principal. */
type SinClasificar = Omit<CatalogExercise, 'tipo' | 'patron'>
function grupo(primary: Musculo, rows: string[]): SinClasificar[] {
  return rows.map(row => {
    const [id, name, equipment, secondary = '', aliases = ''] = row.split('|')
    return { id: `appfit:${id}`, name, primaryMuscles: [primary], secondaryMuscles: secondary ? secondary.split(',') as Musculo[] : [], equipment: equipment.split(',') as Equipo[], aliases: aliases ? aliases.split(',') : [] }
  })
}

/** Cuerpo completo agrupa la búsqueda; el mapa necesita músculos concretos, no pintar todo por defecto. */
const PARTICIPACION_COMPLETA: Record<string, Pick<CatalogExercise, 'primaryMuscles' | 'secondaryMuscles'>> = {
  'appfit:peso-muerto': { primaryMuscles: ['gluteos', 'isquiotibiales'], secondaryMuscles: ['espalda', 'antebrazo', 'cuadriceps', 'core'] },
  'appfit:peso-muerto-sumo': { primaryMuscles: ['gluteos', 'cuadriceps'], secondaryMuscles: ['aductores', 'isquiotibiales', 'espalda', 'antebrazo', 'core'] },
  'appfit:swing-kettlebell': { primaryMuscles: ['gluteos', 'isquiotibiales'], secondaryMuscles: ['core', 'espalda', 'hombros'] },
  'appfit:thruster': { primaryMuscles: ['cuadriceps', 'hombros'], secondaryMuscles: ['gluteos', 'core', 'triceps'] },
  'appfit:burpee': { primaryMuscles: ['pecho', 'cuadriceps'], secondaryMuscles: ['triceps', 'hombros', 'gluteos', 'core'] },
  'appfit:farmer-walk': { primaryMuscles: ['antebrazo'], secondaryMuscles: ['hombros', 'espalda', 'core'] },
  'appfit:cargada-barra': { primaryMuscles: ['cuadriceps', 'gluteos'], secondaryMuscles: ['isquiotibiales', 'espalda', 'hombros', 'antebrazo', 'core'] },
  'appfit:peso-muerto-trap-bar': { primaryMuscles: ['cuadriceps', 'gluteos'], secondaryMuscles: ['isquiotibiales', 'espalda', 'antebrazo', 'core'] },
  'appfit:empuje-trineo': { primaryMuscles: ['cuadriceps', 'gluteos'], secondaryMuscles: ['gemelos', 'isquiotibiales', 'hombros', 'triceps', 'core'] },
  'appfit:turkish-get-up': { primaryMuscles: ['core', 'hombros'], secondaryMuscles: ['cuadriceps', 'gluteos', 'triceps'] },
}

const SIN_CLASIFICAR: SinClasificar[] = [
  ...grupo('pecho', [
    'press-banca|Press banca|barra|triceps,hombros|bench press',
    'press-inclinado-barra|Press inclinado con barra|barra|triceps,hombros',
    'press-declinado-barra|Press declinado con barra|barra|triceps,hombros',
    'press-mancuernas|Press con mancuernas|mancuernas|triceps,hombros',
    'press-inclinado-mancuernas|Press inclinado con mancuernas|mancuernas|triceps,hombros',
    'aperturas-mancuernas|Aperturas con mancuernas|mancuernas|hombros',
    'pullover-mancuerna|Pullover con mancuerna|mancuernas|espalda,triceps|pull over',
    'cruce-poleas|Cruce de poleas|polea|hombros',
    'pec-deck|Aperturas en máquina|maquina|hombros|pec deck',
    'press-pecho-maquina|Press de pecho en máquina|maquina|triceps,hombros',
    'flexiones|Flexiones|corporal|triceps,hombros,core|push ups',
    'fondos-pecho|Fondos en paralelas para pecho|corporal|triceps,hombros,core',
    'press-banca-smith|Press banca en multipower|smith|triceps,hombros',
    'press-pecho-bandas|Press de pecho con bandas|bandas|triceps,hombros',
    'press-inclinado-maquina|Press inclinado en máquina|maquina|triceps,hombros|incline chest press',
    'press-inclinado-smith|Press inclinado en multipower|smith|triceps,hombros',
    'aperturas-inclinadas|Aperturas inclinadas con mancuernas|mancuernas|hombros|incline fly',
    'cruce-poleas-bajo|Cruce de poleas de abajo arriba|polea|hombros|low cable fly',
    'flexiones-declinadas|Flexiones declinadas|corporal|triceps,hombros,core|decline push ups',
    'press-declinado-mancuernas|Press declinado con mancuernas|mancuernas|triceps,hombros',
    'aperturas-polea-banco|Aperturas en polea en banco|polea|hombros|lying cable fly',
    'press-squeeze|Press con mancuernas juntas|mancuernas|triceps,hombros|squeeze press',
    'press-pecho-unilateral-polea|Press de pecho unilateral en polea|polea|triceps,hombros,core|single arm cable chest press',
    'flexiones-inclinadas|Flexiones inclinadas|corporal|triceps,hombros,core|incline push ups',
    'flexiones-arqueras|Flexiones arqueras|corporal|triceps,hombros,core|archer push ups',
    'flexiones-anillas|Flexiones en anillas|anillas,corporal|triceps,hombros,core|ring push ups',
    'press-suelo-mancuernas|Press de suelo con mancuernas|mancuernas|triceps,hombros|dumbbell floor press',
    'press-unilateral-mancuerna|Press de pecho unilateral con mancuerna|mancuernas|triceps,hombros,core|single arm dumbbell bench press',
    'flexiones-rodillas|Flexiones con rodillas apoyadas|corporal|triceps,hombros,core|knee push ups',
    'flexiones-pseudo-plancha|Flexiones pseudo plancha|corporal|triceps,hombros,core|pseudo planche push ups',
    'flexiones-escapulares|Flexiones escapulares|corporal|hombros,core|scapular push ups,push up plus',
  ]),
  ...grupo('espalda', [
    'dominadas|Dominadas|corporal|biceps,antebrazo,hombros,core|pull ups',
    'dominadas-asistidas|Dominadas asistidas en máquina|maquina,corporal|biceps,antebrazo,hombros',
    'jalon-pecho|Jalón al pecho|polea|biceps,antebrazo,hombros|lat pulldown',
    'jalon-neutro|Jalón con agarre neutro|polea|biceps,antebrazo,hombros',
    'remo-barra|Remo con barra|barra|biceps,hombros,antebrazo,core|bent over row',
    'remo-mancuerna|Remo con mancuerna|mancuernas|biceps,hombros,antebrazo,core|remo unilateral',
    'remo-polea|Remo sentado en polea|polea|biceps,hombros,antebrazo',
    'remo-maquina|Remo en máquina|maquina|biceps,hombros,antebrazo',
    'remo-pecho-apoyado|Remo con pecho apoyado|mancuernas|biceps,hombros,antebrazo',
    'remo-t|Remo en T|barra|biceps,hombros,antebrazo,core|t bar row',
    'pullover-polea|Pullover en polea|polea|pecho,triceps,core',
    'remo-trx|Remo en TRX|trx|biceps,hombros,antebrazo,core',
    'remo-invertido|Remo invertido|corporal|biceps,hombros,antebrazo,core',
    'remo-bandas|Remo con bandas|bandas|biceps,hombros,antebrazo',
    'extension-lumbar|Extensiones lumbares|corporal|gluteos,isquiotibiales|hiperextensiones',
    'encogimientos|Encogimientos con mancuernas|mancuernas|antebrazo|shrugs',
    'dominadas-supinas|Dominadas supinas|corporal|biceps,antebrazo,hombros,core|chin ups',
    'jalon-supino|Jalón con agarre supino|polea|biceps,antebrazo,hombros|reverse grip pulldown',
    'jalon-unilateral|Jalón unilateral en polea|polea|biceps,antebrazo,hombros,core|single arm pulldown',
    'remo-polea-unilateral|Remo unilateral en polea|polea|biceps,hombros,antebrazo,core|single arm cable row',
    'remo-pendlay|Remo Pendlay|barra|biceps,hombros,antebrazo,core|pendlay row',
    'encogimientos-barra|Encogimientos con barra|barra|antebrazo|barbell shrug',
    'remo-seal|Remo Seal|barra|biceps,hombros,antebrazo|seal row',
    'remo-meadows|Remo Meadows|barra|biceps,hombros,antebrazo,core|meadows row',
    'rack-pull|Rack pull|barra|gluteos,isquiotibiales,antebrazo,core|peso muerto parcial',
    'jalon-maquina|Jalón en máquina|maquina|biceps,antebrazo,hombros|machine pulldown',
    'pullover-maquina|Pullover en máquina|maquina|pecho,triceps|machine pullover',
    'remo-alto-maquina|Remo alto en máquina|maquina|hombros,biceps,antebrazo|high row machine',
    'remo-kettlebell|Remo con kettlebell|kettlebell|biceps,hombros,antebrazo,core|kettlebell row',
    'dominadas-neutras|Dominadas con agarre neutro|corporal|biceps,antebrazo,hombros,core|neutral grip pull ups',
    'dominadas-banda|Dominadas asistidas con banda|corporal,bandas|biceps,antebrazo,hombros,core|band assisted pull ups',
    'dominadas-escapulares|Dominadas escapulares|corporal|antebrazo,core|scapular pull ups',
    'remo-anillas|Remo en anillas|anillas,corporal|biceps,hombros,antebrazo,core|ring rows',
    'pilates-swimming|Swimming de pilates|corporal|gluteos,isquiotibiales,hombros,core|natacion de pilates',
    'pilates-swan|Swan de pilates|corporal|gluteos,triceps,hombros|cisne de pilates',
    'remo-gorila|Remo gorila con kettlebells|kettlebell|biceps,hombros,antebrazo,core|gorilla row',
    'remo-renegado|Remo renegado con mancuernas|mancuernas|biceps,hombros,antebrazo,core,triceps|renegade row',
    'dominadas-arqueras|Dominadas arqueras|corporal|biceps,hombros,antebrazo,core|archer pull ups',
    'pilates-double-leg-kick|Double leg kick de pilates|corporal|gluteos,isquiotibiales,hombros|patada doble de pilates',
  ]),
  ...grupo('hombros', [
    'press-militar|Press militar|barra|triceps,pecho,core|overhead press',
    'press-hombro-mancuernas|Press de hombros con mancuernas|mancuernas|triceps,pecho',
    'press-arnold|Press Arnold|mancuernas|triceps,pecho',
    'press-hombro-maquina|Press de hombros en máquina|maquina|triceps,pecho',
    'elevacion-lateral|Elevaciones laterales|mancuernas|espalda|lateral raise',
    'elevacion-lateral-polea|Elevaciones laterales en polea|polea|espalda',
    'elevacion-frontal|Elevaciones frontales|mancuernas|pecho',
    'pajaros|Pájaros con mancuernas|mancuernas|espalda|reverse fly',
    'reverse-pec-deck|Aperturas inversas en máquina|maquina|espalda',
    'face-pull|Face pull|polea|espalda,biceps',
    'press-landmine|Press landmine|barra|triceps,pecho,core',
    'separacion-bandas|Separaciones con banda|bandas|espalda|band pull apart',
    'press-hombro-smith|Press de hombros en multipower|smith|triceps,pecho',
    'elevacion-lateral-maquina|Elevaciones laterales en máquina|maquina|espalda',
    'remo-menton|Remo al mentón|barra|espalda,biceps,antebrazo|upright row',
    'pajaros-polea|Pájaros en polea|polea|espalda|reverse cable fly',
    'elevacion-frontal-polea|Elevaciones frontales en polea|polea|pecho',
    'press-militar-sentado|Press militar sentado|barra|triceps,pecho|seated overhead press',
    'elevacion-y|Elevaciones en Y|mancuernas|espalda|y raise',
    'press-kettlebell|Press de hombro con kettlebell|kettlebell|triceps,pecho,core|kettlebell press',
    'elevacion-lateral-bandas|Elevaciones laterales con banda|bandas|espalda',
    'flexiones-pike|Flexiones pike|corporal|triceps,pecho,core|pike push ups',
    'press-z|Press Z con barra|barra|triceps,pecho,core|z press',
    'elevacion-lateral-inclinada|Elevación lateral inclinada con mancuerna|mancuernas|espalda|lean away lateral raise',
    'flexiones-hindu|Flexiones hindúes|corporal|pecho,triceps,core|hindu push ups,dand',
  ]),
  ...grupo('biceps', [
    'curl-barra|Curl con barra|barra|antebrazo',
    'curl-mancuernas|Curl con mancuernas|mancuernas|antebrazo',
    'curl-martillo|Curl martillo|mancuernas|antebrazo',
    'curl-inclinado|Curl inclinado con mancuernas|mancuernas|antebrazo',
    'curl-predicador|Curl predicador con barra|barra|antebrazo',
    'curl-polea|Curl en polea|polea|antebrazo',
    'curl-concentrado|Curl concentrado|mancuernas|antebrazo',
    'curl-maquina|Curl en máquina|maquina|antebrazo',
    'curl-bayesiano|Curl bayesiano en polea|polea|antebrazo|bayesian curl',
    'curl-arana|Curl araña|mancuernas|antebrazo|spider curl',
    'curl-martillo-cuerda|Curl martillo en polea con cuerda|polea|antebrazo|rope hammer curl',
    'curl-barra-z|Curl con barra Z|barra|antebrazo|ez bar curl',
    'curl-predicador-mancuerna|Curl predicador con mancuerna|mancuernas|antebrazo',
    'curl-zottman|Curl Zottman|mancuernas|antebrazo|zottman curl',
    'curl-polea-alta|Curl en polea alta|polea|antebrazo|high cable curl',
    'curl-trx|Curl de bíceps en TRX|trx|antebrazo,core',
    'curl-biceps-anillas|Curl de bíceps en anillas|anillas,corporal|antebrazo,core|ring biceps curl',
  ]),
  ...grupo('triceps', [
    'extension-triceps-cuerda|Extensión de tríceps con cuerda|polea',
    'extension-triceps-barra|Extensión de tríceps en polea con barra|polea',
    'extension-triceps-cabeza|Extensión de tríceps sobre la cabeza|mancuernas',
    'extension-triceps-polea-cabeza|Extensión de tríceps sobre la cabeza en polea|polea',
    'press-frances|Press francés|barra||skull crusher',
    'press-cerrado|Press banca con agarre cerrado|barra|pecho,hombros',
    'patada-triceps|Patada de tríceps|mancuernas',
    'fondos-triceps|Fondos en paralelas para tríceps|corporal|pecho,hombros,core',
    'extension-triceps-unilateral|Extensión de tríceps unilateral en polea|polea',
    'press-frances-mancuernas|Press francés con mancuernas|mancuernas',
    'fondos-maquina|Fondos en máquina|maquina|pecho,hombros|dip machine',
    'fondos-banco|Fondos en banco|corporal|pecho,hombros|bench dips',
    'flexiones-diamante|Flexiones diamante|corporal|pecho,hombros,core|diamond push ups',
    'patada-triceps-polea|Patada de tríceps en polea|polea||cable kickback',
    'extension-triceps-maquina|Extensión de tríceps en máquina|maquina',
    'extension-triceps-bandas|Extensión de tríceps con banda|bandas',
    'fondos-anillas|Fondos en anillas|anillas,corporal|pecho,hombros,core|ring dips',
    'fondos-barra-recta|Fondos en barra recta|corporal|pecho,hombros,core|straight bar dips',
    'extension-triceps-anillas|Extensión de tríceps en anillas|anillas,corporal|hombros,core|ring triceps extension',
  ]),
  ...grupo('antebrazo', [
    'curl-muneca|Curl de muñeca|mancuernas',
    'extension-muneca|Extensión de muñeca|mancuernas',
    'curl-inverso|Curl inverso con barra|barra|biceps',
    'colgar-barra|Colgarse de la barra|corporal|espalda',
    'agarre-disco|Agarre de disco en pinza|otros',
    'rodillo-muneca|Rodillo de muñeca|otros|hombros|wrist roller',
    'curl-muneca-espalda|Curl de muñeca por detrás con barra|barra||behind the back wrist curl',
  ]),
  ...grupo('cuadriceps', [
    'sentadilla|Sentadilla|barra|gluteos,aductores,espalda,core|back squat,sentadilla trasera',
    'sentadilla-frontal|Sentadilla frontal|barra|gluteos,aductores,espalda,core|front squat',
    'sentadilla-goblet|Sentadilla goblet|kettlebell|gluteos,aductores,core',
    'prensa-piernas|Prensa de piernas|maquina|gluteos,aductores',
    'hack-squat|Sentadilla hack|maquina|gluteos,aductores',
    'sentadilla-smith|Sentadilla en multipower|smith|gluteos,aductores,core',
    'extension-cuadriceps|Extensión de cuádriceps|maquina',
    'zancadas|Zancadas con mancuernas|mancuernas|gluteos,aductores,isquiotibiales,core',
    'sentadilla-bulgara|Sentadilla búlgara|mancuernas|gluteos,aductores,isquiotibiales,core',
    'step-up|Subida al cajón con mancuernas|mancuernas|gluteos,aductores,isquiotibiales,gemelos,core|step up',
    'sentadilla-corporal|Sentadilla con peso corporal|corporal|gluteos,aductores,core',
    'sentadilla-trx|Sentadilla en TRX|trx|gluteos,aductores,core',
    'sentadilla-pendulo|Sentadilla péndulo|maquina|gluteos,aductores|pendulum squat',
    'prensa-horizontal|Prensa horizontal|maquina|gluteos,aductores|seated leg press',
    'zancadas-barra|Zancadas con barra|barra|gluteos,aductores,isquiotibiales,core',
    'sissy-squat|Sentadilla sissy|corporal|core|sissy squat',
    'belt-squat|Sentadilla con cinturón|maquina|gluteos,aductores|belt squat',
    'zancadas-caminando|Zancadas caminando|mancuernas|gluteos,aductores,isquiotibiales,core|walking lunges',
    'sentadilla-pistol|Sentadilla a una pierna|corporal|gluteos,aductores,core|pistol squat',
    'sentadilla-pared|Sentadilla isométrica en pared|corporal|gluteos|wall sit',
    'sentadilla-zercher|Sentadilla Zercher|barra|gluteos,aductores,espalda,core,biceps|zercher squat',
    'sentadilla-shrimp|Sentadilla shrimp|corporal|gluteos,aductores,core|shrimp squat',
    'sentadilla-cajon|Sentadilla al cajón con barra|barra|gluteos,aductores,espalda,core|box squat',
    'arrastre-trineo-atras|Arrastre de trineo hacia atrás|otros|gluteos,gemelos,core|backward sled drag,reverse sled drag',
    'sentadilla-salto|Sentadilla con salto|corporal|gluteos,gemelos,core|jump squat',
    'zancadas-salto|Zancadas con salto|corporal|gluteos,aductores,isquiotibiales,gemelos,core|jumping lunges,split squat jumps',
  ]),
  ...grupo('isquiotibiales', [
    'peso-muerto-rumano|Peso muerto rumano|barra|gluteos,espalda,aductores,antebrazo,core|rdl',
    'rumano-mancuernas|Peso muerto rumano con mancuernas|mancuernas|gluteos,espalda,aductores,antebrazo,core',
    'curl-femoral-tumbado|Curl femoral tumbado|maquina|gemelos',
    'curl-femoral-sentado|Curl femoral sentado|maquina|gemelos',
    'curl-nordico|Curl nórdico|corporal|gluteos,gemelos,core',
    'buenos-dias|Buenos días|barra|gluteos,espalda,aductores,core|good morning',
    'rumano-unilateral|Peso muerto rumano a una pierna|mancuernas|gluteos,espalda,aductores,antebrazo,core',
    'curl-femoral-trx|Curl femoral en TRX|trx|gluteos,core',
    'curl-femoral-pie|Curl femoral de pie en máquina|maquina|gemelos|standing leg curl',
    'rumano-smith|Peso muerto rumano en multipower|smith|gluteos,espalda,aductores,antebrazo,core',
    'glute-ham-raise|Glute ham raise|maquina|gluteos,gemelos|ghr',
    'curl-femoral-fitball|Curl femoral con fitball|otros|gluteos,core',
    'peso-muerto-rigidas|Peso muerto con piernas rígidas|barra|gluteos,espalda,aductores,antebrazo,core|stiff leg deadlift',
    'curl-femoral-deslizadores|Curl femoral con deslizadores|otros|gluteos,gemelos,core|sliding leg curl,hamstring sliders',
    'puente-isquios-caminando|Puente con caminata de talones|corporal|gluteos,gemelos,core|hamstring walkouts',
    'pilates-single-leg-kick|Single leg kick de pilates|corporal|espalda,gluteos,core,hombros|patada simple de pilates',
  ]),
  ...grupo('gluteos', [
    'hip-thrust|Hip thrust con barra|barra|isquiotibiales,cuadriceps,core',
    'hip-thrust-maquina|Hip thrust en máquina|maquina|isquiotibiales,cuadriceps',
    'puente-gluteos|Puente de glúteos|corporal|isquiotibiales,core',
    'patada-gluteo|Patada de glúteo en polea|polea|isquiotibiales',
    'abduccion-maquina|Abducción de cadera en máquina|maquina',
    'abduccion-bandas|Abducción de cadera con banda|bandas',
    'pull-through|Pull through en polea|polea|isquiotibiales,espalda,core',
    'zancada-inversa|Zancada inversa con mancuernas|mancuernas|cuadriceps,aductores,isquiotibiales,core',
    'hip-thrust-smith|Hip thrust en multipower|smith|isquiotibiales,cuadriceps,core',
    'patada-gluteo-maquina|Patada de glúteo en máquina|maquina|isquiotibiales|glute kickback',
    'abduccion-polea|Abducción de cadera en polea|polea',
    'sentadilla-sumo|Sentadilla sumo con mancuerna|mancuernas|aductores,cuadriceps,core|sumo squat',
    'puente-unilateral|Puente de glúteos a una pierna|corporal|isquiotibiales,core|single leg glute bridge',
    'hiperextension-gluteo|Hiperextensión para glúteo|corporal|isquiotibiales,espalda',
    'almejas|Almejas con banda|bandas||clamshell',
    'patada-cuadrupedia|Patada de glúteo en cuadrupedia|corporal|isquiotibiales,core|donkey kick',
    'hip-thrust-unilateral|Hip thrust a una pierna|corporal|isquiotibiales,core|single leg hip thrust',
    'reverse-hyper|Hiperextensión inversa en máquina|maquina|isquiotibiales,espalda|reverse hyperextension',
    'pilates-side-kick|Side kick de pilates|corporal|core|patada lateral de pilates',
    'peso-muerto-kettlebell|Peso muerto con kettlebell|kettlebell|isquiotibiales,cuadriceps,aductores,espalda,antebrazo,core|kettlebell deadlift',
    'hip-thrust-mancuerna|Hip thrust con mancuerna|mancuernas|isquiotibiales,cuadriceps,core|dumbbell hip thrust',
    'pilates-side-kick-arrodillado|Side kick arrodillado de pilates|corporal|core,hombros|kneeling side kick',
  ]),
  ...grupo('aductores', [
    'aduccion-maquina|Aducción de cadera en máquina|maquina||hip adduction',
    'aduccion-polea|Aducción de cadera en polea|polea|core',
    'aduccion-bandas|Aducción de cadera con banda|bandas',
    'aduccion-tumbado|Aducción tumbado de lado|corporal|core|side lying adduction',
    'plancha-copenhague|Plancha Copenhague|corporal|core,hombros|copenhagen plank',
    'sentadilla-cosaca|Sentadilla cosaca|corporal|cuadriceps,gluteos,core|cossack squat',
    'zancada-lateral|Zancada lateral con mancuernas|mancuernas|cuadriceps,gluteos,isquiotibiales,core|side lunge',
    'aduccion-balon|Aducción isométrica con balón|otros||adductor squeeze',
  ]),
  ...grupo('gemelos', [
    'gemelos-maquina|Elevación de gemelos de pie en máquina|maquina',
    'gemelos-sentado|Elevación de gemelos sentado|maquina',
    'gemelos-prensa|Elevación de gemelos en prensa|maquina',
    'gemelos-unilateral|Elevación de gemelos a una pierna|corporal',
    'gemelos-smith|Elevación de gemelos en multipower|smith',
    'gemelos-mancuernas|Elevación de gemelos con mancuernas|mancuernas',
    'gemelos-burro|Elevación de gemelos tipo burro|maquina||donkey calf raise',
    'gemelos-sentado-mancuerna|Elevación de gemelos sentado con mancuernas|mancuernas||seated dumbbell calf raise',
  ]),
  ...grupo('core', [
    'plancha|Plancha|corporal|hombros,gluteos',
    'plancha-lateral|Plancha lateral|corporal|hombros,gluteos',
    'crunch|Crunch abdominal|corporal',
    'crunch-polea|Crunch en polea|polea',
    'elevacion-piernas|Elevaciones de piernas colgado|corporal|antebrazo,espalda',
    'dead-bug|Dead bug|corporal',
    'bird-dog|Bird dog|corporal|espalda,gluteos',
    'pallof-press|Pallof press|polea|hombros',
    'rueda-abdominal|Rueda abdominal|otros|hombros,espalda,triceps|ab wheel',
    'woodchop|Woodchop en polea|polea|hombros,gluteos',
    'crunch-inverso|Crunch inverso|corporal',
    'encogimiento-trx|Encogimientos de rodillas en TRX|trx|hombros,triceps',
    'crunch-maquina|Crunch en máquina|maquina',
    'elevacion-rodillas-paralelas|Elevaciones de rodillas en silla romana|corporal|hombros,triceps|captain chair,elevaciones de rodillas en paralelas',
    'giros-rusos|Giros rusos|corporal||russian twist',
    'inclinacion-lateral|Inclinaciones laterales con mancuerna|mancuernas|espalda,antebrazo|side bend',
    'elevacion-piernas-tumbado|Elevaciones de piernas tumbado|corporal||lying leg raise',
    'hollow-hold|Hollow hold|corporal||posicion hueca',
    'escaladores|Escaladores|corporal|hombros,cuadriceps|mountain climbers',
    'navaja|Abdominales en V|corporal||v ups,navaja',
    'crunch-bicicleta|Crunch bicicleta|corporal||bicycle crunch',
    'crunch-declinado|Crunch en banco declinado|corporal||decline crunch',
    'paseo-maleta|Paseo de maleta|kettlebell|antebrazo,espalda,hombros,gluteos|suitcase carry',
    'dragon-flag|Dragon flag|corporal|espalda,gluteos|bandera dragon',
    'l-sit|L-sit en paralelas|corporal|triceps,hombros,cuadriceps|l sit hold',
    'pilates-hundred|Hundred de pilates|corporal||the hundred,cien de pilates',
    'pilates-roll-up|Roll up de pilates|corporal||pilates rollup',
    'pilates-single-leg-stretch|Single leg stretch de pilates|corporal||estiramiento de una pierna de pilates',
    'pilates-double-leg-stretch|Double leg stretch de pilates|corporal||estiramiento de dos piernas de pilates',
    'pilates-tijeras|Tijeras de pilates|corporal||single straight leg stretch,scissors pilates',
    'pilates-leg-circles|Círculos de pierna de pilates|corporal|aductores|single leg circles',
    'pilates-teaser|Teaser de pilates|corporal|cuadriceps|pilates v sit',
    'pilates-leg-pull-front|Leg pull front de pilates|corporal|gluteos,hombros,triceps|plancha con elevacion de pierna de pilates',
    'pilates-side-bend|Side bend de pilates|corporal|hombros,gluteos|flexion lateral de pilates',
    'plancha-inversa|Plancha inversa|corporal|gluteos,isquiotibiales,hombros,espalda|reverse plank',
    'pilates-rolling-like-ball|Rolling like a ball de pilates|corporal||rodar como una pelota de pilates',
    'pilates-roll-over|Roll over de pilates|corporal||pilates rollover',
    'pilates-hip-twist|Hip twist de pilates|corporal|hombros,cuadriceps|circulos de cadera de pilates',
    'pilates-leg-pull-back|Leg pull back de pilates|corporal|gluteos,isquiotibiales,hombros,triceps|leg pull up de pilates',
    'pilates-seal|Seal de pilates|corporal|aductores|foca de pilates',
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
    'peso-muerto-trap-bar|Peso muerto con barra hexagonal|barra|cuadriceps,gluteos,isquiotibiales,espalda|trap bar deadlift',
    'empuje-trineo|Empuje de trineo|otros|cuadriceps,gluteos,gemelos|sled push',
  ]).map(e => ({ ...e, ...PARTICIPACION_COMPLETA[e.id], filterGroups: ['completo'] as Musculo[] })),
]

/**
 * Patrón de cada ejercicio (slug sin `appfit:`). Dentro de cada patrón, de más a menos básico: el creador de rutinas
 * prefiere los primeros que encajan con el material.
 */
const POR_PATRON: Record<Patron, string[]> = {
  'empuje-horizontal': ['press-banca', 'press-mancuernas', 'press-inclinado-mancuernas', 'press-inclinado-barra', 'press-pecho-maquina', 'press-inclinado-maquina',
    'flexiones', 'fondos-pecho', 'press-banca-smith', 'press-inclinado-smith', 'press-declinado-barra', 'press-declinado-mancuernas', 'press-squeeze',
    'flexiones-declinadas', 'press-pecho-bandas', 'press-pecho-unilateral-polea', 'flexiones-inclinadas', 'flexiones-arqueras', 'flexiones-anillas', 'press-suelo-mancuernas', 'press-unilateral-mancuerna', 'flexiones-rodillas', 'flexiones-pseudo-plancha', 'flexiones-escapulares'],
  'empuje-vertical': ['press-militar', 'press-hombro-mancuernas', 'press-hombro-maquina', 'press-militar-sentado', 'press-arnold', 'press-hombro-smith',
    'press-landmine', 'press-kettlebell', 'flexiones-pike', 'press-z', 'flexiones-hindu'],
  'tiron-horizontal': ['remo-barra', 'remo-polea', 'remo-mancuerna', 'remo-pecho-apoyado', 'remo-maquina', 'remo-t', 'remo-polea-unilateral', 'remo-pendlay',
    'remo-seal', 'remo-meadows', 'remo-invertido', 'remo-trx', 'remo-bandas', 'remo-alto-maquina', 'remo-kettlebell', 'remo-anillas', 'remo-gorila', 'remo-renegado'],
  'tiron-vertical': ['dominadas', 'jalon-pecho', 'jalon-neutro', 'dominadas-asistidas', 'jalon-maquina', 'dominadas-supinas', 'jalon-supino', 'jalon-unilateral',
    'pullover-polea', 'pullover-maquina', 'dominadas-neutras', 'dominadas-banda', 'dominadas-escapulares', 'dominadas-arqueras'],
  sentadilla: ['sentadilla', 'prensa-piernas', 'hack-squat', 'sentadilla-frontal', 'sentadilla-goblet', 'sentadilla-smith', 'sentadilla-pendulo', 'belt-squat',
    'prensa-horizontal', 'sentadilla-sumo', 'sentadilla-corporal', 'sentadilla-trx', 'sentadilla-zercher', 'sentadilla-cajon', 'arrastre-trineo-atras', 'sentadilla-salto'],
  bisagra: ['peso-muerto-rumano', 'peso-muerto', 'rumano-mancuernas', 'peso-muerto-trap-bar', 'peso-muerto-sumo', 'rumano-smith', 'peso-muerto-rigidas',
    'buenos-dias', 'rumano-unilateral', 'rack-pull', 'swing-kettlebell', 'extension-lumbar', 'reverse-hyper', 'pilates-swimming', 'pilates-swan', 'peso-muerto-kettlebell', 'pilates-double-leg-kick'],
  unilateral: ['sentadilla-bulgara', 'zancadas', 'zancada-inversa', 'step-up', 'zancadas-caminando', 'zancadas-barra', 'zancada-lateral', 'sentadilla-cosaca',
    'sentadilla-pistol', 'sentadilla-shrimp', 'zancadas-salto'],
  'pecho-aislamiento': ['aperturas-mancuernas', 'cruce-poleas', 'pec-deck', 'aperturas-inclinadas', 'cruce-poleas-bajo', 'aperturas-polea-banco', 'pullover-mancuerna'],
  'hombro-lateral': ['elevacion-lateral', 'elevacion-lateral-polea', 'elevacion-lateral-maquina', 'remo-menton', 'elevacion-lateral-bandas', 'elevacion-lateral-inclinada'],
  'hombro-frontal': ['elevacion-frontal', 'elevacion-frontal-polea'],
  'hombro-posterior': ['face-pull', 'pajaros', 'reverse-pec-deck', 'pajaros-polea', 'elevacion-y', 'separacion-bandas'],
  biceps: ['curl-barra', 'curl-mancuernas', 'curl-martillo', 'curl-inclinado', 'curl-polea', 'curl-barra-z', 'curl-predicador', 'curl-bayesiano', 'curl-maquina',
    'curl-concentrado', 'curl-predicador-mancuerna', 'curl-martillo-cuerda', 'curl-arana', 'curl-zottman', 'curl-polea-alta', 'curl-trx', 'curl-biceps-anillas'],
  triceps: ['extension-triceps-cuerda', 'press-frances', 'extension-triceps-cabeza', 'extension-triceps-polea-cabeza', 'fondos-triceps', 'press-cerrado',
    'extension-triceps-barra', 'press-frances-mancuernas', 'extension-triceps-unilateral', 'fondos-maquina', 'extension-triceps-maquina', 'patada-triceps',
    'patada-triceps-polea', 'flexiones-diamante', 'fondos-banco', 'extension-triceps-bandas', 'fondos-anillas', 'fondos-barra-recta', 'extension-triceps-anillas'],
  'cuadriceps-aislamiento': ['extension-cuadriceps', 'sissy-squat', 'sentadilla-pared'],
  femoral: ['curl-femoral-tumbado', 'curl-femoral-sentado', 'curl-femoral-pie', 'curl-nordico', 'glute-ham-raise', 'curl-femoral-trx', 'curl-femoral-fitball', 'curl-femoral-deslizadores', 'puente-isquios-caminando', 'pilates-single-leg-kick'],
  gluteo: ['hip-thrust', 'hip-thrust-maquina', 'hip-thrust-smith', 'puente-gluteos', 'patada-gluteo', 'patada-gluteo-maquina', 'pull-through', 'abduccion-maquina',
    'abduccion-polea', 'puente-unilateral', 'hiperextension-gluteo', 'abduccion-bandas', 'almejas', 'patada-cuadrupedia', 'hip-thrust-unilateral', 'pilates-side-kick', 'hip-thrust-mancuerna', 'pilates-side-kick-arrodillado'],
  aductores: ['aduccion-maquina', 'aduccion-polea', 'plancha-copenhague', 'aduccion-tumbado', 'aduccion-bandas', 'aduccion-balon'],
  gemelos: ['gemelos-maquina', 'gemelos-sentado', 'gemelos-prensa', 'gemelos-mancuernas', 'gemelos-smith', 'gemelos-burro', 'gemelos-unilateral', 'gemelos-sentado-mancuerna'],
  core: ['plancha', 'crunch-polea', 'elevacion-piernas', 'rueda-abdominal', 'pallof-press', 'dead-bug', 'plancha-lateral', 'crunch', 'crunch-maquina',
    'elevacion-rodillas-paralelas', 'woodchop', 'crunch-inverso', 'hollow-hold', 'elevacion-piernas-tumbado', 'bird-dog', 'encogimiento-trx', 'giros-rusos',
    'inclinacion-lateral', 'escaladores', 'navaja', 'crunch-bicicleta', 'crunch-declinado', 'dragon-flag', 'l-sit', 'pilates-hundred', 'pilates-roll-up', 'pilates-single-leg-stretch', 'pilates-double-leg-stretch', 'pilates-tijeras', 'pilates-leg-circles', 'pilates-teaser', 'pilates-leg-pull-front', 'pilates-side-bend', 'plancha-inversa', 'pilates-rolling-like-ball', 'pilates-roll-over', 'pilates-hip-twist', 'pilates-leg-pull-back', 'pilates-seal'],
  antebrazo: ['curl-muneca', 'extension-muneca', 'curl-inverso', 'colgar-barra', 'agarre-disco', 'rodillo-muneca', 'curl-muneca-espalda'],
  trapecio: ['encogimientos', 'encogimientos-barra'],
  completo: ['thruster', 'farmer-walk', 'cargada-barra', 'burpee', 'turkish-get-up', 'empuje-trineo', 'paseo-maleta'],
}
/** Patrones de varias articulaciones: sus ejercicios son compuestos salvo excepción (`TIPO_PROPIO`). */
export const PATRONES_COMPUESTOS: ReadonlySet<Patron> = new Set<Patron>(['empuje-horizontal', 'empuje-vertical', 'tiron-horizontal', 'tiron-vertical', 'sentadilla',
  'bisagra', 'unilateral', 'completo'])
/** Excepciones al tipo de su patrón: compuestos en un patrón de aislamiento y al revés. */
const TIPO_PROPIO: Record<string, TipoEjercicio> = {
  'press-cerrado': 'compuesto', 'fondos-triceps': 'compuesto', 'fondos-maquina': 'compuesto', 'fondos-banco': 'compuesto', 'flexiones-diamante': 'compuesto',
  'hip-thrust': 'compuesto', 'hip-thrust-maquina': 'compuesto', 'hip-thrust-smith': 'compuesto', 'remo-menton': 'compuesto',
  'pullover-polea': 'aislamiento', 'pullover-maquina': 'aislamiento', 'extension-lumbar': 'aislamiento',
  'dominadas-escapulares': 'aislamiento', 'fondos-anillas': 'compuesto', 'hip-thrust-unilateral': 'compuesto',
  'fondos-barra-recta': 'compuesto', 'flexiones-escapulares': 'aislamiento', 'peso-muerto-kettlebell': 'compuesto',
  'hip-thrust-mancuerna': 'compuesto', 'pilates-double-leg-kick': 'aislamiento',
  'reverse-hyper': 'aislamiento', 'pilates-swimming': 'aislamiento', 'pilates-swan': 'aislamiento',
}
const PATRON_DE = new Map<string, { patron: Patron; orden: number }>(Object.entries(POR_PATRON).flatMap(([patron, slugs]) => slugs.map((slug, orden) => [`appfit:${slug}`, { patron: patron as Patron, orden }] as const)))

function clasificar(e: SinClasificar): CatalogExercise {
  const c = PATRON_DE.get(e.id)
  if (!c) throw new Error(`Ejercicio del catálogo sin patrón: ${e.id}`)
  const corporal = e.equipment.some(q => q === 'corporal' || q === 'anillas' || q === 'trx')
  const searchTerms = e.id.startsWith('appfit:pilates-') ? ['pilates'] : corporal ? ['calistenia', 'calisthenics'] : ['gimnasio']
  return { ...e, searchTerms, patron: c.patron,
    tipo: TIPO_PROPIO[e.id.slice('appfit:'.length)] ?? (PATRONES_COMPUESTOS.has(c.patron) ? 'compuesto' : 'aislamiento') }
}

export const CATALOGO_EJERCICIOS: CatalogExercise[] = SIN_CLASIFICAR.map(clasificar)
export const CATALOGO_POR_ID = new Map(CATALOGO_EJERCICIOS.map(e => [e.id, e]))
/** Posición del ejercicio dentro de su patrón (0 = el más básico), para ordenar las sugerencias. */
export function ordenEnPatron(id: string): number {
  return PATRON_DE.get(id)?.orden ?? Number.MAX_SAFE_INTEGER
}
/** Slugs clasificados por patrón, para comprobar en los tests que cada ejercicio tiene uno y solo uno. */
export const SLUGS_POR_PATRON: Readonly<Record<Patron, readonly string[]>> = POR_PATRON
