-- F3.37: operational audit history for support tickets and opportunity applications.
alter table public.support_tickets
  add column if not exists assigned_to uuid references auth.users(id) on delete set null;
create index if not exists support_tickets_assigned_updated_idx
  on public.support_tickets (assigned_to, updated_at desc) where assigned_to is not null;

create table if not exists public.support_ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('CREATED','STATUS_CHANGED','PRIORITY_CHANGED','ASSIGNED','UNASSIGNED')),
  old_status text, new_status text, old_priority text, new_priority text,
  old_assigned_to uuid, new_assigned_to uuid,
  created_at timestamptz not null default now()
);
create index if not exists support_ticket_events_ticket_created_idx
  on public.support_ticket_events(ticket_id, created_at);

create table if not exists public.opportunity_application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.opportunity_applications(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('SUBMITTED','STATUS_CHANGED')),
  old_status text, new_status text not null,
  created_at timestamptz not null default now()
);
create index if not exists opportunity_application_events_application_created_idx
  on public.opportunity_application_events(application_id, created_at);

alter table public.support_ticket_events enable row level security;
alter table public.opportunity_application_events enable row level security;
grant select on public.support_ticket_events, public.opportunity_application_events to authenticated, service_role;
revoke insert, update, delete on public.support_ticket_events, public.opportunity_application_events from anon, authenticated;
grant all on public.support_ticket_events, public.opportunity_application_events to service_role;

drop policy if exists "support ticket events owner or super admin read" on public.support_ticket_events;
create policy "support ticket events owner or super admin read"
on public.support_ticket_events for select to authenticated using (
  exists (select 1 from public.support_tickets t where t.id = support_ticket_events.ticket_id
    and (t.user_id = (select auth.uid()) or exists (
      select 1 from public.platform_members pm where pm.user_id = (select auth.uid())
      and pm.active = true and pm.role = 'super_admin'
    )))
);

drop policy if exists "opportunity application events participant read" on public.opportunity_application_events;
create policy "opportunity application events participant read"
on public.opportunity_application_events for select to authenticated using (
  exists (select 1 from public.opportunity_applications a
    join public.opportunities o on o.id = a.opportunity_id
    where a.id = opportunity_application_events.application_id
    and (a.applicant_user_id = (select auth.uid()) or o.owner_id = (select auth.uid())
      or exists (select 1 from public.platform_members pm where pm.user_id = (select auth.uid())
        and pm.active = true and pm.role = 'super_admin')))
);

create or replace function public.capture_support_ticket_event()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.support_ticket_events(ticket_id,actor_user_id,event_type,new_status,new_priority,new_assigned_to)
    values(new.id,v_actor,'CREATED',new.status,new.priority,new.assigned_to);
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into public.support_ticket_events(ticket_id,actor_user_id,event_type,old_status,new_status)
    values(new.id,v_actor,'STATUS_CHANGED',old.status,new.status);
  end if;
  if new.priority is distinct from old.priority then
    insert into public.support_ticket_events(ticket_id,actor_user_id,event_type,old_priority,new_priority)
    values(new.id,v_actor,'PRIORITY_CHANGED',old.priority,new.priority);
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into public.support_ticket_events(ticket_id,actor_user_id,event_type,old_assigned_to,new_assigned_to)
    values(new.id,v_actor,case when new.assigned_to is null then 'UNASSIGNED' else 'ASSIGNED' end,old.assigned_to,new.assigned_to);
  end if;
  return new;
end;
$$;
revoke all on function public.capture_support_ticket_event() from public, anon, authenticated;
drop trigger if exists capture_support_ticket_event_trigger on public.support_tickets;
create trigger capture_support_ticket_event_trigger after insert or update of status,priority,assigned_to
on public.support_tickets for each row execute function public.capture_support_ticket_event();

create or replace function public.capture_opportunity_application_event()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_title text; v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.opportunity_application_events(application_id,actor_user_id,event_type,new_status)
    values(new.id,v_actor,'SUBMITTED',new.status);
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into public.opportunity_application_events(application_id,actor_user_id,event_type,old_status,new_status)
    values(new.id,v_actor,'STATUS_CHANGED',old.status,new.status);
    select o.title into v_title from public.opportunities o where o.id = new.opportunity_id;
    if new.applicant_user_id is not null then
      insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
      values(new.applicant_user_id,'OPPORTUNITY_APPLICATION_STATUS','Actualização da sua candidatura',
        'O estado da candidatura à oportunidade "' || left(coalesce(v_title,'oportunidade'),120) || '" foi alterado para ' || new.status || '.',
        'OPPORTUNITY_APPLICATION',new.id);
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.capture_opportunity_application_event() from public, anon, authenticated;
drop trigger if exists capture_opportunity_application_event_trigger on public.opportunity_applications;
create trigger capture_opportunity_application_event_trigger after insert or update of status
on public.opportunity_applications for each row execute function public.capture_opportunity_application_event();
