# APPFIT — identidad y diseño de producto

APPFIT es una libreta personal de nutrición y entrenamiento que cabe en una mano. Su personalidad combina **precisión deportiva, calma y cercanía**. Las cifras reales y las acciones útiles tienen presencia; la interfaz no pide atención por sí misma.

Este documento describe intención. [DESIGN-SYSTEM](docs/DESIGN-SYSTEM.md) describe implementación. [Auditoría](docs/historico/auditoria-diseno-2026-10-02.md) explica el cambio de dirección y las referencias.

## Principios

1. **Registrar es la tarea principal.** Añadir comida, registrar peso y apuntar una serie deben entenderse sin estudiar una pantalla.
2. **Una jerarquía por vista.** Dato o tarea principal, contexto, acción; el resto tiene un nivel secundario reconocible.
3. **Densidad útil.** Espacio entre temas, proximidad entre datos relacionados. Ni formularios diminutos ni grandes bloques vacíos.
4. **Superficies con significado.** Un plato o ejercicio puede tener un panel. Una etiqueta o una cifra no necesita una card.
5. **Resultados sin juicio.** No convertir un objetivo superado o una variación de peso en fracaso, alarma o celebración automática.
6. **Una sola aplicación.** Nutrición y Gym comparten tipos, controles, espaciado, navegación y feedback. Su contenido define su carácter.
7. **Honestidad y privacidad.** Mostrar datos existentes, estimaciones explícitas y estados vacíos. Todo el diseño funciona offline sin pedir cuentas, imágenes remotas ni analítica.

## Mobile first

Diseñar la secuencia de lectura y uso vertical, desde 320 px hasta móviles grandes. 375×812 es una referencia de comprobación, no un lienzo rígido. El ancho útil tiene margen lateral de 20 px, reducido a 16 px en pantallas muy estrechas. En tablet/escritorio la libreta se centra con ancho limitado; no se convierte en un dashboard de columnas.

La navegación inferior tiene espacio propio y respeta el home indicator. Las acciones de registro frecuentes se alcanzan también desde cabecera/Inicio. Una página modal dedica su altura a la tarea, con contenido desplazable y cierre visible. El teclado no debe ocultar la acción final ni crear dos scrolls que compitan.

No imitar chrome de iOS o Android. Usar controles familiares, iconos propios, fechas locales y lenguaje español sencillo.

## Jerarquía y tipografía

Manrope variable es la voz común, autoalojada y disponible offline. Una familia, sin parejas ornamentales. Fallback del sistema mientras carga. Números tabulares para métricas y formularios.

- Cabecera: título corto de 28 px, contexto de 13–14 px cuando aporte algo.
- Métrica principal: hasta 44 px, fuerte, con unidad más pequeña y objetivo/contexto cercano.
- Métrica secundaria: 28 px; en grupos densos, 18–22 px.
- Sección: 18 px semibold; cuerpo/inputs: 16 px; contexto: 14 px; metadatos breves: 12–13 px.
- Pesos 400 para lectura, 500–600 para controles, 700–800 para datos y títulos. No poner todo en negrita.

Los nombres de alimentos se muestran completos en selección y revisión. Después de guardar se usan nombres simples y preferencias personales, sin alterar los originales. Los textos largos envuelven; no reducir tipografía para encajarlos. Las cifras grandes conservan su unidad y no fuerzan scroll horizontal.

## Paleta

Neutrales de papel y grafito, sin halo ni gradientes. Naranja profundo de APPFIT para acción y progreso. Es una decisión de identidad deportiva, no una obligación heredada.

| Rol | Claro | Oscuro | Intención |
|---|---|---|---|
| Fondo | Papel cálido, `#F5F5F2` | Grafito, `#141412` | Descanso visual |
| Superficie | `#FFFFFF` | `#20201D` | Unidad de información o edición |
| Superficie secundaria | `#ECECE7` | `#2D2D28` | Campos, controles y contexto |
| Texto principal | `#20201C` | `#F5F5EF` | Legibilidad y presencia |
| Acento | `#DF571B` | `#FF945C` | Acción principal y kcal |
| Acento de texto | `#9D370D` | `#FFAA7C` | Links/foco con contraste |

