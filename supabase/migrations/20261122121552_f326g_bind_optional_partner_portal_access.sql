
alter table private.partner_access_grants add column if not exists account_id uuid references public.partner_accounts(id) on delete restrict;
create index if not exists partner_access_grants_account_idx on private.partner_access_grants(account_id);

create or replace function public.partner_access_create(p_email text,p_token_hash text,p_expires_at timestamptz,p_account_id uuid default null)
returns uuid language plpgsql security definer set search_path=public,private as $$
declare v_id uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.platform_members pm where pm.user_id=auth.uid() and pm.active=true and pm.role='super_admin') then raise exception 'FORBIDDEN'; end if;
 if p_account_id is not null and not exists(select 1 from public.partner_accounts a where a.id=p_account_id and a.status='ACTIVE' and a.portal_enabled=true) then raise exception 'PARTNER_PORTAL_DISABLED_OR_UNAVAILABLE'; end if;
 insert into private.partner_access_grants(email,token_hash,created_by,expires_at,account_id)
 values(lower(trim(p_email)),p_token_hash,auth.uid(),p_expires_at,p_account_id) returning id into v_id;
 return v_id;
end; $$;
revoke all on function public.partner_access_create(text,text,timestamptz,uuid) from public,anon;
grant execute on function public.partner_access_create(text,text,timestamptz,uuid) to authenticated;

create or replace function public.partner_access_create(p_email text,p_token_hash text,p_expires_at timestamptz)
returns uuid language sql security definer set search_path=public,private as $$
 select public.partner_access_create(p_email,p_token_hash,p_expires_at,null);
$$;
revoke all on function public.partner_access_create(text,text,timestamptz) from public,anon;
grant execute on function public.partner_access_create(text,text,timestamptz) to authenticated;

create or replace function public.partner_access_claim(p_token_hash text,p_user_id uuid)
returns boolean language plpgsql security definer set search_path=public,private as $$
declare v_email text; v_name text; v_account uuid; v_grant_account uuid;
begin
 if auth.uid() is null or p_user_id is distinct from auth.uid() then raise exception 'FORBIDDEN'; end if;
 select g.email,g.account_id into v_email,v_grant_account from private.partner_access_grants g
 where g.token_hash=p_token_hash and g.status='PENDING' and g.expires_at>now() for update;
 if v_email is null then raise exception 'INVALID_OR_EXPIRED_ACCESS'; end if;
 if not exists(select 1 from auth.users u where u.id=p_user_id and lower(u.email)=lower(v_email)) then raise exception 'EMAIL_MISMATCH'; end if;
 select coalesce(nullif(trim(raw_user_meta_data->>'full_name'),''),split_part(email,'@',1)) into v_name from auth.users where id=p_user_id;
 insert into public.profiles(id,full_name,user_type) values(p_user_id,v_name,'parceiro')
 on conflict(id) do update set user_type='parceiro',full_name=excluded.full_name;
 if v_grant_account is not null then
  select a.id into v_account from public.partner_accounts a where a.id=v_grant_account and a.status='ACTIVE' and a.portal_enabled=true for update;
  if v_account is null then raise exception 'PARTNER_PORTAL_DISABLED_OR_UNAVAILABLE'; end if;
  if exists(select 1 from public.partner_account_members m where m.user_id=p_user_id and m.account_id<>v_account and m.active=true) then raise exception 'PARTNER_ACCOUNT_ALREADY_ASSIGNED'; end if;
  insert into public.partner_account_members(account_id,user_id,role,active) values(v_account,p_user_id,'manager',true)
  on conflict(account_id,user_id) do update set active=true,updated_at=now();
 else
  select m.account_id into v_account from public.partner_account_members m where m.user_id=p_user_id and m.active=true limit 1;
  if v_account is null then
   insert into public.partner_accounts(name,operating_model,portal_enabled) values(v_name,'SELF_SERVICE',true) returning id into v_account;
   insert into public.partner_account_members(account_id,user_id,role,active) values(v_account,p_user_id,'owner',true);
  end if;
 end if;
 update private.partner_access_grants set status='ACCEPTED',accepted_user_id=p_user_id,accepted_at=now() where token_hash=p_token_hash and status='PENDING';
 return true;
end; $$;
revoke all on function public.partner_access_claim(text,uuid) from public,anon;
grant execute on function public.partner_access_claim(text,uuid) to authenticated;

create or replace function public.current_partner_account_id()
returns uuid language sql stable security definer set search_path=public as $$
 with eligible as (
  select m.account_id from public.partner_account_members m join public.partner_accounts a on a.id=m.account_id
  join public.profiles p on p.id=m.user_id
  where m.user_id=auth.uid() and auth.uid() is not null and m.active=true
   and a.status='ACTIVE' and a.portal_enabled=true and p.user_type='parceiro' and p.account_status='ACTIVE'
 )
 select (array_agg(account_id))[1] from eligible having count(*)=1;
$$;
revoke all on function public.current_partner_account_id() from public,anon;
grant execute on function public.current_partner_account_id() to authenticated;

create or replace function public.partner_account_context()
returns table(account_id uuid,account_name text,account_status text,member_role text)
language sql stable security definer set search_path=public as $$
 with eligible as (
  select a.id,a.name,a.status,m.role from public.partner_accounts a join public.partner_account_members m on m.account_id=a.id
  join public.profiles p on p.id=m.user_id
  where m.user_id=auth.uid() and auth.uid() is not null and m.active=true
   and a.status='ACTIVE' and a.portal_enabled=true and p.user_type='parceiro' and p.account_status='ACTIVE'
 )
 select e.id,e.name,e.status,e.role from eligible e where (select count(*) from eligible)=1;
$$;
revoke all on function public.partner_account_context() from public,anon;
grant execute on function public.partner_account_context() to authenticated;
