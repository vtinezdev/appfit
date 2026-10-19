# 051 · Avatar exclusivo de una cuenta

2026-10-19 · Aceptada. Víctor quiere usar su retrato con corona solo en su cuenta `tinez`.

El catálogo admite `exclusivo.tinez`. Su imagen es un recurso estático de la app, no una subida desde el perfil. El servidor sigue guardando solo el identificador; otras personas pueden ver el avatar donde ya pueden ver su alias, respetando bloqueos y suspensiones.

El permiso se guarda por UUID de cuenta en `avatares_exclusivos`, sin acceso directo desde el cliente. La migración 0019 lo asigna una sola vez al perfil actual `tinez`, corroborado por su nombramiento de administrador en 0017. Si no hay coincidencia, no concede el permiso: se revisa y asigna desde el SQL Editor. Cambiar de alias conserva el permiso; ocupar después el alias o nombrar otro administrador no lo concede. Borrar la cuenta elimina la asignación.

`mis_avatares_exclusivos()` devuelve solo los identificadores propios. El editor los consulta al abrirse, sin cachearlos entre cuentas, y muestra una sección «Solo para ti» encima del catálogo. Sin 0019, sin permiso, sin el recurso gráfico o si falla esa lectura, no aparece la sección y el catálogo normal sigue funcionando. `editar_avatar` comprueba el permiso también en el servidor, aunque se llame directamente. Retirar la asignación impide volver a guardarlo y oculta el avatar ya elegido.

Esto no amplía los permisos de administración ni añade imágenes o datos al diario o al backup. La exclusividad afecta a su selección en AppFit: el recurso visual se sirve con la app para poder mostrarlo a otras personas.
