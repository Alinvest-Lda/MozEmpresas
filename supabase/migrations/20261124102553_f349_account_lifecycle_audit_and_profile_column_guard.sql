-- F3.49: account lifecycle audit, immutable event history, and profile status column guard.
create table if not exists public.account_admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid not null,
  action text not null check (action in (
    'SELF_DEACTIVATED','SELF_DELETION_REQUESTED','ADMIN_SUSPENDED','ADMIN_REACTIVATED',
    'ADMIN_DELETION_REQUESTED','ADMIN_DELETION_REQUEST_CANCELLED'
  )),
  status_from text,
  status_to text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists account_admin_audit_target_created_idx on public.account_admin_audit_log(target_user_id,created_at desc);
create index if not exists account_admin_audit_actor_created_idx on public.account_admin_audit_log(actor_user_id,created_at desc);
alter table public.account_admin_audit_log enable row level security;
revoke all on public.account_admin_audit_log from public,anon,authenticated;
grant all on public.account_admin_audit_log to service_role;

create or replace function public.prevent_account_admin_audit_mutation()
returns trigger language plpgsql set search_path=pg_catalog,public,pg_temp as $$
begin raise exception 'ACCOUNT_ADMIN_AUDIT_IMMUTABLE'; end $$;
revoke all on function public.prevent_account_admin_audit_mutation() from public,anon,authenticated;
drop trigger if exists account_admin_audit_immutable on public.account_admin_audit_log;
create trigger account_admin_audit_immutable before update or delete on public.account_admin_audit_log
for each row execute function public.prevent_account_admin_audit_mutation();

create or replace function public.request_own_account_status(p_status text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,auth,pg_temp as $$
declare v_user_id uuid:=auth.uid(); v_old_status text; v_action text;
begin
 if v_user_id is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='42501'; end if;
 if p_status not in ('INACTIVE','DELETED') then raise exception 'INVALID_ACCOUNT_STATUS' using errcode='22023'; end if;
 select account_status into v_old_status from public.profiles where id=v_user_id for update;
 if not found then raise exception 'PROFILE_NOT_FOUND' using errcode='P0002'; end if;
 if v_old_status='DELETED' then raise exception 'DELETION_ALREADY_REQUESTED' using errcode='23514'; end if;
 update public.profiles set account_status=p_status,
   deactivated_at=case when p_status='INACTIVE' then now() else deactivated_at end,
   deletion_requested_at=case when p_status='DELETED' then now() else deletion_requested_at end,
   updated_at=now() where id=v_user_id;
 v_action:=case when p_status='INACTIVE' then 'SELF_DEACTIVATED' else 'SELF_DELETION_REQUESTED' end;
 insert into public.account_admin_audit_log(actor_user_id,target_user_id,action,status_from,status_to)
 values(v_user_id,v_user_id,v_action,v_old_status,p_status);
 return jsonb_build_object('user_id',v_user_id,'status_from',v_old_status,'status_to',p_status);
end $$;
revoke all on function public.request_own_account_status(text) from public,anon;
grant execute on function public.request_own_account_status(text) to authenticated,service_role;

revoke update on public.profiles from authenticated;
grant update(full_name,location,website,bio) on public.profiles to authenticated;
