-- Pruebas de 0003_social.sql, 0004_publicaciones.sql y 0005_feed.sql. Se pegan enteras en el SQL Editor y se ejecutan: no dejan nada guardado.
--
-- Todo va en un único bloque que, al final, lanza el error «PRUEBAS_OK»: el error deshace todo lo que hizo (usuarios
-- de prueba incluidos). Si sale «PRUEBAS_OK», han pasado todas; si sale otro mensaje, es la prueba que falló.
-- Cada «como(x)» se hace fijando el usuario de la sesión, que es lo que lee auth.uid().

do $$
declare
  ana uuid := gen_random_uuid();
  beto uuid := gen_random_uuid();
  carla uuid := gen_random_uuid();
  pub uuid := gen_random_uuid();
  pub2 uuid := gen_random_uuid();
  com1 uuid;
  e text;
  n integer;
  v text;
  r record;
begin
  insert into auth.users (id, email, aud, role, created_at, updated_at)
  values (ana, 'prueba-ana@appfit.test', 'authenticated', 'authenticated', now(), now()),
         (beto, 'prueba-beto@appfit.test', 'authenticated', 'authenticated', now(), now()),
         (carla, 'prueba-carla@appfit.test', 'authenticated', 'authenticated', now(), now());

  -- Sin perfil
  perform set_config('request.jwt.claims', json_build_object('sub', ana)::text, true);
  assert public.mi_perfil() is null, 'sin perfil, mi_perfil es null';
  begin perform public.personas('siguiendo'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'sin_perfil', 'sin perfil no hay listas: ' || coalesce(e, 'sin error');

  -- Crear perfiles
  begin perform public.crear_perfil('Ana', 'Ana G.', false); e := null; exception when others then e := sqlerrm; end;
  assert e = 'sin_aceptar', 'hay que aceptar: ' || coalesce(e, 'sin error');
  begin perform public.crear_perfil('a', null, true); e := null; exception when others then e := sqlerrm; end;
  assert e = 'alias_no_valido', 'alias corto: ' || coalesce(e, 'sin error');
  begin perform public.crear_perfil('.ana', null, true); e := null; exception when others then e := sqlerrm; end;
  assert e = 'alias_no_valido', 'alias con punto al principio: ' || coalesce(e, 'sin error');
  begin perform public.crear_perfil('admin', null, true); e := null; exception when others then e := sqlerrm; end;
  assert e = 'alias_reservado', 'alias reservado: ' || coalesce(e, 'sin error');
  perform public.crear_perfil('  Ana.Fit ', '  Ana   G. ', true);
  assert public.mi_perfil() ->> 'alias' = 'ana.fit', 'el alias se guarda en minúsculas y sin espacios';
  assert public.mi_perfil() ->> 'nombre' = 'Ana G.', 'el nombre se limpia';
  assert public.mi_perfil() ->> 'codigo' ~ '^[0-9A-F]{4}-[0-9A-F]{4}$', 'código con formato';
  begin perform public.crear_perfil('otra', null, true); e := null; exception when others then e := sqlerrm; end;
  assert e = 'ya_hay_perfil', 'un perfil por cuenta: ' || coalesce(e, 'sin error');

  perform set_config('request.jwt.claims', json_build_object('sub', beto)::text, true);
  begin perform public.crear_perfil('ANA.FIT', null, true); e := null; exception when others then e := sqlerrm; end;
  assert e = 'alias_ocupado', 'alias ocupado sin distinguir mayúsculas: ' || coalesce(e, 'sin error');
  perform public.crear_perfil('beto', null, true);
  perform set_config('request.jwt.claims', json_build_object('sub', carla)::text, true);
  perform public.crear_perfil('carla', 'Carla', true);

  -- Buscar por alias y por código
  perform set_config('request.jwt.claims', json_build_object('sub', beto)::text, true);
  select count(*) into n from public.buscar_persona('Ana.Fit');
  assert n = 1, 'busca por alias sin distinguir mayúsculas';
  select count(*) into n from public.buscar_persona('beto');
  assert n = 0, 'no se encuentra a sí mismo';
  select codigo into v from public.perfiles where user_id = carla;
  select * into r from public.buscar_persona(lower(replace(v, '-', '')));
  assert r.alias = 'carla' and r.sigo = 'no' and r.me_sigue = 'no', 'busca por código sin guion y en minúsculas';
  select count(*) into n from public.buscar_persona('ana');
  assert n = 0, 'el alias es exacto';

  -- Seguir con aprobación
  assert public.pedir_seguir('ana.fit') = 'pendiente', 'la solicitud queda pendiente';
  assert public.pedir_seguir('ana.fit') = 'pendiente', 'pedirlo dos veces no duplica';
  select * into r from public.personas('siguiendo');
  assert r.alias = 'ana.fit' and r.sigo = 'pendiente', 'en siguiendo aparece la solicitud enviada';
  perform set_config('request.jwt.claims', json_build_object('sub', ana)::text, true);
  assert (public.mi_perfil() ->> 'solicitudes')::int = 1, 'Ana tiene una solicitud';
  select * into r from public.personas('solicitudes');
  assert r.alias = 'beto' and r.me_sigue = 'pendiente', 'Ana ve la solicitud de Beto';
  select count(*) into n from public.personas('seguidores');
  assert n = 0, 'una solicitud no es un seguidor';
  perform public.responder_solicitud('beto', true);
  select * into r from public.personas('seguidores');
  assert r.alias = 'beto' and r.me_sigue = 'aceptado', 'aceptada, Beto la sigue';
  begin perform public.responder_solicitud('beto', true); e := null; exception when others then e := sqlerrm; end;
  assert e = 'no_encontrado', 'no hay solicitud que responder dos veces: ' || coalesce(e, 'sin error');

  -- Rechazar y quitar seguidor
  perform set_config('request.jwt.claims', json_build_object('sub', carla)::text, true);
  perform public.pedir_seguir('ana.fit');
  perform set_config('request.jwt.claims', json_build_object('sub', ana)::text, true);
  perform public.responder_solicitud('carla', false);
  select count(*) into n from public.seguimientos where seguidor = carla;
  assert n = 0, 'rechazar borra la solicitud';
  perform public.quitar_seguidor('beto');
  select count(*) into n from public.personas('seguidores');
  assert n = 0, 'quitar seguidor';

  -- Dejar de seguir y cancelar
  perform set_config('request.jwt.claims', json_build_object('sub', beto)::text, true);
  perform public.pedir_seguir('carla');
  perform public.dejar_de_seguir('carla');
  select count(*) into n from public.personas('siguiendo');
  assert n = 0, 'cancelar la solicitud';

  -- Bloquear
  perform public.pedir_seguir('ana.fit');
  perform set_config('request.jwt.claims', json_build_object('sub', ana)::text, true);
  perform public.responder_solicitud('beto', true);
  perform public.pedir_seguir('beto');
  perform public.bloquear('beto');
  select count(*) into n from public.seguimientos where seguidor in (ana, beto) and seguido in (ana, beto);
  assert n = 0, 'bloquear quita el seguimiento en los dos sentidos';
  select * into r from public.personas('bloqueados');
  assert r.alias = 'beto', 'Beto aparece en bloqueados';
  perform set_config('request.jwt.claims', json_build_object('sub', beto)::text, true);
  select count(*) into n from public.buscar_persona('ana.fit');
  assert n = 0, 'quien está bloqueado no encuentra a quien le bloqueó';
  begin perform public.pedir_seguir('ana.fit'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'no_encontrado', 'ni puede pedir seguirla: ' || coalesce(e, 'sin error');
  perform set_config('request.jwt.claims', json_build_object('sub', ana)::text, true);
  select count(*) into n from public.buscar_persona('beto');
  assert n = 0, 'quien bloquea tampoco ve a la otra persona al buscar';
  perform public.desbloquear('beto');
  select count(*) into n from public.buscar_persona('beto');
  assert n = 1, 'al desbloquear se vuelven a encontrar';

  -- Código nuevo
  select codigo into v from public.perfiles where user_id = ana;
  assert public.nuevo_codigo() <> v, 'código nuevo';
  perform set_config('request.jwt.claims', json_build_object('sub', beto)::text, true);
  select count(*) into n from public.buscar_persona(v);
  assert n = 0, 'el código anterior deja de servir';

  -- Editar
  perform set_config('request.jwt.claims', json_build_object('sub', ana)::text, true);
  begin perform public.editar_perfil('carla', null); e := null; exception when others then e := sqlerrm; end;
  assert e = 'alias_ocupado', 'editar a un alias ocupado: ' || coalesce(e, 'sin error');
  perform public.editar_perfil('ana', null);
  assert public.mi_perfil() ->> 'alias' = 'ana' and public.mi_perfil() ->> 'nombre' is null, 'editar alias y quitar el nombre';

  -- Publicar
  perform set_config('request.jwt.claims', json_build_object('sub', carla)::text, true);
  perform public.publicar(pub, 'entreno', now() - interval '1 hour', '{"v":1,"tipo":"entreno","titulo":"Entreno","duracionSeg":60,"series":3,"volumenKg":100,"ejercicios":[],"records":[],"ligas":[],"logros":[]}');
  perform public.publicar(pub, 'entreno', now() - interval '1 hour', '{"v":1,"tipo":"entreno","titulo":"Entreno","duracionSeg":60,"series":3,"volumenKg":100,"ejercicios":[],"records":[],"ligas":[],"logros":[]}');
  select count(*) into n from public.publicaciones where autor = carla;
  assert n = 1, 'publicar dos veces el mismo id no duplica';
  begin perform public.publicar(gen_random_uuid(), 'otro', now(), '{}'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'publicacion_no_valida', 'tipo no válido: ' || coalesce(e, 'sin error');
  begin perform public.publicar(gen_random_uuid(), 'entreno', now(), '[1, 2]'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'publicacion_no_valida', 'el resumen es un objeto: ' || coalesce(e, 'sin error');
  begin perform public.publicar(gen_random_uuid(), 'entreno', now(), jsonb_build_object('t', repeat('x', 9000))); e := null; exception when others then e := sqlerrm; end;
  assert e = 'publicacion_no_valida', 'el resumen es pequeño: ' || coalesce(e, 'sin error');
  begin perform public.publicar(gen_random_uuid(), 'actividad', now() + interval '3 days', '{}'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'publicacion_no_valida', 'no se publica algo del futuro: ' || coalesce(e, 'sin error');
  perform set_config('request.jwt.claims', json_build_object('sub', beto)::text, true);
  begin perform public.publicar(pub, 'entreno', now(), '{}'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'publicacion_no_valida', 'el id de otra persona no se reutiliza: ' || coalesce(e, 'sin error');
  begin perform public.borrar_publicacion(pub); e := null; exception when others then e := sqlerrm; end;
  assert e = 'no_encontrado', 'no se borra lo de otra persona: ' || coalesce(e, 'sin error');
  perform set_config('request.jwt.claims', json_build_object('sub', carla)::text, true);
  perform public.borrar_publicacion(pub);
  select count(*) into n from public.publicaciones where id = pub;
  assert n = 0, 'borrar mi publicación';
  begin perform public.borrar_publicacion(pub); e := null; exception when others then e := sqlerrm; end;
  assert e = 'no_encontrado', 'borrarla otra vez: ' || coalesce(e, 'sin error');
  perform public.publicar(pub2, 'actividad', now(), '{"v":1,"tipo":"actividad","actividad":"caminar","titulo":"Ruta","duracionSeg":60,"distanciaM":100,"desnivelM":null}');

  -- Feed, reacciones, comentarios y avisos
  perform set_config('request.jwt.claims', json_build_object('sub', beto)::text, true);
  perform public.pedir_seguir('carla');
  select count(*) into n from public.feed(null, 20);
  assert n = 0, 'con la solicitud pendiente no se ve nada';
  begin perform public.publicaciones_de('carla', null, 20); e := null; exception when others then e := sqlerrm; end;
  assert e = 'no_encontrado', 'ni sus publicaciones: ' || coalesce(e, 'sin error');
  perform set_config('request.jwt.claims', json_build_object('sub', carla)::text, true);
  perform public.responder_solicitud('beto', true);
  select * into r from public.feed(null, 20);
  assert r.id = pub2 and r.mia, 'cada cual ve lo suyo en el feed';
  perform set_config('request.jwt.claims', json_build_object('sub', beto)::text, true);
  select * into r from public.feed(null, 20);
  assert r.id = pub2 and r.alias = 'carla' and not r.mia and r.reacciones = 0 and r.resumen ->> 'titulo' = 'Ruta', 'aceptado, Beto ve lo de Carla';
  select count(*) into n from public.publicaciones_de('carla', null, 20);
  assert n = 1, 'y su perfil';
  select count(*) into n from public.feed(r.creada, 20);
  assert n = 0, 'la página siguiente empieza después de la última vista';
  perform public.reaccionar(pub2);
  perform public.reaccionar(pub2);
  select * into r from public.feed(null, 20);
  assert r.reacciones = 1 and r.reaccione, 'una reacción por persona';
  com1 := public.comentar(pub2, '  ¡Buena ruta!  ');
  begin perform public.comentar(pub2, '   '); e := null; exception when others then e := sqlerrm; end;
  assert e = 'comentario_no_valido', 'comentario vacío: ' || coalesce(e, 'sin error');
  begin perform public.comentar(pub2, repeat('a', 501)); e := null; exception when others then e := sqlerrm; end;
  assert e = 'comentario_no_valido', 'comentario largo: ' || coalesce(e, 'sin error');
  select * into r from public.comentarios_de(pub2);
  assert r.texto = '¡Buena ruta!' and r.mio and r.puedo_borrar, 'el comentario, sin espacios de más';
  select * into r from public.feed(null, 20);
  assert r.comentarios = 1, 'el feed cuenta los comentarios';
  perform set_config('request.jwt.claims', json_build_object('sub', carla)::text, true);
  -- Todo el bloque es una transacción y now() no avanza: los avisos se vieron «antes» para que cuenten como nuevos.
  update public.perfiles set avisos_vistos = now() - interval '1 minute' where user_id = carla;
  -- Y la reacción, de antes que el comentario (si no, tienen la misma hora y el orden es cualquiera).
  update public.reacciones set creada = now() - interval '30 seconds' where publicacion = pub2;
  assert (public.avisos() ->> 'nuevos')::int = 2, 'Carla tiene dos avisos nuevos';
  assert jsonb_array_length(public.avisos() -> 'lista') = 2, 'con su lista';
  assert public.avisos() -> 'lista' -> 0 ->> 'tipo' = 'comentario', 'lo más reciente primero';
  perform public.marcar_avisos_vistos();
  assert (public.avisos() ->> 'nuevos')::int = 0, 'vistos, ya no son nuevos';
  select * into r from public.comentarios_de(pub2);
  assert not r.mio and r.puedo_borrar, 'quien publica puede borrar los comentarios de lo suyo';
  perform set_config('request.jwt.claims', json_build_object('sub', ana)::text, true);
  begin perform public.reaccionar(pub2); e := null; exception when others then e := sqlerrm; end;
  assert e = 'no_encontrado', 'sin seguir no se reacciona: ' || coalesce(e, 'sin error');
  begin perform public.comentar(pub2, 'hola'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'no_encontrado', 'ni se comenta: ' || coalesce(e, 'sin error');
  begin perform public.comentarios_de(pub2); e := null; exception when others then e := sqlerrm; end;
  assert e = 'no_encontrado', 'ni se leen los comentarios: ' || coalesce(e, 'sin error');
  begin perform public.borrar_comentario(com1); e := null; exception when others then e := sqlerrm; end;
  assert e = 'no_encontrado', 'ni se borran: ' || coalesce(e, 'sin error');
  begin perform public.denunciar('publicacion', pub2::text, 'spam', null); e := null; exception when others then e := sqlerrm; end;
  assert e = 'no_encontrado', 'ni se denuncia lo que no se ve: ' || coalesce(e, 'sin error');
  perform set_config('request.jwt.claims', json_build_object('sub', beto)::text, true);
  perform public.denunciar('publicacion', pub2::text, 'inapropiado', null);
  perform public.denunciar('comentario', com1::text, 'otro', 'prueba');
  select count(*) into n from public.denuncias where (objetivo = pub2 and contenido like 'carla · %') or (objetivo = com1 and contenido = 'beto · ¡Buena ruta!');
  assert n = 2, 'las denuncias guardan lo denunciado';
  begin perform public.denunciar('publicacion', 'no-es-un-id', 'spam', null); e := null; exception when others then e := sqlerrm; end;
  assert e = 'no_encontrado', 'un id que no es uuid: ' || coalesce(e, 'sin error');
  perform set_config('request.jwt.claims', json_build_object('sub', carla)::text, true);
  perform public.borrar_comentario(com1);
  select count(*) into n from public.comentarios where publicacion = pub2;
  assert n = 0, 'Carla borra el comentario de Beto en lo suyo';
  perform public.bloquear('beto');
  perform set_config('request.jwt.claims', json_build_object('sub', beto)::text, true);
  select count(*) into n from public.feed(null, 20);
  assert n = 0, 'bloqueado, deja de ver sus publicaciones';
  perform public.quitar_reaccion(pub2);
  select count(*) into n from public.reacciones where publicacion = pub2;
  assert n = 0, 'quitar la reacción';
  perform set_config('request.jwt.claims', json_build_object('sub', carla)::text, true);
  perform public.desbloquear('beto');

  -- Denunciar y suspender
  perform set_config('request.jwt.claims', json_build_object('sub', beto)::text, true);
  begin perform public.denunciar('perfil', 'ana', 'insulto', null); e := null; exception when others then e := sqlerrm; end;
  assert e = 'denuncia_no_valida', 'motivo no válido: ' || coalesce(e, 'sin error');
  perform public.denunciar('perfil', 'ana', 'spam', '  ');
  select count(*) into n from public.denuncias where objetivo = ana and contenido = 'ana' and detalle is null and revisada is null;
  assert n = 1, 'la denuncia guarda el perfil tal como estaba';
  update public.perfiles set suspendido = true where user_id = ana;
  select count(*) into n from public.buscar_persona('ana');
  assert n = 0, 'un perfil suspendido no aparece';
  perform set_config('request.jwt.claims', json_build_object('sub', ana)::text, true);
  begin perform public.pedir_seguir('beto'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'suspendido', 'un perfil suspendido no puede hacer nada: ' || coalesce(e, 'sin error');
  assert (public.mi_perfil() ->> 'suspendido')::boolean, 'pero sí ve que está suspendido';

  -- Borrar perfil y cuenta
  perform set_config('request.jwt.claims', json_build_object('sub', carla)::text, true);
  perform public.pedir_seguir('beto');
  perform public.borrar_perfil();
  assert public.mi_perfil() is null, 'perfil borrado';
  select count(*) into n from public.seguimientos where seguidor = carla;
  assert n = 0, 'borrar el perfil borra sus seguimientos';
  select count(*) into n from public.publicaciones where autor = carla;
  assert n = 0, 'y sus publicaciones';
  delete from auth.users where id = beto;
  select count(*) into n from public.perfiles where user_id = beto;
  assert n = 0, 'borrar la cuenta borra el perfil';

  -- Sin acceso directo a las tablas desde la app
  assert not has_table_privilege('authenticated', 'public.perfiles', 'select'), 'authenticated no lee perfiles';
  assert not has_table_privilege('anon', 'public.seguimientos', 'select'), 'anon no lee seguimientos';
  assert not has_table_privilege('authenticated', 'public.publicaciones', 'select'), 'authenticated no lee publicaciones';
  assert not has_table_privilege('authenticated', 'public.comentarios', 'select'), 'authenticated no lee comentarios';
  assert not has_function_privilege('authenticated', 'public.social_fila(uuid, uuid)', 'execute'), 'ni los ayudantes del feed';
  assert not has_function_privilege('authenticated', 'public.social_ver(uuid, uuid)', 'execute'), 'los ayudantes no se pueden llamar';
  assert not has_function_privilege('anon', 'public.mi_perfil()', 'execute'), 'sin sesión no hay funciones sociales';
  assert has_function_privilege('authenticated', 'public.pedir_seguir(text)', 'execute'), 'con sesión, sí';

  raise exception 'PRUEBAS_OK';
end;
$$;
