# Auditoría integral de AppFit · 17 de octubre de 2026

> Actualización posterior: A06 y A07 se abordan en las mejoras de uso de PROCESO §154. Este informe conserva los resultados y pendientes tal como se observaron al cerrar la auditoría.

## Alcance y método

Auditoría solicitada en el texto adjunto: reconocimiento, uso real, correcciones reproducibles y prevención. Se parte del trabajo de adaptación a tamaños/Android ya presente en el árbol; esos cambios no se presentan como hallazgos nuevos. No se usan datos personales, cuentas reales, APIs de productos reales ni el origen personal `localhost:5173`. Sin push, merge ni despliegue.

Inventario reproducible: [inventario.json](inventario.json), obtenido de los archivos reales del repositorio, excluyendo dependencias, builds, Git y copias de trabajo. 1.179 archivos; 602 fuentes TS/TSX/CSS; 215 componentes/pantallas React; 181 archivos de tests al inicio. Enumerar no significa haber verificado cada rama de cada componente.

## Arquitectura reconocida

- React 19, TypeScript, Vite 8, Tailwind 3 con tokens, Dexie/IndexedDB, Recharts, dnd-kit, lector local de códigos y vite-plugin-pwa/Workbox. SPA sin rutas URL: 12 destinos en `app/navegacion.ts`; subpantallas en estado React.
- Datos locales y transacciones en repositorios de cada feature. Backup v3, esquema Dexie v12; 21 tablas de usuario y 2 de catálogo. La sesión visual del entreno y su descanso usan sessionStorage; series, confirmaciones y entrenos usan IndexedDB. Se verifica la cifra de tablas con el inventario de `shared/db/db.ts`.
- Cuenta opcional: copia cifrada en el cliente y Supabase; Social/Amigos/comunidades solo con configuración y cuenta. Pruebas de red con dobles locales, nunca contra usuarios reales.
- PWA: identificador/origen estable, registro explícito, actualización a petición de la persona, chunks y fuentes precacheados; imágenes de ejercicios, WASM y lugares bajo caché de ejecución. `version.json` compara identidad sin cachear los metadatos.
- Arranque: tema/viewport/instalación, persistencia del navegador, ajustes, catálogo diferido y copia de nube opcional. Las APIs de cámara, GPS, audio, Wake Lock, persistencia y SW se inspeccionan junto con sus fallbacks.

## Matriz de cobertura ejecutada

La matriz automatizada final tiene **30 configuraciones correctas y 690 comprobaciones de pantallas/estados**. Son 23 estados por configuración, no 690 pantallas diferentes. El inventario es más amplio que el recorrido automatizado: no se certifican todas las variantes de los 215 componentes. Los calendarios compactos siguen teniendo objetivos táctiles inferiores a 44 px; se registran por separado como pendiente A06.

La tabla siguiente recoge los flujos identificados y los escenarios de reconocimiento. Su enumeración no significa ejecución exhaustiva; las tablas de combinaciones y resultados posteriores delimitan lo realmente probado.

| Área real | Pantallas/flujos identificados | Escenarios considerados |
|---|---|---|
| Inicio | Energía, peso/historial, agua, creatina opcional, avisos, revisión semanal | Vacío/con datos, formularios, lectura/backup, texto ampliado |
| Entreno › Gimnasio | Empezar, Rutinas/editor/asistente, activo/minimizado, catálogo, serie/RIR/carga/ejecución/nota/progresión | Inicio, búsqueda, edición, decimales, doble acción, errores de escritura, navegación, recarga, cierre/reapertura, fin y descarte |
| Historial/Progreso/Liga | Calendario, detalle/editor, registro pasado, gráficas y alternativas | Lectura, corrección, borrado/Deshacer, series confirmadas/pendientes, ligas |
| Entreno › Actividades | Lista, registro manual/GPX, grabación y detalle | Formularios, vacío/con datos, permisos/fallbacks; GPS/cámara físicos separados |
| Nutrición | Diario, añadir/revisar, platos, Alimentos/recetas/plantillas, Resumen | Navegación, formularios, datos sintéticos, scroll y gráficas |
| Perfil/Referencias | Datos/medidas, energía/metodología, índice y seis áreas | Formulario, fechas/decimales, enlaces internos, lectura sin escritura |
| Cumbres/Caminos/Ritmo/Vitrina | Montañas, rutas/pasos/zancada, semanas/pausas, logros/récords/colecciones | Vacío/con datos, modales, listas, cifras largas y lectura sin escritura |
| Ajustes/Cuenta | Índice y 12 secciones, copia/importación, apariencia, instalación y actualización | Tema, capas, importación válida/inválida, persistencia y fallos |
| Social/Amigos | Feed, perfil, comentarios, avisos, comunidades | Simulador local y tests existentes; sin cuenta remota real |
| PWA/datos | Offline, reconexión, SW A→B, copia cifrada/fallos/conflictos | Navegador de producción y tests de repositorios/gestor |

