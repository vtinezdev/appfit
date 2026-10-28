# 062 — Imagen de comunidad

Fecha: 2026-10-28. Estado: implementada en cliente y SQL. Víctor confirma la ejecución de 0028 en Supabase real el 2026-10-28 con las seis comprobaciones en `true`. Amplía [ADR 047](047-avatares-de-catalogo.md).

## Contexto y decisión

Víctor quiere una identidad de comunidad coherente con los avatares personales y claramente distinguible. Tras comparar emblemas y lugares compartidos, aprueba un catálogo de 36 lugares, su paleta y el encuadre en los recuadros actuales.

- Las imágenes son WebP locales de 256 × 256. Las 36 suman 258 850 bytes. Mantienen colores de AppFit y composiciones de espacios compartidos, con recorte cuadrado redondeado y tamaños actuales de 40/80 px. Las personas conservan sus avatares.
- Se guarda solo un ID estable `lugar.<slug>` o `null` (iniciales), nunca una URL ni una subida de archivo. El servidor valida la lista cerrada. Los identificadores desconocidos para un cliente anterior se muestran con iniciales.
- Solo el creador elige al crear o cambia desde «Más acciones». Ser moderador o administrador no concede ese permiso. Todas las opciones están disponibles. Cancelar no escribe; guardar falla de forma visible y conserva el borrador.
- La elección al crear ocurre en otra vista de la misma Sheet y vuelve con «Hecho». Desde el detalle, la hoja de edición se abre tras `onExited` del menú. No se anidan dos hojas visibles.
- `crear_comunidad_con_imagen` realiza creación, membresía e imagen en una transacción y conserva la idempotencia: repetir un envío no restaura una imagen que después cambió el creador. `editar_imagen_comunidad` conserva el resto de datos. La RPC de lectura mantiene los filtros y permisos anteriores.
- La capacidad `imagenesComunidades` habilita la elección. Sin 0028 el cliente sigue leyendo, creando y navegando con iniciales. Las firmas antiguas de creación no cambian.

## Ejecución y comprobación

`supabase/migrations/0028_comunidades_imagen.sql` se ejecuta manualmente después de 0027. Víctor se encarga del proyecto real. La implementación se comprueba con la suite SQL en PostgreSQL temporal, pruebas de catálogo/contrato, navegador con Supabase falso y build PWA. Ningún ensayo usa datos reales.

La tabla de imágenes del cliente y el validador SQL deben ampliarse juntos para añadir ID en otra versión, conservando los existentes. Fuentes, huellas y script de regeneración en `scripts/comunidades/`; no se introduce una dependencia ni servicio adicional.
