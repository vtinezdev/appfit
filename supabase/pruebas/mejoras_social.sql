-- Después de 0009. Datos sintéticos; PRUEBAS_OK revierte todo el bloque.
do $$
declare
  ana uuid := gen_random_uuid(); beto uuid := gen_random_uuid(); carla uuid := gen_random_uuid();
  grupo uuid := gen_random_uuid(); pub uuid := gen_random_uuid(); pub_beto uuid := gen_random_uuid();
  r jsonb := '{"v":1,"tipo":"entreno","titulo":"Torso A","duracionSeg":3920,"series":18,"volumenKg":8433,"ejercicios":["Press banca","Remo con barra"],"records":[{"ejercicio":"Press banca","texto":"100 kg × 5"}],"ligas":[{"ejercicio":"Remo con barra","texto":"Sube a Plata"}],"logros":["Constancia II"]}';
  actividad jsonb := '{"v":1,"tipo":"actividad","actividad":"correr","titulo":"Carrera","duracionSeg":1800,"distanciaM":5000,"desnivelM":null}';
  p record; c jsonb; cursor_fecha timestamptz; cursor_id uuid; ids uuid[] := '{}'; ci uuid[] := '{}'; n integer := 0; e text; invalido jsonb;
begin
  insert into auth.users(id,email) values (ana,'social-qa-ana@appfit.test'),(beto,'social-qa-beto@appfit.test'),(carla,'social-qa-carla@appfit.test');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',ana)::text,true); perform public.crear_perfil('qa.ana',null,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',beto)::text,true); perform public.crear_perfil('qa.beto',null,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',carla)::text,true); perform public.crear_perfil('qa.carla',null,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',ana)::text,true);
  assert public.social_resumen_valido(r), 'fixture actual entreno';
  assert public.social_resumen_valido(actividad), 'fixture actual actividad';
  assert public.social_resumen_valido(actividad-'desnivelM') is false, 'la validación nunca devuelve null ante un campo requerido ausente';
  assert public.social_resumen_valido(r || jsonb_build_object('nota',repeat('é',280),'recordsTotal',7,'recordsEjercicios',4)), 'nota y totales opcionales v1';
  assert public.social_resumen_valido(r || '{"records":[{"ejercicio":"Press","texto":"85 kg","tipo":"peso","modo":"externa","valor":85,"anterior":82.5,"variante":"Barra"}]}'), 'metadatos';
  assert public.social_resumen_valido(r || jsonb_build_object('mapa',(select jsonb_object_agg(k,5) from unnest(array['pecho','espalda','hombros','biceps','triceps','antebrazo','cuadriceps','isquiotibiales','gluteos','aductores','gemelos','core']) k))), '12 zonas';
  for invalido in select unnest(array[r || '{"privado":"secreto"}', r || '{"series":-1}', r || '{"duracionSeg":"10"}', r || jsonb_build_object('nota',repeat('a',281)),r || '{"recordsTotal":0}',r || '{"mapa":{"pecho":8}}',r || '{"records":[{"ejercicio":"Press","texto":"85","pesoCorporal":80}]}',actividad-'desnivelM',actividad || '{"gps":[1,2]}',actividad || '{"distanciaM":-1}',r || jsonb_build_object('titulo',repeat('a',61))]) loop
    begin perform public.publicar(gen_random_uuid(),invalido->>'tipo',now(),invalido); e := null; exception when others then e := sqlerrm; end;
    assert e = 'publicacion_no_valida', 'resumen inválido rechazado: ' || coalesce(e,'sin error');
  end loop;
  -- 45 publicaciones con timestamp idéntico. El cursor compuesto no salta ni repite ninguna.
  for n in 1..45 loop insert into public.publicaciones(id,autor,tipo,fecha,creada,resumen) values(gen_random_uuid(),ana,'entreno',now(),now(),r); end loop;
  loop
    n := 0;
    for p in select * from public.feed(cursor_fecha,cursor_id,20) loop
      assert not p.id = any(ids), 'sin duplicados'; ids := array_append(ids,p.id); cursor_fecha := p.creada; cursor_id := p.id; n := n+1;
    end loop;
    exit when n < 20;
  end loop;
  assert cardinality(ids) = 45, 'todas las filas con empate accesibles';
  pub := ids[1];
  for n in 1..250 loop insert into public.comentarios(publicacion,autor,texto,creado) values(pub,beto,'Comentario '||n,now()); end loop;
  cursor_fecha := null; cursor_id := null;
  loop
    c := public.comentarios_pagina(pub,cursor_fecha,cursor_id,20);
    assert (c->>'total')::int = 250, 'el total no baja al paginar';
    for p in select * from jsonb_to_recordset(c->'items') as x(id uuid,creado timestamptz) loop
      assert not p.id = any(ci), 'comentarios sin duplicados'; ci := array_append(ci,p.id); cursor_fecha := p.creado; cursor_id := p.id;
    end loop;
    exit when jsonb_array_length(c->'items') < 20;
  end loop;
  assert cardinality(ci) = 250, 'los 250 comentarios son accesibles';
  -- Comunidad compartida sin relación de seguidores: no deja leer las publicaciones privadas de Beto.
  perform public.crear_comunidad(grupo,'QA social','Pruebas');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',beto)::text,true);
  perform public.unirse_comunidad(grupo); perform public.publicar_comunidad(pub_beto,'actividad',now(),actividad,grupo);
  perform public.publicar(gen_random_uuid(),'actividad',now(),actividad);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',ana)::text,true);
  select count(*) into n from public.publicaciones_persona_comunidad('qa.beto',grupo,null,null,20); assert n=1, 'solo publicaciones de esta comunidad';
  begin perform public.publicaciones_de('qa.beto',null,null,20); e := null; exception when others then e:=sqlerrm; end;
  assert e='no_encontrado', 'sin aprobación no hay feed privado';
  perform public.bloquear('qa.beto');
  select count(*) into n from public.publicaciones_persona_comunidad('qa.beto',grupo,null,null,20); assert n=0, 'respeta bloqueo';
  assert (public.comentarios_pagina(pub,null,null,20)->>'total')::int=0,'total respeta bloqueo';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',carla)::text,true);
  begin perform public.comentarios_pagina(pub_beto,null,null,20); e := null; exception when others then e:=sqlerrm; end;
  assert e='no_encontrado', 'no miembro no lee comentarios';
  assert not has_function_privilege('anon','public.feed(timestamptz,uuid,integer)','execute'), 'anon sin acceso';
  assert not has_function_privilege('authenticated','public.social_resumen_valido(jsonb)','execute'), 'ayudante privado';
  raise exception 'PRUEBAS_OK';
end;
$$;
