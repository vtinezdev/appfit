-- Tras 0016. Solo datos sintéticos: PRUEBAS_OK deshace todo.
do $$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); g uuid:=gen_random_uuid();
 logro uuid:=gen_random_uuid(); x jsonb; e text; mal jsonb;
 entrenos jsonb:='{"v":1,"tipo":"logro","titulo":"Entrenos","logroId":"entrenos","grupo":"entreno","nivel":2,"descripcion":"50 entrenos"}';
 compostela jsonb:='{"v":1,"tipo":"logro","titulo":"Compostela","logroId":"compostela","grupo":"caminos","nivel":null,"descripcion":"Termina un Camino"}';
 cumbres jsonb:='{"v":1,"tipo":"logro","titulo":"Cumbres","logroId":"cumbres","grupo":"cumbres","nivel":1,"descripcion":"Corona una montaña"}';
 series jsonb:='{"v":1,"tipo":"logro","titulo":"Series","logroId":"series","grupo":"entreno","nivel":1,"descripcion":"250 series"}';
begin
 insert into auth.users(id,email) values(a,'destacados-a@appfit.test'),(b,'destacados-b@appfit.test'),(c,'destacados-c@appfit.test');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.crear_perfil('destacados.ana','Ana',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true); perform public.crear_perfil('destacados.beto','Beto',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true); perform public.crear_perfil('destacados.carla','Carla',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true); perform public.pedir_seguir('destacados.ana');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.responder_solicitud('destacados.beto',true);
 -- Lo destacado antes (una publicación) pasa a la columna nueva sin la nota (misma sentencia que en 0016).
 perform public.publicar(logro,'logro',now(),entrenos||'{"nota":"Por fin"}');
 perform public.editar_perfil_deportivo('Antes',array['fuerza'],array[logro],null);
 update public.perfiles pe set logros_destacados = coalesce((
   select jsonb_agg(pu.resumen - 'nota' order by array_position(pe.destacados, pu.id))
   from public.publicaciones pu where pu.id = any(pe.destacados) and pu.tipo = 'logro' and pu.autor = pe.user_id), '[]'::jsonb)
 where cardinality(pe.destacados) > 0;
 assert (select logros_destacados from public.perfiles where user_id=a)=jsonb_build_array(entrenos),'conversión sin nota';
 -- Sin publicar: tres logros distintos, en su orden; deja de usarse la lista de publicaciones.
 perform public.guardar_perfil_deportivo(' Constancia ',array['fuerza','correr'],jsonb_build_array(compostela,entrenos,cumbres));
 assert (select cardinality(destacados) from public.perfiles where user_id=a)=0,'deja de usar publicaciones';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 x:=public.perfil_deportivo('destacados.ana');
 assert x->>'bio'='Constancia' and x->'logros'=jsonb_build_array(compostela,entrenos,cumbres),'seguidor ve los logros en su orden';
 assert jsonb_array_length(x->'destacados')=0,'clientes anteriores sin publicaciones destacadas';
 -- Desde una comunidad compartida se ven como la biografía; sin relación ni comunidad, nada.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true);
 begin perform public.perfil_deportivo('destacados.ana');e:=null;exception when others then e:=sqlerrm;end;
 assert e='no_encontrado','sin relación no se ve';
 perform public.crear_comunidad(g,'Destacados','Propósito de prueba',false);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.unirse_comunidad(g);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true);
 x:=public.perfil_deportivo('destacados.ana',g);assert jsonb_array_length(x->'logros')=3,'desde una comunidad';
 -- Lo que no es una medalla de logro se rechaza y no cambia nada.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 foreach mal in array array[
  jsonb_build_array(compostela,entrenos,cumbres,series),
  jsonb_build_array(entrenos,entrenos||'{"nivel":3}'),
  jsonb_build_array(entrenos||'{"nota":"hola"}'),
  jsonb_build_array(entrenos||'{"extra":1}'),
  jsonb_build_array('{"v":1,"tipo":"texto","titulo":"Hola","texto":"Hola"}'::jsonb),
  jsonb_build_array(entrenos||'{"nivel":6}'),
  jsonb_build_array(entrenos||'{"nivel":"2"}'),
  jsonb_build_array(entrenos-'nivel'),
  jsonb_build_array(entrenos||'{"grupo":"otro"}'),
  jsonb_build_array(entrenos||'{"logroId":"Entrenos"}'),
  jsonb_build_array(entrenos||'{"titulo":" "}'),
  jsonb_build_array(entrenos||'{"descripcion":""}'),
  jsonb_build_array('"entrenos"'::jsonb),
  entrenos,
  '"x"'::jsonb
 ]::jsonb[] loop
  begin perform public.guardar_perfil_deportivo('Otra',array[]::text[],mal); raise exception 'debía fallar: %',mal;
  exception when others then assert sqlerrm='perfil_deportivo_no_valido','rechaza '||mal::text; end;
 end loop;
 begin perform public.guardar_perfil_deportivo(repeat('x',161),array[]::text[],'[]'); e:=null; exception when others then e:=sqlerrm; end;
 assert e='perfil_deportivo_no_valido','biografía larga';
 begin perform public.guardar_perfil_deportivo('',array['nadar'],'[]'); e:=null; exception when others then e:=sqlerrm; end;
 assert e='perfil_deportivo_no_valido','disciplina desconocida';
 assert (select bio from public.perfiles where user_id=a)='Constancia' and (select jsonb_array_length(logros_destacados) from public.perfiles where user_id=a)=3,'un rechazo no toca nada';
 -- La denuncia del perfil conserva los nombres de sus logros.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 perform public.denunciar('perfil','destacados.ana','otro',null);
 assert (select contenido from public.denuncias where denunciante=b order by creada desc limit 1) like '%Compostela, Entrenos, Cumbres%','denuncia con logros';
 -- Vaciar quita todos.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 perform public.guardar_perfil_deportivo('',array[]::text[],'[]');
 assert (select logros_destacados from public.perfiles where user_id=a)='[]'::jsonb,'vaciar';
 assert not has_function_privilege('anon','public.guardar_perfil_deportivo(text,text[],jsonb)','execute'),'anon no guarda';
 assert not has_function_privilege('authenticated','public.social_logro_destacado_valido(jsonb)','execute'),'ayudante privado';
 raise exception 'PRUEBAS_OK';
end;
$$;