| Eje | Matriz ejecutada |
|---|---|
| Tamaños exigidos | 320×568, 360×800, 375×667, 390×844, 430×932, 768×1024, 1024×768, 1440×900 |
| Navegadores | Chromium 151.0.7922.173; Firefox 153.0; WebKit 26.5, todos ejecutados en Linux con Playwright 1.62.1 |
| Interacción | Teclado/foco/Tab/Escape/Atrás; táctil emulado en motores que lo soportan; puntero de escritorio |
| Variantes | Claro/oscuro, Reduce Motion y texto 200 %, vacío/datos sintéticos, nombres largos/cifras grandes, viewport reducido |
| Límites | PWA instalada, teclado nativo, notch, gestos, suspensión del SO, GPS/cámara/audio reales requieren hardware; emulación no los certifica |

## Resultados y hallazgos

Los niveles expresan el impacto observado: A01 y A02 afectan al registro correcto de una sesión; A03/A04 a su lectura y uso con texto ampliado; A05 a la geometría. No apareció un P0 que inutilice la aplicación o destruya un historial en los escenarios ejecutados. Esto no descarta defectos fuera de la cobertura.

### A01 · P1 · La coma decimal cambia el peso registrado

- Pantalla/componente: entreno activo y editor del historial, `CampoSerie` en `PanelEjercicio.tsx` (incluye lados y bajadas que reutilizan el campo).
- Reproducción: Chromium, 390×844, locale es-ES; crear entreno y una serie, vaciar el peso y escribir `72,5` tecla a tecla, salir del campo y leer el backup.
- Esperado: 72,5 kg. Observado: **725 kg** persistidos. Firefox persistió 72,5 con la misma secuencia, confirmando una diferencia entre motores.
- Causa: `type=number` entrega al componente una cadena dependiente del motor/localización; el componente la convertía con `Number` después de que el navegador descartara la coma.
- Corrección: texto con teclado decimal y parser común coma/punto; borrador durante foco, redondeo de dos decimales, semántica spinbutton e incremento/decremento con flechas conservados. No se cambian límites ni reglas de cálculo.
- Evidencia: [captura anterior](evidencias/a01-coma-antes.png), [después](evidencias/a01-coma-despues.png); medición previa `72,5 → 725` en Chromium.
- Verificación: escenario de escritura real con coma/punto, edición parcial y flecha; 11 escenarios diarios completos pasan en Chromium, Firefox y WebKit tras la corrección.

### A02 · P1 · Cierre del entrenamiento tras fallar el guardado de notas

- Pantallas: EntrenoActivo y editor de DetalleEntreno.
- Reproducción: crear sesión de prueba y una serie; hacer que IndexedDB rechace solo los updates de `notas`, escribir una nota y pulsar Terminar → Guardar y terminar.
- Esperado: conservar el formulario y permitir reintentar; no anunciar éxito perdiendo la nota. Observado: «Sesión guardada en el historial», `fin` persistido y **sin `notas`**. En el editor, Listo también salía aunque fallase la nota.
- Causa: `guardarNotas` capturaba el error sin devolver el resultado al cierre; el cierre continuaba.
- Corrección: comunicar el resultado de la escritura; impedir el fin/salida del editor si falla; conservar nota y permitir reintentar. La transacción del cierre no cambia.
- Evidencia: [éxito aparente anterior](evidencias/a02-notas-antes.png); backup sintético previo con `fin` y sin el texto solicitado.
- Verificación: inyección de fallo, comprobación de sesión aún activa, reintento y lectura independiente de la nota; también Listo en historial. Pasa en los tres motores.

