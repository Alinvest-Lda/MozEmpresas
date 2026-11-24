
-- F3.35: controlled replacement/revocation of the single partner portal user.
alter table public.partner_relationship_audit
  drop constraint if exists partner_relationship_audit_action_check;
alter table public.partner_relationship_audit
  add constraint partner_relationship_audit_action_check
  check (action = any (array[
    'CREATED','UPDATED','SUSPENDED','REACTIVATED','CLOSED',
    'CONTACT_DEACTIVATED','CONTACT_REACTIVATED','DELETED','ACCESS_REVOKED'
  ]));

create or replace function public.admin_partner_access_members_list()
returns table(
  account_id uuid,
  account_name text,
  member_id uuid,
  user_id uuid,
  full_name text,
  email text,
  member_role text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path to public, auth, pg_temp
as $function$
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_members pm
    where pm.user_id=auth.uid() and pm.active=true and pm.role='super_admin'
  ) then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select m.account_id,a.name,m.id,m.user_id,p.full_name,u.email,m.role,m.created_at
  from public.partner_account_members m
  join public.partner_accounts a on a.id=m.account_id
  join public.profiles p on p.id=m.user_id
  join auth.users u on u.id=m.user_id
  where m.active=true
  order by a.name;
end;
$function$;

create or replace function public.admin_partner_access_revoke(
  p_member_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path to public, auth, pg_temp
as $function$
declare
  v_member public.partner_account_members%rowtype;
  v_account_name text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_members pm
    where pm.user_id=auth.uid() and pm.active=true and pm.role='super_admin'
  ) then
    raise exception 'FORBIDDEN';
  end if;

  if p_member_id is null or p_reason is null
     or length(trim(p_reason)) < 8 or length(trim(p_reason)) > 500 then
    raise exception 'INVALID_ACCESS_REVOCATION';
  end if;

  select m.* into v_member
  from public.partner_account_members m
  where m.id=p_member_id and m.active=true
  for update;

  if v_member.id is null then
    raise exception 'PARTNER_ACCESS_NOT_FOUND';
  end if;

  select a.name into v_account_name
  from public.partner_accounts a
  where a.id=v_member.account_id
  for update;

  update public.partner_account_members
  set active=false,updated_at=now()
  where id=v_member.id and active=true;

  if not found then
    raise exception 'PARTNER_ACCESS_CHANGED';
  end if;

  insert into public.partner_relationship_audit(
    entity_type,entity_id,account_id,actor_user_id,action,before_state,after_state,reason
  ) values (
    'PARTNER_ACCOUNT',v_member.account_id, v_member.account_id,auth.uid(),'ACCESS_REVOKED',
    jsonb_build_object('member_id',v_member.id,'user_id',v_member.user_id,'role',v_member.role,'active',true),
    jsonb_build_object('member_id',v_member.id,'user_id',v_member.user_id,'role',v_member.role,'active',false),
    trim(p_reason)
  );

  return true;
end;
$function$;

revoke all on function public.admin_partner_access_members_list() from public,anon;
grant execute on function public.admin_partner_access_members_list() to authenticated,service_role;
revoke all on function public.admin_partner_access_revoke(uuid,text) from public,anon;
grant execute on function public.admin_partner_access_revoke(uuid,text) to authenticated,service_role;
