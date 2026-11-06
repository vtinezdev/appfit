-- Plazos de borrado (política de privacidad § 6, PROCESO §330; decididos por Víctor el 2026-11-06): una denuncia se borra
-- 6 meses después de revisarla (las que siguen sin revisar esperan a que se revisen) y un mensaje al creador, 12 meses
-- después de llegar, se haya leído o no. Con la denuncia se va su aviso «Revisamos tu denuncia y hemos actuado» (0026).
-- Aditiva: una función y una tarea programada; la app no cambia. Ejecutar en el SQL Editor del proyecto, después de 0029.

create or replace function public.borrar_caducados()
returns table (denuncias integer, mensajes integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  d integer;
  m integer;
begin
  delete from public.denuncias where revisada is not null and revisada < now() - interval '6 months';
  get diagnostics d = row_count;
  delete from public.mensajes_creador where creado < now() - interval '12 months';
  get diagnostics m = row_count;
  return query select d, m;
end;
$$;

-- Solo la ejecuta la tarea programada (como postgres): nadie más tiene permiso.
revoke execute on function public.borrar_caducados() from public, anon, authenticated;

-- Tareas programadas (pg_cron, activado en 0002). Domingos a las 03:45 UTC, después de las cuentas inactivas (03:30).
-- Con el mismo nombre, volver a ejecutar este archivo actualiza la tarea en vez de duplicarla.
select cron.schedule('appfit-plazos-borrado', '45 3 * * 0', $$ select public.borrar_caducados() $$);
