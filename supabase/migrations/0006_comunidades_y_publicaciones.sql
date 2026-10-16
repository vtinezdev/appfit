-- AppFit: publicaciones libres, logros y comunidades. Ejecutar después de 0005_feed.sql.
-- Las publicaciones de seguidores y las de comunidades son audiencias separadas.
begin;

create table public.comunidades (
  id uuid primary key,
  creador uuid not null references public.perfiles(user_id) on delete cascade,
  nombre text not null check (char_length(trim(nombre)) between 3 and 60),
  descripcion text not null default '' check (char_length(descripcion) <= 300),
  creada timestamptz not null default now(),
  suspendida boolean not null default false
);
create unique index comunidades_nombre on public.comunidades(lower(nombre));
create index comunidades_creador on public.comunidades(creador);
create table public.miembros_comunidad (
  comunidad uuid not null references public.comunidades(id) on delete cascade,
  miembro uuid not null references public.perfiles(user_id) on delete cascade,
  creado timestamptz not null default now(),
  primary key (comunidad, miembro)
);
create index miembros_persona on public.miembros_comunidad(miembro);
alter table public.comunidades enable row level security;
alter table public.miembros_comunidad enable row level security;
revoke all on public.comunidades, public.miembros_comunidad from anon, authenticated;

alter table public.publicaciones drop constraint publicaciones_tipo_check;
alter table public.publicaciones add constraint publicaciones_tipo_check check (tipo in ('entreno', 'actividad', 'texto', 'logro'));
alter table public.publicaciones add column comunidad uuid references public.comunidades(id) on delete cascade;
create index publicaciones_comunidad_creada on public.publicaciones(comunidad, creada desc);
alter table public.denuncias drop constraint denuncias_tipo_check;
alter table public.denuncias add constraint denuncias_tipo_check check (tipo in ('perfil', 'publicacion', 'comentario', 'comunidad'));

-- Ayudantes privados, no invocables por clientes.
create function public.social_comunidad(p_yo uuid, p_id uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.comunidades c join public.perfiles p on p.user_id = c.creador
    where c.id = p_id and not c.suspendida and not p.suspendido and not public.social_bloqueo(p_yo, c.creador)
  ) then raise exception 'no_encontrado'; end if;
  return p_id;
end;
$$;

create function public.social_es_miembro(p_yo uuid, p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.miembros_comunidad m where m.miembro = p_yo and m.comunidad = p_id)
$$;

create function public.social_puede_ver_publicacion(p_yo uuid, p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.publicaciones pu join public.perfiles a on a.user_id = pu.autor
    where pu.id = p_id and not a.suspendido and not public.social_bloqueo(p_yo, pu.autor)
      and case when pu.comunidad is null then public.social_puede_ver(p_yo, pu.autor)
      else exists (
        select 1 from public.comunidades c join public.perfiles creador on creador.user_id = c.creador
        where c.id = pu.comunidad and not c.suspendida and not creador.suspendido
          and not public.social_bloqueo(p_yo, c.creador)
          and public.social_es_miembro(p_yo, c.id)
      ) end
  )
$$;

