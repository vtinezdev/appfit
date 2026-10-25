# Revisión del catálogo de ejercicios · 17 de octubre de 2026

Revisión de las **204 definiciones existentes**: **96 ajustadas y 108 confirmadas sin cambios**. Se incorporan **32 ejercicios** (8 de gimnasio, 12 de calistenia y 12 de pilates): catálogo final de **236**, todos con ilustración propia. Los 204 ids, nombres, alias y músculos principales anteriores se conservan.

## Criterio editorial

- Principal: grupo que caracteriza el movimiento. Secundarios: sinergistas relevantes y estabilizadores que sostienen una demanda clara (agarre en tirones, tronco en movimientos suspendidos o sin apoyo). Las variantes con apoyo no heredan automáticamente la demanda del tronco de las variantes libres.
- Se revisaron también las listas que ya eran correctas; no se añaden músculos por completar el cuerpo. El press francés deja de atribuir trabajo relevante al hombro solo por mantener la posición del brazo. La sentadilla sumo deja de equiparar su flexión de rodilla con una bisagra de isquiotibiales.
- Se mantienen las 12 zonas del mapa: espalda agrupa dorsales, trapecios, romboides y erectores; hombros agrupa deltoides; core agrupa abdominales y oblicuos. Los flexores profundos de cadera no se convierten artificialmente en cuádriceps. Abductores sigue siendo un filtro editorial de glúteos, no una zona anatómica nueva.
- El mapa sigue usando el reparto editorial existente (principal 1; secundario 0,5), sin inventar porcentajes de activación. Las ilustraciones resaltan los principales; afinar secundarios no requiere repintar las 204 imágenes anteriores.
- Las nuevas sesiones usan el catálogo vigente aunque un ejercicio local conserve metadatos anteriores. Los entrenamientos con `muscleSnapshot` mantienen su reparto guardado. Los antiguos sin snapshot se interpretan con el catálogo actual, igual que antes, con la indicación de sesión antigua de la interfaz. No se migra ni reescribe el histórico.

## Fuentes de contraste