### A03 · P2 · Nombre de alimento reducido a una columna ilegible

- Pantalla: Nutrición → Alimentos, filas de `Alimentos.tsx`; 375×667 con texto al 200 %, Chromium/Firefox.
- Reproducción: importar fixture de prueba, entrar en Alimentos y ampliar texto.
- Esperado: nombre y nutrientes legibles completos. Observado: **19 px** de ancho para el nombre frente a una cifra energética que no encogía; palabras casi letra a letra y glifos que excedían la columna.
- Causa: fila flex sin wrap y cifra de kcal con shrink-0.
- Corrección: permitir wrap dentro del botón y dar una base de lectura al nombre; las kcal pasan debajo cuando falta espacio. Mismo botón, datos y acciones.
- Verificación: matriz final correcta en los tres motores, incluidos ambos temas al 200 %; [fila corregida](evidencias/a03-alimento-despues.png).

### A04 · P2 · Campo de peso estrecho con texto ampliado

- Componente compartido: NumberStepper, observado en Registrar peso, 375×667 al 200 %, especialmente WebKit.
- Observado: campo de 117 px incluyendo padding/unidad; contenido de 141 px, valor parcialmente desplazado/oculto entre los botones de ±88 px y la unidad.
- Causa: ancho fijo del campo que encogía entre dos controles que no encogían.
- Corrección: rejilla adaptable por ancho real; con menos de 10 rem, campo y unidad en una fila y los dos controles debajo. No reduce texto ni targets.
- Verificación: matriz final correcta en los tres motores; campo, unidad, controles y Guardar accesibles con texto al 200 %; [captura corregida](evidencias/a04-selector-despues.png).

### A05 · P3 · Anillos semanales deformados a 320 px

- Pantalla/componente: Diario, `.semana-anillo`; 320×568, tres motores.
- Reproducción: abrir Diario en la anchura mínima y medir el SVG dentro de su celda de siete días.
- Esperado: anillo cuadrado dentro de la celda. Observado: ancho comprimido de unos 38 px con altura fija de 44 px; al girar el SVG, su extensión horizontal sobresalía unos 3 px.
- Causa: altura fija mientras el ancho podía encoger.
- Corrección: `height: auto` y `aspect-ratio: 1`, conservando ancho máximo y distribución semanal.
- Verificación: reejecución a 320 px en los tres motores sin desbordamiento; datos y acciones sin cambios. Medidas en [cobertura.json](cobertura.json).

### Mediciones que no son defectos confirmados

Los primeros diagnósticos señalaban 8/12 px de extensión en cabeceras de Progreso y del aviso de categorías. Corresponden a márgenes negativos explícitos de los botones, dentro del padding del contenedor; no se detectó recorte ni acción inaccesible. No se rediseñan para hacer pasar una medición. El detector conserva la comprobación de página, inputs y desbordamientos no explicados por esos márgenes. Las capturas iniciales tomadas antes de terminar la entrada de una capa no se usan como prueba de que la capa sea invisible.

### Automatización existente

Se localizaron esperas del antiguo botón global «Registrar» en nueve scripts; se actualiza únicamente la señal de arranque a «Registrar peso». El test del catálogo esperaba el check dentro de un panel que ahora se pliega al completar todas las series: se despliega por la interfaz antes de verificar la marca. Los scripts no ejecutados no se consideran aprobados por cambiar su selector.


## Dispositivos y combinaciones probados realmente

Todos son navegadores automatizados en Linux. Chromium y WebKit permiten contexto móvil/táctil; Firefox usa viewport y puntero porque Playwright no ofrece la misma emulación móvil. **Ninguno es un teléfono físico.** WebKit en Linux no equivale a Safari instalado en iOS.

La siguiente combinación se ejecutó completa en cada uno de los tres motores; no se afirma haber probado ambos temas en cada tamaño:

| Viewport | Tema | Escala de texto |
|---|---|---|
| 320×568 | Claro | Normal |
| 360×800 | Oscuro | Normal |
| 375×667 | Claro | Normal |
| 390×844 | Oscuro | Normal |
| 430×932 | Claro | Normal |
| 768×1024 | Oscuro | Normal |
| 1024×768 | Claro | Normal |
| 1440×900 | Oscuro | Normal |
| 375×667 | Claro y oscuro, dos casos | 200 % |

