-- Tras 0020. Datos sintéticos; PRUEBAS_OK revierte todo el bloque.
do $$
declare
  ana uuid := gen_random_uuid();
  r jsonb := '{"v":1,"tipo":"entreno","titulo":"Torso A","duracionSeg":3920,"series":18,"volumenKg":8433,"ejercicios":["Press banca","Mi ejercicio"],"records":[],"ligas":[],"logros":["Entrenos III"]}';
  completo jsonb;
begin
  insert into auth.users(id,email) values (ana,'imagenes-qa-ana@appfit.test');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',ana)::text,true); perform public.crear_perfil('qa.imagenes',null,true);
  assert public.social_capacidades()->'imagenesPublicacion' = 'true'::jsonb, 'anuncia la capacidad';
  assert public.social_resumen_valido(r), 'sin imágenes sigue valiendo';
  completo := r || '{"catalogIds":["appfit:press-banca",null],"insignias":[{"id":"entrenos","grupo":"entreno","nivel":3}]}';
  assert public.social_resumen_valido(completo), 'imagen e insignia alineadas';
  assert public.social_resumen_valido(r || '{"insignias":[{"id":"descanso","grupo":"oculto","nivel":null}]}'), 'repetible sin nivel';
  assert public.social_resumen_valido(r || '{"catalogIds":["appfit:press-banca"]}') is false, 'largo distinto de ejercicios';
  assert public.social_resumen_valido(r || '{"catalogIds":["https://x.y/a.webp",null]}') is false, 'solo ids del catálogo';
  assert public.social_resumen_valido(r || '{"catalogIds":["off:123",null]}') is false, 'ni de otras fuentes';
  assert public.social_resumen_valido(r || jsonb_build_object('catalogIds',jsonb_build_array('appfit:'||repeat('a',41),null))) is false, 'id acotado';
  assert public.social_resumen_valido(r || '{"catalogIds":[1,null]}') is false, 'tipo';
  assert public.social_resumen_valido(r || '{"insignias":[]}') is false, 'largo distinto de logros';
  assert public.social_resumen_valido(r || '{"insignias":[{"id":"entrenos","grupo":"otro","nivel":3}]}') is false, 'grupo conocido';
  assert public.social_resumen_valido(r || '{"insignias":[{"id":"entrenos","grupo":"entreno","nivel":6}]}') is false, 'nivel 1–5';
  assert public.social_resumen_valido(r || '{"insignias":[{"id":"entrenos","grupo":"entreno","nivel":2.5}]}') is false, 'nivel entero';
  assert public.social_resumen_valido(r || '{"insignias":[{"id":"entrenos","grupo":"entreno","nivel":3,"extra":1}]}') is false, 'sin claves de más';
  assert public.social_resumen_valido(r || '{"insignias":[{"id":"Entrenos!","grupo":"entreno","nivel":3}]}') is false, 'id con forma de identificador';
  assert public.social_resumen_valido('{"v":1,"tipo":"actividad","actividad":"correr","titulo":"Carrera","duracionSeg":1800,"distanciaM":5000,"desnivelM":null,"catalogIds":[]}') is false, 'solo en entrenos';
  perform public.publicar(gen_random_uuid(),'entreno',now(),completo);
  assert (select resumen->'insignias'->0->>'id' from public.publicaciones where autor = ana) = 'entrenos', 'se publica tal cual';
  raise exception 'PRUEBAS_OK';
end;
$$;
