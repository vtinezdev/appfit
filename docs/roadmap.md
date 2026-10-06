# Roadmap: pendientes, ideas y descartadas

Única lista viva de lo que falta. Cuando algo se haga, se quita de aquí (y se documenta donde toque); cuando se descarte, pasa a «Descartadas» con el motivo. Nada de esto se empieza sin que Víctor lo pida. Origen de la mayoría de ideas (con su valor y esfuerzo estimados): `historico/ideas-nutricion-v2.md`.

## Pendiente de probar en el iPhone real

Según los registros de sesión, sin confirmar todavía (preguntar a Víctor antes de darlo por hecho):
- Rediseño completo (§51): safe areas, teclado y tacto en iOS/Android reales. Chromium cubre tamaños/temas/foco/scroll y viewport reducido, no reproduce el teclado real de WebKit.
- Catálogo: tiempo de importación (~6.300 filas) y de búsqueda en Safari/WebKit.
- Escáner: 3 productos reales (la cámara necesita HTTPS).
- Exportar el backup (`<a download>` con un blob) desde la PWA instalada.
- Persistencia (§44): trasladar una copia de Safari al acceso de pantalla de inicio, cerrar/reabrir y actualizar la PWA en la misma dirección. Comprobado en Chromium con perfil persistente y modos de iOS emulados; confirmar el comportamiento del almacenamiento y del permiso en WebKit.

## Limitaciones conocidas

- Ajustes: los campos de objetivos diarios desbordan a 375 px con texto al 200% (fila sin wrap y anchos fijos). Detectado al confirmar los fondos claros; pendiente de adaptación del formulario, sin relación con la capa fotográfica.
- No se puede borrar un pesaje (solo se sustituye el del día).
- La mini gráfica de peso reparte los puntos por orden, no por fecha.
- Buscador e intérprete priorizan los básicos compartidos en `catalogo/preferidos.ts`; arroz, pasta y pollo sin más detalle se eligen en crudo. Si se pesa en cocido, especificarlo o usar «Cambiar». Si aún hay ruido, valorar sugerencias prioritarias con «Ver más variantes», sin fusionar alimentos por nombre.
- Catálogo: no hay genéricos españoles (manchego, tortilla de patata…); la categoría y la detección de idioma de Open Food Facts son heurísticas (ver `scripts/catalogo/README.md`).
- «Alimentos» ya no muestra la procedencia de cada alimento (se quitó en §38).
- El `theme_color` del manifest es el claro; el meta de la página se adapta al tema.

## Ideas sin empezar

Registro:
- **Porciones propias por alimento** («1 rebanada de mi pan = 35 g»). Hoy solo existen las raciones fijas del intérprete.
- **Recetas caseras**: ingredientes + peso cocinado, y registrar gramos de la receta. `Meal` está pensado para admitir un peso cocinado opcional.

Cuerpo y objetivos:
- Media móvil de 7 días del peso (hoy solo la variación a 7 días).
- Calculadora de objetivos (Mifflin-St Jeor + actividad + déficit o superávit).
- Objetivos distintos en días de entreno y de descanso (primera integración real Gym ↔ Nutrición).
- Agua.
- Definir recomendaciones contrastadas por grupos de alimentos y comparar raciones con el consumo real. La sección Referencias y sus tipos ya están preparados; faltan fuentes, valores y clasificación de alimentos, sin recomendaciones ficticias.

Análisis:
- TDEE adaptativo con el peso y las kcal registradas (necesita semanas de datos).
- Adherencia: % de días dentro de ±10 % del objetivo y rachas.
- Alimentos que más kcal o proteína aportan en un periodo.
- Exportar CSV de entradas y pesos.

Calidad de datos:
- Aviso de coherencia energética (kcal frente a 4·P + 4·C + 9·G) en la revisión y en Alimentos; la tubería del catálogo ya tiene uno (`calidad.ts`).
- Alias y fusión de alimentos propios duplicados («pechuga de pollo» / «pollo, pechuga»), reasignando entradas y plantillas.

Experiencia:
- Recordatorio de backup («hace 14 días que no exportas»).

Catálogo:
- BEDCA como fuente, si AESAN/BEDCA lo autorizan (ver `scripts/catalogo/README.md`).

## Descartadas

- **Todo lo que dependía de la IA** (foto de la etiqueta o del plato, «¿qué como?», cola de audio sin conexión, probar la conexión con Gemini): la IA se retiró ([ADR 006](decisiones/006-sin-ia-interprete-local.md)).
- **Notificaciones push y recordatorios**: en iOS necesitan un servidor push, lo que rompe «sin backend».
- **Atajos de iOS y enlaces profundos** (`?texto=…`): Atajos abre Safari, que en iOS tiene un almacenamiento separado del de la PWA instalada.
- **Compartir una foto a la app** (Web Share Target): no existe en iOS.
- **Sincronización entre dispositivos**: requiere backend; el backup JSON cubre el cambio de móvil.
- **Micronutrientes completos** (vitaminas, minerales): complican mucho la UI para un uso personal.
- Fuentes de catálogo descartadas (USDA, CoFID…): `scripts/catalogo/README.md` § Fuentes.