En cada configuración: Inicio, Registrar peso y viewport reducido, Diario, Resumen, Alimentos, Añadir comida, Rutinas, Historial, detalle, editor, Progreso en lista y gráfica, Actividades, Perfil, Cumbres, Caminos, Ritmo, Vitrina, Colecciones, Referencias y Ajustes. Se comprueban página y desbordamiento interno, inputs, apertura/cierre de capas y conservación del backup; las medidas táctiles registran también las excepciones pendientes. Los recorridos de catálogo, creador de rutinas, Cuenta y Social indicados abajo son complementarios, a 375 px oscuro, no toda esta matriz.

El trabajo previo de adaptación (§152) añade 14 configuraciones Chromium con ambos temas, horizontal 812×375, Reduce Motion, navegación por teclado/Atrás y oferta de instalación simulada. Sus resultados se documentan en esa entrada; no se suman a las 30 configuraciones nuevas.

## Pruebas ejecutadas y resultado final

| Prueba | Resultado comprobado |
|---|---|
| `npm run test` | **2.248 tests, 181 archivos, todos correctos**; incluye repositorios, migraciones, backup, viewport, instalación y lógica de negocio |
| `npm run build` | TypeScript, Vite y PWA correctos; 108 entradas precache, 2.607,66 KiB; dos builds adicionales para actualización A/B |
| `npm run test:ui` con tres motores | **33 escenarios correctos**: 11 por motor; cero errores JavaScript no controlados en las páginas usadas |
| `npm run test:ui:responsive` con tres motores | **30/30 configuraciones, 690 medidas**; sin overflow inesperado ni inputs inferiores a 16 px en la cobertura final |
| `auditoria-datos.cjs`, Chromium | **4 escenarios correctos**: actividad manual inválida/válida con coma, GPX inválido/válido, descripción local de comida con revisión, backup inválido sin reemplazo/exportación |
| `validar-catalogo-ejercicios.cjs`, Chromium 375 oscuro | 4 estados correctos: recientes, filtros, personalizado y sesión; confirmación/continuación por la interfaz |
| `validar-creador-rutinas.cjs`, Chromium 375 oscuro | Preguntas, plan, cambio y creación correctos |
| `validar-cuenta.cjs`, Chromium 375 oscuro | Copia cifrada, claves inválidas, dos contextos, elección local/remota, conflicto/reintento y cierre de sesión conservando datos; Supabase simulado |
| `validar-social.cjs`, Chromium 375 oscuro | Feed, publicación/comentarios, comunidades, edición de descripción y permisos de publicación correctos; Supabase falso local |
| `validar-actualizaciones.cjs`, Chromium producción | UI de actualización y SW real A→B: fallo de descarga, reintento, dos pestañas, reapertura offline y todas las tablas conservadas |
| `npm run test:ui:offline`, Chromium producción | Recarga offline, pesaje conservado y nueve destinos diferidos abiertos por primera vez sin conexión, sin errores de ejecución |

La reapertura del entreno significa cerrar la página y abrir otra en el mismo contexto, con IndexedDB conservado. La prueba del SW sí cierra y relanza un contexto persistente completo antes de abrir offline. Ninguna simula con fidelidad que Android/iOS termine la PWA por presión de memoria.

La regresión de entrenamiento no solo comprueba mensajes: consulta un backup independiente para verificar identidad, orden, peso, confirmación, `fin` y notas. Incluye doble inicio sin duplicados, búsqueda y cancelación del catálogo, coma/punto y edición parcial, incremento con flechas, altas rápidas, confirmación reversible, campos incompletos, fallo de escritura con rollback/reintento, minimizar/cambiar de sección, recarga/reapertura, borrar/Deshacer, cancelar finalización y notas fallidas en activo e historial.

## Persistencia, red y APIs

No se cambia esquema, versión de backup, cálculo, transacción de cierre ni reglas de progresión. La matriz de lectura compara el backup antes/después; las escrituras funcionales usan fixtures nuevos y verifican su resultado. Los fallos de IndexedDB se provocan sobre registros sintéticos concretos.

