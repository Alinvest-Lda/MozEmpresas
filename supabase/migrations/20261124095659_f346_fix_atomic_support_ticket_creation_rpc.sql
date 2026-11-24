-- F3.46: correct atomic support-ticket RPC field mapping.
create or replace function public.create_support_ticket_with_message(p_area text,p_subject text,p_business_id uuid,p_body text)
returns uuid language plpgsql security invoker set search_path=pg_catalog,public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_ticket_id uuid;
begin
 if v_actor is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='42501'; end if;
 if p_area not in ('Técnico','Comercial','Conta e acessos','Pagamentos e créditos','Publicidade','Serviços MozEmpresas') or length(btrim(coalesce(p_subject,''))) not between 3 and 180 or length(btrim(coalesce(p_body,''))) not between 10 and 5000 then raise exception 'INVALID_SUPPORT_TICKET_INPUT' using errcode='22023'; end if;
 insert into public.support_tickets(user_id,business_id,area,subject,status,priority) values(v_actor,p_business_id,btrim(p_area),btrim(p_subject),'OPEN','NORMAL') returning id into v_ticket_id;
 insert into public.support_messages(ticket_id,sender_user_id,sender_role,body) values(v_ticket_id,v_actor,'USER',btrim(p_body)); return v_ticket_id;
end $$;
revoke all on function public.create_support_ticket_with_message(text,text,uuid,text) from public,anon;
grant execute on function public.create_support_ticket_with_message(text,text,uuid,text) to authenticated;
