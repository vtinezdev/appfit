-- Cumbra Fit · desbloqueos (ADR 068, parte 2). Ejecutar después de 0030. Pruebas: supabase/pruebas/desbloqueos.sql.
--
-- Quién tiene Cumbra Fit desbloqueada (Nutrición, Perfil y la copia en la nube, tras el mes de prueba). Hoy solo a mano:
-- un administrador (0017) lo hace desde la app por el alias del perfil social. La parte 3 añadirá las compras de Google
-- Play (origen 'play'). Solo se guarda la cuenta, el origen y la fecha: nada de lo que la persona registra.
--
-- También a mano en el SQL Editor, con el alias:
--   insert into public.desbloqueos (user_id, origen) select user_id, 'manual' from public.perfiles where alias = '<alias>'
--   on conflict do nothing;
--
-- Aditiva: sin ella, `mi_desbloqueo` no existe y la app sigue con la prueba como siempre.
begin;

create table public.desbloqueos (
  user_id uuid primary key references auth.users (id) on delete cascade,
  origen text not null check (origen in ('manual', 'play')),
  -- Quién lo desbloqueó a mano (null en una compra o si ya no existe esa cuenta).
  por uuid references auth.users (id) on delete set null,
  creado timestamptz not null default now()
);

alter table public.desbloqueos enable row level security;
revoke all on public.desbloqueos from anon, authenticated;

-- --- Para el cliente ---

-- Si quien tiene sesión tiene Cumbra Fit desbloqueada. Sin sesión, false.
create function public.mi_desbloqueo()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (select 1 from public.desbloqueos d where d.user_id = auth.uid())
$$;

-- Desbloquear (`true`) o quitar el desbloqueo manual (`false`) por el alias del perfil. Solo administradores; una compra
-- no se quita desde aquí.
create function public.admin_desbloquear(p_alias text, p_desbloquear boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_admin_yo(); v_alias text := lower(trim(coalesce(p_alias, ''))); v_otro uuid;
begin
  if p_desbloquear is null then raise exception 'accion_no_valida'; end if;
  select user_id into v_otro from public.perfiles where alias = v_alias;
  if v_otro is null then raise exception 'no_encontrado'; end if;
  if p_desbloquear then
    insert into public.desbloqueos (user_id, origen, por) values (v_otro, 'manual', v_yo) on conflict (user_id) do nothing;
  else
    delete from public.desbloqueos where user_id = v_otro and origen = 'manual';
    if not found then raise exception 'no_encontrado'; end if;
  end if;
end;
$$;

-- Personas con perfil desbloqueadas a mano, de la más reciente a la más antigua. Sin UUID.
create function public.admin_desbloqueados()
returns table (alias text, nombre text, desde timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.social_admin_yo();
  return query
    select p.alias, p.nombre, d.creado from public.desbloqueos d join public.perfiles p on p.user_id = d.user_id
    where d.origen = 'manual' order by d.creado desc;
end;
$$;

revoke execute on function public.mi_desbloqueo(), public.admin_desbloquear(text, boolean), public.admin_desbloqueados()
  from public, anon;
grant execute on function public.mi_desbloqueo(), public.admin_desbloquear(text, boolean), public.admin_desbloqueados()
  to authenticated;

notify pgrst, 'reload schema';
commit;
