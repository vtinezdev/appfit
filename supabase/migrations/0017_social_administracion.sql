-- AppFit · administración de Social. Ejecutar después de 0016. Pruebas: supabase/pruebas/social_administracion.sql.
--
-- Un administrador (hoy, solo el creador de la app) puede, desde la propia app: borrar cualquier publicación o comentario,
-- suspender y readmitir perfiles, añadir personas a una comunidad (reciben un aviso) y expulsarlas, y revisar las denuncias.
-- No lee nada que no vería otra persona: actúa sobre lo que tiene a la vista y sobre lo denunciado.
--
-- Nadie se nombra administrador desde la app. Se hace a mano en el SQL Editor, con el alias del perfil:
--   insert into public.administradores (user_id) select user_id from public.perfiles where alias = '<alias>';
-- y se retira con `delete from public.administradores where user_id = (select user_id from public.perfiles where alias = '<alias>')`.
--
-- Es aditiva: sin ella, `soy_admin` no existe y el cliente no enseña nada de esto.
begin;

create table public.administradores (
  user_id uuid primary key references auth.users (id) on delete cascade,
  creado timestamptz not null default now()
);

-- Suspensiones hechas por un administrador. Sobreviven a borrar el perfil: quien está suspendido no puede crear otro con
-- la misma cuenta. `alias`: el que tenía al suspenderlo, para poder readmitirlo aunque ya no tenga perfil.
create table public.vetados (
  user_id uuid primary key references auth.users (id) on delete cascade,
  alias text not null,
  creado timestamptz not null default now()
);

alter table public.administradores enable row level security;
alter table public.vetados enable row level security;
revoke all on public.administradores, public.vetados from anon, authenticated;

-- Quién metió a alguien en una comunidad (null: se unió por su cuenta). Da el aviso «te ha añadido».
alter table public.miembros_comunidad add column anadido_por uuid references public.perfiles (user_id) on delete set null;

-- --- Ayudantes privados ---

create function public.social_admin(p_yo uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.administradores a where a.user_id = p_yo)
$$;

-- Mi user_id si soy administrador con perfil activo; si no, no_encontrado (no se revela que la función existe para mí).
create function public.social_admin_yo()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo();
begin
  if not public.social_admin(v_yo) then raise exception 'no_encontrado'; end if;
  return v_yo;
end;
$$;