En producción, los recursos precacheados permiten abrir los destinos diferidos sin conexión. La prueba A→B provoca el fallo de descarga de un chunk, reintenta, aplica la actualización desde una pestaña y comprueba que la otra no se recargue sin pedirlo; compara todas las tablas, cierra y vuelve a abrir offline. No certifica cachés o despliegues históricos ajenos a esas dos builds locales.

Cuenta usa tráfico interceptado y Social un servidor falso: sirven para verificar comportamiento del cliente, copia cifrada, errores y conflictos. **No se conectó a Supabase real ni se reejecutaron sus suites SQL/RLS** en esta auditoría. El estado previo de migraciones reales se conserva en la documentación; no se presenta como una nueva prueba remota.

[apis.json](apis.json) conserva el sondeo de los tres motores: IndexedDB, WebCrypto, VisualViewport, inert, ResizeObserver, PointerEvent y SW disponibles. Cámara, geolocalización, Wake Lock y WebAudio exponen API, pero no se verificó su funcionamiento físico. La API de persistencia no aparece en WebKit; el arranque dispone de fallback y pudo ejecutarse. BarcodeDetector nativo no aparece en ninguno; el proyecto dispone del lector WASM y entrada manual. Disponibilidad de una API no demuestra concesión de permisos ni lectura de sensores.

Durante la preparación de WebKit hubo fallos de catálogo al recargar mientras se descargaba. Se corrigió el montaje de prueba: esperar la actualización viva de Dexie en vez de destruir la página innecesariamente. Se reejecutaron los diez casos WebKit completos, todos correctos. No se modificó la aplicación para ocultar errores de red. [diagnostico-inicial.json](diagnostico-inicial.json) es exploratorio y contiene ejecuciones descartadas por preparación/HMR; no debe interpretarse como el resultado final ni como defectos confirmados del producto.

## Textos, primera utilización e interacción

Se recorrieron estados vacíos, búsqueda sin completar, cancelación, errores en línea y reintento con los nombres y convenciones en español del proyecto. El inicio vacío ofrece sesión vacía; los registros requieren una acción explícita; la revisión de comida permite comprobar antes de guardar. Se conservaron etiquetas, unidades y coma decimal. El fallo de notas dejó de producir una confirmación de éxito incorrecta (A02).

No se confirmó una errata que justificara cambiar textos en los recorridos ejecutados. Esta revisión no equivale a una prueba de comprensión con personas nuevas ni a la lectura manual de toda cadena traducible. Con texto muy grande algunas pestañas parten palabras; siguen accesibles, pero merecen revisión visual como A07.

La reducción de viewport verifica que una capa puede desplazarse y sus acciones siguen alcanzables. Las medidas de tamaño/foco aportan prevención para móvil; no demuestran que el teclado nativo, la barra dinámica o los gestos se comporten igual en un teléfono. No se certifica arrastre táctil de rutinas ni gesto accidental de desplazamiento con esta auditoría.

## Pendientes y límites explícitos

| ID / prioridad | Reproducción y evidencia | Recomendación y estado |
|---|---|---|
| A06 · P3 · Objetivos táctiles de calendario | Diario a 320 px: ancho ≈38 px. Historial a 320/360/375: ≈36–43 px; a 375 con texto 200 %, ≈32 px y alto 88. Esperado general del diseño: al menos 44×44. Siete columnas y gaps limitan el ancho. Medidas `tacto` en cobertura.json. No hay botón oculto, pero no cumple el objetivo de 44 px. | Pendiente: decidir una alternativa compacta/lista o navegación por día accesible y probar con dedo; no ampliar por solapamiento ni rediseñar calendario sin decisión. La lista del historial sigue disponible. |
| A07 · P3 · Partición de rótulos al 200 % | Abrir pestañas de Gimnasio/Nutrición a 375 px con texto 200 %. Algunos nombres se reparten en varias líneas dentro del espacio disponible. No se detectó recorte ni pérdida de acción. | Recomendación de UX pendiente: revisar lectura/alto de rótulos con usuarios antes de cambiar patrón. |
| Hardware · sin severidad de defecto asignada | No hay iPhone/Android conectado ni PWA instalada físicamente. | Probar teclado, instalación, safe areas, giro, Atrás, barras dinámicas, sensores y suspensión del SO. |
| Servicios reales · sin severidad asignada | Cuenta/Social simulados; sin SQL/RLS remoto ni correo real. | Prueba controlada con cuentas de QA y backend autorizado antes de abrir nuevas versiones a más usuarios. |

