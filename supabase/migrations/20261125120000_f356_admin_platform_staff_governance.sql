-- F3.56: audited platform staff activation control with last-admin protection.
create table if not exists public.platform_staff_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  role text not null,
  active_from boolean not null,
  active_to boolean not null,
  reason text not null check (length(trim(reason)) between 8 and 500),
  created_at timestamptz not null default now()
);
create index if not exists platform_staff_audit_target_created_idx
  on public.platform_staff_audit_log(target_user_id, created_at desc);
alter table public.platform_staff_audit_log enable row level security;
revoke all on public.platform_staff_audit_log from public, anon, authenticated;
grant select on public.platform_staff_audit_log to authenticated;
drop policy if exists platform_staff_audit_super_admin_read on public.platform_staff_audit_log;
create policy platform_staff_audit_super_admin_read
  on public.platform_staff_audit_log for select to authenticated
  using (exists (
    select 1 from public.platform_members pm
    where pm.user_id = (select auth.uid()) and pm.active = true and pm.role = 'super_admin'
  ));

create or replace function public.prevent_platform_staff_audit_mutation()
returns trigger language plpgsql set search_path = pg_catalog, public, pg_temp as $$
begin
  raise exception 'PLATFORM_STAFF_AUDIT_IMMUTABLE';
end;
$$;
revoke all on function public.prevent_platform_staff_audit_mutation() from public, anon, authenticated;
drop trigger if exists platform_staff_audit_immutable on public.platform_staff_audit_log;
create trigger platform_staff_audit_immutable
  before update or delete on public.platform_staff_audit_log
  for each row execute function public.prevent_platform_staff_audit_mutation();

create or replace function public.admin_set_platform_staff_active(
  p_user_id uuid,
  p_active boolean,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_member public.platform_members%rowtype;
  v_active_admins integer;
  v_reason text := nullif(left(trim(coalesce(p_reason, '')), 500), '');
begin
  if v_actor is null or not exists (
    select 1 from public.platform_members pm
    where pm.user_id = v_actor and pm.active = true and pm.role = 'super_admin'
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_user_id is null or p_active is null or length(coalesce(v_reason, '')) < 8 then
    raise exception 'INVALID_STAFF_CHANGE' using errcode = '22023';
  end if;
  if p_user_id = v_actor and p_active = false then
    raise exception 'SELF_STAFF_REVOCATION_FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_member
  from public.platform_members
  where user_id = p_user_id
  for update;
  if not found then
    raise exception 'PLATFORM_STAFF_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_member.active = p_active then
    raise exception 'PLATFORM_STAFF_STATUS_UNCHANGED' using errcode = '23514';
  end if;

  if v_member.role = 'super_admin' and p_active = false then
    select count(*) into v_active_admins
    from public.platform_members pm
    join public.profiles p on p.id = pm.user_id
    where pm.active = true and pm.role = 'super_admin' and p.account_status = 'ACTIVE';
    if v_active_admins <= 1 then
      raise exception 'LAST_ACTIVE_SUPER_ADMIN_PROTECTED' using errcode = '23514';
    end if;
  end if;

  update public.platform_members
  set active = p_active
  where user_id = p_user_id and active = v_member.active;
  if not found then
    raise exception 'PLATFORM_STAFF_CHANGED' using errcode = '40001';
  end if;

  if not p_active then
    delete from auth.sessions where user_id = p_user_id;
  end if;

  insert into public.platform_staff_audit_log(
    actor_user_id, target_user_id, role, active_from, active_to, reason
  ) values (
    v_actor, p_user_id, v_member.role, v_member.active, p_active, v_reason
  );

  return jsonb_build_object(
    'user_id', p_user_id, 'role', v_member.role,
    'active_from', v_member.active, 'active_to', p_active
  );
end;
$$;
revoke all on function public.admin_set_platform_staff_active(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_platform_staff_active(uuid, boolean, text) to authenticated;
