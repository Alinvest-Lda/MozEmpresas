-- F3.73: notify the other side of every support conversation message.
create or replace function public.notify_support_message_recipient_f373()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_ticket public.support_tickets%rowtype;
  v_preview text;
begin
  select * into v_ticket
  from public.support_tickets
  where id = new.ticket_id;

  if not found then
    return new;
  end if;

  v_preview := left(regexp_replace(btrim(coalesce(new.body, '')), '\s+', ' ', 'g'), 180);

  if new.sender_role = 'BACKOFFICE' then
    if v_ticket.user_id is not null and v_ticket.user_id <> new.sender_user_id then
      insert into public.notifications(user_id, type, title, body, resource_type, resource_id)
      values (
        v_ticket.user_id,
        'SUPPORT_MESSAGE_RECEIVED',
        'Nova resposta do suporte',
        'O backoffice respondeu ao atendimento "' || left(v_ticket.subject, 120) || '". ' || v_preview,
        'SUPPORT_TICKET',
        v_ticket.id
      );
    end if;
  elsif new.sender_role = 'USER' then
    if v_ticket.assigned_to is not null then
      insert into public.notifications(user_id, type, title, body, resource_type, resource_id)
      select pm.user_id, 'SUPPORT_MESSAGE_RECEIVED', 'Nova mensagem num atendimento',
        'O utilizador respondeu ao atendimento "' || left(v_ticket.subject, 120) || '". ' || v_preview,
        'SUPPORT_TICKET', v_ticket.id
      from public.platform_members pm
      where pm.user_id = v_ticket.assigned_to
        and pm.active = true
        and pm.role = 'super_admin'
        and pm.user_id <> new.sender_user_id;
    else
      insert into public.notifications(user_id, type, title, body, resource_type, resource_id)
      select pm.user_id, 'SUPPORT_MESSAGE_RECEIVED', 'Novo atendimento / resposta recebida',
        'Existe uma nova mensagem no atendimento "' || left(v_ticket.subject, 120) || '". ' || v_preview,
        'SUPPORT_TICKET', v_ticket.id
      from public.platform_members pm
      where pm.active = true
        and pm.role = 'super_admin'
        and pm.user_id <> new.sender_user_id;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.notify_support_message_recipient_f373() from public, anon, authenticated;

drop trigger if exists trg_notify_support_message_recipient_f373 on public.support_messages;
create trigger trg_notify_support_message_recipient_f373
after insert on public.support_messages
for each row
execute function public.notify_support_message_recipient_f373();
