# Catálogo de ejercicios — 2026-10-06

Víctor solicita seleccionar ejercicios sin tener que escribirlos en cada rutina. Rama `feat/catalogo-ejercicios`. Se entregan 116 definiciones editoriales comunes con ids estables, músculos principales/secundarios y equipamiento; no se añaden variaciones para rellenar una cifra ni dependencias.

Selector común en ModalPage para rutinas y sesiones, búsqueda tolerante acotada, dos familias de chips combinables, seis recientes derivados de series y creación de personalizados. Filtrar/abrir no escribe. Los ids numéricos históricos permanecen: se materializa solo el elegido o se enlaza un antiguo por equivalencia exacta. Los personalizados quedan separados del catálogo y sus metadatos viajan en backup v2; sin transformación de registros ni cambio de Dexie v6. Crear identidad/primera serie es transaccional y reintentable.

Arquitectura vigente en [ADR 014](../decisiones/014-catalogo-ejercicios-local.md), flujo en [Gym](../features/gym.md), invariantes en [Datos](../datos.md) y componentes en [DESIGN-SYSTEM](../DESIGN-SYSTEM.md). Favoritos, imágenes/instrucciones, variantes y estadísticas futuras pueden referenciar los ids; no se implementan ahora.

## Validación y revisión

- 1.236 tests / 68 archivos: catálogo/clasificación, búsqueda/ranking/filtros, deduplicación de recientes, identidad antigua/personalizada, selección simultánea, rollback de primera serie y round trip de backup.
- TypeScript/build Vite/PWA correcto, catálogo disponible offline sin petición externa. `validar-build.cjs` abre el selector por primera vez offline en ambos temas y comprueba SW, fuentes/fondos/chunks y export íntegro.
- 32 estados de catálogo/rutinas/sesión en ocho contextos: 320/375/430 claro/oscuro, 1440 claro y 375 oscuro con texto al 200%/Reduce Motion. Crear/editar rutina, filtrar sin escritura, recientes, personalizado, reintento, serie/ID previo, marcar, cancelar y recargar conservando datos. Caso adicional de 375 claro: viewport de 430 px de altura y cierre bloqueado durante escritura pendiente; fallo conserva formulario y reintento funciona.
- Revisión manual acotada con Impeccable en móvil/escritorio y temas. La inspección inicial encuentra el título del personalizado desbordando al 200%; una tanda ajusta la cabecera compartida para envolver, conserva foco al cambiar de formulario y deja fijo solo el buscador para liberar espacio de lista. Confirmación conjunta correcta, sin más rondas de pulido. Detector sin hallazgos; no se añaden rasters.
- `validar-motion.cjs`: doce contextos correctos, incluyendo iPhone/Android emulados con Reduce Motion; navegación/cierre/Atrás, resize, series/marcas/descanso, borrado/Deshacer, fallo/reintento y finalización. La prueba de touchCancel sigue sobre Sheet, ahora en Terminar entreno (Añadir ejercicio usa ModalPage).

Capturas/informes temporales: `/tmp/appfit-catalogo-ejercicios/`, `/tmp/appfit-catalogo-teclado/` y `/tmp/appfit-catalogo-motion/`. Sin script de lint separado: guards/sintaxis y `git diff --check`. Chromium emulado, no validación física de Safari/iOS, Android ni lectores de pantalla. Sin commit, push ni despliegue.
