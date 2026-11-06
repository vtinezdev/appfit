# Auditoría de seguridad y bugs (noviembre de 2026)

Revisión por áreas antes de publicar en Google Play. Cada área se revisa leyendo el código y trazando un camino concreto de ataque o de fallo; solo cuenta lo que se confirma con un test o una prueba. Lo pequeño se arregla en la PR de la auditoría; lo que depende de Víctor o de sus paneles queda abajo, en «Para Víctor». Histórico de la auditoría: este archivo y `docs/PROCESO.md` § 331 en adelante.

## Áreas

| # | Área | Estado |
|---|---|---|
| 1 | Supabase: RLS, funciones `security definer`, permisos, entradas de las RPC y frenos | Revisada (2026-11-06) |
| 2 | Cuenta: cifrado de la copia, PBKDF2, sesión, código OTP, borrado | Pendiente |
| 3 | Validación de entradas: importar backup, GPX/FIT, Open Food Facts, datos de Social | Pendiente |
| 4 | XSS y renderizado de contenido de terceros | Pendiente |
| 5 | Cabeceras y CSP | Pendiente |
| 6 | Dependencias (npm audit, versiones) | Pendiente |
| 7 | Service worker y caché | Pendiente |
| 8 | Almacenamiento local y datos sensibles | Pendiente |
| 9 | Lógica de negocio: fechas, cálculos, casos límite | Pendiente |
| 10 | Recorridos de error | Pendiente |

## 1. Supabase

Método: las 31 migraciones cargadas en PGlite (PostgreSQL 17 en WASM) y consultas al catálogo (`pg_class`, `pg_policies`, `pg_proc`, `pg_constraint`), más lectura de las 79 funciones que la app puede ejecutar.

Comprobado sin problemas:
- Las 21 tablas tienen RLS. La app solo puede leer directamente `copias` (su fila, por la política «cada usuario lee su copia») y no escribe directamente en ninguna.
- Ninguna función `security definer` deja el `search_path` sin fijar.
- Sin sesión solo se ejecuta `enviar_mensaje_creador`, con freno por cuenta y global.
- Toda función que la app puede ejecutar mira la sesión, directamente o a través de `social_yo`, `social_admin_yo` o `social_publicar`. Las dos que no (`crear_comunidad` de 3 argumentos y `feed` de 2) solo llaman a su versión completa, que sí la mira.
- Textos y JSON de Social tienen tope en la tabla (perfil, publicaciones 8 KB, comentarios, comunidades, denuncias, mensajes). Las listas que llegan como array se recortan (60 alias, 30 publicaciones) y las páginas, a 30 filas.
- Frenos por día: 30 publicaciones, 5 comunidades, 20 denuncias, 20 invitaciones a compañía; mensajes al creador, 5 por hora y 300 en total.

Arreglado:
- **Las claves de la copia no tenían tope** (confirmado: `subir_copia` guardaba 20 MB en `claves` con una copia de 3 bytes, saltándose el tope de 30 MB, que solo mide `datos`). `0031_copias_tope_de_claves.sql` limita `claves` a un objeto de 2 KB (las reales ocupan unos 400 bytes) y hace que `tamano` cuente bytes. Prueba: `supabase/pruebas/copias.sql` (falla sin 0031). **Víctor tiene que ejecutar 0031** en el SQL Editor.

## Para Víctor

1. **Ejecutar `supabase/migrations/0031_copias_tope_de_claves.sql`** en el SQL Editor del proyecto (después de 0030). La app no cambia.
2. **Espacio por cuenta (decisión).** Cada cuenta puede ocupar hasta 60 MB en la base de datos (la copia, hasta 30 MB, y la anterior, otros 30 MB, que se borra cuando la copia lleva 7 días sin cambiar), y las cuentas se crean con cualquier email. Con el plan gratuito de Supabase (500 MB de base de datos) bastan unas pocas cuentas hechas a propósito para llenarla. Opciones: bajar el tope de la copia (por ejemplo, a 10 MB, si las copias reales quedan muy por debajo; la tuya se puede ver en Table Editor › `copias` › `tamano`), activar CAPTCHA en Authentication › Attack Protection (pide un cambio en la app y un servicio externo nuevo en la CSP), o vigilar el uso en el panel. Dime cuál prefieres.
3. **Panel de Supabase › Authentication › Rate Limits:** revisar los límites de envío de correos y de verificación del código (ya estaba en `seguridad.md` junto a la caducidad de 600 s).
