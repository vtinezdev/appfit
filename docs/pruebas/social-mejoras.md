# Validación de las mejoras de Social

Estado (2026-10-18): **2.291 tests / 191 archivos, build, seis suites SQL y ocho escenarios móviles correctos**. Regresión de refresco/error/páginas desconocidas comprobada de nuevo tras su último ajuste. Pruebas con personas, cuentas reales y dispositivos físicos pendientes. No representa un piloto realizado.

## Reproducir la automatización

- `npm run test` y `npm run build`. Si se ejecutan junto a navegadores/build en una máquina limitada, separar las ejecuciones para respetar los tiempos de los tests de geometría.
- Con Docker: `node scripts/sql/validar-social.mjs`. PostgreSQL 17 sin puertos publicados, usuarios sintéticos y rollback; sin Supabase real, correo ni pg_cron.
- Backend falso: `node scripts/ui/supabase-falso.mjs`.
- Vite: `VITE_SUPABASE_URL=http://127.0.0.1:54329 VITE_SUPABASE_PUBLISHABLE_KEY=falsa npm run dev -- --host 127.0.0.1 --port 5174 --strictPort`.
- Con Playwright y Chromium disponibles: `node scripts/ui/validar-social.cjs`. Solo `appfit-test.localhost:5174`. `APPFIT_UI_CASE=375-light` limita un caso; sin variable recorre ocho: 320/375/430, ambos temas y 375 con texto al 200 %. Evidencias por defecto en `/tmp/appfit-social`.

Se comprueban publicaciones/reintentos, destinos, notas independientes, mapa bajo demanda, omisión de cifras con capacidad habilitada únicamente en el doble, perfil deportivo, reglas/bienvenida, borrados/cancelación, borrador con Escape/Cerrar/fondo/Atrás repetido y foco, errores/desconexión, refresco sin salto, 250 comentarios, página desconocida completa y salida de creador suspendido. Las suites SQL añaden audiencia, permisos/RLS, cuotas existentes, bloqueos, moderación y compatibilidad.

## Antes del despliegue

- [x] Víctor confirma la ejecución correcta de 0009–0013, en orden después de 0008, en SQL Editor (2026-10-18), con «Success. No rows returned» en cada migración. Las suites sintéticas se han ejecutado solo en PostgreSQL temporal.
- [x] La migración 0013 mantiene `social_configuracion.campos_opcionales = false` en este despliegue. Confirmar actualización de lectores y que la versión de rollback también entiende omisiones antes de activar. Desactivar la opción detiene nuevas omisiones; no rellena publicaciones ya guardadas.
- [ ] Probar dos cuentas reales de prueba: solicitar/aceptar, enviar a seguidores y comunidad, verificar con cada cuenta qué se ve, salir, bloquear y revocar seguimiento. Comprobar también que el no autor no obtiene identidades de ánimo por RPC.
- [ ] Crear, transferir, delegar/revocar moderación, retirar contenido, expulsar y cerrar una comunidad de prueba. Un moderador no debe transferir ni expulsar a otro moderador. Expulsar no implica prohibición permanente de reingreso.
- [ ] Perfil suspendido de prueba: sin feed ni publicación; inventario/cierre exclusivo de comunidades propias; retirada final del perfil. Diario/copia/cuenta siguen intactos.
- [ ] Safari y PWA en iPhone físico: teclado, foco al continuar borrador, gesto/Escape/Atrás, scroll de Sheets largos, giro/recortes, texto grande, light/dark y errores de red.
- [ ] Android físico: teclado y Atrás, confirmaciones con texto grande, suspensión/reanudación y versión instalada de PWA.

## Tareas de uso antes del siguiente piloto

Con 6–8 participantes, incluyendo principiantes y alguien que prefiera no usar Social. Registrar si terminan cada tarea y qué creen que se ha enviado; no recoger datos del diario ni instalar analítica.

1. Crear perfil sin exponer medidas y explicar qué es opcional.
2. Compartir código, solicitar/aceptar y distinguir Sigues de Te siguen.
3. Preparar un entreno con nota, elegir detalles y audiencia, explicar el envío de la vista previa.
4. Dar ánimo y responder; distinguir quién puede conocer las identidades.
5. Abrir una persona desde Amigos, feed y comunidad y volver al origen.
6. Salir accidentalmente del editor, continuar sin perder texto y recuperar un error de red.
7. Distinguir una copia de comunidad de la de seguidores y borrar solo una.

Los filtros por tipo esperan datos de volumen. La ocultación automática espera capacidad de revisión y decisión de umbral. Fase 3 requiere los pilotos/decisiones del [plan](../social-mejoras.md); no se activa al dar por buenas estas pruebas técnicas.
