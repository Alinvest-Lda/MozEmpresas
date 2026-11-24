-- F3.56: Super Admin governance for business ownership, visibility, archive and audit.
create table if not exists public.business_admin_audit_log (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 actor_user_id uuid references auth.users(id) on delete set null,
 action text not null check (action in ('OWNERSHIP_TRANSFERRED','VISIBILITY_CHANGED','BUSINESS_ARCHIVED','BUSINESS_RESTORED')),
 old_owner_id uuid,new_owner_id uuid,old_is_public boolean,new_is_public boolean,
 old_archived_at timestamptz,new_archived_at timestamptz,
 reason text not null check (length(trim(reason)) between 8 and 500),
 metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now()
);
create index if not exists business_admin_audit_log_business_created_idx on public.business_admin_audit_log(business_id,created_at desc);
create index if not exists business_admin_audit_log_actor_created_idx on public.business_admin_audit_log(actor_user_id,created_at desc);
alter table public.business_admin_audit_log enable row level security;
revoke all on public.business_admin_audit_log from public,anon,authenticated;
grant select,insert on public.business_admin_audit_log to service_role;
create or replace function public.guard_business_admin_audit_immutable()
returns trigger language plpgsql set search_path=pg_catalog,public as $$ begin raise exception 'BUSINESS_ADMIN_AUDIT_IMMUTABLE'; end $$;
revoke all on function public.guard_business_admin_audit_immutable() from public,anon,authenticated;
drop trigger if exists business_admin_audit_immutable on public.business_admin_audit_log;
create trigger business_admin_audit_immutable before update or delete on public.business_admin_audit_log for each row execute function public.guard_business_admin_audit_immutable();
create unique index if not exists business_members_one_owner_per_business_idx on public.business_members(business_id) where role='owner';

