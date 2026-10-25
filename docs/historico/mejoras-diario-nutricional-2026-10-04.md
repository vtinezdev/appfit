# Mejoras del diario nutricional — 2026-10-04

Rama: `feat/mejoras-diario-nutricional`, desde master después del rediseño Impeccable. Sin commit, push ni despliegue.

## Resultado

Las cuatro peticiones se resuelven en el diario existente, conservando la identidad Impeccable y los datos:

1. «Añadir ingredientes» hace explícita la tarea que ya ofrecía «Editar plato», con + y revisión existente. No modifica ingredientes guardados al abrir/cancelar.
2. Asa de arrastre por plato, comida de destino marcada, copia legible dentro del viewport, teclado y alternativa «Mover» mediante Sheet. Cambia la ubicación del grupo completo con Deshacer; sin copias ni recálculos. Cancelación con captura del primer puntero, Escape, blur/visibilidad, resize y pointercancel/lostcapture. dnd-kit se carga con Hoy.
3. Barras diarias con significado/fuentes: fibra mínimo, sal y saturadas límites, azúcares totales referencia de etiquetado. No se inventan máximos/mínimos ni se compara el total de azúcares con un límite de libres. Datos ausentes y cobertura siguen explícitos.
4. Comidas con heading 22 px / 800, claramente superior a los alimentos de 16 px, manteniendo secciones planas y cards solo por plato.

Implementación normativa: [Nutrición](../features/nutricion.md), [Datos](../datos.md), [Sistema visual](../DESIGN-SYSTEM.md), [ADR 010](../decisiones/010-mover-platos-y-referencias-nutricionales.md). Se mantienen tokens, esquema y backup; no se cambian backend, catálogos ni flujos de Gym. `.agents` y `.codex` permanecen sin modificar.

## Evidencia

- `npm run test`: 1.154 tests, 61 archivos. Los nuevos casos verifican movimiento y undo sin pérdida de datos, colisión de ids, fallo transaccional parcial, composición cambiada y referencias/ausencia/cobertura.
- `npm run build`: TypeScript, Vite y PWA correctos. Hoy diferido (~63 kB antes de gzip) incluye el contexto de arrastre; arranque ~373 kB, sin aviso de chunks superiores a 500 kB. No hay script de lint instalado.
- `validar-diario-mejoras.cjs`: nueve contextos, 320/375/430 px claro/oscuro; dos a 375 con Reduce Motion y texto al 200%; escritorio 1440. Mouse, teclado y touch CDP, mover entre comidas, undo/snapshots/foco, cancelar/soltar fuera, copia acotada, referencias/cobertura, jerarquía, overflow y targets. Contexto adicional de casos dentro del recorrido a 375 claro: segundo dedo, captura perdida, blur sintetizado, autoscroll y fallo/reintento de IndexedDB. Capturas e informe en `/tmp/appfit-diario-mejoras`.
- Regresiones `validar-platos.cjs`, `validar-copia-platos.cjs`, `validar-nutrientes.cjs`: seis configuraciones móviles cada una, correctas. Los selectores se adaptan al nuevo nombre y separan el valor consumido del texto de referencia.
- `APPFIT_UI_SOLO_FLUJOS=1 node scripts/ui/validar-rediseno.cjs`: 40 estados en ambos temas, correctos.
- `validar-build.cjs`: artefacto real servido en el origen aislado, SW/recarga offline, Manrope local, destinos/chunks diferidos y export íntegro en ambos temas, correctos.
- Inspección visual acotada con el criterio de Impeccable: headings, copy, contraste de tokens existente, targets, capas y estados; se corrige la copia de arrastre recortada, sin añadir efectos decorativos. Durante el recorrido funcional se corrige el retorno de foco tras cerrar Sheet y el origen del recorrido de teclado con texto ampliado.

Todas las pruebas usan perfiles vacíos y datos sintéticos en `appfit-test.localhost`, sin datos personales ni API externa real. Es Chromium emulado; Safari/iOS, Android físicos, lectores de pantalla y haptics/rendimiento en hardware siguen pendientes. Un blur sintetizado comprueba el handler; no reproduce todos los cambios de aplicación del sistema operativo. No se repite la migración de SW entre versiones en un perfil duradero.
