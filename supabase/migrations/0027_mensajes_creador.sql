-- Mensajes al creador (bloque 7, punto 32, ADR 061): «Comunicar un problema» (Ajustes) y, más adelante, «Proponer un
-- alimento» (Añadir comida) envían lo que la persona ha revisado en pantalla. Se puede enviar con o sin cuenta. Nadie lo
-- lee desde la app: Víctor lo ve en el panel de Supabase (Table Editor › mensajes_creador). Sin RLS de lectura ni de
-- escritura directa: solo la función `enviar_mensaje_creador`, que limita tamaños y ritmo. Ejecutar después de 0026; se
-- puede ejecutar antes o después de desplegar (sin la función, la app dice que no se ha podido enviar).
-- Pruebas: supabase/pruebas/mensajes_creador.sql.
begin;

create table if not exists public.mensajes_creador (
 id uuid primary key default gen_random_uuid(),
 tipo text not null check (tipo in ('problema','alimento')),
 texto text not null check (char_length(texto) between 1 and 8000),
 datos jsonb check (datos is null or (jsonb_typeof(datos)='object' and octet_length(datos::text)<=4000)),
 version text not null default '' check (char_length(version)<=60),
 -- Con sesión, quién lo manda (para poder contestar por la cuenta); sin ella, nada que identifique a la persona.
 user_id uuid references auth.users(id) on delete set null,
 creado timestamptz not null default now(),
 leido boolean not null default false
);
create index if not exists mensajes_creador_creado on public.mensajes_creador(creado desc);
alter table public.mensajes_creador enable row level security;
revoke all on table public.mensajes_creador from public,anon,authenticated;

create or replace function public.enviar_mensaje_creador(p_tipo text,p_texto text,p_datos jsonb default null,p_version text default '')
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_yo uuid:=auth.uid();
begin
 if p_tipo is null or p_tipo not in ('problema','alimento') then raise exception 'tipo no válido' using errcode='22023'; end if;
 if p_texto is null or char_length(btrim(p_texto))=0 then raise exception 'mensaje vacío' using errcode='22023'; end if;
 -- Freno contra abusos: 5 por cuenta y hora y, en total, 300 por hora.
 if v_yo is not null and (select count(*) from public.mensajes_creador where user_id=v_yo and creado>now()-interval '1 hour')>=5 then
  raise exception 'demasiados mensajes' using errcode='P0001';
 end if;
 if (select count(*) from public.mensajes_creador where creado>now()-interval '1 hour')>=300 then
  raise exception 'demasiados mensajes' using errcode='P0001';
 end if;
 insert into public.mensajes_creador(tipo,texto,datos,version,user_id) values (p_tipo,btrim(p_texto),p_datos,coalesce(p_version,''),v_yo);
end $$;
revoke execute on function public.enviar_mensaje_creador(text,text,jsonb,text) from public;
grant execute on function public.enviar_mensaje_creador(text,text,jsonb,text) to anon,authenticated;

commit;