create or replace function public.admin_transfer_business_ownership(p_business_id uuid,p_new_owner_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,auth,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_business public.businesses; v_old_owner uuid; v_new_name text; v_reason text:=nullif(trim(coalesce(p_reason,'')),'');
begin
 if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_business_id is null or p_new_owner_id is null or length(coalesce(v_reason,''))<8 or length(v_reason)>500 then raise exception 'INVALID_TRANSFER' using errcode='22023'; end if;
 select * into v_business from public.businesses where id=p_business_id for update;
 if not found then raise exception 'BUSINESS_NOT_FOUND' using errcode='P0002'; end if;
 if v_business.archived_at is not null then raise exception 'BUSINESS_ARCHIVED' using errcode='23514'; end if;
 v_old_owner:=v_business.owner_id;
 if v_old_owner=p_new_owner_id then raise exception 'OWNER_UNCHANGED' using errcode='23514'; end if;
 select p.full_name into v_new_name from public.profiles p where p.id=p_new_owner_id and p.account_status='ACTIVE' for share;
 if not found then raise exception 'NEW_OWNER_NOT_ACTIVE' using errcode='23514'; end if;
 update public.businesses set owner_id=p_new_owner_id,updated_at=now() where id=p_business_id;
 delete from public.business_members where business_id=p_business_id and user_id=v_old_owner and role='owner';
 insert into public.business_members(business_id,user_id,role) values(p_business_id,p_new_owner_id,'owner')
 on conflict(business_id,user_id) do update set role='owner';
 insert into public.business_admin_audit_log(business_id,actor_user_id,action,old_owner_id,new_owner_id,old_is_public,new_is_public,old_archived_at,new_archived_at,reason,metadata)
 values(p_business_id,v_actor,'OWNERSHIP_TRANSFERRED',v_old_owner,p_new_owner_id,v_business.is_public,v_business.is_public,v_business.archived_at,v_business.archived_at,v_reason,jsonb_build_object('new_owner_name',v_new_name));
 return jsonb_build_object('business_id',p_business_id,'old_owner_id',v_old_owner,'new_owner_id',p_new_owner_id);
end $$;
revoke all on function public.admin_transfer_business_ownership(uuid,uuid,text) from public,anon;
grant execute on function public.admin_transfer_business_ownership(uuid,uuid,text) to authenticated;

create or replace function public.admin_set_business_visibility(p_business_id uuid,p_is_public boolean,p_reason text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,auth,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_business public.businesses; v_reason text:=nullif(trim(coalesce(p_reason,'')),'');
begin
 if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_business_id is null or p_is_public is null or length(coalesce(v_reason,''))<8 or length(v_reason)>500 then raise exception 'INVALID_VISIBILITY_CHANGE' using errcode='22023'; end if;
 select * into v_business from public.businesses where id=p_business_id for update;
 if not found then raise exception 'BUSINESS_NOT_FOUND' using errcode='P0002'; end if;
 if v_business.archived_at is not null then raise exception 'BUSINESS_ARCHIVED' using errcode='23514'; end if;
 if v_business.is_public=p_is_public then raise exception 'VISIBILITY_UNCHANGED' using errcode='23514'; end if;
 update public.businesses set is_public=p_is_public,updated_at=now() where id=p_business_id;
 insert into public.business_admin_audit_log(business_id,actor_user_id,action,old_owner_id,new_owner_id,old_is_public,new_is_public,old_archived_at,new_archived_at,reason)
 values(p_business_id,v_actor,'VISIBILITY_CHANGED',v_business.owner_id,v_business.owner_id,v_business.is_public,p_is_public,v_business.archived_at,v_business.archived_at,v_reason);
 return jsonb_build_object('business_id',p_business_id,'is_public',p_is_public);
end $$;
revoke all on function public.admin_set_business_visibility(uuid,boolean,text) from public,anon;
grant execute on function public.admin_set_business_visibility(uuid,boolean,text) to authenticated;

create or replace function public.admin_archive_business(p_business_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,auth,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_business public.businesses; v_reason text:=nullif(trim(coalesce(p_reason,'')),''); v_now timestamptz:=now();
begin
 if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_business_id is null or length(coalesce(v_reason,''))<8 or length(v_reason)>500 then raise exception 'INVALID_ARCHIVE' using errcode='22023'; end if;
 select * into v_business from public.businesses where id=p_business_id for update;
 if not found then raise exception 'BUSINESS_NOT_FOUND' using errcode='P0002'; end if;
 if v_business.archived_at is not null then raise exception 'BUSINESS_ALREADY_ARCHIVED' using errcode='23514'; end if;
 update public.businesses set archived_at=v_now,is_public=false,updated_at=v_now where id=p_business_id;
 insert into public.business_admin_audit_log(business_id,actor_user_id,action,old_owner_id,new_owner_id,old_is_public,new_is_public,old_archived_at,new_archived_at,reason)
 values(p_business_id,v_actor,'BUSINESS_ARCHIVED',v_business.owner_id,v_business.owner_id,v_business.is_public,false,null,v_now,v_reason);
 return jsonb_build_object('business_id',p_business_id,'archived_at',v_now);
end $$;
revoke all on function public.admin_archive_business(uuid,text) from public,anon;
grant execute on function public.admin_archive_business(uuid,text) to authenticated;

create or replace function public.admin_restore_business(p_business_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,auth,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_business public.businesses; v_reason text:=nullif(trim(coalesce(p_reason,'')),'');
begin
 if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_business_id is null or length(coalesce(v_reason,''))<8 or length(v_reason)>500 then raise exception 'INVALID_RESTORE' using errcode='22023'; end if;
 select * into v_business from public.businesses where id=p_business_id for update;
 if not found then raise exception 'BUSINESS_NOT_FOUND' using errcode='P0002'; end if;
 if v_business.archived_at is null then raise exception 'BUSINESS_NOT_ARCHIVED' using errcode='23514'; end if;
 update public.businesses set archived_at=null,is_public=false,updated_at=now() where id=p_business_id;
 insert into public.business_admin_audit_log(business_id,actor_user_id,action,old_owner_id,new_owner_id,old_is_public,new_is_public,old_archived_at,new_archived_at,reason)
 values(p_business_id,v_actor,'BUSINESS_RESTORED',v_business.owner_id,v_business.owner_id,v_business.is_public,false,v_business.archived_at,null,v_reason);
 return jsonb_build_object('business_id',p_business_id,'archived_at',null);
end $$;
revoke all on function public.admin_restore_business(uuid,text) from public,anon;
grant execute on function public.admin_restore_business(uuid,text) to authenticated;

create or replace function public.admin_list_business_audit(p_business_id uuid default null,p_limit integer default 100)
returns table(id uuid,business_id uuid,business_name text,actor_user_id uuid,action text,old_owner_id uuid,new_owner_id uuid,old_is_public boolean,new_is_public boolean,old_archived_at timestamptz,new_archived_at timestamptz,reason text,metadata jsonb,created_at timestamptz)
language plpgsql stable security definer set search_path=pg_catalog,public,auth,pg_temp as $$
begin
 if auth.uid() is null or not exists(select 1 from public.platform_members pm where pm.user_id=auth.uid() and pm.active=true and pm.role='super_admin') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 return query select a.id,a.business_id,b.name,a.actor_user_id,a.action,a.old_owner_id,a.new_owner_id,a.old_is_public,a.new_is_public,a.old_archived_at,a.new_archived_at,a.reason,a.metadata,a.created_at
 from public.business_admin_audit_log a join public.businesses b on b.id=a.business_id
 where p_business_id is null or a.business_id=p_business_id
 order by a.created_at desc limit greatest(1,least(coalesce(p_limit,100),200));
end $$;
revoke all on function public.admin_list_business_audit(uuid,integer) from public,anon;
grant execute on function public.admin_list_business_audit(uuid,integer) to authenticated;
