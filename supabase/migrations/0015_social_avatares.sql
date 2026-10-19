-- AppFit · avatares de catálogo en Social. Ejecutar después de 0014. Sin imágenes: se guarda solo el identificador que
-- elige la persona (una disciplina sobre un tono, un paisaje o un logro de su Vitrina). Es aditiva: los clientes
-- anteriores siguen leyendo `avatares_social` (el logro publicado de antes) y el cliente nuevo funciona sin ella.
-- Pruebas: supabase/pruebas/social_avatares.sql.
begin;

-- El catálogo vive en la app: aquí basta el formato. Un identificador que la app no reconozca se pinta como monograma.
alter table public.perfiles add column avatar text check (avatar is null or (char_length(avatar) <= 64
  and avatar ~ '^(disciplina\.[a-z-]+\.[a-z-]+|paisaje\.[a-z-]+|logro\.[a-z-]+\.[a-z-]+)$'));

-- Cambia el avatar propio (null: las iniciales). Deja de usarse el logro publicado de 0012, que quedaría por debajo.
create function public.editar_avatar(p_avatar text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo();
begin
  if p_avatar is not null and (char_length(p_avatar) > 64
    or p_avatar !~ '^(disciplina\.[a-z-]+\.[a-z-]+|paisaje\.[a-z-]+|logro\.[a-z-]+\.[a-z-]+)$') then
    raise exception 'avatar_no_valido';
  end if;
  update public.perfiles set avatar = p_avatar, avatar_publicacion = null where user_id = v_yo;
end;
$$;

-- Avatares de varias personas a la vez. El de catálogo es como el nombre: se ve donde se vea el alias, sin bloqueo ni
-- suspensión. Quien no tenga, conserva el logro publicado de 0014 con su visibilidad (desde una comunidad, solo lo
-- publicado en ella). Viajan alias e identificador (texto) o resumen (objeto), nunca UUID de usuario.
create function public.avatares_perfil(p_alias text[], p_comunidad uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo(); v_catalogo jsonb;
begin
  select coalesce(jsonb_object_agg(pe.alias, to_jsonb(pe.avatar)), '{}'::jsonb) into v_catalogo
  from public.perfiles pe
  where pe.alias in (select lower(trim(a)) from unnest(p_alias[1:60]) a)
    and pe.avatar is not null and not pe.suspendido and not public.social_bloqueo(v_yo, pe.user_id);
  return public.avatares_social(p_alias, p_comunidad) || v_catalogo;
end;
$$;

revoke execute on function public.editar_avatar(text), public.avatares_perfil(text[], uuid) from public, anon;
grant execute on function public.editar_avatar(text), public.avatares_perfil(text[], uuid) to authenticated;
commit;
