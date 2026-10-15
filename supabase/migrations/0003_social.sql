-- AppFit · parte social, fase 3: perfiles, seguir, bloquear y denunciar (plan: docs/social.md; decisión: ADR 040).
-- Se ejecuta una vez en el SQL Editor, después de 0002_espacio.sql. Pruebas: supabase/pruebas/social.sql.
--
-- La app no toca las tablas: todo pasa por las funciones de abajo (security definer, con auth.uid()), que identifican a
-- las personas por su alias y nunca devuelven ids. Los errores son claves cortas (alias_ocupado, no_encontrado…) que
-- traduce la app. Moderación a mano: `select * from public.denuncias where revisada is null` y
-- `update public.perfiles set suspendido = true where alias = '…'`.

create table public.perfiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- 3–20 caracteres: minúsculas sin tildes, números, punto y guion bajo, sin empezar ni acabar en punto.
  alias text not null unique check (alias ~ '^[a-z0-9_][a-z0-9._]{1,18}[a-z0-9_]$'),
  nombre text check (nombre is null or char_length(nombre) between 1 and 40),
  -- Código de invitación: 8 cifras hexadecimales, «1A2B-3C4D».
  codigo text not null unique check (codigo ~ '^[0-9A-F]{4}-[0-9A-F]{4}$'),
  -- Cuándo aceptó las condiciones y que tiene 16 años o más.
  acepto timestamptz not null,
  avisos_vistos timestamptz not null default now(),
  suspendido boolean not null default false,
  creado timestamptz not null default now()
);

