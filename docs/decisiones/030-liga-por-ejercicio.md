# 030 — Liga por ejercicio

Fecha: 2026-10-10. Estado: vigente. Amplía [ADR 029](029-gamificacion-atributos.md) (sus salvaguardas valen aquí).

## Contexto

En la exploración de gamificación (`gaming.md`), Víctor quiso una liga **por ejercicio**: cuanto más se hace un ejercicio, más se sube de división. Como no conviene hacer siempre el mismo, llegar a la división máxima debe indicar, sin ser una regla, que quizá toca cambiarlo. Eso choca con la lógica habitual de una liga, donde la cima es el premio y cambiar parecería perderlo.

## Decisión

- **Mide semanas**, no series ni sesiones: una semana con al menos una serie efectiva del ejercicio en un entreno terminado. No premia el volumen ni la frecuencia, y va al ritmo semanal de Ritmo.
- **Escalera** de 5 ligas (Bronce, Plata, Oro, Platino, Diamante) con 3 divisiones cada una y **Élite** a las 16 semanas (Víctor prefirió 16 a 13). Una división por semana.
- **Bajada gradual**: la primera semana sin el ejercicio no cuenta y desde la segunda baja una división por semana. Descartado el reinicio: dos semanas fuera lo dejarían «como nuevo» y el aviso de Élite perdería sentido. Las pausas de Ritmo congelan.
- **Variantes** (ejecución, agarre, técnica, modo de carga) cuentan como el mismo ejercicio; cambiar de ejercicio lo renueva.
- **Élite completa un ciclo**, que quedará en la Vitrina: así cambiar no quita nada. Avisa con suavidad y ofrece alternativas y «Mantener» en cualquier ejercicio.
- **Básicos**: lista editorial (sentadilla, press banca, peso muerto, press militar, dominadas y remo con barra) que en Élite no avisa durante el entreno; se explica que suelen mantenerse. Decir que es «recomendable» necesita fuente en Referencias.
- **Sin XP**: la Liga no suma en Atributos, porque premiaría meter más ejercicios distintos. Solo da logros.
- **Todo dentro de Entreno** (Progreso, entreno activo y fin de sesión), sin destino nuevo en Más.
- **Derivada**, como Atributos: sin tablas ni migraciones. El único dato es la lista de ejercicios mantenidos, como campo opcional de `Settings` (`ligaMantener`).
- No hay un número de semanas demostrado para cambiar un ejercicio: los umbrales son parámetros por probar y la app no lo presenta como recomendación.

## Consecuencias

- La Liga es un estado actual, no una recompensa acumulada: cambiar los umbrales recalcula divisiones y ciclos sin guardar nada.
- Implementada por fases el mismo día (`gaming.md`, PROCESO §103 a §107): lógica pura (`liga/lib`), Progreso, el entreno y su cierre, alternativas con «Usar» y «Mantener», el aviso de sesiones sin récord y el logro «Ciclos completados». Descartado «Explorador» (probar ejercicios nuevos): empujaría a cambiar por cambiar. Reglas vigentes: [features/liga.md](../features/liga.md).
