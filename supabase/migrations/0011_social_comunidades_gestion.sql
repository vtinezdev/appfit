-- AppFit · gobierno de comunidades. Revisión manual de denuncias; sin umbral automático.
begin;
alter table public.miembros_comunidad add column moderador boolean not null default false;
alter table public.comunidades add column reglas text not null default '' check(char_length(reglas)<=1000);
alter table public.comunidades add column bienvenida text not null default '' check(char_length(bienvenida)<=500);
create function public.social_modera(p_yo uuid,p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.comunidades c join public.perfiles p on p.user_id=c.creador
 where c.id=p_id and not c.suspendida and not p.suspendido and not public.social_bloqueo(p_yo,c.creador)
 and (c.creador=p_yo or exists(select 1 from public.miembros_comunidad m where m.comunidad=c.id and m.miembro=p_yo and m.moderador)))
$$;
revoke execute on function public.social_modera(uuid,uuid) from public,anon,authenticated;
create function public.gestion_comunidad(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid:=public.social_yo(); v_mod boolean; v_miembros jsonb;
begin
 perform public.social_comunidad(v_yo,p_id);
 v_mod:=public.social_modera(v_yo,p_id);
 if v_mod then
 select coalesce(jsonb_agg(jsonb_build_object('alias',p.alias,'nombre',p.nombre,'moderador',m.moderador,'creador',c.creador=m.miembro,'yo',m.miembro=v_yo) order by p.alias),'[]'::jsonb) into v_miembros
 from public.miembros_comunidad m join public.perfiles p on p.user_id=m.miembro join public.comunidades c on c.id=m.comunidad
 where m.comunidad=p_id and not p.suspendido and not public.social_bloqueo(v_yo,p.user_id);
 end if;
 return (select jsonb_build_object('modera',v_mod,'creador',c.creador=v_yo,'reglas',c.reglas,'bienvenida',c.bienvenida,'miembros',coalesce(v_miembros,'[]'::jsonb)) from public.comunidades c where c.id=p_id);
end;
$$;
create function public.gestionar_comunidad(p_id uuid,p_accion text,p_alias text,p_texto text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid:=public.social_yo(); v_creador uuid; v_otro uuid;
begin
 select creador into v_creador from public.comunidades where id=p_id for update;
 if v_creador is null or not public.social_modera(v_yo,p_id) then raise exception 'no_encontrado'; end if;
 if p_accion in ('transferir','nombrar','revocar','expulsar') then
 select p.user_id into v_otro from public.perfiles p join public.miembros_comunidad m on m.miembro=p.user_id and m.comunidad=p_id
 where p.alias=lower(trim(p_alias)) and not p.suspendido and not public.social_bloqueo(v_yo,p.user_id) for update of m;
 if v_otro is null or v_otro=v_creador or v_otro=v_yo then raise exception 'no_encontrado'; end if;
 end if;
 if p_accion='expulsar' then
   -- Un moderador no puede expulsar a otro moderador; el creador sí.
   if v_yo<>v_creador and exists(select 1 from public.miembros_comunidad where comunidad=p_id and miembro=v_otro and moderador) then raise exception 'no_encontrado'; end if;
   delete from public.miembros_comunidad where comunidad=p_id and miembro=v_otro;
 elsif v_yo<>v_creador then raise exception 'no_encontrado';
 elsif p_accion='transferir' then
   update public.comunidades set creador=v_otro where id=p_id;
   update public.miembros_comunidad set moderador=false where comunidad=p_id and miembro=v_otro;
 elsif p_accion in ('nombrar','revocar') then update public.miembros_comunidad set moderador=p_accion='nombrar' where comunidad=p_id and miembro=v_otro;
 elsif p_accion='reglas' then
   if char_length(coalesce(p_texto,''))>1000 then raise exception 'comunidad_no_valida'; end if;
   update public.comunidades set reglas=trim(coalesce(p_texto,'')) where id=p_id;
 elsif p_accion='bienvenida' then
   if char_length(coalesce(p_texto,''))>500 then raise exception 'comunidad_no_valida'; end if;
   update public.comunidades set bienvenida=trim(coalesce(p_texto,'')) where id=p_id;
 else raise exception 'comunidad_no_valida'; end if;
end;
$$;
-- Serializar salir y transferir evita que el creador quede fuera de su propia comunidad.
create or replace function public.salir_comunidad(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid:=public.social_yo(); v_creador uuid;
begin
 select creador into v_creador from public.comunidades where id=p_id for update;
 if v_creador=v_yo then raise exception 'creador_no_puede_salir'; end if;
 delete from public.miembros_comunidad where comunidad=p_id and miembro=v_yo;
end;
$$;
create or replace function public.borrar_publicacion(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid:=auth.uid();
begin
 if v_yo is null then raise exception 'sin_sesion'; end if;
 delete from public.publicaciones p where p.id=p_id and (p.autor=v_yo or (
   not coalesce((select suspendido from public.perfiles where user_id=v_yo),true)
   and public.social_puede_ver_publicacion(v_yo,p.id) and public.social_modera(v_yo,p.comunidad)));
 if not found then raise exception 'no_encontrado'; end if;
end;
$$;
create or replace function public.borrar_comentario(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid:=auth.uid();
begin
 if v_yo is null then raise exception 'sin_sesion'; end if;
 delete from public.comentarios c where c.id=p_id and (c.autor=v_yo or exists(select 1 from public.publicaciones p where p.id=c.publicacion and (p.autor=v_yo or (
  not coalesce((select suspendido from public.perfiles where user_id=v_yo),true)
  and public.social_puede_ver_publicacion(v_yo,p.id) and public.social_modera(v_yo,p.comunidad)))));
 if not found then raise exception 'no_encontrado'; end if;
end;
$$;
-- Salida de privacidad para creadores suspendidos: solo inventario propio y cierre, sin leer contenido.
create function public.comunidades_propias() returns table(id uuid,nombre text)
language plpgsql stable security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'sin_sesion'; end if;
 return query select c.id,c.nombre from public.comunidades c where c.creador=auth.uid() order by c.nombre;
end;
$$;
revoke execute on function public.comunidades_propias() from public,anon;
grant execute on function public.comunidades_propias() to authenticated;
-- La API explícita de borrado de perfil ya no borra comunidades en cascada por sorpresa.
-- La eliminación completa de cuenta y la limpieza administrativa conservan sus contratos existentes.
create or replace function public.borrar_perfil() returns void
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'sin_sesion'; end if;
 perform 1 from public.perfiles where user_id=auth.uid() for update;
 if exists(select 1 from public.comunidades where creador=auth.uid()) then raise exception 'comunidades_pendientes'; end if;
 delete from public.perfiles where user_id=auth.uid();
end;
$$;
revoke execute on function public.gestion_comunidad(uuid),public.gestionar_comunidad(uuid,text,text,text) from public,anon;
grant execute on function public.gestion_comunidad(uuid),public.gestionar_comunidad(uuid,text,text,text) to authenticated;
create or replace function public.comentarios_pagina(p_id uuid,p_antes timestamptz,p_antes_id uuid,p_limite integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid:=public.social_yo(); v_autor uuid:=public.social_publicacion(v_yo,p_id); v_total integer; v_items jsonb;
begin
 select count(*)::int into v_total from public.comentarios c join public.perfiles pe on pe.user_id=c.autor
 where c.publicacion=p_id and not pe.suspendido and not public.social_bloqueo(v_yo,c.autor);
 select coalesce(jsonb_agg(to_jsonb(x) order by x.creado desc,x.id desc),'[]'::jsonb) into v_items from (
  select c.id,pe.alias,pe.nombre,c.texto,c.creado,c.autor=v_yo as mio,c.autor=v_yo or v_autor=v_yo or public.social_modera(v_yo,(select comunidad from public.publicaciones where id=p_id)) as puedo_borrar,
    case when not coalesce(q.suspendido,true) and not public.social_bloqueo(v_yo,q.user_id) then c.respuesta_a end as respuesta_a,
    case when not coalesce(q.suspendido,true) and not public.social_bloqueo(v_yo,q.user_id) then q.alias end as respuesta_alias
  from public.comentarios c join public.perfiles pe on pe.user_id=c.autor
  left join public.comentarios padre on padre.id=c.respuesta_a left join public.perfiles q on q.user_id=padre.autor
  where c.publicacion=p_id and not pe.suspendido and not public.social_bloqueo(v_yo,c.autor)
    and (p_antes is null or (c.creado,c.id)<(p_antes,p_antes_id))
  order by c.creado desc,c.id desc limit least(greatest(coalesce(p_limite,20),1),30)
 ) x;
 return jsonb_build_object('items',v_items,'total',v_total);
end;
$$;

commit;
