# ADR 008 — Navegación principal en una rueda bajo demanda

Estado: **sustituida** por [ADR 028](028-barra-de-pestanas-y-registrar.md) (barra de pestañas con «+», 2026-10-09). Estado: la rueda dentro de Sheet se sustituye por el abanico anclado de [ADR 009](009-identidad-y-motion-impeccable.md). Se conservan la lista central, la paginación y el acceso bajo demanda. El texto siguiente registra la decisión original.

## Contexto

Víctor solicita reemplazar los cuatro destinos inferiores por un único botón que abra una rueda, manteniendo Inicio, Nutrición, Gym y Ajustes y admitiendo secciones futuras.

## Decisión

Un botón Menú con espacio propio abre un Sheet compartido. Cuatro destinos circulares con icono/nombre, selección marcada y cierre central. La lista de destinos y el tipo Tab tienen una fuente común. Las opciones adicionales se paginan en grupos de cuatro para conservar botones grandes incluso en 320 px.

Se reutilizan las capas, aislamiento, teclado y retorno del foco existentes; no se crea un sistema paralelo de overlays ni se añade una dependencia. Navegar mantiene el router y su reinicio del scroll; cancelar no cambia la pantalla.

## Consecuencias

Cambiar de sección requiere dos pulsaciones y los destinos no son visibles hasta abrir Menú, una preferencia explícita del usuario. Se conserva acceso por nombre, teclado y lector de pantalla. Registrar desde Inicio y las pestañas internas no cambian. No requiere migración de datos, ajustes ni backup. Añadir una pantalla futura implica conectarla en App, además de declararla en la lista de destinos.
