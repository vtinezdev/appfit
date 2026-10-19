-- Tras 0019, en la base efímera de scripts/sql/validar-social.mjs. No modifica permisos de cuentas reales.
-- PRUEBAS_OK deshace todos los datos sintéticos.
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); e text; x jsonb;
begin
  assert not exists (select 1 from public.avatares_exclusivos), 'Ejecutar en una base temporal sin permisos reales';
  insert into auth.users(id,email) values(a,'exclusivo-a@appfit.test'),(b,'exclusivo-b@appfit.test');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
  perform public.crear_perfil('exclusivo.tinez','Tinez de prueba',true);
  assert public.mis_avatares_exclusivos() = array[]::text[], 'sin asignación no tiene exclusivos';
  begin perform public.editar_avatar('exclusivo.tinez'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'avatar_no_disponible', 'el alias por sí solo no concede el avatar';
  insert into public.avatares_exclusivos(avatar,user_id) values('exclusivo.tinez',a);
  assert public.mis_avatares_exclusivos() = array['exclusivo.tinez'], 'solo devuelve el identificador propio';
  perform public.editar_avatar('exclusivo.tinez');
  assert (select avatar from public.perfiles where user_id = a) = 'exclusivo.tinez', 'el dueño lo guarda';
  foreach e in array array['exclusivo.otro','exclusivo.tinez.oro','exclusivo.Tinez','exclusivo.tinez/','exclusivo.tinez ']
  loop
    begin perform public.editar_avatar(e); raise exception 'debía fallar';
    exception when others then assert sqlerrm = 'avatar_no_valido', 'rechaza formatos alternativos'; end;
  end loop;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
  perform public.crear_perfil('exclusivo.otro',null,true);
  insert into public.administradores(user_id) values(b);
  assert public.soy_admin(), 'otro administrador';
  assert public.mis_avatares_exclusivos() = array[]::text[], 'ser administrador no concede el avatar';
  perform public.editar_avatar('paisaje.cumbre');
  begin perform public.editar_avatar('exclusivo.tinez'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'avatar_no_disponible', 'ni siquiera otro administrador puede forzarlo por RPC';
  assert (select avatar from public.perfiles where user_id = b) = 'paisaje.cumbre', 'un rechazo no cambia el avatar';
  x := public.avatares_perfil(array['exclusivo.tinez']);
  assert x->>'exclusivo.tinez' = 'exclusivo.tinez', 'los demás sí pueden verlo';
  assert position(a::text in x::text) = 0, 'no revela el UUID';

  -- El permiso sigue al usuario, aunque otra persona ocupe su alias anterior.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
  perform public.editar_perfil('exclusivo.nuevo',null);
  assert public.mis_avatares_exclusivos() = array['exclusivo.tinez'], 'conserva el permiso al cambiar de alias';
  perform public.editar_avatar('exclusivo.tinez');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
  perform public.editar_perfil('exclusivo.tinez',null);
  assert public.mis_avatares_exclusivos() = array[]::text[], 'ocupar el alias no hereda el permiso';
  begin perform public.editar_avatar('exclusivo.tinez'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'avatar_no_disponible', 'el nuevo dueño del alias sigue sin poder elegirlo';

  -- Conserva la visibilidad anterior: bloqueo y suspensión lo ocultan.
  perform public.bloquear('exclusivo.nuevo');
  assert public.avatares_perfil(array['exclusivo.nuevo']) = '{}'::jsonb, 'bloqueado no ve el avatar';
  perform public.desbloquear('exclusivo.nuevo');
  update public.perfiles set suspendido = true where user_id = a;
  assert public.avatares_perfil(array['exclusivo.nuevo']) = '{}'::jsonb, 'suspendido sin avatar visible';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
  begin perform public.mis_avatares_exclusivos(); e := null; exception when others then e := sqlerrm; end;
  assert e = 'suspendido', 'suspendido no consulta permisos';
  begin perform public.editar_avatar('exclusivo.tinez'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'suspendido', 'suspendido no guarda';
  update public.perfiles set suspendido = false where user_id = a;

  -- Retirar el permiso oculta lo elegido y bloquea volver a guardarlo, sin impedir volver al catálogo o a las iniciales.
  delete from public.avatares_exclusivos where user_id = a;
  assert public.mis_avatares_exclusivos() = array[]::text[], 'permiso retirado';
  assert public.avatares_perfil(array['exclusivo.nuevo']) = '{}'::jsonb, 'sin permiso ya no se muestra';
  begin perform public.editar_avatar('exclusivo.tinez'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'avatar_no_disponible', 'revocado no guarda';
  perform public.editar_avatar('disciplina.pesas.oro');
  perform public.editar_avatar(null);
  assert (select avatar from public.perfiles where user_id = a) is null, 'puede volver a las iniciales';

  insert into public.avatares_exclusivos(avatar,user_id) values('exclusivo.tinez',a);
  delete from auth.users where id = a;
  assert not exists(select 1 from public.avatares_exclusivos), 'borrar la cuenta borra el permiso';

  assert not has_table_privilege('authenticated','public.avatares_exclusivos','select'), 'sin lectura directa de permisos';
  assert not has_table_privilege('authenticated','public.avatares_exclusivos','insert'), 'sin autoasignación';
  assert not has_table_privilege('authenticated','public.avatares_exclusivos','update'), 'sin transferencia desde el cliente';
  assert not has_table_privilege('authenticated','public.perfiles','update'), 'sin edición directa del avatar';
  assert not has_function_privilege('anon','public.mis_avatares_exclusivos()','execute'), 'anónimo sin permisos';
  assert has_function_privilege('authenticated','public.mis_avatares_exclusivos()','execute'), 'sesión con RPC';
  perform set_config('request.jwt.claims','{}',true);
  begin perform public.editar_avatar('exclusivo.tinez'); e := null; exception when others then e := sqlerrm; end;
  assert e = 'sin_sesion', 'sin sesión no guarda';
  raise exception 'PRUEBAS_OK';
end;
$$;
