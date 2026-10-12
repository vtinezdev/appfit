# 032 — Creador de rutinas por reglas

Fecha: 2026-10-12. Estado: vigente.

## Contexto

El [plan de mejoras](../mejoras.md) pide proponer rutinas a quien no sabe por dónde empezar. La app no tiene IA ([ADR 006](006-sin-ia-interprete-local.md)) ni backend, y las rutinas ya tienen su forma (`Routine`, `ObjetivoEjercicio`) y su editor.

## Decisión

- **Por reglas, en el dispositivo**: los días por semana eligen un reparto (cuerpo completo, torso/pierna, torso/pierna + empuje/tirón/pierna, empuje/tirón/pierna); cada día es una lista ordenada de patrones de movimiento y la sesión usa los primeros según el tiempo (5/6/7 ejercicios en 45/60/75 min, uno menos con Fuerza). Cada hueco se rellena con un ejercicio del catálogo del mismo patrón cuyo material está disponible; si no hay, con un patrón sustituto y, como último recurso, core.
- **El catálogo gana `tipo` (compuesto/aislamiento) y `patron`**: trabajo editorial único en `gym/lib/catalogoEjercicios.ts`, con los ejercicios de cada patrón de más a menos básico. Un test exige que los 204 tengan uno y solo uno y que cada patrón pedido tenga ejercicios (o un sustituto con ellos) para cada material.
- **Determinista**: la semilla 0 elige los más básicos; «Regenerar todo» usa otra semilla y elige entre los tres mejores; «Otra sugerencia» pasa al siguiente del patrón. Se evita repetir ejercicio en el día y, mientras haya alternativas, entre días.
- **Objetivos por tipo y objetivo** (hipertrofia, fuerza, general): series, rango y descanso fijos por tabla, editables luego en el editor de siempre.
- **Nada se escribe hasta «Guardar»**: la vista previa trabaja con selecciones (`SeleccionEjercicio`); `routinesRepo.guardarPlan` resuelve los ejercicios y crea las rutinas en una transacción. Si un nombre ya existe se añade «(2)», sin preguntar.
- **Sin cambio de esquema**: el resultado son rutinas normales.

## Consecuencias

Las propuestas son tan buenas como la clasificación editorial y las plantillas; mejorar el creador es editar esas tablas, con sus tests. Con poco material (casa) algunos huecos se cubren con sustitutos (sin press de hombros ni curl sin material) y un día de tirón puede acabar con core. Las alternativas de la Liga siguen con su propio criterio (músculo principal); no se han unificado. Detalle vivo en [Gym](../features/gym.md#creador-de-rutinas).
