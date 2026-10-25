# ADR 041 — Publicaciones libres, logros y comunidades

Fecha: 2026-10-16. Estado: aceptada; 0006 aplicada en el proyecto real el 2026-10-16. Ampliación 0007 aplicada en el proyecto real el 2026-10-16, según confirmación de Víctor.

## Contexto

Víctor pide crear publicaciones para seguidores sin depender de un entreno, compartir logros conseguidos, comunidades donde participar sin seguirse y que el entreno compartido muestre su mapa de calor. Amplía el alcance del ADR 040: las publicaciones ya no se limitan a resúmenes de actividad ni a seguidores aprobados.

## Decisión

- Reutilizar el mismo Supabase, perfil y mecanismos de reacción, comentarios, bloqueo, suspensión y denuncia. No añadir servicios ni datos sociales a Dexie.
- Mantener audiencias separadas por publicación: seguidores aprobados o una comunidad elegida expresamente. Las comunidades son descubribles para perfiles activos y permiten adhesión abierta. Solo sus miembros pueden ver e interactuar con su contenido; salir revoca ese acceso. Ser miembro nunca da acceso al feed privado de otra persona.
- Ofrecer texto de hasta 2.000 caracteres y adjuntos de resumen de entreno, actividad o logro. Todo tiene destinatario visible y vista previa antes de enviar. Se preservan el UUID y la audiencia al reintentar; ninguna obtención de logro publica automáticamente. Cuota conjunta de 30 publicaciones al día.
- Compartir solo piezas alcanzadas de la Vitrina, con su símbolo y el requisito del nivel concreto; no revelar ocultos pendientes. Los logros elegidos de Nutrición no incluyen diarios ni cantidades consumidas.
- Compartir del mapa únicamente niveles enteros por las 12 zonas conocidas, calculados con la heurística y snapshot existentes. La representación usa la misma geometría para todas las publicaciones, sin enviar sexo ni datos del Perfil. Las publicaciones anteriores sin mapa siguen siendo válidas.
- El creador se incorpora como miembro y puede borrar una comunidad con confirmación, eliminando sus publicaciones e interacciones. No puede abandonarla dejando un grupo sin creador. Borrar su perfil elimina también sus comunidades, y se explica antes de borrar. Nombre único sin distinguir mayúsculas, 3–60 caracteres; descripción hasta 300; cinco creaciones diarias.

## Consecuencias

La pertenencia a una comunidad permite relacionarse con personas no seguidas sin cambiar los seguimientos existentes. La comprobación de acceso se hace en el servidor por publicación, también para comentarios, reacciones, denuncias y avisos. Tablas con RLS sin permisos directos y ayudantes SQL privados, igual que el modelo anterior.

Se añade una migración 0006 y pruebas con rollback para las nuevas tablas, funciones, límites y cascadas. Debe ejecutarse en el proyecto real antes de publicar el frontend. Las publicaciones no forman parte de la copia cifrada; los registros locales y su backup conservan su forma. Las publicaciones de comunidad de un entreno/actividad son independientes de su marca local de publicación de seguidores. Las cuestiones legales y la prueba con cuentas y dispositivos reales del plan social siguen pendientes.

## Ampliación: quién puede publicar (2026-10-16)

La creación permite limitar las publicaciones al creador, manteniendo comentarios y reacciones para todos los miembros. Las comunidades anteriores, incluida Testers, conservan el modo abierto por defecto. La restricción se valida en un trigger de la tabla de publicaciones, para cubrir todos los tipos y clientes anteriores sin duplicar la lógica de validación de resúmenes. Las audiencias, membresías, bloqueos y contenido existente se conservan. El RPC anterior de creación sigue disponible con modo abierto; el nuevo recibe la elección explícita. Migración y pruebas: [Social](../features/social.md#comunidades-donde-solo-publica-su-creador).
