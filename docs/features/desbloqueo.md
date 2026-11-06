# Desbloqueo (gratis y de pago)

`src/features/desbloqueo/` y la lógica en `shared/lib/acceso.ts` y `shared/pwa/cobro.ts`. Decisión: [ADR 068](../decisiones/068-gratis-y-de-pago.md). Entreno, Actividades, Liga, Social y la cuenta son gratis siempre; Nutrición, Perfil y la copia en la nube, durante un mes de prueba desde la primera apertura y después con un pago único.

**Estado:** partes 1 (bloqueo y prueba) y 2 (desbloqueo manual) de 3. **El cobro está apagado** (`COBRO_ACTIVO = false`): nadie ve nada distinto hasta que se pueda pagar con Play Billing (parte 3). La parte 2 usa `supabase/migrations/0031_desbloqueos.sql`, que Víctor ejecutó en el proyecto real el 2026-11-06 (sin ella, la app sigue igual y Moderación no enseña la pestaña).

## Dónde está cada cosa

| Qué | Dónde | Notas |
|---|---|---|
| Estado del acceso | `shared/lib/acceso.ts`: `calcularAcceso` (`abierto` · `prueba` · `terminada` · `desbloqueado`), `dePagoBloqueado`, `resumenAcceso`, `DIAS_PRUEBA` (30, contando el primer día), `PRECIO_DESBLOQUEO` | puro, con tests |
| Dónde se aplica | `shared/pwa/cobro.ts`: `aplicaCobro` (solo la app de Google Play con `COBRO_ACTIVO`; la web y el iPhone, abiertos), `entornoAcceso` | `?preview=cobro` lo enciende en esa sesión para probarlo |
| Primera apertura | `settings.primeraApertura`, que apunta `ensureSettings` al arrancar si falta | viaja en el backup y en la copia; importar se queda con la más antigua (`importarBackup`); borrar los datos reinicia la prueba (aceptado) |
| Contexto y hoja | `DesbloqueoContext`: `DesbloqueoProvider` (en `App`) y `useDePago()` → `{ acceso, bloqueado, pedir, proteger }`; `components/DesbloquearSheet` («Cumbra Fit completa») | sin proveedor (tests sueltos), todo abierto |
| Aviso en las secciones de pago | `components/AvisoPruebaTerminada` en Nutrición, Recetas y Perfil | solo con la prueba terminada |
| Desbloqueo de la cuenta | `data/desbloqueoNube.consultarMiDesbloqueo` (`mi_desbloqueo`, 0031) y `lib/consulta.accionDesbloqueo` | con sesión, `DesbloqueoProvider` pregunta al abrir y cuando cambia la cuenta; sin sesión, lo olvida |
| Desbloqueo recordado | `shared/pwa/cobro`: `desbloqueadoAqui`, `recordarDesbloqueo`, `observarDesbloqueo` (localStorage `appfit-desbloqueo`) | fuera de IndexedDB: no viaja en el backup ni en la copia; sin red vale lo último que se supo |
| Desbloquear a mano | Social › Moderación › Desbloqueos (`social/components/Moderacion`, `admin_desbloquear`, `admin_desbloqueados`) | solo administradores (0017), por el alias del perfil social |

## Con la prueba terminada

Lo apuntado se ve y se exporta; lo que **añade o cambia** pide desbloquear (`proteger(accion)` abre la hoja en vez de hacer la acción). Borrar y deshacer siguen libres: los datos son de cada persona.

- **Nutrición**: Añadir comida (cabecera, cada comida, comidas típicas, editar una entrada o un plato), acciones del día (copiar, cheat day), acciones de comida (copiar, guardar como típica), mover un plato (hoja y arrastre), «Lo he comido» de lo planificado, Plan › Añadir, guardar un alimento o una ración, editar o crear comidas típicas en Alimentos y apuntar una nota en Medidas.
- **Recetas**: nueva receta; en la ficha, registrar, planificar, editar, añadir preparación y copiar a mis recetas. La lista de la compra se puede seguir marcando.
- **Perfil**: editar los datos y el interruptor del gasto observado. El peso es de todos (Inicio) y sigue libre; las medidas corporales también.
- **Inicio**: la tarjeta de energía cambia «Añadir comida» por «Desbloquear para añadir comidas».
- **Cuenta**: «Activar la copia» pide desbloquear. Una copia ya activa sigue guardándose (pendiente de la parte 3).
- **Cumbres, Ritmo y Vitrina** conservan lo ganado con las comidas hasta el último día de prueba (Víctor, 2026-11-06); después solo cuentan el entreno y las actividades. `experiencia/hooks/leerExperiencia` lee las comidas hasta ese día y pasa `nutricionHasta` a `calcularExperiencia`, que lo pasa como `registroHasta` a `calcularRitmo`: las semanas que empiezan después se miden solo con el entreno, para que no salgan a medias por no poder apuntar comidas.
- **Ajustes** enseña la fila «Cumbra Fit completa» con el estado («Prueba: quedan 12 días», «Prueba terminada»…) solo donde el cobro se aplica.

La hoja de desbloqueo muestra el precio con el botón deshabilitado («Muy pronto podrás desbloquearla desde aquí»): el pago llega en la parte 3.

## Desbloqueo manual (parte 2)

Para quien ya usa la app: Víctor, como administrador, abre Social › Moderación › Desbloqueos, escribe el alias del perfil social y pulsa «Desbloquear». Queda en `public.desbloqueos` (0031: `user_id`, `origen` `manual` o `play`, quién lo hizo y cuándo; RLS cerrada, todo por funciones) y vale en cualquier móvil donde esa persona entre con su cuenta. «Quitar» lo deshace (solo los manuales; una compra no se quita desde aquí). Un alias sin perfil avisa «No hay ningún perfil con el alias @…». Requiere que la persona tenga cuenta y perfil en Social.

La app de esa persona pregunta `mi_desbloqueo` al abrir con sesión y lo recuerda en el móvil. Al quitarlo en la nube, la próxima vez que abra con sesión vuelve a la prueba (o al bloqueo). Al cerrar la sesión se olvida. Pruebas: `supabase/pruebas/desbloqueos.sql` y `scripts/ui/validar-desbloqueos.cjs` (Supabase falso: `mi_desbloqueo`, `admin_desbloquear`, `admin_desbloqueados` y `simular_desbloqueo`).
