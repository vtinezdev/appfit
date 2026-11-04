-- Tras 0029. Solo datos sintéticos: PRUEBAS_OK deshace todo.
do $$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); g uuid:=gen_random_uuid();
 p uuid:=gen_random_uuid(); otra uuid:=gen_random_uuid(); raiz uuid; r1 uuid; r2 uuid; ajeno uuid; e text; x jsonb;
 texto jsonb:='{"v":1,"tipo":"texto","titulo":"Publicación","texto":"Una buena sesión"}';
begin
 insert into auth.users(id,email) values(a,'anid-a@appfit.test'),(b,'anid-b@appfit.test'),(c,'anid-c@appfit.test');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.crear_perfil('anid.ana','Ana',true);
 assert (public.social_capacidades()->>'respuestasAnidadas')::boolean,'anuncia la capacidad nueva';
 assert (public.social_capacidades()->>'imagenesComunidades')::boolean,'conserva las capacidades previas';
 perform public.crear_comunidad(g,'Respuestas anidadas','Propósito de prueba',false);
 perform public.publicar_comunidad(p,'texto',now(),texto,g);
 perform public.publicar_comunidad(otra,'texto',now(),texto,g);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true); perform public.crear_perfil('anid.beto','Beto',true);
 perform public.unirse_comunidad(g);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true); perform public.crear_perfil('anid.carla','Carla',true);
 perform public.unirse_comunidad(g);

 -- Beto comenta, Carla le responde y Beto responde a la respuesta de Carla.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 raiz:=public.comentar_respuesta(p,'Comentario raíz',null);
 ajeno:=public.comentar_respuesta(otra,'En otra publicación',null);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true);
 update public.perfiles set avisos_vistos=now()-interval '1 day' where user_id=c;
 r1:=public.comentar_respuesta(p,'Respuesta de Carla',raiz);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 r2:=public.comentar_respuesta(p,'Respuesta a la respuesta',r1);
 assert (select respuesta_a from public.comentarios where id=r2)=r1,'la respuesta apunta a la respuesta, no a la raíz';

 -- El aviso le llega a quien escribió la respuesta contestada.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true);
 x:=public.avisos();
 assert exists(select 1 from jsonb_array_elements(x->'lista') z where z->>'tipo'='respuesta' and z->>'alias'='anid.beto'),'aviso a la autora de la respuesta';

 -- La página dice a quién contesta cada respuesta.
 x:=public.comentarios_pagina(p,null,null,20);
 assert exists(select 1 from jsonb_array_elements(x->'items') z where z->>'id'=r2::text and z->>'respuesta_a'=r1::text and z->>'respuesta_alias'='anid.carla'),'respuesta_alias de la respuesta contestada';

 -- No se responde a un comentario de otra publicación ni a quien te bloquea.
 begin perform public.comentar_respuesta(p,'Cruzado',ajeno);e:=null;exception when others then e:=sqlerrm;end;
 assert e='no_encontrado','otra publicación';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true); perform public.bloquear('anid.carla');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true);
 begin perform public.comentar_respuesta(p,'Bloqueada',r2);e:=null;exception when others then e:=sqlerrm;end;
 assert e='no_encontrado','bloqueo';

 assert not has_function_privilege('anon','public.comentar_respuesta(uuid,text,uuid)','execute'),'cerrado a anon';
 raise exception 'PRUEBAS_OK';
end;
$$;
