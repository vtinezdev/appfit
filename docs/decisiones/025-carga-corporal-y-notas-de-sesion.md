# 025 · Carga corporal y notas de ejercicio por sesión

Fecha: 2026-10-08. Estado: implementado.

## Contexto

El campo histórico `SetEntry.peso` representa kg externos. Dominadas, fondos y ejercicios asistidos necesitan distinguir masa corporal, lastre y ayuda sin reinterpretar los registros existentes ni estimar la fracción del cuerpo movida.

## Decisión

- `modoCarga` opcional en la serie: ausente/`externa`, `corporal`, `lastre`, `asistencia`. `peso` conserva kg externos en externa, representa kg añadidos en lastre y kg de ayuda en asistencia; corporal usa cero. `pesoCorporal` opcional es un snapshot independiente. Cero kg antiguo sigue siendo carga externa sin convertirlo automáticamente en corporal.
- `Workout.cargasEjercicios` guarda la configuración de nuevas series de ese ejercicio en esa sesión; todas las series existentes se actualizan transaccionalmente al elegir/corregir la configuración. Cambiar modo reinicia kg para no reinterpretar el mismo número. Corregir solo masa conserva lastre/asistencia. Solo las series físicamente modificadas pierden su marca de completado.
- La UI propone el último pesaje hasta la fecha del entreno; masa desconocida es válida. Nueva sesión con modo corporal previo consulta el pesaje de su fecha. Añadir otra serie conserva el snapshot de la sesión, aunque después se registre otro peso. No se reescribe el histórico con pesajes futuros.
- Volumen externo = Σ kg externos/lastre × reps efectivas. Cuerpo y asistencia no suman tonelaje. No se estima masa efectiva, esfuerzo, fatiga ni recuperación. El mapa mantiene series/reps para modos corporales, sin equiparar más lastre o asistencia con una precisión fisiológica; la ponderación de kg relativos se aplica solo a series de carga externa.
- Récords y Progreso comparan ejercicio + modo de carga. Epley se usa solo en carga externa. Corporal compara reps; lastre compara kg añadidos y reps con el mismo lastre. En asistencia, menos ayuda solo genera récord si se mantienen al menos las reps del mínimo anterior; las reps también se comparan a igual ayuda. No se afirma que las máquinas de asistencia estén calibradas igual: cambiar ejercicio/máquina debe mantener identidades distintas si se necesitan comparaciones separadas.
- `Workout.notasEjercicios` guarda notas de esta sesión; la última nota de una sesión anterior terminada se consulta como referencia con fecha y no se copia. Instrucciones permanentes no se implementan en este cambio.
- Quitar el ejercicio captura/retira nota y configuración junto a las series. Deshacer restaura sus datos originales y conserva cambios posteriores de otros ejercicios.

Campos opcionales sin índice: Dexie v7 y backup v3, sin transformación/migración. CSV añade modo, snapshot corporal y nota para que sus kg no sean ambiguos. Las gráficas conservan selección de curvas solo en estado de pantalla, sin escribir preferencias ni datos.

## Consecuencias

Los totales conservan una definición de volumen única y comprobable. La masa corporal queda disponible para una futura fórmula validada por ejercicio, sin introducirla ahora. Lateralidad, agarres, técnicas especiales y recomendaciones de progresión se incorporan después mediante [ADR 026](026-ejecucion-tecnicas-y-progresion-confirmada.md), ampliando las claves de comparabilidad sin reinterpretar silenciosamente estas series.
