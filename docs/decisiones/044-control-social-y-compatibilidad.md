# ADR 044 · Control de Social y compatibilidad de publicaciones

Estado: aceptado para implementación, 2026-10-18. Ampliación de ADR 040 y 041.

Víctor solicita implementar `social-mejoras.md` y confirma: mantener Ánimo, Sigues/Te siguen, identidades de reacciones solo para el autor, comunidades separadas con indicador de novedades, sin 1RM estimado y reps solo al mayor peso de la misma variante/modo, nota de 280 caracteres sin edición y propia de cada copia. Confirma también revisión manual de denuncias y transferencia o cierre previo al borrado del perfil del creador.

Las comunidades pueden delegar moderación y transferirse a un miembro activo. Borrar el perfil desde su API exige resolver antes la propiedad, en lugar de eliminar esas comunidades por cascada. Un creador suspendido conserva una salida limitada para listar/cerrar solo sus propias comunidades y retirar su perfil, sin poder leer Social. El borrado completo de cuenta y la limpieza administrativa conservan el contrato de ADR 039. Bloquear al creador continúa ocultando la comunidad. Expulsar quita la membresía actual, sin añadir una lista permanente de prohibiciones.

La biografía deportiva, disciplinas y logros destacados son contenido elegido expresamente. Avatar sin archivos: monograma o insignia de un logro propio publicado. Las identidades y el contenido se leen según relación/audiencia; un contexto de comunidad nunca abre el feed de seguidores ni sus logros privados. No se publican medidas, nutrición, peso corporal, GPS ni el plan semanal.

El resumen conserva `v: 1`. Las adiciones que los lectores antiguos ignoran (nota, metadatos, totales) son opcionales. Omitir duración/volumen requiere **lector antes que escritor**: 0013 mantiene desactivada su escritura hasta actualizar los lectores anteriores; después se activa explícitamente en `social_configuracion`. Omitir elimina el campo del JSON; no lo deja oculto ni lo convierte en cero.

No se añaden avisos generales de hilo, analítica, realtime ni servicio de push. Las denuncias siguen con revisión manual hasta disponer de capacidad y acordar otro mecanismo. La fase 3 requiere su piloto y decisiones específicas; este ADR no autoriza agregados del diario ni push.

Consecuencias: cinco migraciones nuevas antes del cliente, pruebas SQL aisladas y de UI, validación posterior con cuentas/dispositivos reales y tareas de uso antes de abrir el siguiente piloto. Formato, límites, firmas y flujo vigente se documentan en [Social](../features/social.md).