create table public.seguimientos (
  seguidor uuid not null references public.perfiles (user_id) on delete cascade,
  seguido uuid not null references public.perfiles (user_id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptado')),
  creado timestamptz not null default now(),
  primary key (seguidor, seguido),
  check (seguidor <> seguido)
);

create index seguimientos_seguido on public.seguimientos (seguido, estado);

create table public.bloqueos (
  quien uuid not null references public.perfiles (user_id) on delete cascade,
  bloqueado uuid not null references public.perfiles (user_id) on delete cascade,
  creado timestamptz not null default now(),
  primary key (quien, bloqueado),
  check (quien <> bloqueado)
);

create index bloqueos_bloqueado on public.bloqueos (bloqueado);

create table public.denuncias (
  id bigint generated always as identity primary key,
  denunciante uuid references auth.users (id) on delete set null,
  tipo text not null check (tipo in ('perfil', 'publicacion', 'comentario')),
  -- user_id del perfil, o id de la publicación o del comentario (fase 5).
  objetivo uuid not null,
  -- Lo denunciado tal como estaba (alias y nombre, texto…), por si cambia o se borra antes de revisarlo.
  contenido text not null,
  motivo text not null check (motivo in ('spam', 'acoso', 'inapropiado', 'suplantacion', 'otro')),
  detalle text check (detalle is null or char_length(detalle) <= 500),
  creada timestamptz not null default now(),
  revisada timestamptz
);

alter table public.perfiles enable row level security;
alter table public.seguimientos enable row level security;
alter table public.bloqueos enable row level security;
alter table public.denuncias enable row level security;
revoke all on public.perfiles, public.seguimientos, public.bloqueos, public.denuncias from anon, authenticated;

-- --- Ayudantes (solo los usan las funciones de abajo) ---

-- Mi user_id, si tengo perfil y no está suspendido.
create function public.social_yo()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_suspendido boolean;
begin
  if v_uid is null then
    raise exception 'sin_sesion';
  end if;
  select p.suspendido into v_suspendido from public.perfiles p where p.user_id = v_uid;
  if not found then
    raise exception 'sin_perfil';
  end if;
  if v_suspendido then
    raise exception 'suspendido';
  end if;
  return v_uid;
end;
$$;

-- user_id de un alias, sin mirar bloqueos (para deshacer relaciones). Nunca el propio.
create function public.social_id(p_yo uuid, p_alias text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select p.user_id into v_id from public.perfiles p where p.alias = lower(trim(p_alias)) and p.user_id <> p_yo;
  if v_id is null then
    raise exception 'no_encontrado';
  end if;
  return v_id;
end;
$$;

-- Si hay un bloqueo entre dos personas, en cualquier sentido.
create function public.social_bloqueo(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bloqueos b
    where (b.quien = p_a and b.bloqueado = p_b) or (b.quien = p_b and b.bloqueado = p_a)
  )
$$;

-- Cómo ve `p_yo` a otra persona: alias, nombre, si la sigue y si le sigue ('no', 'pendiente' o 'aceptado').
create function public.social_ver(p_yo uuid, p_otro uuid)
returns table (alias text, nombre text, sigo text, me_sigue text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.alias, p.nombre,
    coalesce((select s.estado from public.seguimientos s where s.seguidor = p_yo and s.seguido = p.user_id), 'no'),
    coalesce((select s.estado from public.seguimientos s where s.seguidor = p.user_id and s.seguido = p_yo), 'no')
  from public.perfiles p
  where p.user_id = p_otro
$$;

create function public.social_alias(p_alias text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := lower(trim(coalesce(p_alias, '')));
begin
  if v !~ '^[a-z0-9_][a-z0-9._]{1,18}[a-z0-9_]$' then
    raise exception 'alias_no_valido';
  end if;
  if v in ('appfit', 'admin', 'administrador', 'administracion', 'soporte', 'ayuda', 'oficial', 'moderador', 'moderacion', 'root', 'sistema') then
    raise exception 'alias_reservado';
  end if;
  return v;
end;
$$;

create function public.social_nombre(p_nombre text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := nullif(trim(regexp_replace(coalesce(p_nombre, ''), '\s+', ' ', 'g')), '');
begin
  if char_length(v) > 40 then
    raise exception 'nombre_largo';
  end if;
  return v;
end;
$$;

create function public.social_codigo()
returns text
language sql
volatile
set search_path = ''
as $$
  -- Las 8 primeras cifras de un UUID v4 son aleatorias (gen_random_uuid usa un generador seguro).
  select upper(substr(v, 1, 4) || '-' || substr(v, 5, 4)) from (select replace(gen_random_uuid()::text, '-', '') as v) x
$$;

revoke execute on function public.social_yo(), public.social_id(uuid, text), public.social_bloqueo(uuid, uuid),
  public.social_ver(uuid, uuid), public.social_alias(text), public.social_nombre(text), public.social_codigo()
  from public, anon, authenticated;

-- --- Perfil ---

-- Mi perfil (alias, nombre, código y solicitudes pendientes), o null si aún no tengo.
create function public.mi_perfil()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v jsonb;
begin
  if v_uid is null then
    raise exception 'sin_sesion';
  end if;
  select jsonb_build_object(
    'alias', p.alias, 'nombre', p.nombre, 'codigo', p.codigo, 'suspendido', p.suspendido,
    'solicitudes', (select count(*) from public.seguimientos s where s.seguido = v_uid and s.estado = 'pendiente')
  ) into v
  from public.perfiles p where p.user_id = v_uid;
  return v;
end;
$$;

create function public.crear_perfil(p_alias text, p_nombre text, p_acepto boolean)
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

create function public.editar_perfil(p_alias text, p_nombre text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restriccion text;
begin
  update public.perfiles set alias = public.social_alias(p_alias), nombre = public.social_nombre(p_nombre)
  where user_id = public.social_yo();
exception
  when unique_violation then
    get stacked diagnostics v_restriccion = constraint_name;
    if v_restriccion = 'perfiles_alias_key' then
      raise exception 'alias_ocupado';
    end if;
    raise;
end;
$$;

-- Código de invitación nuevo: el anterior deja de servir.
create function public.nuevo_codigo()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v text := public.social_codigo();
begin
  update public.perfiles set codigo = v where user_id = public.social_yo();
  return v;
end;
$$;

-- Borra mi perfil y, en cascada, a quién sigo, quién me sigue y mis bloqueos. La cuenta y su copia se quedan.
create function public.borrar_perfil()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'sin_sesion';
  end if;
  delete from public.perfiles where user_id = auth.uid();
end;
$$;

-- --- Encontrar y seguir ---

-- Una persona por su alias exacto o su código de invitación (con o sin guion). Nunca uno mismo, ni perfiles
-- suspendidos ni con un bloqueo de por medio.
create function public.buscar_persona(p_texto text)
returns table (alias text, nombre text, sigo text, me_sigue text)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_yo uuid := public.social_yo();
  v_codigo text := upper(replace(trim(coalesce(p_texto, '')), '-', ''));
begin
  return query
  select v.alias, v.nombre, v.sigo, v.me_sigue
  from public.perfiles p
  cross join lateral public.social_ver(v_yo, p.user_id) v
  where (p.alias = lower(trim(p_texto)) or (v_codigo ~ '^[0-9A-F]{8}$' and p.codigo = substr(v_codigo, 1, 4) || '-' || substr(v_codigo, 5, 4)))
    and p.user_id <> v_yo
    and not p.suspendido
    and not public.social_bloqueo(v_yo, p.user_id);
end;
$$;

-- Mis listas: 'siguiendo' (también las solicitudes que he enviado), 'seguidores', 'solicitudes' (las que me han
-- enviado) o 'bloqueados'.
create function public.personas(p_lista text)
returns table (alias text, nombre text, sigo text, me_sigue text)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_yo uuid := public.social_yo();
begin
  if p_lista = 'siguiendo' then
    return query
    select v.alias, v.nombre, v.sigo, v.me_sigue
    from public.seguimientos s
    join public.perfiles p on p.user_id = s.seguido and not p.suspendido
    cross join lateral public.social_ver(v_yo, s.seguido) v
    where s.seguidor = v_yo
    order by v.alias;
  elsif p_lista = 'seguidores' then
    return query
    select v.alias, v.nombre, v.sigo, v.me_sigue
    from public.seguimientos s
    join public.perfiles p on p.user_id = s.seguidor and not p.suspendido
    cross join lateral public.social_ver(v_yo, s.seguidor) v
    where s.seguido = v_yo and s.estado = 'aceptado'
    order by v.alias;
  elsif p_lista = 'solicitudes' then
    return query
    select v.alias, v.nombre, v.sigo, v.me_sigue
    from public.seguimientos s
    join public.perfiles p on p.user_id = s.seguidor and not p.suspendido
    cross join lateral public.social_ver(v_yo, s.seguidor) v
    where s.seguido = v_yo and s.estado = 'pendiente'
    order by s.creado desc;
  elsif p_lista = 'bloqueados' then
    return query
    select v.alias, v.nombre, v.sigo, v.me_sigue
    from public.bloqueos b
    cross join lateral public.social_ver(v_yo, b.bloqueado) v
    where b.quien = v_yo
    order by v.alias;
  else
    raise exception 'lista_no_valida';
  end if;
end;
$$;

-- Pide seguir a alguien (queda pendiente hasta que acepte). Como mucho 50 al día.
create function public.pedir_seguir(p_alias text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := public.social_yo();
  v_otro uuid := public.social_id(v_yo, p_alias);
  v_estado text;
begin
  if public.social_bloqueo(v_yo, v_otro) or (select p.suspendido from public.perfiles p where p.user_id = v_otro) then
    raise exception 'no_encontrado';
  end if;
  if (select count(*) from public.seguimientos s where s.seguidor = v_yo and s.creado > now() - interval '1 day') >= 50 then
    raise exception 'limite';
  end if;
  insert into public.seguimientos (seguidor, seguido) values (v_yo, v_otro) on conflict do nothing;
  select s.estado into v_estado from public.seguimientos s where s.seguidor = v_yo and s.seguido = v_otro;
  return v_estado;
end;
$$;

-- Deja de seguir a alguien o cancela la solicitud enviada.
create function public.dejar_de_seguir(p_alias text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := public.social_yo();
begin
  delete from public.seguimientos where seguidor = v_yo and seguido = public.social_id(v_yo, p_alias);
end;
$$;

create function public.responder_solicitud(p_alias text, p_aceptar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := public.social_yo();
  v_otro uuid := public.social_id(v_yo, p_alias);
begin
  if p_aceptar then
    update public.seguimientos set estado = 'aceptado' where seguidor = v_otro and seguido = v_yo and estado = 'pendiente';
  else
    delete from public.seguimientos where seguidor = v_otro and seguido = v_yo and estado = 'pendiente';
  end if;
  if not found then
    raise exception 'no_encontrado';
  end if;
end;
$$;

-- Quita a alguien de mis seguidores (puede volver a pedirlo).
create function public.quitar_seguidor(p_alias text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := public.social_yo();
begin
  delete from public.seguimientos where seguidor = public.social_id(v_yo, p_alias) and seguido = v_yo;
end;
$$;

-- Bloquear quita el seguimiento en los dos sentidos y oculta a cada uno del otro.
create function public.bloquear(p_alias text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := public.social_yo();
  v_otro uuid := public.social_id(v_yo, p_alias);
begin
  insert into public.bloqueos (quien, bloqueado) values (v_yo, v_otro) on conflict do nothing;
  delete from public.seguimientos
  where (seguidor = v_yo and seguido = v_otro) or (seguidor = v_otro and seguido = v_yo);
end;
$$;

create function public.desbloquear(p_alias text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := public.social_yo();
begin
  delete from public.bloqueos where quien = v_yo and bloqueado = public.social_id(v_yo, p_alias);
end;
$$;

-- --- Moderación ---

-- Denuncia un perfil (por su alias). Publicaciones y comentarios llegan en la fase 5. Como mucho 20 al día.
create function public.denunciar(p_tipo text, p_objetivo text, p_motivo text, p_detalle text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := public.social_yo();
  v_objetivo uuid;
  v_contenido text;
begin
  if (select count(*) from public.denuncias d where d.denunciante = v_yo and d.creada > now() - interval '1 day') >= 20 then
    raise exception 'limite';
  end if;
  if p_tipo = 'perfil' then
    v_objetivo := public.social_id(v_yo, p_objetivo);
    select p.alias || coalesce(' · ' || p.nombre, '') into v_contenido from public.perfiles p where p.user_id = v_objetivo;
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

revoke execute on function public.mi_perfil(), public.crear_perfil(text, text, boolean), public.editar_perfil(text, text),
  public.nuevo_codigo(), public.borrar_perfil(), public.buscar_persona(text), public.personas(text), public.pedir_seguir(text),
  public.dejar_de_seguir(text), public.responder_solicitud(text, boolean), public.quitar_seguidor(text), public.bloquear(text),
  public.desbloquear(text), public.denunciar(text, text, text, text)
  from public, anon;
grant execute on function public.mi_perfil(), public.crear_perfil(text, text, boolean), public.editar_perfil(text, text),
  public.nuevo_codigo(), public.borrar_perfil(), public.buscar_persona(text), public.personas(text), public.pedir_seguir(text),
  public.dejar_de_seguir(text), public.responder_solicitud(text, boolean), public.quitar_seguidor(text), public.bloquear(text),
  public.desbloquear(text), public.denunciar(text, text, text, text)
  to authenticated;
