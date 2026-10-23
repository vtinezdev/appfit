-- Moderar comunidades desde la app (A22, docs/features/social.md § Administración): en una denuncia de comunidad, el
-- administrador la suspende (deja de verse para todos y se reactiva desde Suspendidos) o la cierra (se borra con sus
-- publicaciones y miembros). Cuando se actúa sobre una denuncia (borrar, suspender o cerrar), quien denunció recibe un
-- aviso sin detalles: «Revisamos tu denuncia y hemos actuado». Descartar no avisa. Ejecutar después de 0025; la app
-- nueva la necesita para estas acciones (sin ella, el servidor responde «acción no válida» y no se cambia nada).
-- Pruebas: supabase/pruebas/social_moderar_comunidades.sql.
begin;

alter table public.denuncias add column actuada timestamptz;

create or replace function public.admin_resolver_denuncia(p_id bigint, p_accion text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_admin_yo(); v_tipo text; v_objetivo uuid; v_uid uuid;
begin
  select tipo, objetivo into v_tipo, v_objetivo from public.denuncias where id = p_id;
  if v_tipo is null then raise exception 'no_encontrado'; end if;
  if p_accion = 'borrar' then
    -- Si ya no existe (lo borró su autor), basta con marcarla revisada.
    if v_tipo = 'publicacion' then delete from public.publicaciones where id = v_objetivo;
    elsif v_tipo = 'comentario' then delete from public.comentarios where id = v_objetivo;
    else raise exception 'accion_no_valida'; end if;
  -- 0026: una comunidad denunciada se suspende (deja de verse para todos; se reactiva desde Suspendidos) o se cierra
  -- (se borra con sus publicaciones y miembros). Si ya no existe, basta con marcarla revisada.
  elsif p_accion = 'suspender_comunidad' then
    if v_tipo <> 'comunidad' then raise exception 'accion_no_valida'; end if;
    update public.comunidades set suspendida = true where id = v_objetivo;
  elsif p_accion = 'cerrar' then
    if v_tipo <> 'comunidad' then raise exception 'accion_no_valida'; end if;
    delete from public.comunidades where id = v_objetivo;
  elsif p_accion = 'suspender' then
    v_uid := case v_tipo
      when 'perfil' then v_objetivo
      when 'publicacion' then (select autor from public.publicaciones where id = v_objetivo)
      when 'comentario' then (select autor from public.comentarios where id = v_objetivo)
      else (select creador from public.comunidades where id = v_objetivo) end;
    if v_uid is null or v_uid = v_yo then raise exception 'no_encontrado'; end if;
    perform public.social_vetar(v_uid);
  elsif p_accion is distinct from 'descartar' then raise exception 'accion_no_valida';
  end if;
  -- 0026: si se actuó, quien denunció recibe «Revisamos tu denuncia y hemos actuado», sin decir qué ni a quién.
  update public.denuncias set revisada = now(), actuada = case when p_accion = 'descartar' then null else now() end
  where tipo = v_tipo and objetivo = v_objetivo and revisada is null;
end;
$$;

-- Comunidades suspendidas, para reactivarlas.
create function public.admin_comunidades_suspendidas() returns table (id uuid, nombre text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.social_admin_yo();
  return query select c.id, c.nombre from public.comunidades c where c.suspendida order by c.nombre;
end;
$$;

create function public.admin_reactivar_comunidad(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.social_admin_yo();
  update public.comunidades set suspendida = false where id = p_id and suspendida;
  if not found then raise exception 'no_encontrado'; end if;
end;
$$;

create or replace function public.social_eventos(p_yo uuid)
returns table(tipo text,alias text,nombre text,publicacion uuid,titulo text,texto text,creado timestamptz,mia boolean)
language sql stable security definer set search_path = '' as $$
 select 'reaccion',pe.alias,pe.nombre,pu.id,case when pu.tipo='texto' then left(pu.resumen->>'texto',60) else pu.resumen->>'titulo' end,null::text,r.creada,true
 from public.reacciones r join public.publicaciones pu on pu.id=r.publicacion and pu.autor=p_yo
 join public.perfiles pe on pe.user_id=r.user_id and not pe.suspendido
 where r.user_id<>p_yo and not public.social_bloqueo(p_yo,r.user_id) and public.social_puede_ver_publicacion(p_yo,pu.id)
 union all
 select case when pu.autor=p_yo then 'comentario' else 'respuesta' end,pe.alias,pe.nombre,pu.id,
 case when pu.tipo='texto' then left(pu.resumen->>'texto',60) else pu.resumen->>'titulo' end,left(c.texto,120),c.creado,pu.autor=p_yo
 from public.comentarios c join public.publicaciones pu on pu.id=c.publicacion
 join public.perfiles pe on pe.user_id=c.autor and not pe.suspendido
 left join public.comentarios padre on padre.id=c.respuesta_a
 where (pu.autor=p_yo or padre.autor=p_yo) and c.autor<>p_yo
 and not public.social_bloqueo(p_yo,c.autor) and public.social_puede_ver_publicacion(p_yo,pu.id)
 union all
 select 'aceptada',pe.alias,pe.nombre,null::uuid,'',null::text,s.aceptado,false
 from public.seguimientos s join public.perfiles pe on pe.user_id=s.seguido and not pe.suspendido
 where s.seguidor=p_yo and s.estado='aceptado' and s.aceptado is not null and not public.social_bloqueo(p_yo,s.seguido)
 union all
 select 'comunidad',pe.alias,pe.nombre,pu.id,co.nombre,null::text,pu.creada,false
 from public.miembros_comunidad m join public.comunidades co on co.id=m.comunidad and co.solo_creador_publica
 join public.publicaciones pu on pu.comunidad=co.id and pu.autor=co.creador and pu.creada>m.creado
 join public.perfiles pe on pe.user_id=pu.autor and not pe.suspendido
 where m.miembro=p_yo and pu.autor<>p_yo and public.social_puede_ver_publicacion(p_yo,pu.id)
 union all
 select 'anadido',pe.alias,pe.nombre,co.id,co.nombre,null::text,m.creado,false
 from public.miembros_comunidad m join public.comunidades co on co.id=m.comunidad and not co.suspendida
 join public.perfiles pe on pe.user_id=m.anadido_por and not pe.suspendido
 join public.perfiles cr on cr.user_id=co.creador and not cr.suspendido
 where m.miembro=p_yo and m.anadido_por<>p_yo
 and not public.social_bloqueo(p_yo,m.anadido_por) and not public.social_bloqueo(p_yo,co.creador)
 union all
 -- 0025: un ánimo en tu semana de un grupo de la semana en compañía (en `publicacion`, el id del grupo).
 select 'animo_compania',pe.alias,pe.nombre,a.compania,'',null::text,a.creado,false
 from public.companeros_animos a join public.perfiles pe on pe.user_id=a.de and not pe.suspendido
 where a.para=p_yo and not public.social_bloqueo(p_yo,a.de)
 union all
 -- 0026: una denuncia mía en la que se actuó; sin persona ni objetivo.
 select 'denuncia',null::text,null::text,null::uuid,'',null::text,d.actuada,false
 from public.denuncias d where d.denunciante=p_yo and d.actuada is not null
$$;
revoke execute on function public.social_eventos(uuid) from public,anon,authenticated;

revoke execute on function public.admin_resolver_denuncia(bigint, text), public.admin_comunidades_suspendidas(),
  public.admin_reactivar_comunidad(uuid) from public, anon;
grant execute on function public.admin_resolver_denuncia(bigint, text), public.admin_comunidades_suspendidas(),
  public.admin_reactivar_comunidad(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
