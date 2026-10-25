-- AppFit · parte social, fase 4: publicar el resumen de un entreno o de una actividad (plan: docs/social.md; ADR 040).
-- Se ejecuta una vez en el SQL Editor, después de 0003_social.sql. Pruebas: supabase/pruebas/social.sql.
--
-- El resumen lo crea la app (social/lib/publicacion.ts) y la persona lo ve antes de publicarlo. Aquí solo se comprueba
-- que es un objeto pequeño: quien lo lea lo valida al pintarlo. Lo ven sus seguidores (fase 5).

create table public.publicaciones (
  -- Lo genera la app: publicar dos veces el mismo id (un reintento) no duplica.
  id uuid primary key,
  autor uuid not null references public.perfiles (user_id) on delete cascade,
  tipo text not null check (tipo in ('entreno', 'actividad')),
  -- Inicio del entreno o de la actividad.
  fecha timestamptz not null,
  creada timestamptz not null default now(),
  resumen jsonb not null check (jsonb_typeof(resumen) = 'object' and octet_length(resumen::text) <= 8192)
);

create index publicaciones_autor on public.publicaciones (autor, fecha desc);

alter table public.publicaciones enable row level security;
revoke all on public.publicaciones from anon, authenticated;

-- Publica (como mucho 30 al día). Si ese id ya es mío, no hace nada: el reintento tras un fallo de red no duplica.
create function public.publicar(p_id uuid, p_tipo text, p_fecha timestamptz, p_resumen jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := public.social_yo();
  v_autor uuid;
begin
  select p.autor into v_autor from public.publicaciones p where p.id = p_id;
  if found then
    if v_autor = v_yo then
      return;
    end if;
    raise exception 'publicacion_no_valida';
  end if;
  if (select count(*) from public.publicaciones p where p.autor = v_yo and p.creada > now() - interval '1 day') >= 30 then
    raise exception 'limite';
  end if;
  if p_fecha is null or p_fecha > now() + interval '1 day' then
    raise exception 'publicacion_no_valida';
  end if;
  insert into public.publicaciones (id, autor, tipo, fecha, resumen) values (p_id, v_yo, p_tipo, p_fecha, p_resumen);
exception
  when check_violation or not_null_violation then
    raise exception 'publicacion_no_valida';
end;
$$;

-- Borra una publicación mía (también con el perfil suspendido). Si ya no existe, no_encontrado.
create function public.borrar_publicacion(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'sin_sesion';
  end if;
  delete from public.publicaciones where id = p_id and autor = auth.uid();
  if not found then
    raise exception 'no_encontrado';
  end if;
end;
$$;

revoke execute on function public.publicar(uuid, text, timestamptz, jsonb), public.borrar_publicacion(uuid) from public, anon;
grant execute on function public.publicar(uuid, text, timestamptz, jsonb), public.borrar_publicacion(uuid) to authenticated;
