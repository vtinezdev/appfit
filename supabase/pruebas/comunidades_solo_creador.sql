-- Tras 0007. Usuarios sintéticos y rollback: no modifica comunidades reales.
begin;
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  aa text := 'a_' || left(replace(a::text, '-', ''), 8);
  ab text := 'b_' || left(replace(b::text, '-', ''), 8);
  ac text := 'c_' || left(replace(c::text, '-', ''), 8);
  anuncios uuid := gen_random_uuid(); abierta uuid := gen_random_uuid();
  publicacion uuid := gen_random_uuid(); propia uuid := gen_random_uuid(); comentario uuid;
  tipo text; e text; r record; n integer;
  texto jsonb := '{"v":1,"tipo":"texto","titulo":"Novedades","texto":"Nueva actualización disponible"}';
  entreno jsonb := '{"v":1,"tipo":"entreno","titulo":"Entreno","duracionSeg":60,"series":3,"volumenKg":100,"ejercicios":[],"records":[],"ligas":[],"logros":[]}';
  actividad jsonb := '{"v":1,"tipo":"actividad","actividad":"correr","titulo":"Carrera","duracionSeg":60,"distanciaM":100,"desnivelM":null}';
  logro jsonb := '{"v":1,"tipo":"logro","titulo":"Entrenos","logroId":"entrenos","grupo":"entreno","nivel":1,"descripcion":"10 entrenos"}';
begin
  insert into auth.users(id, email, aud, role, created_at, updated_at)
    select x, x::text || '@appfit-pruebas.invalid', 'authenticated', 'authenticated', now(), now() from unnest(array[a,b,c]) x;
  perform set_config('request.jwt.claims', json_build_object('sub', a)::text, true); perform public.crear_perfil(aa, 'Ana', true);
  perform set_config('request.jwt.claims', json_build_object('sub', b)::text, true); perform public.crear_perfil(ab, 'Beto', true);
  perform set_config('request.jwt.claims', json_build_object('sub', c)::text, true); perform public.crear_perfil(ac, 'Carla', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
  perform public.crear_comunidad(abierta, 'Testers de prueba ' || abierta, 'Firma anterior de tres argumentos');
  select * into r from public.comunidades(abierta::text, true);
  assert not r.solo_creador_publica, 'Las comunidades creadas por clientes anteriores siguen abiertas';
  perform public.crear_comunidad(anuncios, 'Actualizaciones ' || anuncios, '', true);
  perform public.crear_comunidad(anuncios, 'Reintento ' || anuncios, '', true);
  select * into r from public.comunidades(anuncios::text, true);
  assert r.solo_creador_publica and r.mia and r.unida, 'La creadora ve y conserva la restricción al reintentar';
  begin perform public.crear_comunidad(anuncios, 'Cambio ' || anuncios, '', false); e := null; exception when others then e := sqlerrm; end;
  assert e = 'comunidad_no_valida', 'Reutilizar el UUID no cambia los permisos';
  begin perform public.crear_comunidad(gen_random_uuid(), 'Nula de prueba', '', null); e := null; exception when others then e := sqlerrm; end;
  assert e = 'comunidad_no_valida', 'La elección no admite null';
  for tipo in select unnest(array['texto', 'entreno', 'actividad', 'logro']) loop
    perform public.publicar_comunidad(gen_random_uuid(), tipo, now(), case tipo when 'logro' then logro when 'entreno' then entreno when 'actividad' then actividad else texto end, anuncios);
  end loop;
  perform public.publicar_comunidad(publicacion, 'texto', now(), texto, anuncios);
  perform public.publicar_comunidad(publicacion, 'texto', now(), texto, anuncios);
  select count(*) into n from public.publicaciones where id = publicacion; assert n = 1, 'Publicación de creadora idempotente';

  perform set_config('request.jwt.claims', json_build_object('sub', b)::text, true);
  perform public.unirse_comunidad(anuncios); perform public.unirse_comunidad(abierta);
  select * into r from public.comunidades(anuncios::text, true);
  assert r.unida and not r.mia and r.solo_creador_publica, 'El miembro recibe la política de publicación';
  select count(*) into n from public.publicaciones_comunidad(anuncios, null, 20); assert n = 5, 'Puede leer todos los anuncios sin seguir a la creadora';
  for tipo in select unnest(array['texto', 'entreno', 'actividad', 'logro']) loop
    begin
      perform public.publicar_comunidad(gen_random_uuid(), tipo, now(), case tipo when 'logro' then logro when 'entreno' then entreno when 'actividad' then actividad else texto end, anuncios);
      e := null;
    exception when others then e := sqlerrm; end;
    assert e = 'solo_creador_publica', 'No puede publicar otro miembro, en ningún tipo ni desde clientes anteriores';
  end loop;
  comentario := public.comentar(publicacion, 'Gracias por las novedades');
  perform public.reaccionar(publicacion);
  select * into r from public.social_fila(b, publicacion);
  assert r.comentarios = 1 and r.reacciones = 1, 'Los miembros siguen comentando y dando ánimo';
  perform public.publicar_comunidad(propia, 'texto', now(), texto, abierta);
  perform public.comentar(propia, 'También se comenta en Testers');
  select count(*) into n from public.publicaciones_comunidad(abierta, null, 20); assert n = 1, 'En Testers los miembros siguen publicando';
  perform public.publicar(gen_random_uuid(), 'texto', now(), texto);
  select count(*) into n from public.feed(null, 20); assert n = 1, 'Publicar a seguidores sigue disponible y no publica anuncios';
  begin perform public.borrar_publicacion(publicacion); e := null; exception when others then e := sqlerrm; end;
  assert e = 'no_encontrado', 'El miembro no borra anuncios del creador';
  perform public.salir_comunidad(anuncios);
  begin perform public.comentar(publicacion, 'Ya no soy miembro'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'no_encontrado', 'Salir revoca también los comentarios';

  perform set_config('request.jwt.claims', json_build_object('sub', c)::text, true);
  begin perform public.publicar_comunidad(gen_random_uuid(), 'texto', now(), texto, anuncios); e := null; exception when others then e := sqlerrm; end;
  assert e = 'no_miembro', 'El no miembro tampoco publica';
  begin perform public.comentar(publicacion, 'No me he unido'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'no_encontrado', 'El no miembro no comenta';
  perform set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
  perform public.borrar_publicacion(publicacion);
  assert not exists (select 1 from public.comentarios where id = comentario), 'La creadora puede borrar con cascada';
  assert not has_function_privilege('authenticated', 'public.social_validar_autoria_comunidad()', 'EXECUTE'), 'Validación privada';
  assert not has_function_privilege('anon', 'public.crear_comunidad(uuid,text,text,boolean)', 'EXECUTE'), 'Anon no crea';
  assert has_function_privilege('authenticated', 'public.crear_comunidad(uuid,text,text,boolean)', 'EXECUTE'), 'RPC nueva autenticada';
  assert not has_function_privilege('anon', 'public.comunidades(text,boolean)', 'EXECUTE'), 'Listado sigue autenticado';
end;
$$;
select 'PRUEBAS_COMUNIDADES_SOLO_CREADOR_OK' as resultado;
rollback;
