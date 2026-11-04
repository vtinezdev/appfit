-- AppFit · responder a una respuesta. Ejecutar después de 0028.
-- Hasta ahora `comentar_respuesta` solo aceptaba responder a un comentario raíz (un nivel). Con esta migración también
-- se responde a una respuesta: `respuesta_a` apunta al comentario al que se contesta, sea raíz o respuesta, y el aviso
-- «Respondió a tu comentario» le llega a su autor (`social_eventos` ya lo dirige a `padre.autor`). En pantalla los
-- hilos siguen teniendo un solo nivel visual: el cliente cuelga cada respuesta del comentario raíz de su cadena y
-- muestra «Respuesta a @…» cuando contesta a otra respuesta.
-- Se puede ejecutar antes o después de desplegar: el cliente solo ofrece «Responder» en las respuestas cuando
-- `social_capacidades` anuncia `respuestasAnidadas`. Se deshace reejecutando `comentar_respuesta` de 0010 y
-- `social_capacidades` de 0028.
-- Víctor ejecuta este archivo completo en el SQL Editor; no se aplica desde la app.
begin;

create or replace function public.comentar_respuesta(p_id uuid,p_texto text,p_respuesta uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public.social_yo(); v_id uuid;
begin
  -- Serializa la cuota de esta persona, incluso con varias pestañas.
  perform 1 from public.perfiles where user_id=v_yo for update;
  perform public.social_publicacion(v_yo,p_id);
  -- El comentario al que se responde (raíz o respuesta) es de esta publicación y su autor se ve.
  if p_respuesta is not null and not exists(
    select 1 from public.comentarios c join public.perfiles pe on pe.user_id=c.autor
    where c.id=p_respuesta and c.publicacion=p_id
      and not pe.suspendido and not public.social_bloqueo(v_yo,c.autor)
  ) then raise exception 'no_encontrado'; end if;
  v_id := public.comentar(p_id,p_texto);
  update public.comentarios set respuesta_a=p_respuesta where id=v_id;
  return v_id;
end;
$$;

create or replace function public.social_capacidades() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.social_yo();
  return (select jsonb_build_object('camposOpcionales',campos_opcionales,'imagenesPublicacion',true,'detallesEjercicio',true,'rutinaCompartida',true,'semanaRitmo',true,'semanaCompania',true,'imagenesComunidades',true,'respuestasAnidadas',true) from public.social_configuracion where id);
end;
$$;

revoke execute on function public.comentar_respuesta(uuid,text,uuid), public.social_capacidades() from public, anon;
grant execute on function public.comentar_respuesta(uuid,text,uuid), public.social_capacidades() to authenticated;
notify pgrst, 'reload schema';
commit;