Proteína azul mineral, carbohidratos oliva y grasa ciruela son colores de datos, no acentos de sección. Mantienen significado en todo el producto. Las etiquetas y unidades siempre acompañan al color. Avisos y errores tienen texto e icono, no solo color. No usar rojo para superar kcal.

## Espaciado, layout y superficies

Ritmo base de 4 px. Entre secciones: 28 px; entre unidades de un grupo: 12 px; padding de panel: 16 px. Separar cambios de tema más que filas de una misma lista.

La pantalla se organiza en una columna. Rejillas de dos o tres métricas solo cuando sus valores caben; cantidades largas pueden envolver. Las listas usan divisores, no una card por fila. Los platos guardados juntos conservan panel independiente, borde y separación; sus ingredientes pertenecen al mismo contorno.

Radios contenidos: 8 px para pequeños controles, 12 px para campos/botones, 16 px para paneles y 24 px para sheets. Círculos solo en puntos/indicadores o controles cuya forma lo justifique. La profundidad se explica con superficie y línea; sombra solo en overlays.

## Navegación

Cuatro destinos permanentes: **Inicio, Nutrición, Gym, Ajustes**. Icono y nombre siempre visibles, posiciones fijas. Selección por texto/indicador además de color. La barra ocupa su propio espacio y no cubre registros.

Dentro de una feature, pestañas planas para navegar entre vistas. Selectores segmentados para cambiar un valor (comida, periodo, tema, métrica). No usar el mismo tratamiento para ambos conceptos. Los flujos de registro son capas modales con salida clara, aislamiento del fondo y retorno del foco.

## Controles y componentes

- **Botón principal:** naranja, etiqueta concreta, al menos 48 px en acciones de registro. Uno domina cada tarea.
- **Secundario:** superficie neutra/borde; no compite con guardar.
- **Texto/ghost:** para ayuda, cambiar o acción contextual. Táctil aunque visualmente discreto.
- **Destructivo:** discreto cuando se ofrece; rojo sólido únicamente al confirmar. Borrado reversible ofrece Deshacer; irreversible confirma consecuencias reales.
- **Campos:** etiqueta visible, 16 px, mínimo 44 px, fondo neutro, borde reconocible y foco claro. Placeholder es ejemplo, no etiqueta.
- **Cantidades:** campo directo o stepper de tamaño táctil real. En series de Gym, entrada directa; los botones de ajuste no deben comprimir los valores.
- **Desplegable:** explica qué se abre, mantiene estado accesible y no esconde errores que impiden guardar.
- **Listas:** fila completa pulsable, nombre primero, contexto debajo y dato/acción a la derecha cuando quepa. No esconder nombres completos necesarios para elegir.

No crear abstracciones de dominio sin semántica común. Un componente compartido debe resolver una necesidad repetida, no imponer idéntica composición a todas las pantallas.

## Nutrición

El diario presenta kcal consumidas, objetivo y diferencia explícita. Macros a continuación, cada uno con gramos, objetivo y barra proporcional. El exceso continúa visualmente y se expresa en texto; no se recorta ni colorea como error.

Cada comida tiene total y acción de añadir. Cada guardado múltiple es un plato independiente. Los ingredientes se despliegan y editan sin cambiar su agrupación.

Añadir comida ofrece Describir, Buscar y Plantillas como métodos claros. La descripción muestra separación de alimentos antes de interpretar. La revisión muestra nombre completo, cantidad y aporte. Los nutrientes por 100 g, nombre visible y otras opciones se consultan en detalles. Datos incompletos se exponen para resolverlos; no se guardan a escondidas.

La media semanal/mensual dice cuántos días tienen registros. Una gráfica debe responder a una pregunta concreta. Métrica seleccionable, unidad, objetivo, cobertura y datos textuales accesibles; nunca rellenar huecos con datos inventados ni presentar un periodo vacío como progreso.

## Entrenamiento

El entreno activo es una herramienta de registro: nombre del ejercicio, referencia de la sesión anterior, filas de serie/repeticiones/kg y añadir serie. Campos grandes y lectura rápida tienen prioridad sobre cualquier efecto.

