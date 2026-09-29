# Progreso del proyecto

Esta carpeta guarda un registro por sesión de trabajo. Cada vez que se cierra una sesión (una conversación de trabajo en el proyecto), se añade una carpeta nueva `sesion-NN/` con **dos documentos**:

| Archivo | Para quién | Qué contiene |
|---|---|---|
| `resumen-tecnico.md` | Para retomar el trabajo rápido (yo mismo, otra IA, o Víctor con prisa) | El estado del proyecto **a fecha de esa sesión**, de forma densa y estructurada: stack, arquitectura, estado de cada parte del plan, decisiones clave, problemas conocidos y cómo continuar. Optimizado para leerse en un minuto y quedar al día. |
| `resumen-humano.md` | Para Víctor | Qué se hizo en **esa sesión concreta** y por qué, contado en lenguaje natural, sin dar por hecho que se recuerda jerga técnica del resto del proyecto. |

## Índice de sesiones

- [`sesion-01/`](./sesion-01/) — Construcción inicial de la app completa (nutrición + gym + PWA) y arreglo del modelo de Gemini desactualizado.
- [`sesion-02/`](./sesion-02/) — Nutrición v2, Fase 1 (en curso): kcal rápidas (A5), copiar comida/día (A2) y plantillas (A1), sobre el esquema v2 y los frecuentes/buscador ya hechos. Queda D1 (Resumen navegable).
- [`sesion-03/`](./sesion-03/) — Rediseño piloto de Hoy y Añadir comida; Gym migrado a `features/` con repositorios, `useAviso` y patrón de borrado (confirmación en rutinas/plantillas, «Deshacer» en filas sueltas).

## Convención para futuras sesiones

1. Nueva carpeta `sesion-NN` (dos dígitos, correlativo).
2. Dentro, `resumen-tecnico.md` y `resumen-humano.md` con el mismo formato que la sesión anterior.
3. Añadir la sesión a la lista de arriba con una línea describiendo qué se hizo.
4. El resto de documentación "viva" del proyecto (plan original, herramientas, bitácora acumulada de decisiones) sigue en [`../PLAN.md`](../PLAN.md), [`../herramientas.md`](../herramientas.md) y [`../PROCESO.md`](../PROCESO.md) — esta carpeta de `progreso/` no los sustituye, es un histórico sesión a sesión.
