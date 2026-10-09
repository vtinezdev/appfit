# AppFit

App personal de nutrición y gimnasio para iPhone, instalable como PWA. Registra comidas escribiéndolas o dictándolas (interpretadas en el propio móvil, sin IA), lleva el control de tus entrenos y de tu peso, y guarda absolutamente todo **solo en tu propio móvil**: no hay backend, ni cuentas, ni servidor que vea tus datos.

> Proyecto personal de uso individual: no está pensado para varios usuarios ni para publicarse en tiendas de apps.

## Características

**Inicio**
- Aviso discreto cuando hace tiempo que no exportas una copia, y tarjeta de agua con su objetivo recomendado según tu sexo.
- Pantalla minimalista con tarjetas breves: una rueda de energía con lo comido en los colores de proteína, hidratos y grasa y lo que falta en negro (si te pasas, una segunda vuelta por dentro), el entreno en curso o el último, y el peso con su variación semanal e historial. Registro de comida directo desde Inicio. Identidad deportiva en grafito con un único acento naranja para actuar y para las calorías; títulos y métricas contundentes, tarjetas limpias y redondeadas, y tema claro y oscuro.

**Nutrición**
- Añadir comidas por texto libre o con el dictado del teclado: un intérprete local entiende alimentos, cantidades y medidas caseras («2 huevos», «una lata de atún», «un vaso de leche») y los busca en tus alimentos y en un catálogo de más de 6.000 alimentos (CIQUAL y productos de marca de Open Food Facts España). Sin conexión.
- Escáner de códigos de barras (Open Food Facts; solo se envía el número del código).
- Pantalla de revisión editable antes de guardar: muestra cómo se divide la descripción y permite añadir alimentos uno a uno o por tandas, conservando las correcciones y guardándolos juntos.
- Los alimentos guardados juntos aparecen como un plato desplegable, con nombre opcional, totales y edición de cada ingrediente. Platos y alimentos individuales comparten filas compactas, con nombre, cantidad/conteo, macros y kcal. «…» permite añadir ingredientes, mover, copiar y borrar el plato. Arrastrarlo desde su asa al desplegar ingredientes o usar «Mover» lo traslada completo a otra comida del día, con Deshacer. «Copiar plato» lo duplica a otra comida o día, manteniendo el original. Las comidas tienen títulos más destacados que los alimentos.
- Nutrición simplifica automáticamente el nombre de todos los alimentos, incluidos los que añades manualmente, mientras Añadir comida conserva el nombre completo. Se puede personalizar la etiqueta sin cambiar los nombres originales ni sus nutrientes.
- Buscador con frecuentes, plantillas de comidas, copiar una comida o un día y «kcal rápidas» para una comida fuera.
- Resumen diario en un recuadro con calorías, objetivos y macros, separado del resto de secciones; la vista detallada incluye el desglose dentro del mismo panel.
- Buscador e intérprete priorizan alimentos básicos habituales («pollo» → pechuga sin piel), conservando las variantes de preparación y marca cuando las especificas.
- Resumen semanal y mensual navegable, con gráficas frente a tus objetivos.
- Vista detallada con consumo, barras y cobertura de fibra, azúcares, sal y saturadas. Un botón de información explica criterio y fuente y permite abrir su referencia global. Los extras también están en los detalles del alimento; los datos ausentes se distinguen de cero y las sumas incompletas se señalan.
- Base de datos personal de alimentos, editable a mano, con raciones propias («1 rebanada de mi pan = 32 g», que el intérprete entiende) y recetas caseras (ingredientes + peso cocinado, que se convierten en un alimento).
- Resumen con adherencia al objetivo de kcal (±10 %), rachas de registro y los alimentos que más kcal y proteína aportan. Cada día conserva el objetivo que tenía.

**Gimnasio**
- Catálogo local de 204 ejercicios con buscador, filtros combinables de músculo/equipamiento y recientes; ejercicios personalizados disponibles en rutinas y sesiones, también sin conexión.
- Entrenos desde cero o desde una rutina, con el progreso guardado aunque cierres la app a mitad.
- Quitar un ejercicio solo de ese entreno desde su menú, con Deshacer, también al editar el historial; conserva el catálogo y la rutina original.
- Series con repeticiones y peso, precargadas con los valores de la última vez.
- RIR de 0 a 5+ en su celda de la fila, que se pregunta al marcar la serie (se puede desactivar), y notas por ejercicio de cada sesión, con la última nota como referencia. Carga corporal, lastre y asistencia separados de kg externos, con masa corporal opcional conservada en el historial.
- Controles para mostrar/ocultar métricas de Progreso (comparadas por tipo de carga) y Consumo/Objetivo en el resumen nutricional.
- El número de la serie indica su tipo (calentamiento, dropset o negativas) y se cambia tocándolo; las bajadas del dropset y los lados izquierdo/derecho se registran en filas propias. Ejecución unilateral con lados iguales o separados, agarre y bajada lenta. Sugerencias de progresión a partir de sesiones confirmadas y objetivos configurables: explican su motivo y solo cambian valores al pulsar Aplicar; el historial antiguo no se da por realizado.
- Confirmación reversible de series, guardada en el historial (las no marcadas quedan pendientes; las de entrenos antiguos, sin dato), descanso opcional y resumen al terminar.
- Mapa muscular frontal/trasero al terminar y en el historial, con trabajo estimado a partir de series/reps/peso y músculos principales/secundarios. Escala relativa a cada sesión y detalle por grupo; no representa fatiga ni recuperación.
- Rutinas con objetivos por ejercicio (series, rango de repeticiones y descanso), ejercicios reordenables y ejercicios propios editables; historial de entrenos que se pueden editar, borrar o registrar a posteriori, con notas, series de calentamiento, RIR, récords personales, calculadora de discos, aviso sonoro al terminar el descanso y resumen semanal por grupo muscular; gráficas de progreso por ejercicio (peso máximo, 1RM estimado, volumen).

