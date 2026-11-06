# 068 — Gratis y de pago: Entreno gratis, el resto con un pago único

Fecha: 2026-11-06. Estado: aceptada; **partes 1 (bloqueo y prueba) y 2 (desbloqueo manual, migración 0031) implementadas con el cobro apagado**, parte 3 (Play Billing) pendiente. Detalle: [desbloqueo](../features/desbloqueo.md). Cambia la app de Google Play, que hoy no cobra (`android/README.md`).

## Contexto

Víctor quiere monetizar la app sin convertirla en una suscripción: una parte gratis de verdad y el resto desbloqueado con un único pago pequeño. Lo decidió en conversación el 2026-11-06. La app vive en el móvil (IndexedDB) y la cuenta es opcional, así que el bloqueo de lo que es solo local no puede ser inviolable; con un pago único bajo no compensa endurecerlo más allá de lo razonable.

## Decisión

**Reparto.**

| Gratis siempre | De pago (tras la prueba) |
|---|---|
| Entreno › Gimnasio (rutinas, sesiones, historial) y su progreso (gráficas, récords) | Nutrición entera (diario, recetas, catálogo, escáner, plan, lista de la compra) |
| Entreno › Actividades y Caminos | Perfil (gasto y objetivo de kcal, que solo sirve a Nutrición) |
| Liga | Copia en la nube (lo único que cuesta dinero cada mes) |
| Progreso › Semana, Cumbres y Vitrina, **contando solo entrenos y actividades** | Lo que comidas y nutrición aportan a Semana, Cumbres y Vitrina (Herbario, metros por comidas…) |
| Social, Amigos y la cuenta | |
| Ajustes, Referencias, exportar e importar los datos | |

- **Prueba**: un mes con todo abierto desde la primera vez que se abre la app.
- **Al terminar la prueba sin pagar**: lo de pago se ve en solo lectura (lo apuntado no se pierde ni se esconde), pero no se puede añadir ni editar. En Cumbres, Ritmo y Vitrina se conserva lo ganado con las comidas durante la prueba; después solo cuenta el entreno. Inicio muestra sus tarjetas bloqueadas con «Desbloquear». Exportar sigue siendo gratis: los datos son de cada persona.
- **Precio**: 9,99 € en un solo pago, que no caduca. En Android se cobra con Play Billing (obligatorio en Google Play para contenido digital), como producto de compra única.
- **Desbloqueo manual**: quien ya usa la app no paga. Víctor lo desbloquea desde la administración de Social ([ADR 049](049-administracion-de-social.md)) buscando a la persona por su alias. Queda guardado en su cuenta de Supabase y vale en cualquier móvil. Requiere que esa persona tenga cuenta.
- **iPhone**: en espera hasta que exista la app de iPhone. Se deja preparado: el estado «desbloqueado» no depende de cómo se pagó (Play, desbloqueo manual o, en el futuro, App Store).

## Dónde se aplica y cómo se cuenta la prueba

Víctor lo decide el 2026-11-06:

- **Solo en la app de Google Play.** La web y la PWA de iPhone siguen sin bloqueo mientras no haya forma de pagar fuera de Play; se acepta que alguien con Android pueda usar la web gratis. La app de Play se reconoce como ya hace `shared/pwa/entorno` ([ADR 067](067-app-de-tienda-sin-instalar-desde-la-web.md)). Cuando salga la app de iPhone se revisa.
- **La prueba cuenta desde la primera apertura** de la app en ese móvil (una fecha guardada en el dispositivo). Se reinicia si alguien borra los datos de la app; se acepta, con un pago de 9,99 € no compensa atarla a la cuenta.

## Consecuencias

- Nueva tabla en Supabase para los desbloqueos (manuales y comprados), con RLS: cada persona lee la suya y solo la administración escribe. Migración SQL nueva, a ejecutar a mano.
- Verificar las compras de Play en el servidor exige una función de Supabase que consulte la API de Google Play: es un servicio nuevo y va en `docs/seguridad.md`. Sin cuenta, la compra se comprueba en el móvil con la Digital Goods API de la TWA.
- Hay que cambiar las condiciones de uso, la política de privacidad ([ADR 065](065-textos-legales-y-edad-minima.md)), la ficha de Play y `/conoce`, que hoy dicen que la app es gratis.
- El bloqueo de lo local se puede saltar con conocimientos técnicos, o usando la web; se acepta.
- Siguiente paso, aparte: pasar la app de Play de TWA a Capacitor para grabar actividades con la pantalla bloqueada (servicio en primer plano de ubicación). Play Billing funciona igual allí. Ver `docs/roadmap.md`.
