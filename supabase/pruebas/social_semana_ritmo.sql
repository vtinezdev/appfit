-- Tras 0023. Datos sintéticos; PRUEBAS_OK revierte todo el bloque.
do $$
declare
  ana uuid := gen_random_uuid();
  s jsonb := '{"v":1,"tipo":"semana","titulo":"2 de 3 entrenos","lunes":"2026-10-19","estado":"semana","dias":[true,false,true,false,false,false,false],"entrenos":2,"objetivo":3,"hilo":6}';
  ret jsonb := '{"v":1,"tipo":"semana","titulo":"Estoy retomando","lunes":"2026-10-19","estado":"retomando"}';
  pau jsonb := '{"v":1,"tipo":"semana","titulo":"En pausa","lunes":"2026-10-19","estado":"pausa"}';
begin
  insert into auth.users(id,email) values (ana,'semana-qa-ana@appfit.test');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',ana)::text,true); perform public.crear_perfil('qa.semana',null,true);
  assert public.social_capacidades()->'semanaRitmo' = 'true'::jsonb, 'anuncia la capacidad';
  assert public.social_capacidades()->'rutinaCompartida' = 'true'::jsonb, 'conserva la de 0022';
  assert public.social_resumen_valido(s), 'la semana con cifras';
  assert public.social_resumen_valido(s || '{"nota":"Volviendo poco a poco"}'), 'con nota';
  assert public.social_resumen_valido(ret), 'retomando sin cifras';
  assert public.social_resumen_valido(ret || '{"entrenos":1}'), 'retomando con sus entrenos';
  assert public.social_resumen_valido(pau), 'en pausa';
  assert public.social_resumen_valido(s - 'hilo') is false, 'la semana lleva todas sus cifras';
  assert public.social_resumen_valido(s || '{"dias":[true,false]}') is false, 'siete días';
  assert public.social_resumen_valido(s || '{"dias":[1,0,1,0,0,0,0]}') is false, 'días sí/no';
  assert public.social_resumen_valido(s || '{"entrenos":8}') is false, 'entrenos acotados';
  assert public.social_resumen_valido(s || '{"objetivo":0}') is false, 'plan de 1 a 7';
  assert public.social_resumen_valido(s || '{"hilo":521}') is false, 'hilo acotado';
  assert public.social_resumen_valido(s || '{"entrenos":2.5}') is false, 'enteros';
  assert public.social_resumen_valido(s || '{"lunes":"lunes"}') is false, 'lunes con fecha';
  assert public.social_resumen_valido(s || '{"kcal":2100}') is false, 'nunca kcal';
  assert public.social_resumen_valido(s || '{"diasRegistrados":5}') is false, 'nunca días registrados';
  assert public.social_resumen_valido(ret || '{"objetivo":3}') is false, 'retomando sin plan';
  assert public.social_resumen_valido(ret || '{"hilo":3}') is false, 'retomando sin hilo';
  assert public.social_resumen_valido(pau || '{"entrenos":1}') is false, 'pausa sin cifras';
  assert public.social_resumen_valido(s || '{"estado":"fallida"}') is false, 'sin semanas fallidas';
  perform public.publicar(gen_random_uuid(),'semana',now(),s);
  assert (select resumen->>'hilo' from public.publicaciones where autor = ana and tipo = 'semana') = '6', 'se publica tal cual';
  raise exception 'PRUEBAS_OK';
end;
$$;