-- Suspende un perfil y lo anota en `vetados`. Nunca a un administrador.
create function public.social_vetar(p_uid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_alias text;
begin
  select alias into v_alias from public.perfiles where user_id = p_uid for update;
  if v_alias is null or public.social_admin(p_uid) then raise exception 'no_encontrado'; end if;
  update public.perfiles set suspendido = true where user_id = p_uid;
  insert into public.vetados (user_id, alias) values (p_uid, v_alias)
  on conflict (user_id) do update set alias = excluded.alias;
end;
$$;

revoke execute on function public.social_admin(uuid), public.social_admin_yo(), public.social_vetar(uuid)
  from public, anon, authenticated;

-- Como en 0011, y el administrador modera cualquier comunidad visible.
create or replace function public.social_modera(p_yo uuid,p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.comunidades c join public.perfiles p on p.user_id=c.creador
 where c.id=p_id and not c.suspendida and not p.suspendido and not public.social_bloqueo(p_yo,c.creador)
 and (c.creador=p_yo or public.social_admin(p_yo)
   or exists(select 1 from public.miembros_comunidad m where m.comunidad=c.id and m.miembro=p_yo and m.moderador)))
$$;
revoke execute on function public.social_modera(uuid,uuid) from public,anon,authenticated;

-- --- Para el cliente ---

-- Si soy administrador. Para cualquiera con sesión: la respuesta es false para todos menos para quien lo es.
create function public.soy_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and public.social_admin(auth.uid())
$$;

-- Como en 0011; el administrador borra cualquier publicación, aunque no la vea, y sus denuncias quedan revisadas.
create or replace function public.borrar_publicacion(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid:=auth.uid(); v_activo boolean;
begin
 if v_yo is null then raise exception 'sin_sesion'; end if;
 v_activo := not coalesce((select suspendido from public.perfiles where user_id=v_yo),true);
 delete from public.publicaciones p where p.id=p_id and (p.autor=v_yo or (v_activo and (public.social_admin(v_yo) or (
   public.social_puede_ver_publicacion(v_yo,p.id) and public.social_modera(v_yo,p.comunidad)))));
 if not found then raise exception 'no_encontrado'; end if;
 if v_activo and public.social_admin(v_yo) then
   update public.denuncias set revisada=now() where tipo='publicacion' and objetivo=p_id and revisada is null;
 end if;
end;
$$;

-- Como en 0011; el administrador borra cualquier comentario y sus denuncias quedan revisadas.
create or replace function public.borrar_comentario(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid:=auth.uid(); v_activo boolean;
begin
 if v_yo is null then raise exception 'sin_sesion'; end if;
 v_activo := not coalesce((select suspendido from public.perfiles where user_id=v_yo),true);
 delete from public.comentarios c where c.id=p_id and (c.autor=v_yo or (v_activo and public.social_admin(v_yo))
  or exists(select 1 from public.publicaciones p where p.id=c.publicacion and (p.autor=v_yo or (
  v_activo and public.social_puede_ver_publicacion(v_yo,p.id) and public.social_modera(v_yo,p.comunidad)))));
 if not found then raise exception 'no_encontrado'; end if;
 if v_activo and public.social_admin(v_yo) then
   update public.denuncias set revisada=now() where tipo='comentario' and objetivo=p_id and revisada is null;
 end if;
end;
$$;

-- Como en 0011; el administrador, como el creador, puede expulsar también a moderadores.
create or replace function public.gestionar_comunidad(p_id uuid,p_accion text,p_alias text,p_texto text default '')
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
   -- Un moderador no puede expulsar a otro moderador; el creador y el administrador sí.
   if v_yo<>v_creador and not public.social_admin(v_yo)
     and exists(select 1 from public.miembros_comunidad where comunidad=p_id and miembro=v_otro and moderador) then raise exception 'no_encontrado'; end if;
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

-- El administrador mete a alguien en una comunidad; le llega el aviso «te ha añadido». Puede salir cuando quiera.
create function public.anadir_a_comunidad(p_id uuid, p_alias text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_admin_yo(); v_otro uuid; v_creador uuid;
begin
  perform public.social_comunidad(v_yo, p_id);
  select creador into v_creador from public.comunidades where id = p_id;
  select user_id into v_otro from public.perfiles
  where alias = lower(trim(p_alias)) and not suspendido and user_id <> v_yo and not public.social_bloqueo(v_yo, user_id);
  -- Quien tiene bloqueado al creador no vería la comunidad: no se le mete.
  if v_otro is null or public.social_bloqueo(v_otro, v_creador) then raise exception 'no_encontrado'; end if;
  insert into public.miembros_comunidad (comunidad, miembro, anadido_por) values (p_id, v_otro, v_yo) on conflict do nothing;
  if not found then raise exception 'ya_miembro'; end if;
end;
$$;

-- Suspender (true) o readmitir (false) por alias. Readmitir sirve también para quien borró su perfil estando suspendido.
create function public.admin_suspender(p_alias text, p_suspender boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_admin_yo(); v_alias text := lower(trim(coalesce(p_alias, ''))); v_otro uuid;
begin
  if p_suspender is null then raise exception 'accion_no_valida'; end if;
  if p_suspender then
    select user_id into v_otro from public.perfiles where alias = v_alias and not suspendido and user_id <> v_yo;
    if v_otro is null then raise exception 'no_encontrado'; end if;
    perform public.social_vetar(v_otro);
  else
    select user_id into v_otro from public.perfiles where alias = v_alias and suspendido;
    if v_otro is null then
      select v.user_id into v_otro from public.vetados v
      where v.alias = v_alias and not exists (select 1 from public.perfiles p where p.user_id = v.user_id)
      order by v.creado desc limit 1;
    end if;
    if v_otro is null then raise exception 'no_encontrado'; end if;
    update public.perfiles set suspendido = false where user_id = v_otro;
    delete from public.vetados where user_id = v_otro;
  end if;
end;
$$;

-- Perfiles suspendidos (también los suspendidos a mano en el SQL Editor) y suspensiones de quien ya borró su perfil.
create function public.admin_suspendidos()
returns table (alias text, nombre text, desde timestamptz, con_perfil boolean)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.social_admin_yo();
  return query
  select * from (
    select p.alias, p.nombre, v.creado, true from public.perfiles p left join public.vetados v on v.user_id = p.user_id where p.suspendido
    union all
    select v.alias, null::text, v.creado, false from public.vetados v
    where not exists (select 1 from public.perfiles p where p.user_id = v.user_id)
  ) x order by x.creado desc nulls last, x.alias;
end;
$$;

-- Denuncias sin revisar, una entrada por lo denunciado (las más recientes primero, hasta 100). `id`: la última de ese
-- objetivo, para resolverlas todas a la vez. Sin UUID de personas: el autor va por su alias actual.
create function public.admin_denuncias()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_lista jsonb;
begin
  perform public.social_admin_yo();
  with g as (
    select d.tipo, d.objetivo, max(d.id) as id, max(d.creada) as creada, count(*)::int as n,
      array_agg(distinct d.motivo) as motivos,
      coalesce(array_agg(d.detalle order by d.creada desc) filter (where d.detalle is not null), '{}') as detalles,
      (array_agg(d.contenido order by d.creada desc))[1] as contenido
    from public.denuncias d where d.revisada is null
    group by d.tipo, d.objetivo order by max(d.creada) desc limit 100
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', g.id, 'tipo', g.tipo, 'creada', g.creada, 'denuncias', g.n, 'motivos', to_jsonb(g.motivos),
    'detalles', to_jsonb(g.detalles), 'contenido', g.contenido, 'autor', pe.alias, 'autorSuspendido', coalesce(pe.suspendido, false),
    'vigente', case g.tipo
      when 'perfil' then pe.user_id is not null
      when 'publicacion' then exists (select 1 from public.publicaciones pu where pu.id = g.objetivo)
      when 'comentario' then exists (select 1 from public.comentarios c where c.id = g.objetivo)
      else exists (select 1 from public.comunidades co where co.id = g.objetivo) end,
    'resumen', case when g.tipo = 'publicacion' then (select pu.resumen from public.publicaciones pu where pu.id = g.objetivo) end,
    'texto', case when g.tipo = 'comentario' then (select c.texto from public.comentarios c where c.id = g.objetivo) end
  ) order by g.creada desc), '[]'::jsonb) into v_lista
  from g
  left join lateral (select case g.tipo
      when 'perfil' then g.objetivo
      when 'publicacion' then (select pu.autor from public.publicaciones pu where pu.id = g.objetivo)
      when 'comentario' then (select c.autor from public.comentarios c where c.id = g.objetivo)
      else (select co.creador from public.comunidades co where co.id = g.objetivo) end as uid) a on true
  left join public.perfiles pe on pe.user_id = a.uid;
  return v_lista;
end;
$$;

-- Resuelve todas las denuncias sin revisar de lo mismo que la denuncia `p_id`: 'descartar', 'borrar' (publicación o
-- comentario) o 'suspender' (a su autor; en una comunidad, a quien la creó).
create function public.admin_resolver_denuncia(p_id bigint, p_accion text)
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
  update public.denuncias set revisada = now() where tipo = v_tipo and objetivo = v_objetivo and revisada is null;
end;
$$;

-- Como en 0003; quien tiene una suspensión vigente no crea otro perfil con la misma cuenta.
create or replace function public.crear_perfil(p_alias text, p_nombre text, p_acepto boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_restriccion text;
begin
  if v_uid is null then
    raise exception 'sin_sesion';
  end if;
  if exists (select 1 from public.vetados v where v.user_id = v_uid) then
    raise exception 'suspendido';
  end if;
  if p_acepto is not true then
    raise exception 'sin_aceptar';
  end if;
  if exists (select 1 from public.perfiles p where p.user_id = v_uid) then
    raise exception 'ya_hay_perfil';
  end if;
  insert into public.perfiles (user_id, alias, nombre, codigo, acepto)
  values (v_uid, public.social_alias(p_alias), public.social_nombre(p_nombre), public.social_codigo(), now());
exception
  when unique_violation then
    get stacked diagnostics v_restriccion = constraint_name;
    if v_restriccion = 'perfiles_alias_key' then
      raise exception 'alias_ocupado';
    end if;
    raise;
end;
$$;

-- Como en 0010, con 'anadido': un administrador me metió en una comunidad (`publicacion` lleva el id de la comunidad).
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
$$;
revoke execute on function public.social_eventos(uuid) from public,anon,authenticated;

revoke execute on function public.soy_admin(), public.anadir_a_comunidad(uuid, text), public.admin_suspender(text, boolean),
  public.admin_suspendidos(), public.admin_denuncias(), public.admin_resolver_denuncia(bigint, text)
  from public, anon;
grant execute on function public.soy_admin(), public.anadir_a_comunidad(uuid, text), public.admin_suspender(text, boolean),
  public.admin_suspendidos(), public.admin_denuncias(), public.admin_resolver_denuncia(bigint, text)
  to authenticated;

notify pgrst, 'reload schema';
commit;