- [NASM · Pull-up](https://www.nasm.org/resource-center/exercise-library/pull-up): tirón vertical, control escapular y estabilidad del tronco.
- [NASM · Biblioteca de ejercicios](https://www.nasm.org/resource-center/exercise-library): contraste de familias de sentadilla, zancada, remo, flexión y curl femoral, con variantes y material.
- [NASM · Romanian deadlift](https://www.nasm.org/resource-center/exercise-library/romanian-deadlift-barbell): bisagra, cadena posterior y participación de aductores.
- [ExRx · Dominadas asistidas](https://exrx.net/WeightExercises/LatissimusDorsi/AsPullupOpen): músculos agonistas y sinergistas del tirón asistido.
- [Pilates Anytime · Functional Patterns](https://www.pilatesanytime.com/workshop-view/2386/video/Pilates-Functional-Patterns-by-Carrie-Samper) y [Balanced Body · Pilates and Athletes](https://www.pilates.com/pilates-and-athletes/): articulación, estabilización y movimientos de pilates en colchoneta.
- [Conversación original de las ilustraciones](https://chatgpt.com/share/6ad365ac-3b40-83ed-b994-0d8bb3e965c3), facilitada por Víctor: mismo prompt anatómico gris/naranja, lotes de cuatro.

La traducción de músculos concretos a las zonas amplias de AppFit y la selección de secundarios son decisiones editoriales del catálogo; las fuentes no proporcionan los pesos numéricos del mapa.

## Cambios en los ejercicios existentes

Las dominadas añaden deltoides posteriores y tronco; las asistidas en máquina mantienen una lista de secundarios más corta por el apoyo. Los remos incorporan deltoides posteriores y agarre; las variantes sin apoyo incorporan tronco. Sentadillas, zancadas y bisagras incorporan aductores donde corresponde. Se unifica el antebrazo en curls y se revisan apoyos de brazos, extensiones y trabajo de tronco.

| Ejercicio | Principal | Secundarios anteriores | Secundarios revisados |
| --- | --- | --- | --- |
| Aperturas en máquina (`pec-deck`) | Pecho | — | Hombros |
| Fondos en paralelas para pecho (`fondos-pecho`) | Pecho | Tríceps, Hombros | Tríceps, Hombros, Core |
| Dominadas (`dominadas`) | Espalda | Bíceps, Antebrazo | Bíceps, Antebrazo, Hombros, Core |
| Dominadas asistidas en máquina (`dominadas-asistidas`) | Espalda | Bíceps | Bíceps, Antebrazo, Hombros |
| Jalón al pecho (`jalon-pecho`) | Espalda | Bíceps | Bíceps, Antebrazo, Hombros |
| Jalón con agarre neutro (`jalon-neutro`) | Espalda | Bíceps | Bíceps, Antebrazo, Hombros |
| Remo con barra (`remo-barra`) | Espalda | Bíceps, Core | Bíceps, Hombros, Antebrazo, Core |
| Remo con mancuerna (`remo-mancuerna`) | Espalda | Bíceps | Bíceps, Hombros, Antebrazo, Core |
| Remo sentado en polea (`remo-polea`) | Espalda | Bíceps | Bíceps, Hombros, Antebrazo |
| Remo en máquina (`remo-maquina`) | Espalda | Bíceps | Bíceps, Hombros, Antebrazo |
| Remo con pecho apoyado (`remo-pecho-apoyado`) | Espalda | Bíceps | Bíceps, Hombros, Antebrazo |
| Remo en T (`remo-t`) | Espalda | Bíceps | Bíceps, Hombros, Antebrazo, Core |
| Pullover en polea (`pullover-polea`) | Espalda | Tríceps | Pecho, Tríceps, Core |
| Remo en TRX (`remo-trx`) | Espalda | Bíceps, Core | Bíceps, Hombros, Antebrazo, Core |
| Remo invertido (`remo-invertido`) | Espalda | Bíceps, Core | Bíceps, Hombros, Antebrazo, Core |
| Remo con bandas (`remo-bandas`) | Espalda | Bíceps | Bíceps, Hombros, Antebrazo |
| Dominadas supinas (`dominadas-supinas`) | Espalda | Bíceps, Antebrazo | Bíceps, Antebrazo, Hombros, Core |
| Jalón con agarre supino (`jalon-supino`) | Espalda | Bíceps | Bíceps, Antebrazo, Hombros |
| Jalón unilateral en polea (`jalon-unilateral`) | Espalda | Bíceps | Bíceps, Antebrazo, Hombros, Core |
| Remo unilateral en polea (`remo-polea-unilateral`) | Espalda | Bíceps, Core | Bíceps, Hombros, Antebrazo, Core |
| Remo Pendlay (`remo-pendlay`) | Espalda | Bíceps, Core | Bíceps, Hombros, Antebrazo, Core |
| Remo Seal (`remo-seal`) | Espalda | Bíceps | Bíceps, Hombros, Antebrazo |
| Remo Meadows (`remo-meadows`) | Espalda | Bíceps, Antebrazo | Bíceps, Hombros, Antebrazo, Core |
| Rack pull (`rack-pull`) | Espalda | Glúteos, Isquiotibiales, Antebrazo | Glúteos, Isquiotibiales, Antebrazo, Core |
| Jalón en máquina (`jalon-maquina`) | Espalda | Bíceps | Bíceps, Antebrazo, Hombros |
| Press militar (`press-militar`) | Hombros | Tríceps, Core | Tríceps, Pecho, Core |
| Press de hombros con mancuernas (`press-hombro-mancuernas`) | Hombros | Tríceps | Tríceps, Pecho |
| Press Arnold (`press-arnold`) | Hombros | Tríceps | Tríceps, Pecho |
| Press de hombros en máquina (`press-hombro-maquina`) | Hombros | Tríceps | Tríceps, Pecho |
| Elevaciones laterales (`elevacion-lateral`) | Hombros | — | Espalda |
| Elevaciones laterales en polea (`elevacion-lateral-polea`) | Hombros | — | Espalda |
| Elevaciones frontales (`elevacion-frontal`) | Hombros | — | Pecho |
| Face pull (`face-pull`) | Hombros | Espalda | Espalda, Bíceps |
| Press landmine (`press-landmine`) | Hombros | Tríceps, Core | Tríceps, Pecho, Core |
| Press de hombros en multipower (`press-hombro-smith`) | Hombros | Tríceps | Tríceps, Pecho |
| Elevaciones laterales en máquina (`elevacion-lateral-maquina`) | Hombros | — | Espalda |
| Remo al mentón (`remo-menton`) | Hombros | Espalda, Bíceps | Espalda, Bíceps, Antebrazo |
| Elevaciones frontales en polea (`elevacion-frontal-polea`) | Hombros | — | Pecho |
| Press militar sentado (`press-militar-sentado`) | Hombros | Tríceps | Tríceps, Pecho |
| Press de hombro con kettlebell (`press-kettlebell`) | Hombros | Tríceps, Core | Tríceps, Pecho, Core |
| Elevaciones laterales con banda (`elevacion-lateral-bandas`) | Hombros | — | Espalda |
| Curl inclinado con mancuernas (`curl-inclinado`) | Bíceps | — | Antebrazo |
| Curl predicador con barra (`curl-predicador`) | Bíceps | — | Antebrazo |
| Curl en polea (`curl-polea`) | Bíceps | — | Antebrazo |
| Curl concentrado (`curl-concentrado`) | Bíceps | — | Antebrazo |
| Curl en máquina (`curl-maquina`) | Bíceps | — | Antebrazo |
| Curl bayesiano en polea (`curl-bayesiano`) | Bíceps | — | Antebrazo |
| Curl araña (`curl-arana`) | Bíceps | — | Antebrazo |
| Curl predicador con mancuerna (`curl-predicador-mancuerna`) | Bíceps | — | Antebrazo |
| Curl en polea alta (`curl-polea-alta`) | Bíceps | — | Antebrazo |
| Curl de bíceps en TRX (`curl-trx`) | Bíceps | Core | Antebrazo, Core |
| Press francés (`press-frances`) | Tríceps | Hombros | — |
| Fondos en paralelas para tríceps (`fondos-triceps`) | Tríceps | Pecho, Hombros | Pecho, Hombros, Core |
| Flexiones diamante (`flexiones-diamante`) | Tríceps | Pecho, Hombros | Pecho, Hombros, Core |
| Sentadilla (`sentadilla`) | Cuádriceps | Glúteos, Core | Glúteos, Aductores, Espalda, Core |
| Sentadilla frontal (`sentadilla-frontal`) | Cuádriceps | Glúteos, Core | Glúteos, Aductores, Espalda, Core |
| Sentadilla goblet (`sentadilla-goblet`) | Cuádriceps | Glúteos, Core | Glúteos, Aductores, Core |
| Prensa de piernas (`prensa-piernas`) | Cuádriceps | Glúteos | Glúteos, Aductores |
| Sentadilla hack (`hack-squat`) | Cuádriceps | Glúteos | Glúteos, Aductores |
| Sentadilla en multipower (`sentadilla-smith`) | Cuádriceps | Glúteos, Core | Glúteos, Aductores, Core |
| Zancadas con mancuernas (`zancadas`) | Cuádriceps | Glúteos, Isquiotibiales | Glúteos, Aductores, Isquiotibiales, Core |
| Sentadilla búlgara (`sentadilla-bulgara`) | Cuádriceps | Glúteos, Core | Glúteos, Aductores, Isquiotibiales, Core |
| Subida al cajón con mancuernas (`step-up`) | Cuádriceps | Glúteos | Glúteos, Aductores, Isquiotibiales, Gemelos, Core |
| Sentadilla con peso corporal (`sentadilla-corporal`) | Cuádriceps | Glúteos | Glúteos, Aductores, Core |
| Sentadilla en TRX (`sentadilla-trx`) | Cuádriceps | Glúteos | Glúteos, Aductores, Core |
| Sentadilla péndulo (`sentadilla-pendulo`) | Cuádriceps | Glúteos | Glúteos, Aductores |
| Prensa horizontal (`prensa-horizontal`) | Cuádriceps | Glúteos | Glúteos, Aductores |
| Zancadas con barra (`zancadas-barra`) | Cuádriceps | Glúteos, Isquiotibiales, Core | Glúteos, Aductores, Isquiotibiales, Core |
| Sentadilla con cinturón (`belt-squat`) | Cuádriceps | Glúteos | Glúteos, Aductores |
| Zancadas caminando (`zancadas-caminando`) | Cuádriceps | Glúteos, Isquiotibiales | Glúteos, Aductores, Isquiotibiales, Core |
| Sentadilla a una pierna (`sentadilla-pistol`) | Cuádriceps | Glúteos, Core | Glúteos, Aductores, Core |
| Peso muerto rumano (`peso-muerto-rumano`) | Isquiotibiales | Glúteos, Espalda | Glúteos, Espalda, Aductores, Antebrazo, Core |
| Peso muerto rumano con mancuernas (`rumano-mancuernas`) | Isquiotibiales | Glúteos, Espalda | Glúteos, Espalda, Aductores, Antebrazo, Core |
| Curl nórdico (`curl-nordico`) | Isquiotibiales | Glúteos | Glúteos, Gemelos, Core |
| Buenos días (`buenos-dias`) | Isquiotibiales | Glúteos, Espalda | Glúteos, Espalda, Aductores, Core |
| Peso muerto rumano a una pierna (`rumano-unilateral`) | Isquiotibiales | Glúteos, Core | Glúteos, Espalda, Aductores, Antebrazo, Core |
| Peso muerto rumano en multipower (`rumano-smith`) | Isquiotibiales | Glúteos, Espalda | Glúteos, Espalda, Aductores, Antebrazo, Core |
| Peso muerto con piernas rígidas (`peso-muerto-rigidas`) | Isquiotibiales | Glúteos, Espalda | Glúteos, Espalda, Aductores, Antebrazo, Core |
| Hip thrust con barra (`hip-thrust`) | Glúteos | Isquiotibiales, Core | Isquiotibiales, Cuádriceps, Core |
| Hip thrust en máquina (`hip-thrust-maquina`) | Glúteos | Isquiotibiales | Isquiotibiales, Cuádriceps |
| Puente de glúteos (`puente-gluteos`) | Glúteos | Isquiotibiales | Isquiotibiales, Core |
| Pull through en polea (`pull-through`) | Glúteos | Isquiotibiales | Isquiotibiales, Espalda, Core |
| Zancada inversa con mancuernas (`zancada-inversa`) | Glúteos | Cuádriceps, Core | Cuádriceps, Aductores, Isquiotibiales, Core |
| Hip thrust en multipower (`hip-thrust-smith`) | Glúteos | Isquiotibiales, Core | Isquiotibiales, Cuádriceps, Core |
| Sentadilla sumo con mancuerna (`sentadilla-sumo`) | Glúteos | Aductores, Cuádriceps, Isquiotibiales | Aductores, Cuádriceps, Core |
| Patada de glúteo en cuadrupedia (`patada-cuadrupedia`) | Glúteos | Isquiotibiales | Isquiotibiales, Core |
| Plancha Copenhague (`plancha-copenhague`) | Aductores | Core | Core, Hombros |
| Sentadilla cosaca (`sentadilla-cosaca`) | Aductores | Cuádriceps, Glúteos | Cuádriceps, Glúteos, Core |
| Zancada lateral con mancuernas (`zancada-lateral`) | Aductores | Cuádriceps, Glúteos | Cuádriceps, Glúteos, Isquiotibiales, Core |
| Elevaciones de piernas colgado (`elevacion-piernas`) | Core | Antebrazo | Antebrazo, Espalda |
| Pallof press (`pallof-press`) | Core | — | Hombros |
| Rueda abdominal (`rueda-abdominal`) | Core | Hombros, Espalda | Hombros, Espalda, Tríceps |
| Woodchop en polea (`woodchop`) | Core | Hombros | Hombros, Glúteos |
| Encogimientos de rodillas en TRX (`encogimiento-trx`) | Core | Hombros | Hombros, Tríceps |
| Elevaciones de rodillas en silla romana (`elevacion-rodillas-paralelas`) | Core | — | Hombros, Tríceps |
| Inclinaciones laterales con mancuerna (`inclinacion-lateral`) | Core | — | Espalda, Antebrazo |

## Ejercicios revisados sin cambios

| Ejercicio | Principales | Secundarios confirmados |
| --- | --- | --- |
| Press banca (`press-banca`) | Pecho | Tríceps, Hombros |
| Press inclinado con barra (`press-inclinado-barra`) | Pecho | Tríceps, Hombros |
| Press declinado con barra (`press-declinado-barra`) | Pecho | Tríceps, Hombros |
| Press con mancuernas (`press-mancuernas`) | Pecho | Tríceps, Hombros |
| Press inclinado con mancuernas (`press-inclinado-mancuernas`) | Pecho | Tríceps, Hombros |
| Aperturas con mancuernas (`aperturas-mancuernas`) | Pecho | Hombros |
| Pullover con mancuerna (`pullover-mancuerna`) | Pecho | Espalda, Tríceps |
| Cruce de poleas (`cruce-poleas`) | Pecho | Hombros |
| Press de pecho en máquina (`press-pecho-maquina`) | Pecho | Tríceps, Hombros |
| Flexiones (`flexiones`) | Pecho | Tríceps, Hombros, Core |
| Press banca en multipower (`press-banca-smith`) | Pecho | Tríceps, Hombros |
| Press de pecho con bandas (`press-pecho-bandas`) | Pecho | Tríceps, Hombros |
| Press inclinado en máquina (`press-inclinado-maquina`) | Pecho | Tríceps, Hombros |
| Press inclinado en multipower (`press-inclinado-smith`) | Pecho | Tríceps, Hombros |
| Aperturas inclinadas con mancuernas (`aperturas-inclinadas`) | Pecho | Hombros |
| Cruce de poleas de abajo arriba (`cruce-poleas-bajo`) | Pecho | Hombros |
| Flexiones declinadas (`flexiones-declinadas`) | Pecho | Tríceps, Hombros, Core |
| Press declinado con mancuernas (`press-declinado-mancuernas`) | Pecho | Tríceps, Hombros |
| Aperturas en polea en banco (`aperturas-polea-banco`) | Pecho | Hombros |
| Press con mancuernas juntas (`press-squeeze`) | Pecho | Tríceps, Hombros |
| Extensiones lumbares (`extension-lumbar`) | Espalda | Glúteos, Isquiotibiales |
| Encogimientos con mancuernas (`encogimientos`) | Espalda | Antebrazo |
| Encogimientos con barra (`encogimientos-barra`) | Espalda | Antebrazo |
| Pájaros con mancuernas (`pajaros`) | Hombros | Espalda |
| Aperturas inversas en máquina (`reverse-pec-deck`) | Hombros | Espalda |
| Separaciones con banda (`separacion-bandas`) | Hombros | Espalda |
| Pájaros en polea (`pajaros-polea`) | Hombros | Espalda |
| Elevaciones en Y (`elevacion-y`) | Hombros | Espalda |
| Curl con barra (`curl-barra`) | Bíceps | Antebrazo |
| Curl con mancuernas (`curl-mancuernas`) | Bíceps | Antebrazo |
| Curl martillo (`curl-martillo`) | Bíceps | Antebrazo |
| Curl martillo en polea con cuerda (`curl-martillo-cuerda`) | Bíceps | Antebrazo |
| Curl con barra Z (`curl-barra-z`) | Bíceps | Antebrazo |
| Curl Zottman (`curl-zottman`) | Bíceps | Antebrazo |
| Extensión de tríceps con cuerda (`extension-triceps-cuerda`) | Tríceps | — |
| Extensión de tríceps en polea con barra (`extension-triceps-barra`) | Tríceps | — |
| Extensión de tríceps sobre la cabeza (`extension-triceps-cabeza`) | Tríceps | — |
| Extensión de tríceps sobre la cabeza en polea (`extension-triceps-polea-cabeza`) | Tríceps | — |
| Press banca con agarre cerrado (`press-cerrado`) | Tríceps | Pecho, Hombros |
| Patada de tríceps (`patada-triceps`) | Tríceps | — |
| Extensión de tríceps unilateral en polea (`extension-triceps-unilateral`) | Tríceps | — |
| Press francés con mancuernas (`press-frances-mancuernas`) | Tríceps | — |
| Fondos en máquina (`fondos-maquina`) | Tríceps | Pecho, Hombros |
| Fondos en banco (`fondos-banco`) | Tríceps | Pecho, Hombros |
| Patada de tríceps en polea (`patada-triceps-polea`) | Tríceps | — |
| Extensión de tríceps en máquina (`extension-triceps-maquina`) | Tríceps | — |
| Extensión de tríceps con banda (`extension-triceps-bandas`) | Tríceps | — |
| Curl de muñeca (`curl-muneca`) | Antebrazo | — |
| Extensión de muñeca (`extension-muneca`) | Antebrazo | — |
| Curl inverso con barra (`curl-inverso`) | Antebrazo | Bíceps |
| Colgarse de la barra (`colgar-barra`) | Antebrazo | Espalda |
| Agarre de disco en pinza (`agarre-disco`) | Antebrazo | — |
| Rodillo de muñeca (`rodillo-muneca`) | Antebrazo | Hombros |
| Curl de muñeca por detrás con barra (`curl-muneca-espalda`) | Antebrazo | — |
| Extensión de cuádriceps (`extension-cuadriceps`) | Cuádriceps | — |
| Sentadilla sissy (`sissy-squat`) | Cuádriceps | Core |
| Sentadilla isométrica en pared (`sentadilla-pared`) | Cuádriceps | Glúteos |
| Curl femoral tumbado (`curl-femoral-tumbado`) | Isquiotibiales | Gemelos |
| Curl femoral sentado (`curl-femoral-sentado`) | Isquiotibiales | Gemelos |
| Curl femoral en TRX (`curl-femoral-trx`) | Isquiotibiales | Glúteos, Core |
| Curl femoral de pie en máquina (`curl-femoral-pie`) | Isquiotibiales | Gemelos |
| Glute ham raise (`glute-ham-raise`) | Isquiotibiales | Glúteos, Gemelos |
| Curl femoral con fitball (`curl-femoral-fitball`) | Isquiotibiales | Glúteos, Core |
| Patada de glúteo en polea (`patada-gluteo`) | Glúteos | Isquiotibiales |
| Abducción de cadera en máquina (`abduccion-maquina`) | Glúteos | — |
| Abducción de cadera con banda (`abduccion-bandas`) | Glúteos | — |
| Patada de glúteo en máquina (`patada-gluteo-maquina`) | Glúteos | Isquiotibiales |
| Abducción de cadera en polea (`abduccion-polea`) | Glúteos | — |
| Puente de glúteos a una pierna (`puente-unilateral`) | Glúteos | Isquiotibiales, Core |
| Hiperextensión para glúteo (`hiperextension-gluteo`) | Glúteos | Isquiotibiales, Espalda |
| Almejas con banda (`almejas`) | Glúteos | — |
| Aducción de cadera en máquina (`aduccion-maquina`) | Aductores | — |
| Aducción de cadera en polea (`aduccion-polea`) | Aductores | Core |
| Aducción de cadera con banda (`aduccion-bandas`) | Aductores | — |
| Aducción tumbado de lado (`aduccion-tumbado`) | Aductores | Core |
| Aducción isométrica con balón (`aduccion-balon`) | Aductores | — |
| Elevación de gemelos de pie en máquina (`gemelos-maquina`) | Gemelos | — |
| Elevación de gemelos sentado (`gemelos-sentado`) | Gemelos | — |
| Elevación de gemelos en prensa (`gemelos-prensa`) | Gemelos | — |
| Elevación de gemelos a una pierna (`gemelos-unilateral`) | Gemelos | — |
| Elevación de gemelos en multipower (`gemelos-smith`) | Gemelos | — |
| Elevación de gemelos con mancuernas (`gemelos-mancuernas`) | Gemelos | — |
| Elevación de gemelos tipo burro (`gemelos-burro`) | Gemelos | — |
| Plancha (`plancha`) | Core | Hombros, Glúteos |
| Plancha lateral (`plancha-lateral`) | Core | Hombros, Glúteos |
| Crunch abdominal (`crunch`) | Core | — |
| Crunch en polea (`crunch-polea`) | Core | — |
| Dead bug (`dead-bug`) | Core | — |
| Bird dog (`bird-dog`) | Core | Espalda, Glúteos |
| Crunch inverso (`crunch-inverso`) | Core | — |
| Crunch en máquina (`crunch-maquina`) | Core | — |
| Giros rusos (`giros-rusos`) | Core | — |
| Elevaciones de piernas tumbado (`elevacion-piernas-tumbado`) | Core | — |
| Hollow hold (`hollow-hold`) | Core | — |
| Escaladores (`escaladores`) | Core | Hombros, Cuádriceps |
| Abdominales en V (`navaja`) | Core | — |
| Crunch bicicleta (`crunch-bicicleta`) | Core | — |
| Crunch en banco declinado (`crunch-declinado`) | Core | — |
| Peso muerto convencional (`peso-muerto`) | Glúteos, Isquiotibiales | Espalda, Antebrazo, Cuádriceps, Core |
| Peso muerto sumo (`peso-muerto-sumo`) | Glúteos, Cuádriceps | Aductores, Isquiotibiales, Espalda, Antebrazo, Core |
| Swing con kettlebell (`swing-kettlebell`) | Glúteos, Isquiotibiales | Core, Espalda, Hombros |
| Thruster con mancuernas (`thruster`) | Cuádriceps, Hombros | Glúteos, Core, Tríceps |
| Burpees (`burpee`) | Pecho, Cuádriceps | Tríceps, Hombros, Glúteos, Core |
| Paseo del granjero (`farmer-walk`) | Antebrazo | Hombros, Espalda, Core |
| Cargada con barra (`cargada-barra`) | Cuádriceps, Glúteos | Isquiotibiales, Espalda, Hombros, Antebrazo, Core |
| Levantamiento turco (`turkish-get-up`) | Core, Hombros | Cuádriceps, Glúteos, Tríceps |
| Peso muerto con barra hexagonal (`peso-muerto-trap-bar`) | Cuádriceps, Glúteos | Isquiotibiales, Espalda, Antebrazo, Core |
| Empuje de trineo (`empuje-trineo`) | Cuádriceps, Glúteos | Gemelos, Isquiotibiales, Hombros, Tríceps, Core |

## Incorporaciones

En el selector se pueden buscar «pilates», «calistenia» o «gimnasio»; estos términos no funcionan como alias para enlazar ejercicios históricos. Anillas tiene un filtro de equipamiento propio. Se anexan ejercicios al final de cada patrón para mantener el orden de preferencia de los anteriores; las flexiones pike permiten cubrir ahora el empuje vertical con peso corporal.

| Ejercicio | Principales | Secundarios | Lote de imagen |
| --- | --- | --- | --- |
| Pullover en máquina (`pullover-maquina`) | Espalda | Pecho, Tríceps | 52 |
| Press de pecho unilateral en polea (`press-pecho-unilateral-polea`) | Pecho | Tríceps, Hombros, Core | 52 |
| Remo alto en máquina (`remo-alto-maquina`) | Espalda | Hombros, Bíceps, Antebrazo | 52 |
| Sentadilla Zercher (`sentadilla-zercher`) | Cuádriceps | Glúteos, Aductores, Espalda, Core, Bíceps | 52 |
| Hip thrust a una pierna (`hip-thrust-unilateral`) | Glúteos | Isquiotibiales, Core | 53 |
| Hiperextensión inversa en máquina (`reverse-hyper`) | Glúteos | Isquiotibiales, Espalda | 53 |
| Remo con kettlebell (`remo-kettlebell`) | Espalda | Bíceps, Hombros, Antebrazo, Core | 53 |
| Paseo de maleta (`paseo-maleta`) | Core | Antebrazo, Espalda, Hombros, Glúteos | 53 |
| Dominadas con agarre neutro (`dominadas-neutras`) | Espalda | Bíceps, Antebrazo, Hombros, Core | 54 |
| Dominadas asistidas con banda (`dominadas-banda`) | Espalda | Bíceps, Antebrazo, Hombros, Core | 54 |
| Dominadas escapulares (`dominadas-escapulares`) | Espalda | Antebrazo, Core | 54 |
| Fondos en anillas (`fondos-anillas`) | Tríceps | Pecho, Hombros, Core | 54 |
| Flexiones inclinadas (`flexiones-inclinadas`) | Pecho | Tríceps, Hombros, Core | 55 |
| Flexiones arqueras (`flexiones-arqueras`) | Pecho | Tríceps, Hombros, Core | 55 |
| Flexiones pike (`flexiones-pike`) | Hombros | Tríceps, Pecho, Core | 55 |
| Flexiones en anillas (`flexiones-anillas`) | Pecho | Tríceps, Hombros, Core | 55 |
| Remo en anillas (`remo-anillas`) | Espalda | Bíceps, Hombros, Antebrazo, Core | 56 |
| Sentadilla shrimp (`sentadilla-shrimp`) | Cuádriceps | Glúteos, Aductores, Core | 56 |
| Dragon flag (`dragon-flag`) | Core | Espalda, Glúteos | 56 |
| L-sit en paralelas (`l-sit`) | Core | Tríceps, Hombros, Cuádriceps | 56 |
| Hundred de pilates (`pilates-hundred`) | Core | — | 57 |
| Roll up de pilates (`pilates-roll-up`) | Core | — | 57 |
| Single leg stretch de pilates (`pilates-single-leg-stretch`) | Core | — | 57 |
| Double leg stretch de pilates (`pilates-double-leg-stretch`) | Core | — | 57 |
| Tijeras de pilates (`pilates-tijeras`) | Core | — | 58 |
| Círculos de pierna de pilates (`pilates-leg-circles`) | Core | Aductores | 58 |
| Side kick de pilates (`pilates-side-kick`) | Glúteos | Core | 58 |
| Swimming de pilates (`pilates-swimming`) | Espalda | Glúteos, Isquiotibiales, Hombros, Core | 58 |
| Swan de pilates (`pilates-swan`) | Espalda | Glúteos, Tríceps, Hombros | 59 |
| Teaser de pilates (`pilates-teaser`) | Core | Cuádriceps | 59 |
| Leg pull front de pilates (`pilates-leg-pull-front`) | Core | Glúteos, Hombros, Tríceps | 59 |
| Side bend de pilates (`pilates-side-bend`) | Core | Hombros, Glúteos | 59 |

Roll up y teaser mantienen su ejecución articulada de pilates; no se fusionan con el crunch o los abdominales en V. Hip thrust unilateral apoya las escápulas en banco; no se fusiona con el puente unilateral de suelo. Los movimientos en anillas mantienen identidad y equipo propios frente a TRX o paralelas.
