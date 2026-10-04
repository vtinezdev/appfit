# 011 — Consumo en Nutrición y metodología en Referencias

Fecha: 2026-10-04. Estado: aceptada.

## Contexto

Las barras diarias mezclaban consumo, mínimos/máximos y una explicación general de fuentes. Añadir más metodología aumentaba ruido en la tarea frecuente de revisar el día. Los objetivos personales y las recomendaciones generales requieren interpretaciones distintas.

## Decisión

Nutrición muestra qué está consumiendo el usuario y cómo va. Referencias explica por qué APPFIT utiliza esos valores y de dónde proceden.

El desglose mantiene consumo, barra y cobertura por nutriente; IconButton abre Sheet contextual, con salto a su referencia global tras el cierre real. Un registro puro central con identificadores existentes y un componente de contenido compartido sirven ambas vistas. Mantener sin cambios los valores/fórmulas de ADR 010; su presentación técnica permanente queda sustituida por consulta bajo demanda.

Referencias tiene cuatro áreas: catálogo, objetivos, recomendaciones alimentarias y limitaciones de datos. Utiliza solo CIQUAL/Open Food Facts realmente utilizados, OMS/UE ya definidos, y los objetivos editables de Ajustes como fuente personal. La falta de origen clínico para defaults se explica sin inventarlo. Grupos futuros tienen estructura tipada y una colección vacía, sin rangos ficticios.

El abanico admite cinco destinos amplios: tres superiores y dos inferiores. Mantiene medidas, origen, teclado, capas y Reduce Motion; la paginación empieza con el sexto destino. La sección global se carga diferida. No se añaden dependencias ni rutas URL.

## Consecuencias

Una fuente de verdad evita divergencias entre gramos, criterio y explicación. Consultar referencias no escribe ajustes ni cambia backups. No se modifican cálculos, alimentos, snapshots, parser, repositorios ni esquema. El detalle de una porción conserva su UI sin referencias diarias. La futura comparación por grupos requiere definir fuentes y clasificación; no se implementa aquí.
