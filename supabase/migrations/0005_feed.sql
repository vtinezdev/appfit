-- AppFit · parte social, fase 5: feed, reacciones, comentarios y avisos (plan: docs/social.md; ADR 040).
-- Se ejecuta una vez en el SQL Editor, después de 0004_publicaciones.sql. Pruebas: supabase/pruebas/social.sql.
--
-- Una publicación la ven su autor y quienes le siguen (seguimiento aceptado), si no hay un bloqueo de por medio y el
-- autor no está suspendido. Las reacciones y los comentarios siguen la misma regla. La reacción se llama «Ánimo» en la
-- app de forma provisional; aquí es `reacciones` para poder cambiar el nombre sin tocar el SQL.

create table public.reacciones (
  publicacion uuid not null references public.publicaciones (id) on delete cascade,
  user_id uuid not null references public.perfiles (user_id) on delete cascade,
  creada timestamptz not null default now(),
  primary key (publicacion, user_id)
);

create index reacciones_user on public.reacciones (user_id);

create table public.comentarios (
  id uuid primary key default gen_random_uuid(),
  publicacion uuid not null references public.publicaciones (id) on delete cascade,
  autor uuid not null references public.perfiles (user_id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 500),
  creado timestamptz not null default now()
);

create index comentarios_publicacion on public.comentarios (publicacion, creado);
create index comentarios_autor on public.comentarios (autor);
create index publicaciones_creada on public.publicaciones (autor, creada desc);

alter table public.reacciones enable row level security;
alter table public.comentarios enable row level security;
revoke all on public.reacciones, public.comentarios from anon, authenticated;

-- --- Ayudantes ---

-- Si `p_yo` puede ver lo que publica `p_autor`: es suyo, o le sigue (aceptado), sin bloqueos y sin suspensión.
create function public.social_puede_ver(p_yo uuid, p_autor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_yo = p_autor or (
    exists (select 1 from public.seguimientos s where s.seguidor = p_yo and s.seguido = p_autor and s.estado = 'aceptado')
    and not public.social_bloqueo(p_yo, p_autor)
    and not coalesce((select p.suspendido from public.perfiles p where p.user_id = p_autor), true)
  )
$$;

-- El autor de una publicación que `p_yo` puede ver; si no, no_encontrado.
create function public.social_publicacion(p_yo uuid, p_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_autor uuid;
begin
  select p.autor into v_autor from public.publicaciones p where p.id = p_id;
  if v_autor is null or not public.social_puede_ver(p_yo, v_autor) then
    raise exception 'no_encontrado';
  end if;
  return v_autor;
end;
$$;

-- Una publicación tal como la ve `p_yo`: autor, resumen y recuentos (sin contar a quien esté bloqueado).
create function public.social_fila(p_yo uuid, p_id uuid)
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
  where pu.id = p_id
$$;

revoke execute on function public.social_puede_ver(uuid, uuid), public.social_publicacion(uuid, uuid), public.social_fila(uuid, uuid)
  from public, anon, authenticated;

-- --- Leer ---

-- Lo publicado por mí y por quienes sigo, de lo más reciente a lo más antiguo (por cuándo se publicó). Paginado:
-- `p_antes` es la `creada` de la última que se vio (null, desde el principio). Como mucho 30 de una vez.
create function public.feed(p_antes timestamptz, p_limite integer)
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
    where (pu.autor = v_yo or pu.autor in (
        select s.seguido from public.seguimientos s where s.seguidor = v_yo and s.estado = 'aceptado'))
      and (p_antes is null or pu.creada < p_antes)
      and public.social_puede_ver(v_yo, pu.autor)
    order by pu.creada desc
    limit least(greatest(coalesce(p_limite, 20), 1), 30)
  ) x
  cross join lateral public.social_fila(v_yo, x.pid) f
  order by x.pcreada desc;
end;
$$;

-- Lo publicado por una persona que puedo ver (o por mí), igual de paginado.
create function public.publicaciones_de(p_alias text, p_antes timestamptz, p_limite integer)
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
    where pu.autor = v_autor and (p_antes is null or pu.creada < p_antes)
    order by pu.creada desc
    limit least(greatest(coalesce(p_limite, 20), 1), 30)
  ) x
  cross join lateral public.social_fila(v_yo, x.pid) f
  order by x.pcreada desc;
