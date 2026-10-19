-- Tras 0015. Solo datos sintéticos: PRUEBAS_OK deshace todo.
do $$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); g uuid:=gen_random_uuid();
 logro uuid:=gen_random_uuid(); x jsonb; e text;
 medalla jsonb:='{"v":1,"tipo":"logro","titulo":"Entrenos","logroId":"entrenos","grupo":"entreno","nivel":1,"descripcion":"10 entrenos"}';
begin
 insert into auth.users(id,email) values(a,'avatares-a@appfit.test'),(b,'avatares-b@appfit.test'),(c,'avatares-c@appfit.test');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.crear_perfil('avatares.ana','Ana',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true); perform public.crear_perfil('avatares.beto','Beto',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true); perform public.crear_perfil('avatares.carla','Carla',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true); perform public.pedir_seguir('avatares.ana');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.responder_solicitud('avatares.beto',true);
 -- Antes de elegir del catálogo: el logro publicado de 0012 sigue saliendo, con su visibilidad.
 perform public.publicar(logro,'logro',now(),medalla);
 perform public.editar_perfil_deportivo('',array[]::text[],array[]::uuid[],logro);
 x:=public.avatares_perfil(array['avatares.ana']);assert x->'avatares.ana'->>'logroId'='entrenos','sin catálogo, el logro de antes';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true);
 x:=public.avatares_perfil(array['avatares.ana']);assert x='{}'::jsonb,'el logro de antes sigue su visibilidad';
 -- Formato: lo que no encaja se rechaza y no cambia nada.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 foreach e in array array['foto.https://x','paisaje','paisaje.Cumbre','disciplina.pesas','logro.entreno','paisaje.cumbre;drop','']::text[] loop
  begin perform public.editar_avatar(e); raise exception 'debía fallar: %',e; exception when others then assert sqlerrm='avatar_no_valido','rechaza '||e; end;
 end loop;
 begin perform public.editar_avatar('paisaje.'||repeat('x',60)); raise exception 'debía fallar'; exception when others then assert sqlerrm='avatar_no_valido','largo'; end;
 assert (select avatar_publicacion from public.perfiles where user_id=a)=logro,'un rechazo no toca nada';
 -- Elegir del catálogo sustituye al logro publicado.
 perform public.editar_avatar('paisaje.cumbre');
 assert (select avatar_publicacion from public.perfiles where user_id=a) is null,'deja de usarse el logro de antes';
 x:=public.avatares_perfil(array['avatares.ana']);assert x->>'avatares.ana'='paisaje.cumbre','la propia persona lo ve';
 -- Se ve donde se vea el alias: seguidores, desconocidos y desde una comunidad.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true);
 x:=public.avatares_perfil(array[' Avatares.Ana ','avatares.beto']);assert x->>'avatares.ana'='paisaje.cumbre','desconocido con alias normalizado';
 assert not x ? 'avatares.beto','sin avatar no aparece';
 perform public.crear_comunidad(g,'Avatares','Propósito de prueba',false);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.unirse_comunidad(g);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true);
 x:=public.avatares_perfil(array['avatares.ana'],g);assert x->>'avatares.ana'='paisaje.cumbre','desde una comunidad';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 begin perform public.avatares_perfil(array['avatares.ana'],g);e:=null;exception when others then e:=sqlerrm;end;
 assert e='no_miembro','comunidad ajena exige ser miembro';
 perform public.editar_avatar('disciplina.pesas.oro');
 x:=public.avatares_perfil(array['avatares.ana','avatares.beto']);
 assert x->>'avatares.beto'='disciplina.pesas.oro' and x->>'avatares.ana'='paisaje.cumbre','varios a la vez';
 -- Bloqueo y suspensión lo ocultan; null vuelve a las iniciales.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.bloquear('avatares.carla');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true);
 x:=public.avatares_perfil(array['avatares.ana']);assert x='{}'::jsonb,'bloqueo oculta avatar';
 update public.perfiles set suspendido=true where user_id=b;
 x:=public.avatares_perfil(array['avatares.beto']);assert x='{}'::jsonb,'suspendido sin avatar';
 update public.perfiles set suspendido=false where user_id=b;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true); perform public.editar_avatar(null);
 x:=public.avatares_perfil(array['avatares.beto']);assert x='{}'::jsonb,'null vuelve a las iniciales';
 assert not has_function_privilege('anon','public.avatares_perfil(text[],uuid)','execute'),'anon sin avatares';
 assert not has_function_privilege('anon','public.editar_avatar(text)','execute'),'anon no edita';
 raise exception 'PRUEBAS_OK';
end;
$$;
