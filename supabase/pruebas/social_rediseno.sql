-- Tras 0014. Solo datos sintéticos: PRUEBAS_OK deshace todo.
do $$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); g uuid:=gen_random_uuid();
 logro uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); pg uuid:=gen_random_uuid(); x jsonb; e text;
 texto jsonb:='{"v":1,"tipo":"texto","titulo":"Publicación","texto":"Una buena sesión"}';
 medalla jsonb:='{"v":1,"tipo":"logro","titulo":"Entrenos","logroId":"entrenos","grupo":"entreno","nivel":1,"descripcion":"10 entrenos"}';
begin
 insert into auth.users(id,email) values(a,'rediseno-a@appfit.test'),(b,'rediseno-b@appfit.test'),(c,'rediseno-c@appfit.test');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.crear_perfil('rediseno.ana','Ana',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true); perform public.crear_perfil('rediseno.beto','Beto',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true); perform public.crear_perfil('rediseno.carla','Carla',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true); perform public.pedir_seguir('rediseno.ana');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.responder_solicitud('rediseno.beto',true);
 perform public.publicar(logro,'logro',now(),medalla);
 perform public.editar_perfil_deportivo('',array[]::text[],array[]::uuid[],logro);
 perform public.publicar(p,'texto',now(),texto);
 perform public.crear_comunidad(g,'Rediseño social','Propósito de prueba',false);
 perform public.publicar_comunidad(pg,'texto',now(),texto,g);
 -- Avatar: la propia persona y sus seguidores aprobados lo ven; quien no la sigue, no.
 x:=public.avatares_social(array['rediseno.ana']);assert x->'rediseno.ana'->>'logroId'='entrenos','autor ve su avatar';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 x:=public.avatares_social(array[' Rediseno.Ana ','rediseno.carla']);assert x ? 'rediseno.ana','seguidor ve avatar con alias normalizado';
 assert not x ? 'rediseno.carla','sin avatar elegido no aparece';
 perform public.unirse_comunidad(g);
 -- Desde una comunidad no se muestra el avatar publicado para seguidores.
 x:=public.avatares_social(array['rediseno.ana'],g);assert x='{}'::jsonb,'avatar privado no sale en comunidad';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true);
 x:=public.avatares_social(array['rediseno.ana']);assert x='{}'::jsonb,'desconocido no ve avatar';
 begin perform public.avatares_social(array['rediseno.ana'],g);e:=null;exception when others then e:=sqlerrm;end;
 assert e='no_miembro','comunidad ajena exige ser miembro';
 -- Último comentario: el más reciente visible; nada para quien no ve la publicación.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 perform public.comentar_respuesta(p,'Primero',null);
 perform public.comentar_respuesta(p,repeat('x',200),null);
 perform public.comentar_respuesta(pg,'En el grupo',null);
 -- En una transacción todos tienen la misma hora: el primero, un minuto antes.
 update public.comentarios co set creado=co.creado-interval '1 minute' where co.publicacion=p and co.texto='Primero';
 x:=public.ultimos_comentarios(array[p,pg]);
 assert char_length(x->p::text->>'texto')=140,'texto recortado';assert x->p::text->>'alias'='rediseno.beto','autor del comentario';
 assert x->pg::text->>'texto'='En el grupo','comunidad propia';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true);
 x:=public.ultimos_comentarios(array[p,pg]);assert x='{}'::jsonb,'sin acceso no hay vista previa';
 -- Bloquear oculta avatar y comentario del bloqueado.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 perform public.bloquear('rediseno.beto');
 x:=public.ultimos_comentarios(array[p]);assert x='{}'::jsonb,'bloqueo oculta comentario';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 x:=public.avatares_social(array['rediseno.ana']);assert x='{}'::jsonb,'bloqueo oculta avatar';
 assert not has_function_privilege('anon','public.avatares_social(text[],uuid)','execute'),'anon sin avatares';
 assert not has_function_privilege('anon','public.ultimos_comentarios(uuid[])','execute'),'anon sin comentarios';
 raise exception 'PRUEBAS_OK';
end;
$$;