end;
$$;

-- Los comentarios de una publicación, del más antiguo al más nuevo (como mucho 200). Sin los de personas
-- bloqueadas ni suspendidas. Puedo borrar los míos y todos los de mis publicaciones.
create function public.comentarios_de(p_id uuid)
returns table (id uuid, alias text, nombre text, texto text, creado timestamptz, mio boolean, puedo_borrar boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_yo uuid := public.social_yo();
  v_autor uuid := public.social_publicacion(v_yo, p_id);
begin
  return query
  select c.id, pe.alias, pe.nombre, c.texto, c.creado, c.autor = v_yo, c.autor = v_yo or v_autor = v_yo
  from public.comentarios c
  join public.perfiles pe on pe.user_id = c.autor
  where c.publicacion = p_id and not pe.suspendido and not public.social_bloqueo(v_yo, c.autor)
  order by c.creado
  limit 200;
end;
$$;

-- --- Interactuar ---

create function public.reaccionar(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := public.social_yo();
begin
  perform public.social_publicacion(v_yo, p_id);
  insert into public.reacciones (publicacion, user_id) values (p_id, v_yo) on conflict do nothing;
end;
$$;

create function public.quitar_reaccion(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := public.social_yo();
begin
  delete from public.reacciones where publicacion = p_id and user_id = v_yo;
end;
$$;

-- Comenta (1–500 caracteres, como mucho 100 al día). Devuelve el id del comentario.
create function public.comentar(p_id uuid, p_texto text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := public.social_yo();
  v_texto text := trim(coalesce(p_texto, ''));
  v_id uuid;
begin
  perform public.social_publicacion(v_yo, p_id);
  if char_length(v_texto) not between 1 and 500 then
    raise exception 'comentario_no_valido';
  end if;
  if (select count(*) from public.comentarios c where c.autor = v_yo and c.creado > now() - interval '1 day') >= 100 then
    raise exception 'limite';
  end if;
  insert into public.comentarios (publicacion, autor, texto) values (p_id, v_yo, v_texto) returning id into v_id;
  return v_id;
end;
$$;

-- Borra un comentario mío o de una publicación mía (también con el perfil suspendido).
create function public.borrar_comentario(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'sin_sesion';
  end if;
  delete from public.comentarios c
  where c.id = p_id
    and (c.autor = auth.uid() or exists (select 1 from public.publicaciones p where p.id = c.publicacion and p.autor = auth.uid()));
  if not found then
    raise exception 'no_encontrado';
  end if;
end;
$$;

-- Denunciar ahora también acepta publicaciones y comentarios (por su id), si puedo verlos.
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

-- --- Avisos ---

-- Lo nuevo desde la última vez que se vieron los avisos: solicitudes, reacciones y comentarios en lo mío (de otras
-- personas, sin bloqueadas ni suspendidas), y como mucho las 30 últimas reacciones y comentarios, marcando los nuevos.
create function public.avisos()
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
      join public.publicaciones pu on pu.id = r.publicacion and pu.autor = v_yo
      join public.perfiles q on q.user_id = r.user_id and not q.suspendido
      where r.user_id <> v_yo and not public.social_bloqueo(v_yo, r.user_id)
      union all
      select 'comentario', q.alias, q.nombre, pu.id, pu.resumen ->> 'titulo', left(c.texto, 120), c.creado, c.creado > v_desde
      from public.comentarios c
      join public.publicaciones pu on pu.id = c.publicacion and pu.autor = v_yo
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

create function public.marcar_avisos_vistos()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.perfiles set avisos_vistos = now() where user_id = public.social_yo();
end;
$$;

revoke execute on function public.feed(timestamptz, integer), public.publicaciones_de(text, timestamptz, integer),
  public.comentarios_de(uuid), public.reaccionar(uuid), public.quitar_reaccion(uuid), public.comentar(uuid, text),
  public.borrar_comentario(uuid), public.avisos(), public.marcar_avisos_vistos()
  from public, anon;
grant execute on function public.feed(timestamptz, integer), public.publicaciones_de(text, timestamptz, integer),
  public.comentarios_de(uuid), public.reaccionar(uuid), public.quitar_reaccion(uuid), public.comentar(uuid, text),
  public.borrar_comentario(uuid), public.avisos(), public.marcar_avisos_vistos()
  to authenticated;
