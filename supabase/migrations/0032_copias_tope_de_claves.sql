-- Tope de las claves de la copia (auditoría de seguridad de 2026-11, docs/auditoria-seguridad-2026-11/ESTADO.md).
-- `claves` no tenía límite: una cuenta podía guardar ahí decenas de MB con una copia de 3 bytes y saltarse el tope de
-- 30 MB, que solo mide `datos`. Las claves reales (dos envolturas de la clave de datos, features/cuenta/lib/cifrado.ts)
-- ocupan unos 400 bytes; el tope de 2 KB deja margen de sobra. Además, `tamano` pasa a contar bytes y no caracteres:
-- la copia cifrada es base64 (un byte por carácter), así que para la app no cambia nada.
-- Aditiva para la app. Ejecutar en el SQL Editor del proyecto, después de 0031 (desbloqueos). Si falla al añadir el tope, alguna fila
-- tiene unas claves que no son las de la app: no se cambia nada y hay que mirarlo antes.

alter table public.copias
  add constraint copias_claves_tope check (jsonb_typeof(claves) = 'object' and octet_length(claves::text) <= 2048);

create or replace function public.subir_copia(p_revision_base integer, p_datos text, p_claves jsonb default null)
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
    values (uid, 1, octet_length(p_datos), p_datos, p_claves)
    on conflict (user_id) do nothing
    returning revision into nueva;
    return nueva;
  end if;
  update public.copias
  set datos_anterior = datos,
      datos = p_datos,
      tamano = octet_length(p_datos),
      claves = coalesce(p_claves, claves),
      revision = revision + 1,
      actualizada = now()
  where user_id = uid and revision = p_revision_base
  returning revision into nueva;
  return nueva;
end;
$$;
