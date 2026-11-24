-- F3.67: audit hardening for institutional action plans.
-- Direct authenticated inserts into history are revoked; only the protected trigger may write.
drop policy if exists partner_rel_action_history_superadmin_insert on public.partner_relationship_action_history;
revoke insert on public.partner_relationship_action_history from authenticated;
create or replace function public.partner_relationship_action_history_capture_f365()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if tg_op = 'INSERT' then
    insert into public.partner_relationship_action_history(action_id,account_id,actor_user_id,event_type,snapshot,note)
    values(new.id,new.account_id,auth.uid(),'CREATED',to_jsonb(new),new.details);
    return new;
  else
    insert into public.partner_relationship_action_history(action_id,account_id,actor_user_id,event_type,snapshot,note)
    values(new.id,new.account_id,auth.uid(),
      case
        when old.status is distinct from new.status then 'STATUS_CHANGED'
        when old.owner_user_id is distinct from new.owner_user_id then 'OWNER_CHANGED'
        when old.due_at is distinct from new.due_at then 'DUE_DATE_CHANGED'
        when old.decision is distinct from new.decision then 'DECISION_CHANGED'
        else 'UPDATED'
      end,to_jsonb(new),coalesce(new.resolution_note,new.details));
    return new;
  end if;
end;
$$;
revoke execute on function public.partner_relationship_action_history_capture_f365() from public,anon,authenticated;
