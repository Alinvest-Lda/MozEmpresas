-- F3.72: service request status history and notifications are committed atomically.
create table if not exists public.service_request_status_events (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  from_status text,
  to_status text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_service_request_status_events_request
  on public.service_request_status_events(service_request_id, created_at asc);

alter table public.service_request_status_events enable row level security;
drop policy if exists "service request participants read status history" on public.service_request_status_events;
create policy "service request participants read status history"
  on public.service_request_status_events for select to authenticated
  using (
    exists (
      select 1 from public.service_requests r
      where r.id = service_request_status_events.service_request_id
        and (
          r.requester_user_id = (select auth.uid())
          or exists (
            select 1 from public.businesses b
            where b.id = r.requester_business_id and b.owner_id = (select auth.uid())
          )
          or exists (
            select 1 from public.business_members bm
            where bm.business_id = r.requester_business_id and bm.user_id = (select auth.uid())
          )
        )
    )
  );

revoke all on public.service_request_status_events from public, anon, authenticated;
grant select on public.service_request_status_events to authenticated;

create or replace function public.capture_service_request_status_event_f372()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_service_name text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  insert into public.service_request_status_events (
    service_request_id, actor_user_id, from_status, to_status
  ) values (
    new.id, auth.uid(), old.status, new.status
  );

  if new.requester_user_id is not null and new.requester_user_id is distinct from auth.uid() then
    select name into v_service_name
    from public.platform_services
    where id = new.service_id;

    insert into public.notifications (
      user_id, type, title, body, resource_type, resource_id
    ) values (
      new.requester_user_id,
      'SERVICE_REQUEST_UPDATED',
      'Pedido de serviço actualizado',
      'O pedido de ' || coalesce(v_service_name, 'serviço') ||
        ' passou para o estado ' || lower(replace(new.status, '_', ' ')) || '.',
      'SERVICE_REQUEST',
      new.id
    );
  end if;

  return new;
end;
$$;

revoke all on function public.capture_service_request_status_event_f372() from public, anon, authenticated;

drop trigger if exists trg_capture_service_request_status_event_f372 on public.service_requests;
create trigger trg_capture_service_request_status_event_f372
after update of status on public.service_requests
for each row
execute function public.capture_service_request_status_event_f372();
