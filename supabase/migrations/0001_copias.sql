-- AppFit · copias cifradas por cuenta (plan: docs/cuentas.md).
-- Se ejecuta una vez en el SQL Editor del proyecto de Supabase. Un cambio posterior va en un archivo nuevo (0002_…).
--
-- Cada usuario tiene una sola fila con su copia cifrada en el móvil: el servidor nunca ve los datos en claro.
-- La app solo lee su fila (RLS) y escribe a través de las funciones de abajo, que comprueban la revisión
-- de forma atómica para que un dispositivo no pise la copia que acaba de subir otro.

create table public.copias (
  user_id uuid primary key references auth.users (id) on delete cascade,
  revision integer not null check (revision > 0),
  actualizada timestamptz not null default now(),
  tamano integer not null check (tamano <= 30000000),
  -- Copia cifrada (texto: versión, IV y datos en base64) y la anterior, como red de seguridad.
  datos text not null,
  datos_anterior text,
  -- Clave de los datos envuelta con la contraseña y con la clave de recuperación (ver features/cuenta/lib/cifrado.ts).
  claves jsonb not null
);

alter table public.copias enable row level security;

create policy "cada usuario lee su copia" on public.copias
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.copias from anon, authenticated;
grant select on public.copias to authenticated;

-- Sube una copia si la nube sigue en `p_revision_base` (0 = todavía no hay copia). Devuelve la revisión nueva,
-- o null si otro dispositivo subió antes (conflicto). `p_claves` null conserva las claves guardadas.
create function public.subir_copia(p_revision_base integer, p_datos text, p_claves jsonb default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  nueva integer;
begin
  if uid is null then
    raise exception 'sin sesión';
  end if;

  if p_revision_base = 0 then
    if p_claves is null then
      raise exception 'la primera copia necesita sus claves';
    end if;
    insert into public.copias (user_id, revision, tamano, datos, claves)
    values (uid, 1, length(p_datos), p_datos, p_claves)
    on conflict (user_id) do nothing
    returning revision into nueva;
    return nueva;
  end if;

  update public.copias
  set datos_anterior = datos,
      datos = p_datos,
      tamano = length(p_datos),
      claves = coalesce(p_claves, claves),
      revision = revision + 1,
      actualizada = now()
  where user_id = uid and revision = p_revision_base
  returning revision into nueva;
  return nueva;
end;
$$;

-- Cambia la contraseña o la clave de recuperación: solo vuelve a envolver la clave de los datos, sin tocar la copia.
create function public.actualizar_claves(p_claves jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'sin sesión';
  end if;
  update public.copias set claves = p_claves where user_id = auth.uid();
end;
$$;

-- Borra la cuenta y, en cascada, su copia (Google Play exige poder hacerlo desde la app).
create function public.borrar_cuenta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'sin sesión';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.subir_copia(integer, text, jsonb) from public, anon;
revoke execute on function public.actualizar_claves(jsonb) from public, anon;
revoke execute on function public.borrar_cuenta() from public, anon;
grant execute on function public.subir_copia(integer, text, jsonb) to authenticated;
grant execute on function public.actualizar_claves(jsonb) to authenticated;
grant execute on function public.borrar_cuenta() to authenticated;
