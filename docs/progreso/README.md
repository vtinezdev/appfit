# Progreso del proyecto

> **Histórico, no normativo.** Cada resumen refleja el proyecto *a fecha de su sesión*. El estado actual está en los documentos vivos (`CLAUDE.md` § Documentación) y lo pendiente, en `../roadmap.md`.

Esta carpeta guarda un registro por sesión de trabajo. Cada vez que se cierra una sesión (una conversación de trabajo en el proyecto), se añade una carpeta nueva `sesion-NN/` con **dos documentos**:

| Archivo | Para quién | Qué contiene |
|---|---|---|
| `resumen-tecnico.md` | Para retomar el trabajo de esa sesión (Claude o Víctor) | Qué se hizo, validación y cómo continuar, de forma densa. No repite lo que ya está en los documentos vivos: enlaza a la sección de `PROCESO.md` y a los documentos que cambiaron. |
| `resumen-humano.md` | Para Víctor | Qué se hizo en **esa sesión concreta** y por qué, contado en lenguaje natural, sin dar por hecho que se recuerda jerga técnica del resto del proyecto. |

## Índice de sesiones

- [`sesion-01/`](./sesion-01/) — Construcción inicial de la app completa (nutrición + gym + PWA) y arreglo del modelo de Gemini desactualizado.
- [`sesion-02/`](./sesion-02/) — Nutrición v2, Fase 1 (en curso): kcal rápidas (A5), copiar comida/día (A2) y plantillas (A1), sobre el esquema v2 y los frecuentes/buscador ya hechos. Queda D1 (Resumen navegable).
- [`sesion-03/`](./sesion-03/) — Rediseño piloto de Hoy y Añadir comida; Gym migrado a `features/` con repositorios, `useAviso` y patrón de borrado (confirmación en rutinas/plantillas, «Deshacer» en filas sueltas).
- [`sesion-04/`](./sesion-04/) — food-database, Fases 2 y 3: catálogo CIQUAL traducido dentro del móvil (descarga automática) y buscador de alimentos propios + catálogo en Añadir comida. Handoff de las Fases 4 y 5 en `handoff-fases-4-5.md`.
- [`sesion-05/`](./sesion-05/) — food-database, Fases 4 y 5: intérprete local de comidas sin IA (texto y dictado) con «Cambiar», y escáner de códigos de barras con Open Food Facts.
- [`sesion-06/`](./sesion-06/) — Pantalla Inicio (anillo de kcal, macros y peso con la tabla `pesos`, esquema v5) y comidas de Hoy en Card con franja de macros.
- [`sesion-07/`](./sesion-07/) — Rediseño visual: paleta naranja/negro/blanco, superficie `ink`, primitives nuevas (PageHeader, Metric, Badge, ListGroup), barra de navegación flotante y todas las pantallas.
- [`sesion-08/`](./sesion-08/) — Sección Perfil (estimación energética que fija el objetivo de kcal), menú de seis destinos en círculos, rama al día con `master` y PR #30.

## Convención para cerrar una sesión («cierra la sesión»)

1. Nueva carpeta `sesion-NN` (dos dígitos, correlativo).
2. Dentro, `resumen-tecnico.md` y `resumen-humano.md` con el mismo formato que la sesión anterior.
3. Añadir la sesión al índice de arriba con una línea.
4. Lo que quede pendiente va a `../roadmap.md` (no solo al resumen), para que haya una única lista de pendientes.
