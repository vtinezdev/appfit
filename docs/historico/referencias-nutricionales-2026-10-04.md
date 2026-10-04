# Consumo y referencias — revisión de entrega

Rama `feat/referencias-nutricionales`. Alcance: desglose diario, información contextual y nueva sección global; sin cambios de repositorios, datos, cálculos ni dependencias. Impeccable mantiene el mundo tinta/mineral/naranja existente y guía la auditoría y el pulido.

## Hallazgos y resolución

La auditoría inicial identifica metodología permanente en la tarea de revisar consumo, referencias limitadas al diario y riesgo de duplicar criterios. Se separan información operativa y explicativa mediante un registro puro común, identificadores existentes y un componente compartido.

La primera inspección conjunta detecta desbordamiento del marcador del carril y títulos al ampliar texto al 200%, cifras/etiquetas demasiado comprimidas y «Referencias» dividido dentro del destino de 84 px. Una tanda corrige la posición del marcador en unidades relativas, envoltura del título, apilado mediante container query y padding horizontal del destino. El nombre de sección en la barra queda accesible cuando no cabe visualmente; la cabecera mantiene el contexto. Se confirma en una última ronda conjunta, sin más iteraciones estéticas.

## Auditoría final de Impeccable

| Dimensión | Evaluación | Evidencia y límite |
|---|---|---|
| Accesibilidad | 3/4 | Controles nombrados, targets, foco, Escape/Atrás y aislamiento comprobados; lectores de pantalla físicos pendientes |
| Rendimiento | 3/4 | Sin dependencias, sección diferida (~2,79 kB gzip), sin nuevas animaciones ni escrituras; sin perfil en hardware |
| Responsive | 3/4 | 320/375/430/1440 px, ambos temas, texto al 200% y Reduce Motion; emulación Chromium |
| Temas | 4/4 | Roles existentes; guard y contraste del sistema en verde; revisión visual claro/oscuro |
| Integridad | 4/4 | Registro único, fuentes reales, porciones preservadas, backups iguales y grupos futuros sin valores ficticios |

17/20 dentro de la cobertura disponible. Sin P0/P1 pendientes verificados en este alcance; las limitaciones de plataforma no equivalen a defectos encontrados ni acreditan WCAG completo. No se repite el detector automático de los hooks. La suite del guard y la evidencia renderizada complementan ese control.

## Validación

1.186 tests / 64 archivos; TypeScript y build Vite/PWA correctos. Referencias: diez contextos; diario/arrastre: nueve; menú: doce. `validar-build.cjs` verifica SW, fuente, chunks y primera apertura de Referencias offline en ambos temas, con export intacto. Regresiones de nutrientes y añadido de ingredientes: seis contextos cada una. Sin script de lint independiente en package.json.

Capturas/informe: `/tmp/appfit-referencias/`; menú: `/tmp/appfit-referencias-menu-final/resultado.json`; demás evidencias en los destinos documentados de [Desarrollo](../desarrollo.md). Solo origen `appfit-test.localhost`, perfiles desechables y datos sintéticos.

La navegación continúa sin rutas URL ni historial de pestañas. Las recomendaciones por grupos solo tienen arquitectura y estado vacío: faltan criterios/fuentes y clasificación del consumo. Safari/iOS, Android físicos, VoiceOver/TalkBack y rendimiento en hardware siguen pendientes. Sin commit, push ni despliegue.
