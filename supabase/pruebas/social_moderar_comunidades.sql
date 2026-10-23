-- Tras 0026. Solo datos sintéticos: PRUEBAS_OK deshace todo.
do $$
declare
 adm uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
 g uuid:=gen_random_uuid(); g2 uuid:=gen_random_uuid(); g3 uuid:=gen_random_uuid(); e text; n int; d bigint; x jsonb;
begin
 insert into auth.users(id,email) values(adm,'modc-adm@appfit.test'),(a,'modc-a@appfit.test'),(b,'modc-b@appfit.test');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',adm)::text,true); perform public.crear_perfil('modc.admin',null,true);
 insert into public.administradores(user_id) values (adm);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true); perform public.crear_perfil('modc.ana',null,true);
 perform public.crear_comunidad(g,'Comunidad QA moderar','Una',false);
 perform public.crear_comunidad(g2,'Comunidad QA cerrar','Dos',false);
 perform public.crear_comunidad(g3,'Comunidad QA descartar','Tres',false);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true); perform public.crear_perfil('modc.beto',null,true);
 update public.perfiles set avisos_vistos=now()-interval '1 hour' where user_id=b;
 perform public.unirse_comunidad(g);
 perform public.denunciar('comunidad',g::text,'spam',null);
 perform public.denunciar('comunidad',g2::text,'acoso',null);
 perform public.denunciar('comunidad',g3::text,'otro',null);
 begin perform public.admin_resolver_denuncia(1,'cerrar'); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','sin ser administrador no se resuelve';
 begin perform public.admin_comunidades_suspendidas(); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','ni se listan las suspendidas';

 -- Suspender: deja de verse y se puede reactivar.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',adm)::text,true);
 select id into d from public.denuncias where objetivo=g;
 perform public.admin_resolver_denuncia(d,'suspender_comunidad');
 assert (select suspendida from public.comunidades where id=g),'suspendida';
 assert (select count(*) from public.admin_comunidades_suspendidas() where id=g)=1,'en la lista de suspendidas';
 assert (select revisada is not null and actuada is not null from public.denuncias where id=d),'revisada y actuada';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 select count(*) into n from public.comunidades('',true) c where c.id=g;
 assert n=0,'quien era miembro ya no la ve';
 x:=public.avisos();
 select count(*) into n from jsonb_array_elements(x->'lista') v where v->>'tipo'='denuncia' and v->>'nuevo'='true';
 assert n=1,'quien denunció recibe el aviso';
 assert not (x->'lista')::text ~ 'Comunidad QA','sin decir qué';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',adm)::text,true);
 perform public.admin_reactivar_comunidad(g);
 assert not (select suspendida from public.comunidades where id=g),'reactivada';
 begin perform public.admin_reactivar_comunidad(g); e:=null; exception when others then e:=sqlerrm; end;
 assert e='no_encontrado','reactivar dos veces no';

 -- Cerrar: se borra; descartar no avisa; las acciones de comunidad no valen para otra cosa.
 select id into d from public.denuncias where objetivo=g2;
 perform public.admin_resolver_denuncia(d,'cerrar');
 assert not exists(select 1 from public.comunidades where id=g2),'cerrada';
 select id into d from public.denuncias where objetivo=g3;
 begin perform public.admin_resolver_denuncia(d,'borrar'); e:=null; exception when others then e:=sqlerrm; end;
 assert e='accion_no_valida','una comunidad no se «borra» como una publicación';
 perform public.admin_resolver_denuncia(d,'descartar');
 assert (select actuada is null from public.denuncias where id=d),'descartar no actúa';
 assert exists(select 1 from public.comunidades where id=g3 and not suspendida),'y no toca la comunidad';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a)::text,true);
 perform public.denunciar('perfil','modc.beto','spam',null);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',adm)::text,true);
 select max(id) into d from public.denuncias where tipo='perfil';
 begin perform public.admin_resolver_denuncia(d,'suspender_comunidad'); e:=null; exception when others then e:=sqlerrm; end;
 assert e='accion_no_valida','suspender_comunidad solo con comunidades';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b)::text,true);
 select count(*) into n from jsonb_array_elements(public.avisos()->'lista') v where v->>'tipo'='denuncia';
 assert n=1,'un solo aviso agrupado (suspender y cerrar), no el descarte';
 raise exception 'PRUEBAS_OK';
end;
$$;
