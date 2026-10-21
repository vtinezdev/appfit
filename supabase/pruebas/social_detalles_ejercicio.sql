-- Tras 0021. Datos sintéticos; PRUEBAS_OK revierte todo el bloque.
do $$
declare
  ana uuid := gen_random_uuid();
  r jsonb := '{"v":1,"tipo":"entreno","titulo":"Pierna","duracionSeg":3480,"series":6,"volumenKg":4000,"ejercicios":["Prensa de piernas","Mi ejercicio"],"records":[],"ligas":[],"logros":[],"catalogIds":["appfit:prensa-piernas",null]}';
  completo jsonb;
begin
  insert into auth.users(id,email) values (ana,'detalles-qa-ana@appfit.test');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',ana)::text,true); perform public.crear_perfil('qa.detalles',null,true);
  assert public.social_capacidades()->'detallesEjercicio' = 'true'::jsonb, 'anuncia la capacidad';
  assert public.social_capacidades()->'imagenesPublicacion' = 'true'::jsonb, 'conserva la de 0020';
  assert public.social_resumen_valido(r), 'sin detalles sigue valiendo';
  completo := r || '{"detalles":[{"liga":"Plata","cambio":"Sube a Plata","series":["140 kg × 10","150 kg × 8"],"records":[{"serie":1,"mejora":"+10 kg"}]},{}]}';
  assert public.social_resumen_valido(completo), 'liga, series y récord alineados';
  assert public.social_resumen_valido(r || '{"detalles":[{"liga":"Élite"},{"series":["Corporal × 12"]}]}'), 'todo opcional por ejercicio';
  assert public.social_resumen_valido(r || '{"detalles":[{}]}') is false, 'largo distinto de ejercicios';
  assert public.social_resumen_valido(r || '{"detalles":[{"liga":"Diamante"},{}]}') is false, 'solo ligas conocidas';
  assert public.social_resumen_valido(r || '{"detalles":[{"cambio":""},{}]}') is false, 'sin textos vacíos';
  assert public.social_resumen_valido(r || jsonb_build_object('detalles',jsonb_build_array(jsonb_build_object('series',jsonb_build_array(repeat('x',61))),'{}'::jsonb))) is false, 'serie acotada';
  assert public.social_resumen_valido(r || jsonb_build_object('detalles',jsonb_build_array(jsonb_build_object('series',(select jsonb_agg('1 kg × 1'::text) from generate_series(1,13))),'{}'::jsonb))) is false, 'como mucho 12 series';
  assert public.social_resumen_valido(r || '{"detalles":[{"series":["1 kg × 1"],"records":[{"serie":1,"mejora":"+1 kg"}]},{}]}') is false, 'récord en una serie que existe';
  assert public.social_resumen_valido(r || '{"detalles":[{"series":["1 kg × 1"],"records":[{"serie":0.5,"mejora":"+1 kg"}]},{}]}') is false, 'índice entero';
  assert public.social_resumen_valido(r || '{"detalles":[{"records":[{"serie":0,"mejora":"+1 kg"}]},{}]}') is false, 'sin series no hay récord que señalar';
  assert public.social_resumen_valido(r || '{"detalles":[{"series":["1 kg × 1"],"records":[{"serie":0,"mejora":"+1 kg","extra":1}]},{}]}') is false, 'récord sin claves de más';
  assert public.social_resumen_valido(r || '{"detalles":[{"peso":80},{}]}') is false, 'detalle sin claves de más';
  assert public.social_resumen_valido(r || '{"detalles":["nada",{}]}') is false, 'cada detalle es un objeto';
  perform public.publicar(gen_random_uuid(),'entreno',now(),completo);
  assert (select resumen->'detalles'->0->>'liga' from public.publicaciones where autor = ana) = 'Plata', 'se publica tal cual';
  raise exception 'PRUEBAS_OK';
end;
$$;
