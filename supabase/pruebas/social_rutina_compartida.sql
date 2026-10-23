-- Tras 0022. Datos sintéticos; PRUEBAS_OK revierte todo el bloque.
do $$
declare
  ana uuid := gen_random_uuid();
  r jsonb := '{"v":1,"tipo":"rutina","titulo":"Torso A","ejercicios":[{"nombre":"Press banca","catalogId":"appfit:press-banca","series":4,"repsMin":6,"repsMax":8,"descansoSeg":120,"calentamientos":2},{"nombre":"Mi máquina","catalogId":null,"series":3,"repsMin":10,"repsMax":12},{"nombre":"Remo con barra","catalogId":"appfit:remo-barra"}]}';
  uno jsonb := '{"nombre":"Press banca","catalogId":"appfit:press-banca","series":3,"repsMin":8,"repsMax":12}';
  con jsonb;
begin
  insert into auth.users(id,email) values (ana,'rutina-qa-ana@appfit.test');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',ana)::text,true); perform public.crear_perfil('qa.rutina',null,true);
  assert public.social_capacidades()->'rutinaCompartida' = 'true'::jsonb, 'anuncia la capacidad';
  assert public.social_capacidades()->'detallesEjercicio' = 'true'::jsonb, 'conserva la de 0021';
  assert public.social_resumen_valido(r), 'la rutina que publica la app';
  assert public.social_resumen_valido(r || '{"nota":"Mi rutina de verano"}'), 'con nota';
  con := jsonb_build_object('v',1,'tipo','rutina','titulo','X','ejercicios',jsonb_build_array(uno));
  assert public.social_resumen_valido(con), 'un solo ejercicio';
  assert public.social_resumen_valido(con || '{"ejercicios":[]}') is false, 'al menos un ejercicio';
  assert public.social_resumen_valido(con || jsonb_build_object('ejercicios',(select jsonb_agg(uno) from generate_series(1,16)))) is false, 'como mucho 15';
  assert public.social_resumen_valido(con || '{"ejercicios":[{"nombre":"Sin catálogo"}]}') is false, 'catalogId presente (null si es propio)';
  assert public.social_resumen_valido(con || '{"ejercicios":[{"nombre":"Local","catalogId":"local:3"}]}') is false, 'solo ids del catálogo de la app';
  assert public.social_resumen_valido(con || jsonb_build_object('ejercicios',jsonb_build_array(uno || '{"peso":80}'))) is false, 'nunca cargas';
  assert public.social_resumen_valido(con || jsonb_build_object('ejercicios',jsonb_build_array(uno || '{"agarre":"prono"}'))) is false, 'sin claves de más';
  assert public.social_resumen_valido(con || jsonb_build_object('ejercicios',jsonb_build_array(uno - 'repsMax'))) is false, 'objetivo completo o ninguno';
  assert public.social_resumen_valido(con || '{"ejercicios":[{"nombre":"X","catalogId":null,"descansoSeg":90}]}') is false, 'sin series no hay descanso';
  assert public.social_resumen_valido(con || jsonb_build_object('ejercicios',jsonb_build_array(uno || '{"repsMin":13}'))) is false, 'mínimo ≤ máximo';
  assert public.social_resumen_valido(con || jsonb_build_object('ejercicios',jsonb_build_array(uno || '{"series":3.5}'))) is false, 'enteros';
  assert public.social_resumen_valido(con || jsonb_build_object('ejercicios',jsonb_build_array(uno || '{"series":21}'))) is false, 'series acotadas';
  assert public.social_resumen_valido(con || jsonb_build_object('ejercicios',jsonb_build_array(uno || '{"descansoSeg":5}'))) is false, 'descanso acotado';
  assert public.social_resumen_valido(con || jsonb_build_object('ejercicios',jsonb_build_array(uno || '{"calentamientos":6}'))) is false, 'calentamientos acotados';
  assert public.social_resumen_valido(con || jsonb_build_object('ejercicios',jsonb_build_array(uno || jsonb_build_object('nombre',repeat('x',61))))) is false, 'nombre acotado';
  assert public.social_resumen_valido(con || '{"series":3}') is false, 'sin claves de entreno';
  perform public.publicar(gen_random_uuid(),'rutina',now(),r);
  assert (select resumen->'ejercicios'->1->>'nombre' from public.publicaciones where autor = ana and tipo = 'rutina') = 'Mi máquina', 'se publica tal cual';
  begin
    perform public.publicar(gen_random_uuid(),'entreno',now(),r);
    assert false, 'el tipo de la fila es el del resumen';
  exception when others then
    if sqlerrm <> 'publicacion_no_valida' then raise; end if;
  end;
  raise exception 'PRUEBAS_OK';
end;
$$;