Inicio de sesión distingue rutina y entreno libre. Finalizar es visible sin competir con cada nueva serie. Rutinas e historial utilizan el mismo lenguaje de listas. El progreso distingue peso máximo, 1RM estimado y volumen; una sola sesión no constituye una tendencia. Leyendas y alternativa textual evitan depender del color o del tooltip.

## Peso y medidas

Peso: último registro, contexto temporal y variación sin valoración moral. Sparkline ligera solo cuando hay datos suficientes, historial consultable y registro de hoy con regla de sustitución explícita.

Medidas existentes son ayuda para convertir cantidades caseras en gramos. No presentar esa ayuda como seguimiento corporal. Explicar incertidumbre y opciones, conservar notas de medidas pendientes.

## Ajustes

Orden por utilidad: objetivos, apariencia, copias y conservación, instalación/traslado, catálogo e información, acciones destructivas. Texto explicativo desplegable cuando es largo. La guía enlazada desde Inicio se abre y recibe foco. Exportación/importación accesibles, confirmación antes de sustituir datos y errores en su contexto.

## Feedback y estados

Carga breve localizada; no bloquear toda la app por una fuente de datos secundaria. Vacío con explicación concreta y siguiente acción si existe. Error junto a la tarea, lenguaje recuperable y mensaje que no desaparece antes de leerlo. Avisos temporales para éxito/Deshacer por encima de navegación, nunca detrás de un modal.

No prometer conexión, protección o guardado antes de conocer el resultado. Offline es una capacidad habitual; mostrar explicación solo cuando una operación necesita red y no está disponible.

## Motion

Transiciones breves de 120–200 ms para confirmar selección o entrada/salida de capa. Sin contador desde cero al navegar, cascadas de listas, rebotes, fondos en movimiento ni esperas decorativas. Reduced motion elimina transiciones; datos y estados aparecen inmediatamente.

## Claro, oscuro y accesibilidad

Ambos modos tienen neutrales propios, mismos roles y jerarquía. Preferencia Sistema/Claro/Oscuro en Ajustes, guardada como preferencia visual. No forzar negro estructural en claro ni invertir colores sin comprobarlos.

Texto normal ≥4,5:1; indicadores y foco ≥3:1. Targets reales ≥44×44 px, controles de uso frecuente ≥48 px. Inputs ≥16 px. Foco visible, nombres accesibles, Escape, orden de teclado y retorno del foco en capas. Fondo inerte mientras una capa está abierta. No desactivar zoom. Respetar safe areas y movimiento reducido.

Gráficas tienen título, unidades, leyenda y alternativa textual. Mensajes importantes usan status/alert según su semántica. Contenido largo y cifras grandes se comprueban en ambos temas; ocultar overflow no es una solución para una composición rota.

## Do / Don't

| Hacer | Evitar |
|---|---|
| Una cifra principal con contexto útil | Anillo, cifra y porcentaje contando lo mismo |
| Panel por plato/ejercicio real | Mosaico de cards por cada dato |
| Filas y divisores consistentes | Chips, badges y cajas en cada nivel |
| Nombres completos al elegir | Recortar la variante que distingue dos alimentos |
| Detalles bajo demanda | Exponer todo el formulario en la revisión habitual |
| Una acción de registro clara | Varios botones principales iguales |
| Tipografía y proporciones con carácter | Gradientes, glass, fotos decorativas o sombras como identidad |
| Datos reales y vacío honesto | Gráficas falsas, rachas inventadas, premios o juicios sobre salud |
| Controles táctiles y contenido que envuelve | Texto pequeño, scroll horizontal, acciones tapadas |
| Sistema visual pequeño y mantenible | Librería nueva por una animación o wrapper para cada pantalla |

## Regla para futuras iteraciones

Cada cambio debe mejorar comprensión, velocidad, legibilidad, accesibilidad, coherencia o personalidad. Comprobar primero las pantallas reales, incluidos vacíos, datos abundantes, cifras grandes, nombres largos y errores. Si una regla de este documento no funciona en el producto, revisarla y actualizar código/documentación juntos. La identidad es estable; la composición está al servicio de la tarea.
