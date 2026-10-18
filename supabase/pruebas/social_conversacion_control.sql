-- Tras 0013. Solo datos sintéticos: PRUEBAS_OK deshace todo.
do $$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); g uuid:=gen_random_uuid(); anuncio uuid:=gen_random_uuid();
 p uuid:=gen_random_uuid(); padre uuid; respuesta uuid; otra uuid; logro uuid:=gen_random_uuid(); e text; n integer; x jsonb;
 texto jsonb:='{"v":1,"tipo":"texto","titulo":"Publicación","texto":"Una buena sesión"}';
 medalla jsonb:='{"v":1,"tipo":"logro","titulo":"Entrenos","logroId":"entrenos","grupo":"entreno","nivel":1,"descripcion":"10 entrenos"}';
 entreno jsonb:='{"v":1,"tipo":"entreno","titulo":"Torso","series":3,"ejercicios":[],"records":[],"ligas":[],"logros":[]}';
begin
 insert into auth.users(id,email) values(a,'control-a@appfit.test'),(b,'control-b@appfit.test'),(c,'control-c@appfit.test');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.crear_perfil('control.ana','Ana',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true); perform public.crear_perfil('control.beto','Beto',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true); perform public.crear_perfil('control.carla','Carla',true);
 -- Seguimiento aceptado genera su propio evento; no revela publicaciones sin autorización.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true); perform public.pedir_seguir('control.ana');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.responder_solicitud('control.beto',true);
 perform public.crear_comunidad(g,'Control social','Propósito de prueba',false);
 perform public.crear_comunidad(anuncio,'Anuncios sociales','Solo creador',true);
 perform public.publicar_comunidad(p,'texto',now(),texto,g);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 assert exists(select 1 from jsonb_array_elements(public.avisos()->'lista') z where z->>'tipo'='aceptada'),'aviso de aceptación';
 perform public.unirse_comunidad(g); perform public.unirse_comunidad(anuncio);
 padre:=public.comentar_respuesta(p,'Primer comentario',null);
 perform public.reaccionar(p);
 begin perform public.animos_de(p,null,null,20);e:=null;exception when others then e:=sqlerrm;end;
 assert e='no_encontrado','solo autor ve identidades';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 select count(*) into n from public.animos_de(p,null,null,20);assert n=1,'autor ve ánimo';
 respuesta:=public.comentar_respuesta(p,'Respuesta directa',padre);
 begin perform public.comentar_respuesta(p,'No hay niveles ilimitados',respuesta);e:=null;exception when others then e:=sqlerrm;end;
 assert e='no_encontrado','un nivel de respuestas';
 perform public.publicar_comunidad(gen_random_uuid(),'texto',now(),texto,anuncio);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 x:=public.avisos();assert exists(select 1 from jsonb_array_elements(x->'lista') z where z->>'tipo'='respuesta'),'respuesta dirigida';
 -- Los miembros que ya salieron no reciben avisos ni pueden responder.
 perform public.salir_comunidad(g);
 begin perform public.comentar_respuesta(p,'Ya no soy miembro',padre);e:=null;exception when others then e:=sqlerrm;end;
 assert e='no_encontrado','salir revoca acceso';
 assert not exists(select 1 from jsonb_array_elements(public.avisos()->'lista') z where z->>'tipo'='respuesta'),'sin avisos tras salir';
 perform public.unirse_comunidad(g);
 -- Cuarenta publicaciones y reacciones: lista agrupada acotada, contador sin tope 30.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 update public.perfiles set avisos_vistos=now()-interval '1 day' where user_id=a;
 for n in 1..40 loop
  otra:=gen_random_uuid();insert into public.publicaciones(id,autor,tipo,fecha,creada,resumen)values(otra,a,'texto',now()-interval '2 days',now()-interval '2 days',texto);
  insert into public.reacciones(publicacion,user_id)values(otra,b);
 end loop;
 x:=public.avisos();assert (x->>'nuevos')::int>=40,'contador sin límite de treinta';assert jsonb_array_length(x->'lista')=30,'lista acotada';
 -- Silenciar conserva el seguimiento y el acceso explícito al perfil.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 perform public.silenciar('control.ana',true);
 select count(*) into n from public.feed(null,null,20);assert n=0,'silencio filtra feed';
 select count(*) into n from public.publicaciones_de('control.ana',null,null,20);assert n=20,'perfil sigue accesible';
 assert exists(select 1 from public.seguimientos where seguidor=b and seguido=a and estado='aceptado'),'sigue siguiendo';
 perform public.silenciar('control.ana',false);select count(*) into n from public.feed(null,null,20);assert n=20,'silencio reversible';
 -- Gobernanza: terceros no pueden escalar permisos; el moderador puede retirar contenido.
 begin perform public.gestionar_comunidad(g,'nombrar','control.beto','');e:=null;exception when others then e:=sqlerrm;end;
 assert e='no_encontrado','miembro no asigna permisos';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 perform public.gestionar_comunidad(g,'nombrar','control.beto','');
 perform public.gestionar_comunidad(g,'reglas',null,'Respeto y apoyo mutuo');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 assert (public.gestion_comunidad(g)->>'modera')::boolean,'moderador delegado';
 perform public.borrar_comentario(respuesta);perform public.borrar_publicacion(p);
 begin perform public.gestionar_comunidad(g,'transferir','control.carla','');e:=null;exception when others then e:=sqlerrm;end;
 assert e='no_encontrado','moderador no transfiere';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 begin perform public.borrar_perfil();e:=null;exception when others then e:=sqlerrm;end;
 assert e='comunidades_pendientes','transferir o cerrar antes de borrar perfil';
 perform public.gestionar_comunidad(g,'transferir','control.beto','');
 assert (select creador=b from public.comunidades where id=g),'transferencia';
 perform public.salir_comunidad(g);
 perform public.borrar_comunidad(anuncio);
 -- Perfil deportivo: solo logros publicados propios; contexto de comunidad nunca revela pins privados.
 perform public.publicar(logro,'logro',now(),medalla);
 perform public.editar_perfil_deportivo('Constancia y apoyo',array['fuerza'],array[logro],logro);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 x:=public.perfil_deportivo('control.ana',null);assert x->>'bio'='Constancia y apoyo' and jsonb_array_length(x->'destacados')=1,'perfil elegido';
 begin perform public.editar_perfil_deportivo('Ajeno',array['fuerza'],array[logro],logro);e:=null;exception when others then e:=sqlerrm;end;
 assert e='perfil_deportivo_no_valido','no atribuye logro ajeno';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);perform public.unirse_comunidad(g);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 x:=public.perfil_deportivo('control.ana',g);assert jsonb_array_length(x->'destacados')=0 and x->'avatar'='null'::jsonb,'comunidad no revela logros privados';
 -- Omisión de cifras: lector preparado, escritura desactivada hasta completar el despliegue previo.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',c)::text,true);
 assert not (public.social_capacidades()->>'camposOpcionales')::boolean,'no activa omisiones al migrar';
 begin perform public.publicar(gen_random_uuid(),'entreno',now(),entreno);e:=null;exception when others then e:=sqlerrm;end;
 assert e='publicacion_no_valida','servidor conserva compatibilidad hasta activar';
 update public.social_configuracion set campos_opcionales=true;
 perform public.publicar(gen_random_uuid(),'entreno',now(),entreno);
 assert not has_table_privilege('authenticated','public.silencios','select'),'sin acceso directo';
 assert not has_function_privilege('anon','public.gestionar_comunidad(uuid,text,text,text)','execute'),'anon sin gestión';
 -- La suspensión no impide cerrar comunidades propias y retirar el perfil.
 perform public.crear_comunidad(gen_random_uuid(),'Comunidad para cerrar','');
 update public.perfiles set suspendido=true where user_id=c;
 select count(*) into n from public.comunidades_propias();assert n=1,'inventario propio aun suspendido';
 for x in select to_jsonb(z) from public.comunidades_propias() z loop perform public.borrar_comunidad((x->>'id')::uuid);end loop;
 perform public.borrar_perfil();assert not exists(select 1 from public.perfiles where user_id=c),'retira perfil suspendido sin comunidades';
 -- Borrar con avatar enlazado no deja un ciclo FK ni elimina la comunidad transferida.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 perform public.borrar_perfil();
 assert not exists(select 1 from public.perfiles where user_id=a),'borra perfil con avatar propio';
 assert exists(select 1 from public.comunidades where id=g and creador=b),'la comunidad transferida se conserva';
 assert not has_function_privilege('anon','public.comunidades_propias()','execute'),'inventario propio cerrado a anon';
 raise exception 'PRUEBAS_OK';
end;
$$;
