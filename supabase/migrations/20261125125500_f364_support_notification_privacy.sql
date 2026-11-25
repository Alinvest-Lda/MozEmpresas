-- F3.64: keep private support-message content out of notification previews.
-- Notifications only announce activity; the authenticated ticket view remains the message channel.
create or replace function public.notify_support_message_recipient()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_ticket_user uuid;
  v_assigned_to uuid;
  v_subject text;
  v_assignee_active boolean := false;
begin
  select t.user_id,t.assigned_to,t.subject
    into v_ticket_user,v_assigned_to,v_subject
  from public.support_tickets t
  where t.id=new.ticket_id;
  if v_ticket_user is null then return new; end if;

  if new.sender_role='BACKOFFICE' then
    if v_ticket_user is distinct from new.sender_user_id then
      insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
      values(v_ticket_user,'SUPPORT','Nova resposta do backoffice',
        'O backoffice respondeu ao atendimento "' || left(coalesce(v_subject,'Suporte'),120) || '". Abra o atendimento para consultar a mensagem.',
        'SUPPORT_TICKET',new.ticket_id);
    end if;
  elsif new.sender_role='USER' then
    if v_assigned_to is not null then
      select exists(
        select 1 from public.platform_members pm
        where pm.user_id=v_assigned_to and pm.active=true and pm.role='super_admin'
      ) into v_assignee_active;
    end if;
    if v_assignee_active and v_assigned_to is distinct from new.sender_user_id then
      insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
      values(v_assigned_to,'SUPPORT','Nova mensagem num atendimento atribuído',
        'O utilizador respondeu ao atendimento "' || left(coalesce(v_subject,'Suporte'),120) || '". Abra o atendimento para consultar a mensagem.',
        'SUPPORT_TICKET',new.ticket_id);
    else
      insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
      select pm.user_id,'SUPPORT','Novo atendimento ou resposta por tratar',
        'Existe uma nova mensagem no atendimento "' || left(coalesce(v_subject,'Suporte'),120) || '". Abra o atendimento para consultar a mensagem.',
        'SUPPORT_TICKET',new.ticket_id
      from public.platform_members pm
      where pm.active=true and pm.role='super_admin'
        and pm.user_id is distinct from new.sender_user_id
        and pm.user_id is distinct from v_ticket_user;
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function public.notify_support_message_recipient() from public,anon,authenticated;
