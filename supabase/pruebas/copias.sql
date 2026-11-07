-- Tras 0032. Solo datos sintéticos: PRUEBAS_OK deshace todo.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  env jsonb := '{"sal":"AAAAAAAAAAAAAAAAAAAAAA==","iteraciones":600000,"iv":"AAAAAAAAAAAAAAAA","dek":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}';
  v_claves jsonb;
  r integer;
  fallo boolean;
begin
  v_claves := jsonb_build_object('v', 1, 'contrasena', env, 'recuperacion', env);
  insert into auth.users(id, email) values (a, 'copia-a@appfit.test'), (b, 'copia-b@appfit.test');

  -- Sin sesión no se sube nada.
  perform set_config('request.jwt.claims', '{}', true);
  begin perform public.subir_copia(0, '1.iv.datos', v_claves); fallo := false; exception when others then fallo := true; end;
  assert fallo, 'sin sesión no sube';

  perform set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
  begin perform public.subir_copia(0, '1.iv.datos', null); fallo := false; exception when others then fallo := true; end;
  assert fallo, 'la primera copia necesita claves';
  r := public.subir_copia(0, '1.iv.datos', v_claves);
  assert r = 1, 'primera copia, revisión 1';
  assert public.subir_copia(0, '1.iv.otra', v_claves) is null, 'otra primera copia es un conflicto';
  assert public.subir_copia(5, '1.iv.otra', null) is null, 'revisión vieja es un conflicto';
  assert public.subir_copia(1, '1.iv.nueva', null) = 2, 'segunda copia';
  assert (select datos_anterior = '1.iv.datos' and claves = v_claves from public.copias where user_id = a), 'guarda la anterior y conserva las claves';

  -- Las claves tienen tope (0032): ni un objeto enorme ni algo que no sea un objeto.
  begin perform public.subir_copia(2, '1.iv.x', jsonb_build_object('v', 1, 'relleno', repeat('x', 5000))); fallo := false;
  exception when check_violation then fallo := true; end;
  assert fallo, 'claves enormes al subir';
  begin perform public.actualizar_claves(jsonb_build_object('v', 1, 'relleno', repeat('x', 5000))); fallo := false;
  exception when check_violation then fallo := true; end;
  assert fallo, 'claves enormes al cambiar la contraseña';
  begin perform public.actualizar_claves('[1,2,3]'::jsonb); fallo := false; exception when check_violation then fallo := true; end;
  assert fallo, 'claves que no son un objeto';
  perform public.actualizar_claves(v_claves);
  assert (select octet_length(claves::text) < 1000 from public.copias where user_id = a), 'las claves reales caben';

  -- El tamaño cuenta bytes, no caracteres.
  assert public.subir_copia(2, 'ñññ', null) = 3, 'tercera copia';
  assert (select tamano = 6 from public.copias where user_id = a), 'tamaño en bytes';

  -- Cada cuenta toca solo su copia.
  perform set_config('request.jwt.claims', json_build_object('sub', b)::text, true);
  assert public.subir_copia(3, '1.iv.ajena', null) is null, 'no pisa la copia de otra cuenta';
  perform public.actualizar_claves(v_claves);
  assert (select count(*) from public.copias where user_id = b) = 0, 'no crea fila ajena';
  assert (select datos = 'ñññ' from public.copias where user_id = a), 'la copia de a sigue igual';

  assert not has_function_privilege('anon', 'public.subir_copia(integer,text,jsonb)', 'execute'), 'anon no sube';
  assert not has_table_privilege('authenticated', 'public.copias', 'insert,update,delete'), 'sin escritura directa';
  raise exception 'PRUEBAS_OK';
end;
$$;
