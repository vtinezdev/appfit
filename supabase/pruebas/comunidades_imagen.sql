-- Tras 0028. Usuarios sintéticos y rollback; no modifica comunidades reales.
begin;
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  aa text := 'a_' || left(replace(a::text, '-', ''), 8);
  ab text := 'b_' || left(replace(b::text, '-', ''), 8);
  antigua uuid := gen_random_uuid(); grupo uuid := gen_random_uuid(); fallida uuid := gen_random_uuid();
  e text; r record; n integer;
begin
  insert into auth.users(id,email,aud,role,created_at,updated_at)
    select x,x::text || '@appfit-pruebas.invalid','authenticated','authenticated',now(),now() from unnest(array[a,b]) x;
  perform set_config('request.jwt.claims',json_build_object('sub',a)::text,true); perform public.crear_perfil(aa,'Ana',true);
  perform set_config('request.jwt.claims',json_build_object('sub',b)::text,true); perform public.crear_perfil(ab,'Beto',true);
  perform set_config('request.jwt.claims',json_build_object('sub',a)::text,true);
  assert (public.social_capacidades()->>'imagenesComunidades')::boolean, 'Anuncia la capacidad nueva';
  assert (public.social_capacidades()->>'semanaCompania')::boolean, 'Conserva las capacidades previas';
  perform public.crear_comunidad(antigua,'Anterior ' || antigua,'',false);
  select * into r from public.comunidades(antigua::text,true);
  assert r.imagen is null, 'Los clientes anteriores siguen creando con iniciales';
  perform public.crear_comunidad_con_imagen(grupo,'Imagen ' || grupo,'Una descripción',true,'lugar.campamento');
  select * into r from public.comunidades(grupo::text,true);
  assert r.imagen='lugar.campamento' and r.miembros=1 and r.mia and r.unida and r.solo_creador_publica, 'Creación atómica con imagen, miembro y permisos';
  perform public.editar_imagen_comunidad(grupo,'lugar.refugio');
  perform public.crear_comunidad_con_imagen(grupo,'Imagen ' || grupo,'Una descripción',true,'lugar.campamento');
  select * into r from public.comunidades(grupo::text,true);
  assert r.imagen='lugar.refugio' and r.miembros=1, 'El reintento no duplica ni deshace ediciones posteriores';
  perform public.editar_imagen_comunidad(grupo,null);
  select * into r from public.comunidades(grupo::text,true);
  assert r.imagen is null and r.descripcion='Una descripción' and r.solo_creador_publica, 'Volver a iniciales no toca otros campos';
  foreach e in array array['lugar.desconocido','paisaje.cumbre','https://ejemplo.com/foto.webp','lugar.campamento ',repeat('x',100)] loop
    assert not public.imagen_comunidad_valida(e), 'Rechaza imágenes fuera del catálogo';
  end loop;
  begin perform public.editar_imagen_comunidad(grupo,'lugar.desconocido'); e:=null; exception when others then e:=sqlerrm; end;
  assert e='imagen_comunidad_no_valida', 'Edición con ID no válido';
  begin perform public.crear_comunidad_con_imagen(fallida,'Fallida ' || fallida,'',false,'https://ejemplo.com/foto.webp'); e:=null; exception when others then e:=sqlerrm; end;
  assert e='imagen_comunidad_no_valida', 'Creación con ID no válido';
  assert not exists(select 1 from public.comunidades where id=fallida), 'No queda una comunidad a medias';
  assert not exists(select 1 from public.miembros_comunidad where comunidad=fallida), 'Tampoco queda una membresía';
  begin update public.comunidades set imagen='inventada' where id=grupo; e:=null; exception when check_violation then e:='constraint'; end;
  assert e='constraint', 'La restricción también protege escrituras directas';

  perform public.editar_imagen_comunidad(grupo,'lugar.piscina');
  perform set_config('request.jwt.claims',json_build_object('sub',b)::text,true);
  select * into r from public.comunidades(grupo::text,false);
  assert r.imagen='lugar.piscina' and not r.unida, 'La imagen acompaña a una comunidad descubrible';
  perform public.unirse_comunidad(grupo);
  begin perform public.editar_imagen_comunidad(grupo,null); e:=null; exception when others then e:=sqlerrm; end;
  assert e='no_encontrado', 'Un miembro no cambia la imagen';
  update public.miembros_comunidad set moderador=true where comunidad=grupo and miembro=b;
  insert into public.administradores(user_id) values(b);
  begin perform public.editar_imagen_comunidad(grupo,null); e:=null; exception when others then e:=sqlerrm; end;
  assert e='no_encontrado', 'Ser moderador o administrador no concede la edición de la imagen';
  begin perform public.crear_comunidad_con_imagen(grupo,'Imagen ' || grupo,'',true,'lugar.cancha'); e:=null; exception when others then e:=sqlerrm; end;
  assert e='comunidad_no_valida', 'Otro usuario no se apropia de un ID existente';

  update public.comunidades set creador=b where id=grupo;
  perform public.editar_imagen_comunidad(grupo,'lugar.cancha');
  perform set_config('request.jwt.claims',json_build_object('sub',a)::text,true);
  begin perform public.editar_imagen_comunidad(grupo,null); e:=null; exception when others then e:=sqlerrm; end;
  assert e='no_encontrado', 'Tras transferir, el creador anterior pierde el permiso';
  perform set_config('request.jwt.claims',json_build_object('sub',b)::text,true);
  update public.comunidades set suspendida=true where id=grupo;
  begin perform public.editar_imagen_comunidad(grupo,null); e:=null; exception when others then e:=sqlerrm; end;
  assert e='no_encontrado', 'Una comunidad suspendida no se edita';
  select count(*) into n from public.comunidades(grupo::text,false);
  assert n=0, 'La comunidad suspendida y su imagen dejan de descubrirse';
  update public.comunidades set suspendida=false where id=grupo;
  update public.perfiles set suspendido=true where user_id=b;
  begin perform public.editar_imagen_comunidad(grupo,null); e:=null; exception when others then e:=sqlerrm; end;
  assert e='suspendido', 'Un perfil suspendido no escribe';
  perform set_config('request.jwt.claims','{}',true);
  begin perform public.editar_imagen_comunidad(grupo,null); e:=null; exception when others then e:=sqlerrm; end;
  assert e='sin_sesion', 'Sin sesión no se escribe';
  assert not has_function_privilege('anon','public.editar_imagen_comunidad(uuid,text)','EXECUTE'), 'Anon no edita';
  assert not has_function_privilege('anon','public.crear_comunidad_con_imagen(uuid,text,text,boolean,text)','EXECUTE'), 'Anon no crea';
  assert has_function_privilege('authenticated','public.editar_imagen_comunidad(uuid,text)','EXECUTE'), 'RPC de edición autenticada';
  assert has_function_privilege('authenticated','public.crear_comunidad_con_imagen(uuid,text,text,boolean,text)','EXECUTE'), 'RPC de creación autenticada';
  assert not has_table_privilege('authenticated','public.comunidades','UPDATE'), 'No habilita escritura directa a tablas';
end;
$$;
select 'PRUEBAS_COMUNIDADES_IMAGEN_OK' as resultado;
rollback;