**General**
- Un botón Menú despliega un abanico desde su propio origen para ir a Inicio, Nutrición, Entreno, Perfil, Referencias y Ajustes, con la sección actual marcada.
- Perfil calcula la proteína diaria por kg de peso (1,8 g/kg por defecto, rango 1,6 a 2,2), muestra un gasto observado a partir de lo que comes y tu tendencia de peso (si hay datos suficientes) y guarda tus medidas corporales. Perfil estima tu gasto energético diario y un objetivo de calorías (mantenimiento, definición o volumen) a partir de sexo, fecha de nacimiento, altura, peso y actividad, con ecuaciones citadas. Todo se calcula y se guarda solo en tu dispositivo; es una estimación orientativa, no una prescripción médica.
- Referencias reúne procedencia del catálogo, objetivos nutricionales, la metodología de la estimación energética, el origen de la proteína por kg y el objetivo de agua (con qué se verificó de cada fuente) y limitaciones de datos; recomendaciones por grupos tienen su lugar preparado, sin inventar valores todavía.
- Instalable en iOS («Añadir a pantalla de inicio»), con icono propio y funcionamiento sin conexión (salvo al escanear un producto nuevo).
- Gráfica del peso con media de 7 días y borrado de pesajes con «Deshacer».
- Exportación a CSV (comidas, pesos, series, agua y medidas) para abrir en Excel en español.
- Copia de seguridad exportable e importable en un único archivo JSON, con confirmación antes de sustituir registros y ayuda para trasladarlos de Safari al acceso de pantalla de inicio en iPhone.
- Tema Sistema/Claro/Oscuro seleccionable en Ajustes. Interfaz móvil coherente, controles táctiles grandes y fuente disponible offline.
- Atmósferas fotográficas propias de Inicio, Nutrición y Entreno: escenas oscuras y fotografías de luz natural para claro, integradas con el fondo para priorizar contenido y acciones; imágenes locales disponibles offline.
- Coste de infraestructura: **0 €**.

## Empezar

```bash
npm install
npm run dev      # http://localhost:5173
```

Requisitos, tests, build, pruebas y despliegue en Cloudflare Workers: [`docs/desarrollo.md`](docs/desarrollo.md). Qué hace cada herramienta y por qué se eligió: [`docs/herramientas.md`](docs/herramientas.md).

## Privacidad

No existe backend. Todos los datos (comidas, entrenos, pesos, alimentos y ajustes) se guardan exclusivamente en el IndexedDB del dispositivo donde se usa la app. Cloudflare solo sirve los archivos estáticos de la aplicación; no aloja ni ve ningún dato personal. La única conexión a terceros es la consulta a Open Food Facts al escanear un código de barras que no está en el móvil, y solo envía ese código.

## Documentación

Identidad y criterios de interfaz: [`DESIGN.md`](DESIGN.md). Implementación visual: [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md).

El índice de toda la documentación (qué hay en cada documento) está en [`CLAUDE.md`](CLAUDE.md) § Documentación. El proyecto se desarrolla con Claude Code.

## Licencia

Código bajo licencia MIT: ver [`LICENSE`](LICENSE). Los datos del catálogo tienen su propia licencia: CIQUAL (Licence Ouverte Etalab 2.0) y Open Food Facts (ODbL 1.0); detalle en [`scripts/catalogo/README.md`](scripts/catalogo/README.md). Las imágenes de referencia de ejercicios son ilustraciones propias generadas con IA o, mientras falten, fotos de [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (The Unlicense, dominio público); ver [`scripts/ejercicios/README.md`](scripts/ejercicios/README.md). Saira se distribuye con licencia OFL en `public/fonts/Saira-LICENSE.txt`. El código es público a modo de portfolio; no se esperan ni gestionan contribuciones externas.
