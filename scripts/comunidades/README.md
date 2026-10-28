# Recursos de comunidades

Recursos del catálogo visual aprobado el 2026-10-28 e integrado en Social. El guardado requiere que Víctor ejecute `supabase/migrations/0028_comunidades_imagen.sql`; el script de recursos no modifica Supabase. Contrato y flujos en `docs/features/social.md`, ADR 062.

## Qué se entrega

- 36 WebP individuales de 256 × 256, suficientes para los recuadros de 40 y 80 px, incluido 80 px a densidad 3×. Son los seis lugares originales y 30 ampliaciones.
- `fuentes.json`: disposición exacta de los seis lotes, SHA-256 de los PNG originales y metadatos del catálogo. Los identificadores `lugar.<slug>` no se reutilizan para otro dibujo.
- `preparar-imagenes.mjs`: extracción y codificación reproducibles con `sharp`, que ya es dependencia del proyecto. No genera imágenes, no consulta servicios y no cambia el diseño aprobado.
- `vista-previa.html` / `vista-previa.tsx`: visor de los componentes reales con datos sintéticos, sin importar la app, IndexedDB ni Supabase.
- `validar-vista-previa.cjs`: comprobaciones de interacción, carga de los 36 recursos, ausencia de desbordamiento, teclado, iniciales, imagen fallida y controles deshabilitados; 320/375/430 en ambos temas y 375 con texto al 200 %.

Los originales pesados se mantienen en `originales/`, ignorado por este directorio. No hacen falta para usar o compilar las imágenes. El archivo de originales entregado aparte conserva esos seis PNG para futuras regeneraciones.

## Regenerar

Extraer los seis originales como `originales/lote-01.png` … `lote-06.png` (o usar la ruta a otro directorio):

```bash
node scripts/comunidades/preparar-imagenes.mjs
node scripts/comunidades/preparar-imagenes.mjs /ruta/a/los/originales
```

El script verifica las huellas y la disposición antes de escribir. Genera los WebP en `src/features/social/assets/comunidades/` y `catalogoImagenesComunidad.ts` desde un único manifiesto. Los originales y los WebP son opacos: no se elimina su fondo.

## Revisar sin tocar datos

Desde la copia de preparación, usar un puerto libre y el hostname de pruebas del proyecto:

```bash
npm run dev -- --host 127.0.0.1 --port 5187 --strictPort
```

Abrir `http://appfit-test.localhost:5187/scripts/comunidades/vista-previa.html`. La página solo cambia estado de React en memoria. No se guarda la elección ni se accede a una cuenta.

En otra terminal:

```bash
node scripts/comunidades/validar-vista-previa.cjs
npx vite build --config scripts/comunidades/vite.config.mjs
npm run test
npm run build
```

El build aislado del visor emite los recursos y componentes nuevos aunque todavía no estén importados por la app. Su salida queda en `node_modules/.tmp/comunidades-build`, sin sustituir `dist`. El build normal comprueba tipos y regresiones de la aplicación actual; por sí solo no acredita que las pantallas estén conectadas al nuevo catálogo.

`APPFIT_COMUNIDADES_URL` cambia la URL del visor (solo se acepta el hostname `appfit-test.localhost`); `APPFIT_COMUNIDADES_OUTPUT` cambia el directorio de capturas, por defecto `/tmp/appfit-imagenes-comunidades`.

## Build de la aplicación y caché

Con `npm run build` terminado, servirlo con `npm run preview -- --host 127.0.0.1 --port 5175 --strictPort` y ejecutar `node scripts/comunidades/validar-build.cjs`. Comprueba por SHA-256 que los 36 WebP se emiten sin cambios, que sus URLs figuran en el service worker y que se decodifican desde CacheStorage con el navegador sin conexión. Solo acepta `appfit-test.localhost`, no necesita cuenta ni servidor falso. `APPFIT_COMUNIDADES_BUILD_URL` cambia el origen de pruebas.
