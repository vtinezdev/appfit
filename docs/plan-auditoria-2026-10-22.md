# Auditoría: correcciones y decisiones de diseño

Decisiones de Víctor del 22 de octubre de 2026. **Primero se corrigen los errores de la auditoría; después se implementan las mejoras visuales.** No se debe interpretar la aprobación de las previews como autorización para adelantar esa segunda fase.

## Fase 1 · Correcciones

- [x] AF-01: fuente compartida del día, actualización en medianoche/reanudación y fecha resuelta al registrar agua, peso o creatina. El Diario sigue hoy; conserva fechas históricas y el destino de una tarea abierta.
- [x] AF-02: arranque con fallo visible y reintento de apertura, más límite de errores para lecturas/renderizado. No se borran datos automáticamente.
- [x] AF-03: confirmación al salir de una comida con cambios; Seguir editando conserva texto y revisión. El formulario vacío sale directamente. No se añade persistencia del borrador ante cierre del proceso.
- [x] AF-04: objetivos diarios sin desbordamiento con texto ampliado.
- [x] AF-05: nombre y acciones de rutinas de Empezar con espacio disponible al ampliar texto.
- [x] AF-07: regresión incorporada al workflow de QA: medianoche, salida con cambios, fallos de almacenamiento y adaptación de los dos formularios.
- AF-06 sigue como riesgo de rendimiento pendiente de perfilado con históricos grandes y hardware representativo. Se elimina una lectura duplicada de Caminos en Inicio reutilizando el resultado de Vitrina; no cambian fórmulas, tablas ni agregados persistidos.
- Las pruebas físicas de iPhone/Android siguen pendientes; no se confunden con emulación.

**Validación local de las correcciones:** 205 archivos y 2.527 pruebas unitarias correctas; compilación correcta. Chromium: seis casos nuevos de auditoría, catorce configuraciones de adaptación (ambos temas y texto al 200 %), once escenarios de entrenamiento, cuatro de datos, seis de platos y registro visual a 375 claro. Build de producción con recarga sin conexión y apertura inicial de nueve destinos correcto. Datos sintéticos y origen aislado; los casos de almacenamiento y descarte comprueban también el backup. Firefox/WebKit no se han ejecutado en este entorno para esta corrección; el workflow queda preparado para los tres motores. Evidencias locales en `/tmp/appfit-correcciones-auditoria`.

## Fase 2 · UI/UX — primer bloque implementado y pausa

| Preview | Decisión | Estado |
|---|---|---|
| UI-01 · Inicio compacto | **Rechazada.** Conservar la gráfica actual del peso y el dibujo del vaso; no sustituirlos por las tarjetas numéricas de la preview. | No implementar |
| UI-02 · Resumen compacto del Diario | Aprobada. Mantener las tarjetas integradas de comida y sus cabeceras suaves. | Implementada |
| UI-03 · Pista para copiar/borrar | Aprobada: breve, descartable e inicial; conservar el gesto y Deshacer. | Implementada |
| UI-04 · Nombre del área Alimentos | Aprobado **«Mis alimentos»** para el nivel superior. No usar «Biblioteca». Típicas y plantillas permanecen unificadas. | Implementada |
| UI-05 · Típicas reconocibles | Aprobada. Iconos y número de alimentos; colección compartida entre desayuno, comida, cena y snack. | Implementada |
| UI-06 · Perfil incompleto | Aprobada con ajuste: **más pequeño y compacto** que la preview. Reutilizar los campos existentes. | Implementada |
| UI-07 · Requisitos de gasto observado | Aprobada. Aclarar presentación sin cambiar criterios ni cálculos. | Implementada |
| UI-08 · Atajo del mapa a ejercicios | Aprobada. Conservar el mapa. | Implementada |
| UI-09 · Primeros pasos de Social | Aprobada: compactos y ampliables, con cierre manual. | Implementada |
| UI-10 · Próximos logros | Aprobada. Reutilizar progresos e insignias; no añadir recompensas o reglas nuevas. | Implementada |

Víctor autoriza la fase visual el 22 de octubre y pide detenerse después del bloque en marcha. Se completan UI-02/03/04/05/08; **la última mejora implementada es UI-08, «Ir a ejercicios»**. No se inicia UI-06/07/09/10. Inicio conserva la gráfica y el vaso. El punto de continuación son esas cuatro mejoras, empezando por Perfil compacto.

**Validación del bloque visual:** 2.527 tests y build correctos; ocho configuraciones de Chromium (320/375/430 en ambos temas y 375 al 200 % en ambos temas), más registro visual/copiar a 375 claro y resumen vacío/habitual/exceso/extremo. «Cerrar pista» se comprueba además contra el backup completo: solo cambia su preferencia; el resto de consultas y el atajo no escriben. Evidencias en `/workspace/appfit-mejoras-visuales-2026-10-22`. Sin prueba física ni ejecución local de Firefox/WebKit para este bloque. Publicación autorizada por Víctor después de cerrar y validar este bloque; las cuatro mejoras pendientes permanecen aplazadas.

## Fase 2 · UI/UX — segundo bloque (UI-06/07/09/10)

Víctor pide continuar el 22 de octubre con las cuatro pendientes, sin commit ni push hasta que lo pida.

- **UI-06:** con el perfil incompleto, la card del resultado se sustituye por un bloque pequeño «Completa tu perfil»: «N de 5 datos», qué falta y un botón para el primer dato pendiente que abre su editor de siempre (`EditarDatoSheet` o `RegistrarPesoSheet`) y avanza al siguiente al guardar. El gasto observado queda plegado en un desplegable mientras tanto.
- **UI-07:** el gasto observado sin datos suficientes muestra por separado «Días con comidas · 18 de 23» y «Semanas con pesajes · 2 de 4», con barra y los pesajes de cada una de las cuatro semanas, calculados por `calcularGastoObservado` con los mismos registros que deciden el cálculo. Fórmula, criterios y selector estimado/observado sin cambios; explicación y límites en «Cómo se calcula y sus límites».
- **UI-09:** primeros pasos de Social plegados al entrar, con «1 de 3» y barra del progreso real; al ampliarlos, compartir código, unirse a una comunidad y compartir el entreno con su estado. Se conserva el cierre persistente (`social-primeros-pasos`) con una X.
- **UI-10:** «Próximos logros» antes del catálogo de la Vitrina: hasta tres con insignia, nivel perseguido, cifras y barra; abren el detalle existente. Sin ocultos sin conseguir ni umbrales, recompensas o reglas nuevas.
- Inicio conserva la gráfica de peso y el vaso; Nutrición, las tarjetas integradas de comidas.

**Validación del segundo bloque:** `npm run test` (207 archivos, 2.537 pruebas) y `npm run build` correctos. `validar-mejoras-pendientes.cjs` en ocho configuraciones de Chromium (320/375/430 en ambos temas y 375 al 200 % en ambos temas), con Social contra el Supabase falso: sin scroll horizontal, overflow ni controles menores de 44 px; consultar Perfil y Vitrina no escribe; el editor del perfil solo cambia el dato elegido. `validar-social.cjs` y `validar-pulido-auditoria.cjs` siguen correctos a 375 claro. Sin prueba física ni Firefox/WebKit locales.

La auditoría y las previews de esta sesión son artefactos de revisión externos al repositorio. Esta página conserva las decisiones necesarias para continuar aunque esos artefactos no estén disponibles en otro entorno.