Otros límites: no se certifican navegadores antiguos, todos los modelos Android, todas las combinaciones de tamaño/tema ni todos los catálogos/importaciones posibles. Liga, logros, récords y métricas tienen cobertura de lectura y tests existentes; no se simuló manualmente cada escalón histórico ni el rendimiento con años de datos reales. Los estados de carga reales bajo toda latencia posible y todas las interrupciones del sistema quedan fuera de la certificación.

**iOS:** comprobar Safari y PWA por separado, almacenamiento separado, expulsión de IndexedDB por el sistema, teclado decimal/zoom, notch y barras dinámicas, regreso desde segundo plano, audio/cámara y actualización instalada. WebKit Linux aporta regresión del motor, no garantía sobre esas políticas de iOS.

**Android:** comprobar Chrome y PWA instalada, oferta real de instalación y recorte del icono, teclado Gboard/Samsung con coma/punto, gesto/botón Atrás, safe areas y giro, permisos de cámara/GPS y primera apertura offline. Doze, cierre por memoria, suspensión de GPS y Wake Lock no se reproducen con emulación. La grabación fiable de GPS en segundo plano sigue siendo un límite de la web documentado en el roadmap, no se promete resolverlo con CSS.

## Prevención y evidencias conservadas

Se añaden runners mantenibles de entrenamiento, geometría y formularios, reutilizando Playwright del entorno sin añadir dependencias a la PWA. Las aserciones se apoyan en datos, semántica y medidas; las capturas sirven como evidencia, sin comparar píxeles frágiles. Los scripts devuelven fallo si un motor no puede arrancar o hay error; los pendientes táctiles documentados se registran aparte.

Comandos y preparación completos: [desarrollo](../desarrollo.md#regresión-esencial-y-auditoría-multi-navegador). Con servidores de prueba 5173/5174 y Playwright disponible:

```bash
npm run test
npm run build
APPFIT_AUDIT_BROWSERS=chromium,firefox,webkit npm run test:ui
APPFIT_AUDIT_BROWSERS=chromium,firefox,webkit npm run test:ui:responsive
node scripts/ui/auditoria-datos.cjs
npm run test:ui:offline
```

Se añade `.github/workflows/qa.yml` para PR y push a master: Vitest/build y tres motores, formularios y producción offline; captura artefactos incluso si falla. YAML revisado y comandos ejecutados localmente; **el workflow aún no se ha publicado ni ejecutado en GitHub**. La actualización real A→B y Cuenta/Social son comprobaciones adicionales locales; no se afirma que ese workflow ya las cubra.

Para desarrollo, ejecutar la regresión del área cambiada; antes de merge, unitarios/build y núcleo UI; antes de una versión relevante, matriz completa, SW A→B y prueba física iPhone/Android. Priorizar A06 y una prueba de primera utilización sobre añadir más capturas idénticas.

Evidencias retenidas en el repositorio:

- [Inventario](inventario.json), [matriz final](cobertura.json), [entrenamiento final](entreno.json), [formularios](formularios.json), [APIs](apis.json).
- [Resultados y comandos](resultados.json), [actualización real](actualizaciones.json), [catálogo](catalogo.json), [rutinas](rutinas.json), [Social simulado](social.json).
- [Logs finales](logs/) de tests, build y recorridos complementarios, incluida Cuenta.
- [Coma antes](evidencias/a01-coma-antes.png) y [después](evidencias/a01-coma-despues.png), [notas antes](evidencias/a02-notas-antes.png), [alimento corregido](evidencias/a03-alimento-despues.png), [selector corregido](evidencias/a04-selector-despues.png). Solo datos sintéticos.

Los JSON generados conservan algunas rutas `/tmp` de capturas de la sesión; las cinco imágenes anteriores sí se guardan aquí para revisión duradera. No se incluyen cientos de imágenes redundantes.

Cierre: cinco defectos confirmados corregidos (dos P1, dos P2 y uno P3), dos observaciones P3 pendientes, verificación local en verde. Sin cambios de datos reales, dependencias nuevas, commit, push, merge ni despliegue.
