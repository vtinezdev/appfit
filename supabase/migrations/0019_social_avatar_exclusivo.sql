-- AppFit · avatar personal de Tinez. Ejecutar después de 0018.
-- El permiso pertenece a una cuenta, no al alias ni a todos los administradores.
-- Pruebas: supabase/pruebas/social_avatar_exclusivo.sql.
begin;

create table public.avatares_exclusivos (
  avatar text primary key check (avatar = 'exclusivo.tinez'),
  user_id uuid not null references auth.users (id) on delete cascade
);
alter table public.avatares_exclusivos enable row level security;
revoke all on public.avatares_exclusivos from public, anon, authenticated;

-- Asignación única al perfil actual de Tinez, corroborado por el nombramiento manual de 0017.
-- Si no está, no se reserva a un futuro dueño del alias: revisar la cuenta en el SQL Editor y asignarla a mano.
insert into public.avatares_exclusivos (avatar, user_id)
select 'exclusivo.tinez', p.user_id from public.perfiles p
join public.administradores a on a.user_id = p.user_id where p.alias = 'tinez';

-- Solo los identificadores propios; nunca se expone el UUID de la cuenta propietaria.
create function public.mis_avatares_exclusivos()
returns text[] language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo();
begin
  return coalesce((select array_agg(a.avatar order by a.avatar)
    from public.avatares_exclusivos a where a.user_id = v_yo), array[]::text[]);
end;
$$;
revoke execute on function public.mis_avatares_exclusivos() from public, anon;
grant execute on function public.mis_avatares_exclusivos() to authenticated;

alter table public.perfiles drop constraint perfiles_avatar_check;
alter table public.perfiles add constraint perfiles_avatar_check check (avatar is null or (char_length(avatar) <= 64
  and avatar ~ '^(disciplina\.[a-z-]+\.[a-z-]+|paisaje\.[a-z-]+|logro\.[a-z-]+\.[a-z-]+|exclusivo\.tinez)$'));

create or replace function public.editar_avatar(p_avatar text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo();
begin
  if p_avatar is not null and (char_length(p_avatar) > 64
    or p_avatar !~ '^(disciplina\.[a-z-]+\.[a-z-]+|paisaje\.[a-z-]+|logro\.[a-z-]+\.[a-z-]+|exclusivo\.tinez)$') then
    raise exception 'avatar_no_valido';
  end if;
  if p_avatar = 'exclusivo.tinez' and not exists (
    select 1 from public.avatares_exclusivos a where a.avatar = p_avatar and a.user_id = v_yo
  ) then raise exception 'avatar_no_disponible'; end if;
  update public.perfiles set avatar = p_avatar, avatar_publicacion = null where user_id = v_yo;
end;
$$;

-- Sigue viéndose donde se vea su alias. Si se retira o transfiere el permiso en SQL, el antiguo dueño deja de mostrarlo.
create or replace function public.avatares_perfil(p_alias text[], p_comunidad uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo(); v_catalogo jsonb;
begin
  select coalesce(jsonb_object_agg(pe.alias, to_jsonb(pe.avatar)), '{}'::jsonb) into v_catalogo
  from public.perfiles pe
  where pe.alias in (select lower(trim(a)) from unnest(p_alias[1:60]) a)
    and pe.avatar is not null and not pe.suspendido and not public.social_bloqueo(v_yo, pe.user_id)
    and (pe.avatar <> 'exclusivo.tinez' or exists (
      select 1 from public.avatares_exclusivos a where a.avatar = pe.avatar and a.user_id = pe.user_id
    ));
  return public.avatares_social(p_alias, p_comunidad) || v_catalogo;
end;
$$;
commit;
