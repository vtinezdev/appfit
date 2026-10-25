-- Tras 0008. Usuarios sintéticos y rollback: no modifica comunidades reales.
begin;
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  aa text := 'a_' || left(replace(a::text, '-', ''), 8);
  ab text := 'b_' || left(replace(b::text, '-', ''), 8);
  grupo uuid := gen_random_uuid(); e text; r record;
begin
  insert into auth.users(id, email, aud, role, created_at, updated_at)
    select x, x::text || '@appfit-pruebas.invalid', 'authenticated', 'authenticated', now(), now() from unnest(array[a,b]) x;
  perform set_config('request.jwt.claims', json_build_object('sub', a)::text, true); perform public.crear_perfil(aa, 'Ana', true);
  perform set_config('request.jwt.claims', json_build_object('sub', b)::text, true); perform public.crear_perfil(ab, 'Beto', true);

  perform set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
  perform public.crear_comunidad(grupo, 'Descripción de prueba ' || grupo, 'Antes', true);
  perform public.editar_descripcion_comunidad(grupo, '  Después  ');
  perform public.editar_descripcion_comunidad(grupo, '  Después  ');
  select * into r from public.comunidades(grupo::text, true);
  assert r.descripcion = 'Después' and r.solo_creador_publica and r.mia, 'La creadora cambia la descripción, recortada e idempotente, sin tocar permisos';
  perform public.editar_descripcion_comunidad(grupo, null);
  select * into r from public.comunidades(grupo::text, true);
  assert r.descripcion = '', 'La descripción puede quedar vacía';
  begin perform public.editar_descripcion_comunidad(grupo, repeat('x', 301)); e := null; exception when others then e := sqlerrm; end;
  assert e = 'comunidad_no_valida', 'Respeta el límite de 300 caracteres';
  begin perform public.editar_descripcion_comunidad(gen_random_uuid(), 'Otra'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'no_encontrado', 'Una comunidad inexistente no se edita';

  perform set_config('request.jwt.claims', json_build_object('sub', b)::text, true);
  perform public.unirse_comunidad(grupo);
  begin perform public.editar_descripcion_comunidad(grupo, 'Intrusa'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'no_encontrado', 'Un miembro no cambia la descripción';
  select * into r from public.comunidades(grupo::text, true);
  assert r.descripcion = '', 'La descripción sigue siendo la de la creadora';

  update public.comunidades set suspendida = true where id = grupo;
  perform set_config('request.jwt.claims', json_build_object('sub', a)::text, true);
  begin perform public.editar_descripcion_comunidad(grupo, 'Suspendida'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'no_encontrado', 'Una comunidad suspendida no se edita';

  perform set_config('request.jwt.claims', '{}', true);
  begin perform public.editar_descripcion_comunidad(grupo, 'Sin sesión'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'sin_sesion', 'Sin sesión no se edita';
  assert not has_function_privilege('anon', 'public.editar_descripcion_comunidad(uuid,text)', 'EXECUTE'), 'Anon no edita';
  assert has_function_privilege('authenticated', 'public.editar_descripcion_comunidad(uuid,text)', 'EXECUTE'), 'RPC autenticada';
end;
$$;
select 'PRUEBAS_EDITAR_DESCRIPCION_OK' as resultado;
rollback;