create or replace function public.social_publicacion(p_yo uuid, p_id uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_autor uuid;
begin
  select p.autor into v_autor from public.publicaciones p
  where p.id = p_id and public.social_puede_ver_publicacion(p_yo, p_id);
  if v_autor is null then raise exception 'no_encontrado'; end if;
  return v_autor;
end;
$$;

create function public.social_publicar(p_id uuid, p_tipo text, p_fecha timestamptz, p_resumen jsonb, p_comunidad uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_yo uuid := public.social_yo();
  v_existente public.publicaciones%rowtype;
begin
  -- Serializar la cuota y los reintentos de una misma persona.
  perform 1 from public.perfiles where user_id = v_yo for update;
  if p_comunidad is not null then
    perform public.social_comunidad(v_yo, p_comunidad);
    if not public.social_es_miembro(v_yo, p_comunidad) then raise exception 'no_miembro'; end if;
  end if;
  select * into v_existente from public.publicaciones where id = p_id;
  if found then
    if v_existente.autor = v_yo and v_existente.comunidad is not distinct from p_comunidad then return; end if;
    raise exception 'publicacion_no_valida';
  end if;
  if (select count(*) from public.publicaciones where autor = v_yo and creada > now() - interval '1 day') >= 30 then raise exception 'limite'; end if;
  if p_fecha is null or p_fecha > now() + interval '1 day' or p_resumen is null or jsonb_typeof(p_resumen) <> 'object' then raise exception 'publicacion_no_valida'; end if;
  if p_tipo in ('texto', 'logro') then
    if p_resumen ->> 'v' is distinct from '1' or p_resumen ->> 'tipo' is distinct from p_tipo
      or jsonb_typeof(p_resumen -> 'titulo') is distinct from 'string'
      or char_length(trim(p_resumen ->> 'titulo')) not between 1 and 60 then raise exception 'publicacion_no_valida'; end if;
    if p_tipo = 'texto' then
      if jsonb_typeof(p_resumen -> 'texto') is distinct from 'string'
        or char_length(trim(p_resumen ->> 'texto')) not between 1 and 2000 then raise exception 'publicacion_no_valida'; end if;
    else
      if jsonb_typeof(p_resumen -> 'logroId') is distinct from 'string' or char_length(p_resumen ->> 'logroId') not between 1 and 60
        or coalesce(p_resumen ->> 'grupo', '') not in ('entreno', 'constancia', 'cumbres', 'caminos', 'nutricion', 'oculto')
        or jsonb_typeof(p_resumen -> 'descripcion') is distinct from 'string'
        or char_length(trim(p_resumen ->> 'descripcion')) not between 1 and 500
        or not (p_resumen ? 'nivel') then raise exception 'publicacion_no_valida'; end if;
      if p_resumen -> 'nivel' <> 'null'::jsonb and
        (jsonb_typeof(p_resumen -> 'nivel') <> 'number' or (p_resumen ->> 'nivel') !~ '^[1-5]$') then raise exception 'publicacion_no_valida'; end if;
    end if;
  end if;
  insert into public.publicaciones(id, autor, tipo, fecha, resumen, comunidad) values (p_id, v_yo, p_tipo, p_fecha, p_resumen, p_comunidad);
exception when check_violation or not_null_violation or unique_violation then raise exception 'publicacion_no_valida';
end;
$$;

-- Se conserva la firma antigua, para los clientes anteriores y las publicaciones ya guardadas.
create or replace function public.publicar(p_id uuid, p_tipo text, p_fecha timestamptz, p_resumen jsonb)
returns void language sql security definer set search_path = '' as $$
  select public.social_publicar(p_id, p_tipo, p_fecha, p_resumen, null)
$$;
create function public.publicar_comunidad(p_id uuid, p_tipo text, p_fecha timestamptz, p_resumen jsonb, p_comunidad uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_comunidad is null then raise exception 'comunidad_no_valida'; end if;
  perform public.social_publicar(p_id, p_tipo, p_fecha, p_resumen, p_comunidad);
end;
$$;

create function public.comunidades(p_busqueda text, p_solo_mias boolean)
returns table (id uuid, nombre text, descripcion text, miembros integer, unida boolean, mia boolean)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare v_yo uuid := public.social_yo();
begin
  return query select c.id, c.nombre, c.descripcion,
    (select count(*)::int from public.miembros_comunidad m join public.perfiles p on p.user_id = m.miembro where m.comunidad = c.id and not p.suspendido),
    public.social_es_miembro(v_yo, c.id), c.creador = v_yo
  from public.comunidades c join public.perfiles creador on creador.user_id = c.creador
  where not c.suspendida and not creador.suspendido and not public.social_bloqueo(v_yo, c.creador)
    and (not coalesce(p_solo_mias, false) or public.social_es_miembro(v_yo, c.id))
    and position(lower(left(trim(coalesce(p_busqueda, '')), 60)) in lower(c.nombre)) > 0
  order by lower(c.nombre), c.id limit 100;
end;
$$;

create function public.crear_comunidad(p_id uuid, p_nombre text, p_descripcion text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo(); v_creador uuid;
begin
  perform 1 from public.perfiles where user_id = v_yo for update;
  select creador into v_creador from public.comunidades where id = p_id;
  if found then
    if v_creador = v_yo then return; end if;
    raise exception 'comunidad_no_valida';
  end if;
  if (select count(*) from public.comunidades where creador = v_yo and creada > now() - interval '1 day') >= 5 then raise exception 'limite'; end if;
  insert into public.comunidades(id, creador, nombre, descripcion) values (p_id, v_yo, trim(p_nombre), trim(coalesce(p_descripcion, '')));
  insert into public.miembros_comunidad(comunidad, miembro) values (p_id, v_yo);
exception
  when unique_violation then raise exception 'comunidad_ocupada';
  when check_violation or not_null_violation then raise exception 'comunidad_no_valida';
end;
$$;

create function public.unirse_comunidad(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo();
begin
  perform public.social_comunidad(v_yo, p_id);
  insert into public.miembros_comunidad(comunidad, miembro) values (p_id, v_yo) on conflict do nothing;
end;
$$;
create function public.salir_comunidad(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo();
begin
  if exists (select 1 from public.comunidades where id = p_id and creador = v_yo) then raise exception 'creador_no_puede_salir'; end if;
  delete from public.miembros_comunidad where comunidad = p_id and miembro = v_yo;
end;
$$;
create function public.borrar_comunidad(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sin_sesion'; end if;
  delete from public.comunidades where id = p_id and creador = auth.uid();
  if not found then raise exception 'no_encontrado'; end if;
end;
$$;

create function public.publicaciones_comunidad(p_id uuid, p_antes timestamptz, p_limite integer)
returns table (id uuid, alias text, nombre text, fecha timestamptz, creada timestamptz, resumen jsonb,
  reacciones integer, comentarios integer, reaccione boolean, mia boolean)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare v_yo uuid := public.social_yo();
begin
  perform public.social_comunidad(v_yo, p_id);
  if not public.social_es_miembro(v_yo, p_id) then raise exception 'no_miembro'; end if;
  return query select f.* from (
    select pu.id as pid, pu.creada as pcreada from public.publicaciones pu
    where pu.comunidad = p_id and (p_antes is null or pu.creada < p_antes)
      and public.social_puede_ver_publicacion(v_yo, pu.id)
    order by pu.creada desc limit least(greatest(coalesce(p_limite, 20), 1), 30)
  ) x cross join lateral public.social_fila(v_yo, x.pid) f order by x.pcreada desc;
end;
$$;

revoke execute on function public.social_comunidad(uuid, uuid), public.social_es_miembro(uuid, uuid),
  public.social_puede_ver_publicacion(uuid, uuid), public.social_publicar(uuid, text, timestamptz, jsonb, uuid)
  from public, anon, authenticated;
revoke execute on function public.comunidades(text, boolean), public.crear_comunidad(uuid, text, text),
  public.unirse_comunidad(uuid), public.salir_comunidad(uuid), public.borrar_comunidad(uuid),
  public.publicaciones_comunidad(uuid, timestamptz, integer), public.publicar_comunidad(uuid, text, timestamptz, jsonb, uuid)
  from public, anon;
grant execute on function public.comunidades(text, boolean), public.crear_comunidad(uuid, text, text),
  public.unirse_comunidad(uuid), public.salir_comunidad(uuid), public.borrar_comunidad(uuid),
  public.publicaciones_comunidad(uuid, timestamptz, integer), public.publicar_comunidad(uuid, text, timestamptz, jsonb, uuid)
  to authenticated;

-- A continuación se actualizan las lecturas y denuncias existentes, sin cambiar sus firmas ni permisos.

create or replace function public.social_fila(p_yo uuid, p_id uuid)
returns table (id uuid, alias text, nombre text, fecha timestamptz, creada timestamptz, resumen jsonb,
  reacciones integer, comentarios integer, reaccione boolean, mia boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select pu.id, pe.alias, pe.nombre, pu.fecha, pu.creada, pu.resumen,
    (select count(*)::int from public.reacciones r join public.perfiles q on q.user_id = r.user_id
      where r.publicacion = pu.id and not q.suspendido and not public.social_bloqueo(p_yo, r.user_id)),
    (select count(*)::int from public.comentarios c join public.perfiles q on q.user_id = c.autor
      where c.publicacion = pu.id and not q.suspendido and not public.social_bloqueo(p_yo, c.autor)),
    exists (select 1 from public.reacciones r where r.publicacion = pu.id and r.user_id = p_yo),
    pu.autor = p_yo
  from public.publicaciones pu
  join public.perfiles pe on pe.user_id = pu.autor
  where pu.id = p_id and public.social_puede_ver_publicacion(p_yo, p_id)
$$;

create or replace function public.feed(p_antes timestamptz, p_limite integer)
returns table (id uuid, alias text, nombre text, fecha timestamptz, creada timestamptz, resumen jsonb,
  reacciones integer, comentarios integer, reaccione boolean, mia boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_yo uuid := public.social_yo();
begin
  return query
  select f.*
  from (
    select pu.id as pid, pu.creada as pcreada
    from public.publicaciones pu
    where pu.comunidad is null and (pu.autor = v_yo or pu.autor in (
        select s.seguido from public.seguimientos s where s.seguidor = v_yo and s.estado = 'aceptado'))
      and (p_antes is null or pu.creada < p_antes)
      and public.social_puede_ver_publicacion(v_yo, pu.id)
    order by pu.creada desc
    limit least(greatest(coalesce(p_limite, 20), 1), 30)
  ) x
  cross join lateral public.social_fila(v_yo, x.pid) f
  order by x.pcreada desc;
end;
$$;

create or replace function public.publicaciones_de(p_alias text, p_antes timestamptz, p_limite integer)
returns table (id uuid, alias text, nombre text, fecha timestamptz, creada timestamptz, resumen jsonb,
  reacciones integer, comentarios integer, reaccione boolean, mia boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_yo uuid := public.social_yo();
  v_autor uuid;
begin
  select p.user_id into v_autor from public.perfiles p where p.alias = lower(trim(p_alias));
  if v_autor is null or not public.social_puede_ver(v_yo, v_autor) then
    raise exception 'no_encontrado';
  end if;
  return query
  select f.*
  from (
    select pu.id as pid, pu.creada as pcreada
    from public.publicaciones pu
    where pu.comunidad is null and pu.autor = v_autor and (p_antes is null or pu.creada < p_antes)
    order by pu.creada desc
    limit least(greatest(coalesce(p_limite, 20), 1), 30)
  ) x
  cross join lateral public.social_fila(v_yo, x.pid) f
  order by x.pcreada desc;
end;
$$;

create or replace function public.avisos()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_yo uuid := public.social_yo();
  v_desde timestamptz;
  v_lista jsonb;
begin
  select p.avisos_vistos into v_desde from public.perfiles p where p.user_id = v_yo;
  select coalesce(jsonb_agg(a order by a.creado desc), '[]'::jsonb) into v_lista
  from (
    select * from (
      select 'reaccion' as tipo, q.alias, q.nombre, pu.id as publicacion, pu.resumen ->> 'titulo' as titulo, null::text as texto,
        r.creada as creado, r.creada > v_desde as nuevo
      from public.reacciones r
      join public.publicaciones pu on pu.id = r.publicacion and pu.autor = v_yo and public.social_puede_ver_publicacion(v_yo, pu.id)
      join public.perfiles q on q.user_id = r.user_id and not q.suspendido
      where r.user_id <> v_yo and not public.social_bloqueo(v_yo, r.user_id)
      union all
      select 'comentario', q.alias, q.nombre, pu.id, pu.resumen ->> 'titulo', left(c.texto, 120), c.creado, c.creado > v_desde
      from public.comentarios c
      join public.publicaciones pu on pu.id = c.publicacion and pu.autor = v_yo and public.social_puede_ver_publicacion(v_yo, pu.id)
      join public.perfiles q on q.user_id = c.autor and not q.suspendido
      where c.autor <> v_yo and not public.social_bloqueo(v_yo, c.autor)
    ) t
    order by t.creado desc
    limit 30
  ) a;
  return jsonb_build_object(
    'solicitudes', (select count(*) from public.seguimientos s where s.seguido = v_yo and s.estado = 'pendiente'),
    'nuevos', (select count(*) from jsonb_array_elements(v_lista) e where (e ->> 'nuevo')::boolean),
    'lista', v_lista
  );
end;
$$;

create or replace function public.denunciar(p_tipo text, p_objetivo text, p_motivo text, p_detalle text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := public.social_yo();
  v_objetivo uuid;
  v_contenido text;
  v_publicacion uuid;
begin
  if (select count(*) from public.denuncias d where d.denunciante = v_yo and d.creada > now() - interval '1 day') >= 20 then
    raise exception 'limite';
  end if;
  if p_tipo = 'perfil' then
    v_objetivo := public.social_id(v_yo, p_objetivo);
    select p.alias || coalesce(' · ' || p.nombre, '') into v_contenido from public.perfiles p where p.user_id = v_objetivo;
  elsif p_tipo = 'comunidad' then
    begin v_objetivo := p_objetivo::uuid;
    exception when invalid_text_representation then raise exception 'no_encontrado'; end;
    perform public.social_comunidad(v_yo, v_objetivo);
    select c.nombre || ' · ' || c.descripcion into v_contenido from public.comunidades c where c.id = v_objetivo;
  elsif p_tipo in ('publicacion', 'comentario') then
    begin
      v_objetivo := p_objetivo::uuid;
    exception when invalid_text_representation then
      raise exception 'no_encontrado';
    end;
    if p_tipo = 'publicacion' then
      v_publicacion := v_objetivo;
    else
      select c.publicacion, c.texto into v_publicacion, v_contenido from public.comentarios c where c.id = v_objetivo;
      if v_publicacion is null then
        raise exception 'no_encontrado';
      end if;
    end if;
    perform public.social_publicacion(v_yo, v_publicacion);
    if p_tipo = 'publicacion' then
      select pe.alias || ' · ' || p.resumen::text into v_contenido
      from public.publicaciones p join public.perfiles pe on pe.user_id = p.autor where p.id = v_publicacion;
    else
      select pe.alias || ' · ' || v_contenido into v_contenido
      from public.comentarios c join public.perfiles pe on pe.user_id = c.autor where c.id = v_objetivo;
    end if;
  else
    raise exception 'tipo_no_valido';
  end if;
  insert into public.denuncias (denunciante, tipo, objetivo, contenido, motivo, detalle)
  values (v_yo, p_tipo, v_objetivo, v_contenido, p_motivo, nullif(trim(coalesce(p_detalle, '')), ''));
exception
  when check_violation then
    raise exception 'denuncia_no_valida';
end;
$$;

notify pgrst, 'reload schema';
commit;
