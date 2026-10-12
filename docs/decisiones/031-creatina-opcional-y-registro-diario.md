# 031 — Creatina opcional y registro diario

Fecha: 2026-10-12. Estado: vigente.

## Contexto

El [plan de mejoras](../mejoras.md) incorpora creatina como registro opcional, con dosis automática o manual y carga de cinco días. Debe conservar los datos del móvil y permanecer independiente de la gamificación.

## Decisión

- La feature pertenece a Inicio, junto al agua. `Settings.creatina` contiene activación, dosis manual de mantenimiento e inicio de carga; ausencia significa desactivada.
- Dexie v8 añade `suplementos`, con identidad autoincremental e índice único por tipo y fecha. Solo se ofrece creatina, pero la tabla admite otros tipos sin migrar. Una marca indica que se completó la toma del día; no cuenta porciones ni infiere tomas anteriores.
- La dosis y el fin de carga se derivan de la configuración y del último pesaje no futuro. Mantenimiento: 0,05 g/kg, mínimo 3 g, redondeado a 0,5 g; sin pesaje, 3 g. La manual sustituye al mantenimiento. Carga: 0,3 g/kg durante cinco días inclusivos, repartida en cuatro tomas; requiere pesaje, sin inventar masa. Al sexto día se aplica mantenimiento sin escribir al leer.
- Marcar/desmarcar es una escritura explícita, idempotente y transaccional. Desactivar conserva marcas y configuración. No se modifica XP, Ritmo, rachas, Cumbres ni Vitrina.
- La tabla es opcional en backup v3: no cambia la forma de registros previos ni exige subir esa versión. Una copia antigua deja la tabla vacía y la función desactivada. No se añade CSV ni notificaciones.

## Consecuencias

El historial muestra «Tomada» o «Sin marcar», sin atribuir dosis históricas que no se guardaron. Los cambios de peso o de dosis afectan al cálculo actual; las marcas anteriores se conservan. Lecturas y fórmulas quedan separadas de las escrituras y de la presentación. Detalles vivos en [Inicio](../features/inicio.md#creatina) y [datos](../datos.md#creatina).
