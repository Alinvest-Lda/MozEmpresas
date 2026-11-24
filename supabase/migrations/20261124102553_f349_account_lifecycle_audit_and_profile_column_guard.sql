-- F3.49: account governance, audit trail, and protected self-service status.
create table if not exists public.platform_account_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('ACCOUNT_SUSPENDED','ACCOUNT_REACTIVATED','ACCOUNT_DELETION_REQUESTED','ACCOUNT_DELETION_REVIEWED','PASSWORD_RECOVERY_REQUESTED')),
  previous_status text,
  new_status text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists platform_account_audit_target_created_idx on public.platform_account_audit_log(target_user_id,created_at desc);
create index if not exists platform_account_audit_actor_created_idx on public.platform_account_audit_log(actor_user_id,created_at desc);
alter table public.platform_account_audit_log enable row level security;
revoke all on public.platform_account_audit_log from public,anon,authenticated;
grant select on public.platform_account_audit_log to authenticated;
drop policy if exists platform_account_audit_super_admin_read on public.platform_account_audit_log;
create policy platform_account_audit_super_admin_read on public.platform_account_audit_log for select to authenticated
using (exists(select 1 from public.platform_members pm where pm.user_id=(select auth.uid()) and pm.active=true and pm.role='super_admin'));
create or replace function public.prevent_platform_account_audit_mutation()
returns trigger language plpgsql set search_path=pg_catalog,public,pg_temp as $$
begin raise exception 'PLATFORM_ACCOUNT_AUDIT_IMMUTABLE'; end $$;
revoke all on function public.prevent_platform_account_audit_mutation() from public,anon,authenticated;
drop trigger if exists platform_account_audit_immutable on public.platform_account_audit_log;
create trigger platform_account_audit_immutable before update or delete on public.platform_account_audit_log
for each row execute function public.prevent_platform_account_audit_mutation();

revoke update on public.profiles from authenticated;
grant update(full_name,location,website,bio) on public.profiles to authenticated;

create or replace function public.request_own_account_status(p_status text,p_reason text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_old text; v_reason text:=nullif(left(trim(coalesce(p_reason,'')),500),''); v_action text;
begin
 if v_user is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='42501'; end if;
 if p_status not in ('INACTIVE','DELETED') then raise exception 'INVALID_ACCOUNT_STATUS' using errcode='22023'; end if;
 select account_status into v_old from public.profiles where id=v_user for update;
 if not found then raise exception 'PROFILE_NOT_FOUND' using errcode='P0002'; end if;
 if v_old='DELETED' then raise exception 'ACCOUNT_DELETION_ALREADY_REQUESTED' using errcode='23514'; end if;
 update public.profiles set account_status=p_status,
   deactivated_at=case when p_status='INACTIVE' then now() else deactivated_at end,
   deletion_requested_at=case when p_status='DELETED' then now() else deletion_requested_at end,
   updated_at=now() where id=v_user;
 v_action:=case when p_status='INACTIVE' then 'ACCOUNT_SUSPENDED' else 'ACCOUNT_DELETION_REQUESTED' end;
 insert into public.platform_account_audit_log(actor_user_id,target_user_id,action,previous_status,new_status,reason)
 values(v_user,v_user,v_action,v_old,p_status,v_reason);
 return jsonb_build_object('user_id',v_user,'previous_status',v_old,'new_status',p_status);
end $$;
revoke all on function public.request_own_account_status(text,text) from public,anon;
grant execute on function public.request_own_account_status(text,text) to authenticated;

create or replace function public.admin_set_account_status(p_user_id uuid,p_status text,p_reason text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_old text; v_active_admins integer; v_target_is_admin boolean; v_reason text:=nullif(left(trim(coalesce(p_reason,'')),500),''); v_action text;
begin
 if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin') then
   raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_user_id is null or p_user_id=v_actor then raise exception 'SELF_ACCOUNT_CHANGE_FORBIDDEN' using errcode='42501'; end if;
 if p_status not in ('ACTIVE','INACTIVE','DELETED') then raise exception 'INVALID_ACCOUNT_STATUS' using errcode='22023'; end if;
 if length(coalesce(v_reason,''))<8 then raise exception 'REASON_REQUIRED' using errcode='22023'; end if;
 select account_status into v_old from public.profiles where id=p_user_id for update;
 if not found then raise exception 'PROFILE_NOT_FOUND' using errcode='P0002'; end if;
 select exists(select 1 from public.platform_members where user_id=p_user_id and active=true and role='super_admin') into v_target_is_admin;
 if v_target_is_admin and p_status<>'ACTIVE' then
   select count(*) into v_active_admins from public.platform_members pm join public.profiles p on p.id=pm.user_id
   where pm.active=true and pm.role='super_admin' and p.account_status='ACTIVE';
   if v_active_admins<=1 then raise exception 'LAST_ACTIVE_SUPER_ADMIN_PROTECTED' using errcode='23514'; end if;
 end if;
 if v_old=p_status then raise exception 'ACCOUNT_STATUS_UNCHANGED' using errcode='23514'; end if;
 update public.profiles set account_status=p_status,
   deactivated_at=case when p_status='INACTIVE' then coalesce(deactivated_at,now()) when p_status='ACTIVE' then null else deactivated_at end,
   deletion_requested_at=case when p_status='DELETED' then coalesce(deletion_requested_at,now()) when p_status='ACTIVE' then null else deletion_requested_at end,
   updated_at=now() where id=p_user_id;
 v_action:=case when p_status='ACTIVE' then 'ACCOUNT_REACTIVATED' when p_status='INACTIVE' then 'ACCOUNT_SUSPENDED' else 'ACCOUNT_DELETION_REVIEWED' end;
 insert into public.platform_account_audit_log(actor_user_id,target_user_id,action,previous_status,new_status,reason)
 values(v_actor,p_user_id,v_action,v_old,p_status,v_reason);
 return jsonb_build_object('user_id',p_user_id,'previous_status',v_old,'new_status',p_status);
end $$;
revoke all on function public.admin_set_account_status(uuid,text,text) from public,anon;
grant execute on function public.admin_set_account_status(uuid,text,text) to authenticated;