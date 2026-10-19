-- AppFit · seguimiento mutuo al aceptar. Ejecutar después de 0017. Pruebas: supabase/pruebas/social_seguimiento_mutuo.sql.
--
-- Aceptar una solicitud hace que los dos os sigáis: además de aprobar la suya, quien acepta pasa a seguir a quien la pidió,
-- sin otra solicitud. Si quien acepta ya le había pedido seguir, esa solicitud queda aceptada sin aviso de «aceptó»
-- (lo ha decidido quien recibe el aviso). Después cada sentido es independiente: dejar de seguir y quitar de seguidores
-- rompen solo el suyo. Las relaciones de un solo sentido que ya existían se quedan como estaban.
--
-- Solo cambia `responder_solicitud`; se puede volver atrás reejecutando su definición de 0003.
begin;

create or replace function public.responder_solicitud(p_alias text, p_aceptar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := public.social_yo();
  v_otro uuid := public.social_id(v_yo, p_alias);
begin
  if not p_aceptar then
    delete from public.seguimientos where seguidor = v_otro and seguido = v_yo and estado = 'pendiente';
    if not found then raise exception 'no_encontrado'; end if;
    return;
  end if;
  update public.seguimientos set estado = 'aceptado' where seguidor = v_otro and seguido = v_yo and estado = 'pendiente';
  if not found then raise exception 'no_encontrado'; end if;
  -- El sentido contrario. Sin `aceptado`, no genera el aviso «aceptó tu solicitud» para quien acaba de aceptar.
  update public.seguimientos set estado = 'aceptado' where seguidor = v_yo and seguido = v_otro and estado = 'pendiente';
  if found then
    update public.seguimientos set aceptado = null where seguidor = v_yo and seguido = v_otro;
  else
    insert into public.seguimientos (seguidor, seguido, estado) values (v_yo, v_otro, 'aceptado') on conflict do nothing;
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
