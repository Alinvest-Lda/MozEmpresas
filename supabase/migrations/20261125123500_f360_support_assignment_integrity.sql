-- F3.60: enforce eligible support assignees at the database boundary.
create or replace function public.guard_support_ticket_assignee()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
begin
  if new.assigned_to is not distinct from old.assigned_to then
    return new;
  end if;

  if new.assigned_to is not null and not exists (
    select 1
    from public.platform_members pm
    where pm.user_id = new.assigned_to
      and pm.active = true
      and pm.role = 'super_admin'
  ) then
    raise exception 'SUPPORT_ASSIGNEE_NOT_ACTIVE_SUPER_ADMIN'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;
revoke all on function public.guard_support_ticket_assignee() from public, anon, authenticated;
drop trigger if exists guard_support_ticket_assignee_trigger on public.support_tickets;
create trigger guard_support_ticket_assignee_trigger
before update of assigned_to on public.support_tickets
for each row execute function public.guard_support_ticket_assignee();
