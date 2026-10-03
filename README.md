# AppFit

App personal de nutrición y gimnasio para iPhone, instalable como PWA. Registra comidas escribiéndolas o dictándolas (interpretadas en el propio móvil, sin IA), lleva el control de tus entrenos y de tu peso, y guarda absolutamente todo **solo en tu propio móvil**: no hay backend, ni cuentas, ni servidor que vea tus datos.

> Proyecto personal de uso individual: no está pensado para varios usuarios ni para publicarse en tiendas de apps.

## Características

**Inicio**
- Resumen del día: calorías y macros frente a tus objetivos, el entreno en curso o el último, y tu peso con su evolución de los últimos 30 días e historial consultable. Registro de comida directo desde Inicio.

**Nutrición**
- Añadir comidas por texto libre o con el dictado del teclado: un intérprete local entiende alimentos, cantidades y medidas caseras («2 huevos», «una lata de atún», «un vaso de leche») y los busca en tus alimentos y en un catálogo de más de 6.000 alimentos (CIQUAL y productos de marca de Open Food Facts España). Sin conexión.
- Escáner de códigos de barras (Open Food Facts; solo se envía el número del código).
- Pantalla de revisión editable antes de guardar: muestra cómo se divide la descripción y permite añadir alimentos uno a uno o por tandas, conservando las correcciones y guardándolos juntos.
- Los alimentos guardados juntos aparecen como un plato desplegable en Nutrición, con su propio bloque, borde y espacio entre platos, nombre opcional, totales y edición de cada ingrediente. «Editar plato» permite añadir más alimentos al mismo plato. «Copiar plato» permite duplicarlo a otra comida del mismo día o a otro día, manteniendo el original. Copiar o repetir conserva los platos separados.
- Nutrición simplifica automáticamente el nombre de todos los alimentos, incluidos los que añades manualmente, mientras Añadir comida conserva el nombre completo. Se puede personalizar la etiqueta sin cambiar los nombres originales ni sus nutrientes.
- Buscador con frecuentes, plantillas de comidas, copiar una comida o un día y «kcal rápidas» para una comida fuera.
- Resumen diario en un recuadro compartido entre Inicio y Nutrición, con calorías, objetivos y macros, separado del resto de secciones; la vista detallada incluye el desglose dentro del mismo panel.
- Buscador e intérprete priorizan alimentos básicos habituales («pollo» → pechuga sin piel), conservando las variantes de preparación y marca cuando las especificas.
- Resumen semanal y mensual navegable, con gráficas frente a tus objetivos.
- Vista detallada opcional del diario con fibra, azúcares, sal y grasas saturadas; siempre disponibles en los detalles del alimento. Los datos ausentes se distinguen de cero y los totales incompletos se señalan.
- Base de datos personal de alimentos, editable a mano.

**Gimnasio**
- Entrenos desde cero o desde una rutina, con el progreso guardado aunque cierres la app a mitad.
- Series con repeticiones y peso, precargadas con los valores de la última vez.
- Confirmación reversible de series, descanso opcional y resumen al terminar; las marcas son una ayuda visual de la sesión, no cambian el historial guardado.
- Rutinas, historial de entrenos y gráficas de progreso por ejercicio (peso máximo, 1RM estimado, volumen).

**General**
- Un botón Menú despliega un abanico desde su propio origen para ir a Inicio, Nutrición, Gym y Ajustes, con la sección actual marcada.
- Instalable en iOS («Añadir a pantalla de inicio»), con icono propio y funcionamiento sin conexión (salvo al escanear un producto nuevo).
- Copia de seguridad exportable e importable en un único archivo JSON, con confirmación antes de sustituir registros y ayuda para trasladarlos de Safari al acceso de pantalla de inicio en iPhone.
- Tema Sistema/Claro/Oscuro seleccionable en Ajustes. Interfaz móvil coherente, controles táctiles grandes y fuente disponible offline.
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

Código bajo licencia MIT: ver [`LICENSE`](LICENSE). Los datos del catálogo tienen su propia licencia: CIQUAL (Licence Ouverte Etalab 2.0) y Open Food Facts (ODbL 1.0); detalle en [`scripts/catalogo/README.md`](scripts/catalogo/README.md). Manrope se distribuye con su licencia OFL en `public/fonts/Manrope-LICENSE.txt`. El código es público a modo de portfolio; no se esperan ni gestionan contribuciones externas.
