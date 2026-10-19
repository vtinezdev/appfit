-- Tras 0017. Solo datos sintéticos: PRUEBAS_OK deshace todo.
do $$
declare
 adm uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); m uuid:=gen_random_uuid();
 g uuid:=gen_random_uuid(); pub uuid:=gen_random_uuid(); pub2 uuid:=gen_random_uuid(); pg uuid:=gen_random_uuid();
 com uuid; com2 uuid; x jsonb; e text; d bigint;
 texto jsonb:='{"v":1,"tipo":"texto","titulo":"Hola","texto":"Hola a todos"}';
begin
 insert into auth.users(id,email) values(adm,'admin-adm@appfit.test'),(a,'admin-a@appfit.test'),(b,'admin-b@appfit.test'),(m,'admin-m@appfit.test');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',adm)::text,true); perform public.crear_perfil('admin.tinez','Tinez',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.crear_perfil('admin.ana','Ana',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true); perform public.crear_perfil('admin.beto',null,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',m)::text,true); perform public.crear_perfil('admin.mod',null,true);

 -- Antes de nombrarlo, nadie es administrador y las funciones no responden.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',adm)::text,true);
 assert not public.soy_admin(),'nadie lo es por defecto';
 begin perform public.admin_denuncias(); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','sin serlo no lee denuncias';
 insert into public.administradores(user_id) select user_id from public.perfiles where alias='admin.tinez';
 assert public.soy_admin(),'nombrado a mano';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 assert not public.soy_admin(),'los demás no';
 begin perform public.admin_suspender('admin.beto',true); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','otra persona no suspende';
 begin perform public.anadir_a_comunidad(g,'admin.beto'); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','otra persona no añade';

 -- Publicaciones y comentarios: Ana publica para sus seguidores (el administrador no la sigue) y Beto comenta.
 perform public.publicar(pub,'texto',now(),texto); perform public.publicar(pub2,'texto',now(),texto);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 perform public.pedir_seguir('admin.ana');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.responder_solicitud('admin.beto',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 com:=public.comentar(pub,'Comentario feo'); com2:=public.comentar(pub2,'Otro');
 perform public.denunciar('publicacion',pub::text,'spam',null);
 perform public.denunciar('comentario',com::text,'acoso','Me insulta');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',m)::text,true);
 perform public.denunciar('perfil','admin.beto','acoso',null);
 perform public.denunciar('perfil','admin.ana','spam',null);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 perform public.denunciar('perfil','admin.beto','otro','Insiste');

 -- El panel agrupa por objetivo y no lleva UUID de personas.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',adm)::text,true);
 x:=public.admin_denuncias();
 assert jsonb_array_length(x)=4,'una entrada por objetivo: '||x::text;
 assert (select count(*) from jsonb_array_elements(x) i where i->>'tipo'='perfil' and i->>'autor'='admin.beto' and (i->>'denuncias')::int=2)=1,'dos denuncias de Beto juntas';
 assert (select i->'resumen'->>'texto' from jsonb_array_elements(x) i where i->>'tipo'='publicacion')='Hola a todos','resumen actual';
 assert (select i->>'texto' from jsonb_array_elements(x) i where i->>'tipo'='comentario')='Comentario feo','texto actual';
 assert (select i->'detalles'->>0 from jsonb_array_elements(x) i where i->>'tipo'='comentario')='Me insulta','detalle';
 assert position(b::text in x::text)=0 and position(a::text in x::text)=0,'sin UUID de personas';

 -- Borrar lo que no ve: publicación ajena de solo seguidores y comentario; sus denuncias quedan revisadas.
 perform public.borrar_comentario(com);
 assert not exists(select 1 from public.comentarios where id=com),'borra un comentario ajeno';
 assert not exists(select 1 from public.denuncias where tipo='comentario' and objetivo=com and revisada is null),'denuncia del comentario revisada';
 perform public.borrar_publicacion(pub);
 assert not exists(select 1 from public.publicaciones where id=pub),'borra una publicación ajena';
 assert not exists(select 1 from public.denuncias where tipo='publicacion' and objetivo=pub and revisada is null),'denuncia de la publicación revisada';
 -- Los demás siguen sin poder.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',m)::text,true);
 begin perform public.borrar_publicacion(pub2); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','otra persona no borra lo ajeno';
 begin perform public.borrar_comentario(com2); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','ni comentarios ajenos';

 -- Resolver: descartar la de Ana; suspender a Beto desde su denuncia.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',adm)::text,true);
 select max(id) into d from public.denuncias where tipo='perfil' and objetivo=a;
 begin perform public.admin_resolver_denuncia(d,'borrar'); e:=null; exception when others then e:=sqlerrm; end;
 assert e='accion_no_valida','un perfil no se borra';
 perform public.admin_resolver_denuncia(d,'descartar');
 assert not (select suspendido from public.perfiles where user_id=a),'descartar no suspende';
 select max(id) into d from public.denuncias where tipo='perfil' and objetivo=b;
 perform public.admin_resolver_denuncia(d,'suspender');
 assert (select suspendido from public.perfiles where user_id=b),'suspendido';
 assert not exists(select 1 from public.denuncias where tipo='perfil' and objetivo=b and revisada is null),'las dos revisadas';
 assert public.admin_denuncias()='[]'::jsonb,'nada pendiente';
 assert (select count(*) from public.admin_suspendidos() s where s.alias='admin.beto' and s.con_perfil)=1,'en la lista';

 -- La suspensión sobrevive a borrar el perfil: no puede crear otro con la misma cuenta.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 perform public.borrar_perfil();
 begin perform public.crear_perfil('admin.beto2',null,true); e:=null; exception when others then e:=sqlerrm; end;
 assert e='suspendido','vetado no recrea perfil';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',adm)::text,true);
 assert (select count(*) from public.admin_suspendidos() s where s.alias='admin.beto' and not s.con_perfil)=1,'sigue en la lista sin perfil';
 perform public.admin_suspender('admin.beto',false);
 assert not exists(select 1 from public.vetados where user_id=b),'readmitido sin perfil';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 perform public.crear_perfil('admin.beto',null,true);

 -- Suspender y readmitir por alias; nunca a sí mismo ni a otro administrador.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',adm)::text,true);
 perform public.admin_suspender('Admin.Ana ',true);
 assert (select suspendido from public.perfiles where user_id=a),'por alias normalizado';
 begin perform public.admin_suspender('admin.ana',true); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','ya suspendida';
 perform public.admin_suspender('admin.ana',false);
 assert not (select suspendido from public.perfiles where user_id=a),'readmitida';
 begin perform public.admin_suspender('admin.tinez',true); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','no se suspende a sí mismo';
 insert into public.administradores(user_id) values(m);
 begin perform public.admin_suspender('admin.mod',true); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','ni a otro administrador';
 delete from public.administradores where user_id=m;

 -- Comunidades: Ana crea una; el administrador, sin ser miembro, la gestiona.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 perform public.crear_comunidad(g,'Administración','Prueba',false);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',m)::text,true); perform public.unirse_comunidad(g);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.gestionar_comunidad(g,'nombrar','admin.mod');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',adm)::text,true);
 x:=public.gestion_comunidad(g);
 assert (x->>'modera')::boolean and not (x->>'creador')::boolean and jsonb_array_length(x->'miembros')=2,'modera sin ser miembro';
 -- Añadir: entra directamente y le llega el aviso con quién lo hizo.
 perform public.anadir_a_comunidad(g,'admin.beto');
 assert public.social_es_miembro(b,g),'añadido';
 begin perform public.anadir_a_comunidad(g,'admin.beto'); e:=null; exception when others then e:=sqlerrm; end;
 assert e='ya_miembro','ya era miembro';
 begin perform public.anadir_a_comunidad(g,'nadie.aqui'); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','alias inexistente';
 -- En una sola transacción now() no avanza: los avisos se vieron «antes».
 update public.perfiles set avisos_vistos=now()-interval '1 minute' where user_id=b;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 x:=public.avisos();
 assert (x->>'nuevos')::int=1,'cuenta como nuevo';
 assert (select count(*) from jsonb_array_elements(x->'lista') i where i->>'tipo'='anadido' and i->>'alias'='admin.tinez'
   and i->>'titulo'='Administración' and i->>'publicacion'=g::text and (i->>'nuevo')::boolean)=1,'aviso de añadido: '||x::text;
 perform public.salir_comunidad(g);
 x:=public.avisos();
 assert (select count(*) from jsonb_array_elements(x->'lista') i where i->>'tipo'='anadido')=0,'al salir desaparece el aviso';
 -- Quien se une por su cuenta no recibe ese aviso.
 perform public.unirse_comunidad(g);
 assert (select count(*) from jsonb_array_elements(public.avisos()->'lista') i where i->>'tipo'='anadido')=0,'unirse no avisa';
 -- Quien bloquea al creador no puede ser añadido.
 perform public.salir_comunidad(g); perform public.bloquear('admin.ana');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',adm)::text,true);
 begin perform public.anadir_a_comunidad(g,'admin.beto'); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','bloqueo con el creador';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true); perform public.desbloquear('admin.ana');
 -- Expulsar: también a un moderador, cosa que otro moderador no puede; al creador, nunca.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',adm)::text,true);
 perform public.gestionar_comunidad(g,'expulsar','admin.mod');
 assert not public.social_es_miembro(m,g),'expulsa a un moderador';
 begin perform public.gestionar_comunidad(g,'expulsar','admin.ana'); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','no expulsa al creador';
 begin perform public.gestionar_comunidad(g,'reglas',null,'Mías'); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','las reglas siguen siendo del creador';
 -- Publicaciones de comunidad: el administrador miembro ve «puedo borrar» en los comentarios.
 perform public.unirse_comunidad(g);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 perform public.publicar_comunidad(pg,'texto',now(),texto,g); com:=public.comentar(pg,'En la comunidad');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',adm)::text,true);
 x:=public.comentarios_pagina(pg,null,null,20);
 assert (x->'items'->0->>'puedo_borrar')::boolean,'puede borrar en comunidades';

 assert not has_function_privilege('anon','public.soy_admin()','execute'),'anon no pregunta';
 assert not has_function_privilege('authenticated','public.social_admin(uuid)','execute'),'ayudante privado';
 assert not has_function_privilege('authenticated','public.social_vetar(uuid)','execute'),'ayudante privado';
 assert not has_table_privilege('authenticated','public.administradores','select'),'tabla cerrada';
 assert not has_table_privilege('authenticated','public.vetados','select'),'tabla cerrada';
 raise exception 'PRUEBAS_OK';
end;
$$;
