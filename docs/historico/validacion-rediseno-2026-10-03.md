# Validación del rediseño de APPFIT — 3 de octubre de 2026

Rama `feat/rediseno-ui-ux`, base `a8cc868`. Criterio: [auditoría](auditoria-diseno-2026-10-02.md), [DESIGN.md](../../DESIGN.md) y [sistema visual](../DESIGN-SYSTEM.md). No se modifica ni fusiona master.

## Resultado técnico

- `npm run test`: **1.066 tests / 52 archivos**, todos correctos. Base previa: 1.037 / 49.
- `npm run build`: TypeScript, Vite y PWA correctos. Recharts y lector continúan diferidos; fuente local en precache. Sin dependencias nuevas en package.json ni cambios de catálogo.
- `git diff --check`: correcto.
- No cambios en esquema, repositorios, parser, cálculos, snapshots, formato de backup ni APIs. La identidad de las filas de revisión y el borrador de un campo de serie son estado de UI.

## Navegador

Chromium, exclusivamente `appfit-test.localhost:5173`; contextos aislados con datos sintéticos, Open Food Facts simulado. Scripts reproducibles: [desarrollo](../desarrollo.md).

**512 estados comprobados, 458 capturas**:

- 320×568, 375×812 y 430×932; claro/oscuro; sin datos, datos habituales y extremos.
- Inicio, diario, semana/mes, biblioteca/plantillas, Añadir y métodos, Gym/rutinas/historial/progreso, peso/historial y Ajustes.
- 64 entradas, múltiples platos, 25 rutinas, 30 sesiones, 150 series históricas y 40 pesajes en los fixtures extremos; títulos largos y valores de millones.
- Formularios, confirmaciones, capas anidadas, retorno del foco, navegación con flechas/Home/End, Escape, fondo inert y scroll.
- Teclado simulado mediante viewport reducido, nombre largo en cantidad, plantilla de 24 ingredientes y entrenamiento de 12 series; también 768×1024.
- Guardado por tandas, separación/expansión de platos, borrado/Deshacer, edición de nombres personales sin mover borradores al quitar otra fila, búsqueda/cantidad y alimentos desconocidos.
- Plantillas por UI, aplicación, cancelación de borrado, copiar y deshacer, entreno desde rutina, entrada rápida de decimales, borrar/restaurar series, recarga del entreno activo y finalización.
- Error de escritura simulado en IndexedDB al añadir/copiar: error visible en su capa y export intacto. Código inválido, producto no encontrado y estado de búsqueda.
- Tema persistente; backup inválido/cancelado conserva datos, export real comparado con todas las tablas.
- Overflow de contenedores, targets de ≥44 px, inputs ≥16 px, posición de navegación y footer. Inspección visual de jerarquía, textos/cifras largas y gráficas, además de las aserciones.

Guía iOS emulada aparte: Safari y PWA vacía abren la guía desde Inicio, con foco y salto a Exportar/Importar correctos. No reproduce almacenamiento separado de WebKit.

## Producción y offline

Build servida con preview en el mismo origen de pruebas. Perfil persistente que ya contenía registros de una build anterior: actualización real del service worker, cierre/reapertura y comparación del export de **todas** las tablas. Se ignoran únicamente fecha de exportación/metadato de esquema; una tabla opcional de preferencias vacía equivale a su ausencia anterior.

Sin conexión: recarga, fuente Manrope, todos los destinos, carga de chunks de gráficos, interpretación y guardado de comida y otra recarga correctos en claro/oscuro. Al terminar se restaura el export de referencia del perfil de prueba mediante la UI de importación.

## Problemas encontrados y corregidos

1. CSS de desarrollo conservaba utilidades antiguas después de modificar Tailwind: reinicio de Vite y repetición; producción comprobada aparte.
2. Borde de campos insuficiente en claro: nuevo test de contraste lo detectó; token ajustado, umbral conservado.
3. Respuestas asíncronas de series sobrescribían texto durante escritura rápida: borrador local mientras hay foco y guardado existente. El recorrido escribe 72.5 tecla a tecla y verifica tras recargar.
4. Detalles/borradores podían trasladarse al borrar un ingrediente: claves locales estables y prueba de conservación del alias pendiente.
5. Nombres largos consumían la cabecera con teclado: header breve de tarea, nombre completo en contenido desplazable y acción fija. Campo visible sobre el footer comprobado.
6. Etiquetas de selectores estrechos partían palabras: ancho según contenido, sin cambiar tipografía ni targets.
7. Ejes con millones no cabían: abreviación solo en ejes; cifras completas en métricas, tooltip y datos textuales.
8. Días sin registro mostraban cero en tooltip: valores nulos en el modelo visual, sin cambiar resumen/calculadora.

## Límites prácticos

Pendiente en iOS/Android reales: safe areas, teclado real, tacto/arrastre, rendimiento de importación/búsqueda, cámara y descarga desde PWA instalada. Chromium valida la geometría y flujos, no esos dispositivos. [Roadmap](../roadmap.md).

Se conserva la sparkline ligera de peso, con puntos por orden y sin eje temporal, para no cargar Recharts en Inicio. El historial completo permite consultar fechas y cantidades. El borrado de pesajes y las medidas corporales no se han añadido: esta iteración reutiliza el modelo existente; Medidas caseras mantiene su función nutricional.
