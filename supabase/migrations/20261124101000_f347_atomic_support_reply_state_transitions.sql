-- F3.47: atomic support replies by ticket owner and platform backoffice.
create or replace function public.reply_to_support_ticket(p_ticket_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_status text; v_message_id uuid;
begin
 if v_actor is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='42501'; end if;
 if p_ticket_id is null or length(btrim(coalesce(p_body,''))) not between 1 and 5000 then raise exception 'INVALID_SUPPORT_REPLY' using errcode='22023'; end if;
 select t.status into v_status from public.support_tickets t where t.id=p_ticket_id and t.user_id=v_actor for update;
 if not found then raise exception 'SUPPORT_TICKET_NOT_FOUND' using errcode='42501'; end if;
 if v_status='CLOSED' then raise exception 'SUPPORT_TICKET_CLOSED' using errcode='23514'; end if;
 update public.support_tickets set status=case when v_status='WAITING_USER' then 'IN_PROGRESS' when v_status='RESOLVED' then 'OPEN' else v_status end,closed_at=null,updated_at=now() where id=p_ticket_id and user_id=v_actor;
 insert into public.support_messages(ticket_id,sender_user_id,sender_role,body) values(p_ticket_id,v_actor,'USER',btrim(p_body)) returning id into v_message_id; return v_message_id;
end $$;
revoke all on function public.reply_to_support_ticket(uuid,text) from public,anon; grant execute on function public.reply_to_support_ticket(uuid,text) to authenticated;
create or replace function public.reply_to_support_ticket_as_staff(p_ticket_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_status text; v_message_id uuid;
begin
 if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_ticket_id is null or length(btrim(coalesce(p_body,''))) not between 1 and 5000 then raise exception 'INVALID_SUPPORT_REPLY' using errcode='22023'; end if;
 select t.status into v_status from public.support_tickets t where t.id=p_ticket_id for update;
 if not found then raise exception 'SUPPORT_TICKET_NOT_FOUND' using errcode='P0002'; end if;
 if v_status in ('CLOSED','RESOLVED') then raise exception 'SUPPORT_TICKET_NOT_REPLYABLE' using errcode='23514'; end if;
 update public.support_tickets set status='WAITING_USER',updated_at=now() where id=p_ticket_id;
 insert into public.support_messages(ticket_id,sender_user_id,sender_role,body) values(p_ticket_id,v_actor,'BACKOFFICE',btrim(p_body)) returning id into v_message_id; return v_message_id;
end $$;
revoke all on function public.reply_to_support_ticket_as_staff(uuid,text) from public,anon; grant execute on function public.reply_to_support_ticket_as_staff(uuid,text) to authenticated;
