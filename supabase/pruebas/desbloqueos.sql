-- Tras 0031. Solo datos sintéticos: PRUEBAS_OK deshace todo.
do $$
declare
 adm uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); e text; x record;
begin
 insert into auth.users(id,email) values(adm,'desb-adm@appfit.test'),(a,'desb-a@appfit.test'),(b,'desb-b@appfit.test');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',adm)::text,true); perform public.crear_perfil('desb.tinez','Tinez',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.crear_perfil('desb.ana','Ana',true);
 insert into public.administradores(user_id) values(adm);

 -- Nadie empieza desbloqueado, y quien no administra no desbloquea ni lista.
 assert not public.mi_desbloqueo(),'Ana empieza sin desbloquear';
 begin perform public.admin_desbloquear('desb.ana',true); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','Ana no se desbloquea a sí misma';
 begin perform public.admin_desbloqueados(); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','Ana no lista';

 -- El administrador desbloquea por alias (con mayúsculas y espacios), dos veces sin error, y la lista no lleva UUID.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',adm)::text,true);
 perform public.admin_desbloquear('  Desb.Ana ',true);
 perform public.admin_desbloquear('desb.ana',true);
 assert (select count(*) from public.desbloqueos where user_id=a and origen='manual' and por=adm)=1,'una fila manual';
 select * into x from public.admin_desbloqueados();
 assert x.alias='desb.ana' and x.nombre='Ana','listada';
 begin perform public.admin_desbloquear('nadie.aqui',true); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','alias desconocido';

 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 assert public.mi_desbloqueo(),'Ana desbloqueada';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 assert not public.mi_desbloqueo(),'Beto no (sin perfil)';
 perform set_config('request.jwt.claims','{}',true);
 assert not public.mi_desbloqueo(),'sin sesión, false';

 -- Quitarlo; una compra no se quita desde aquí.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',adm)::text,true);
 perform public.admin_desbloquear('desb.ana',false);
 assert not exists(select 1 from public.desbloqueos where user_id=a),'quitado';
 begin perform public.admin_desbloquear('desb.ana',false); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','quitar dos veces avisa';
 insert into public.desbloqueos(user_id,origen) values(a,'play');
 begin perform public.admin_desbloquear('desb.ana',false); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','una compra no se quita';
 assert exists(select 1 from public.desbloqueos where user_id=a and origen='play'),'la compra sigue';
 assert not exists(select 1 from public.admin_desbloqueados()),'la lista solo enseña los manuales';

 -- Borrar la cuenta borra su desbloqueo.
 delete from auth.users where id=a;
 assert not exists(select 1 from public.desbloqueos where user_id=a),'se va con la cuenta';

 assert not has_table_privilege('authenticated','public.desbloqueos','select'),'tabla cerrada';
 assert not has_table_privilege('anon','public.desbloqueos','select'),'tabla cerrada';
 assert not has_function_privilege('anon','public.mi_desbloqueo()','execute'),'anon no pregunta';
 raise exception 'PRUEBAS_OK';
end;
$$;
