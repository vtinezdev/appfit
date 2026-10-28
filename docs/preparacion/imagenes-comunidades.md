# Estado de la preparación de imágenes de comunidades

El paquete visual preparado en la conversación se ha incorporado sobre el `master` actualizado `1944461` (PR #183). La copia original de preparación se conserva aparte.

La implementación vigente, permisos, compatibilidad y pendiente de Supabase están documentados en [Social](../features/social.md#imagen-de-la-comunidad) y [ADR 062](../decisiones/062-imagen-de-comunidad.md). La regeneración y el visor aislado están en [scripts/comunidades](../../scripts/comunidades/README.md).

El parche aditivo inicial contenía los 36 WebP y componentes; no contiene por sí solo la integración posterior de creación, edición, RPC, migración ni pruebas integradas. Para continuar con este trabajo se usa el estado actual del repositorio, sin reaplicar ese parche de preparación.
