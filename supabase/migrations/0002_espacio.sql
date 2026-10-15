-- AppFit · ahorro de espacio en el plan gratuito (plan: docs/social.md, fase 1; decisión: ADR 040).
-- Se ejecuta una vez en el SQL Editor, después de 0001_copias.sql.
--
-- 1. `actividad`: último día en que cada cuenta abrió la app con sesión. La app lo marca como mucho una vez al día.
-- 2. Cada día se borra la copia anterior (`datos_anterior`) de las copias que llevan más de 7 días sin cambiar.
-- 3. Cada semana se borran las cuentas sin actividad en 12 meses, con todo lo suyo (cascada desde auth.users).
--    Los datos del móvil de esa persona no se tocan.

create table public.actividad (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dia date not null default current_date
);

alter table public.actividad enable row level security;
revoke all on public.actividad from anon, authenticated;

-- Las cuentas que ya existen empiezan contando como activas hoy.
insert into public.actividad (user_id, dia)
select id, current_date from auth.users
on conflict (user_id) do nothing;

-- La app la llama al abrirse con sesión. Solo escribe si el día cambió.
create function public.marcar_actividad()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'sin sesión';
  end if;
  insert into public.actividad (user_id, dia) values (auth.uid(), current_date)
  on conflict (user_id) do update set dia = excluded.dia
  where public.actividad.dia < excluded.dia;
end;
$$;

revoke execute on function public.marcar_actividad() from public, anon;
grant execute on function public.marcar_actividad() to authenticated;

-- Solo la ejecuta la tarea programada (como postgres): nadie más tiene permiso.
-- Cuenta como actividad tanto abrir la app como subir una copia; una cuenta recién creada tiene 12 meses de margen.
create function public.borrar_cuentas_inactivas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  borradas integer;
begin
  delete from auth.users u
  where u.created_at < now() - interval '12 months'
    and not exists (select 1 from public.actividad a where a.user_id = u.id and a.dia >= current_date - interval '12 months')
    and not exists (select 1 from public.copias c where c.user_id = u.id and c.actualizada >= now() - interval '12 months');
  get diagnostics borradas = row_count;
  return borradas;
end;
$$;

revoke execute on function public.borrar_cuentas_inactivas() from public, anon, authenticated;

-- Tareas programadas (pg_cron, incluido en el plan gratuito). Horas en UTC. Con el proyecto pausado no se ejecutan.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule('appfit-copia-anterior', '15 3 * * *', $$
  update public.copias set datos_anterior = null
  where datos_anterior is not null and actualizada < now() - interval '7 days'
$$);

select cron.schedule('appfit-cuentas-inactivas', '30 3 * * 0', $$ select public.borrar_cuentas_inactivas() $$);
