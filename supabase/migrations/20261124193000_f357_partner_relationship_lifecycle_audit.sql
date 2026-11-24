-- F3.57 institutional relationship lifecycle and immutable audit.
create table if not exists public.partner_relationship_audit (
 id uuid primary key default gen_random_uuid(),
 entity_type text not null check(entity_type in ('PARTNER_ACCOUNT','PARTNER_CONTACT')),
 entity_id uuid not null,
 account_id uuid,
 actor_user_id uuid references auth.users(id) on delete set null,
 action text not null check(action in ('CREATED','UPDATED','SUSPENDED','REACTIVATED','CLOSED','CONTACT_DEACTIVATED','CONTACT_REACTIVATED','DELETED')),
 before_state jsonb,
 after_state jsonb,
 reason text not null check(length(trim(reason)) between 8 and 500),
 created_at timestamptz not null default now()
);
create index if not exists partner_relationship_audit_account_created_idx on public.partner_relationship_audit(account_id,created_at desc);
create index if not exists partner_relationship_audit_entity_created_idx on public.partner_relationship_audit(entity_type,entity_id,created_at desc);
alter table public.partner_relationship_audit enable row level security;
revoke all on public.partner_relationship_audit from public,anon;
grant select on public.partner_relationship_audit to authenticated;
drop policy if exists partner_relationship_audit_admin_read on public.partner_relationship_audit;
create policy partner_relationship_audit_admin_read on public.partner_relationship_audit for select to authenticated using(public.is_super_admin());

create or replace function public.guard_partner_relationship_audit_immutable()
returns trigger language plpgsql set search_path=pg_catalog,public as $$ begin raise exception 'PARTNER_RELATIONSHIP_AUDIT_IMMUTABLE'; end $$;
revoke all on function public.guard_partner_relationship_audit_immutable() from public,anon,authenticated;
drop trigger if exists partner_relationship_audit_immutable on public.partner_relationship_audit;
create trigger partner_relationship_audit_immutable before update or delete on public.partner_relationship_audit for each row execute function public.guard_partner_relationship_audit_immutable();

create or replace function public.capture_partner_relationship_audit()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,auth,pg_temp as $$
declare v_before jsonb; v_after jsonb; v_entity uuid; v_account uuid; v_action text; v_reason text;
begin
 if tg_op='DELETE' and tg_table_name='partner_accounts' then raise exception 'PARTNER_ACCOUNT_DELETE_FORBIDDEN' using errcode='23514'; end if;
 if tg_op='DELETE' then v_before:=to_jsonb(old); v_after:=null; v_entity:=old.id; if tg_table_name='partner_accounts' then v_account:=old.id; else v_account:=old.account_id; end if; v_action:='DELETED';
 elsif tg_op='INSERT' then v_before:=null; v_after:=to_jsonb(new); v_entity:=new.id; if tg_table_name='partner_accounts' then v_account:=new.id; else v_account:=new.account_id; end if; v_action:='CREATED';
 else v_before:=to_jsonb(old); v_after:=to_jsonb(new); v_entity:=new.id; if tg_table_name='partner_accounts' then v_account:=new.id; else v_account:=new.account_id; end if;
   if tg_table_name='partner_accounts' and old.status<>'SUSPENDED' and new.status='SUSPENDED' then v_action:='SUSPENDED';
   elsif tg_table_name='partner_accounts' and old.status='SUSPENDED' and new.status='ACTIVE' then v_action:='REACTIVATED';
   elsif tg_table_name='partner_accounts' and old.status<>'CLOSED' and new.status='CLOSED' then v_action:='CLOSED';
   elsif tg_table_name='partner_contacts' and old.active and not new.active then v_action:='CONTACT_DEACTIVATED';
   elsif tg_table_name='partner_contacts' and not old.active and new.active then v_action:='CONTACT_REACTIVATED';
   else v_action:='UPDATED'; end if;
 end if;
 v_reason:=coalesce(nullif(current_setting('app.partner_change_reason',true),''),'Alteração administrativa registada');
 insert into public.partner_relationship_audit(entity_type,entity_id,account_id,actor_user_id,action,before_state,after_state,reason)
 values(case when tg_table_name='partner_accounts' then 'PARTNER_ACCOUNT' else 'PARTNER_CONTACT' end,v_entity,v_account,auth.uid(),v_action,v_before,v_after,v_reason);
 return coalesce(new,old);
end $$;
revoke all on function public.capture_partner_relationship_audit() from public,anon,authenticated;
drop trigger if exists partner_accounts_audit_capture on public.partner_accounts;
create trigger partner_accounts_audit_capture after insert or update or delete on public.partner_accounts for each row execute function public.capture_partner_relationship_audit();
drop trigger if exists partner_contacts_audit_capture on public.partner_contacts;
create trigger partner_contacts_audit_capture after insert or update or delete on public.partner_contacts for each row execute function public.capture_partner_relationship_audit();

create or replace function public.guard_partner_account_lifecycle()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if old.status='CLOSED' and new.status<>'CLOSED' then raise exception 'PARTNER_ACCOUNT_CLOSED_TERMINAL' using errcode='23514'; end if;
 if old.status='CLOSED' and new.portal_enabled then raise exception 'PARTNER_ACCOUNT_CLOSED_PORTAL_DISABLED' using errcode='23514'; end if;
 if new.status='SUSPENDED' and new.portal_enabled then new.portal_enabled:=false; end if;
 if new.status='CLOSED' then new.portal_enabled:=false; end if;
 new.updated_at:=now();
 return new;
end $$;
revoke all on function public.guard_partner_account_lifecycle() from public,anon,authenticated;
drop trigger if exists partner_accounts_lifecycle_guard on public.partner_accounts;
create trigger partner_accounts_lifecycle_guard before update on public.partner_accounts for each row execute function public.guard_partner_account_lifecycle();

create or replace function public.admin_update_partner_account(
 p_account_id uuid,p_name text,p_legal_name text,p_tax_id text,p_billing_address text,p_billing_city text,
 p_contact_email text,p_contact_phone text,p_operating_model text,p_status text,p_portal_enabled boolean,
 p_description text,p_internal_notes text,p_reason text
) returns jsonb language plpgsql security invoker set search_path=pg_catalog,public,auth,pg_temp as $
declare v_account public.partner_accounts;
begin
 if auth.uid() is null or not public.is_super_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_account_id is null or length(trim(coalesce(p_name,''))) not between 2 and 180 or length(trim(coalesce(p_reason,''))) not between 8 and 500 then raise exception 'INVALID_PARTNER_ACCOUNT' using errcode='22023'; end if;
 if p_operating_model not in ('MANAGED','STRATEGIC','HYBRID','SELF_SERVICE') or p_status not in ('ACTIVE','SUSPENDED','CLOSED') then raise exception 'INVALID_PARTNER_STATE' using errcode='22023'; end if;
 perform set_config('app.partner_change_reason',trim(p_reason),true);
 update public.partner_accounts set name=trim(p_name),legal_name=nullif(trim(coalesce(p_legal_name,'')),''),tax_id=nullif(trim(coalesce(p_tax_id,'')),''),
 billing_address=nullif(trim(coalesce(p_billing_address,'')),''),billing_city=nullif(trim(coalesce(p_billing_city,'')),''),
 contact_email=nullif(trim(coalesce(p_contact_email,'')),''),contact_phone=nullif(trim(coalesce(p_contact_phone,'')),''),
 operating_model=p_operating_model,status=p_status,portal_enabled=(p_status='ACTIVE' and p_portal_enabled),
 description=nullif(trim(coalesce(p_description,'')),''),internal_notes=nullif(trim(coalesce(p_internal_notes,'')),'')
 where id=p_account_id returning * into v_account;
 if not found then raise exception 'PARTNER_ACCOUNT_NOT_FOUND' using errcode='P0002'; end if;
 return jsonb_build_object('id',v_account.id,'status',v_account.status,'portal_enabled',v_account.portal_enabled);
end $;
revoke all on function public.admin_update_partner_account(uuid,text,text,text,text,text,text,text,text,text,boolean,text,text,text) from public,anon;
grant execute on function public.admin_update_partner_account(uuid,text,text,text,text,text,text,text,text,text,boolean,text,text,text) to authenticated;

create or replace function public.admin_update_partner_contact(
 p_contact_id uuid,p_full_name text,p_role_title text,p_email text,p_phone text,p_is_primary boolean,
 p_is_billing_contact boolean,p_receives_reports boolean,p_active boolean,p_reason text
) returns jsonb language plpgsql security invoker set search_path=pg_catalog,public,auth,pg_temp as $
declare v_account_id uuid;
begin
 if auth.uid() is null or not public.is_super_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_contact_id is null or length(trim(coalesce(p_full_name,''))) not between 2 and 160 or (nullif(trim(coalesce(p_email,'')),'') is null and nullif(trim(coalesce(p_phone,'')),'') is null) or length(trim(coalesce(p_reason,''))) not between 8 and 500 then raise exception 'INVALID_PARTNER_CONTACT' using errcode='22023'; end if;
 perform set_config('app.partner_change_reason',trim(p_reason),true);
 select account_id into v_account_id from public.partner_contacts where id=p_contact_id for update;
 if not found then raise exception 'PARTNER_CONTACT_NOT_FOUND' using errcode='P0002'; end if;
 if p_is_primary then update public.partner_contacts set is_primary=false where account_id=v_account_id and is_primary and id<>p_contact_id; end if;
 update public.partner_contacts set full_name=trim(p_full_name),role_title=nullif(trim(coalesce(p_role_title,'')),''),
 email=nullif(trim(coalesce(p_email,'')),''),phone=nullif(trim(coalesce(p_phone,'')),''),
 is_primary=p_is_primary,is_billing_contact=p_is_billing_contact,receives_reports=p_receives_reports,
 active=p_active,updated_at=now() where id=p_contact_id;
 return jsonb_build_object('id',p_contact_id,'account_id',v_account_id);
end $;
revoke all on function public.admin_update_partner_contact(uuid,text,text,text,text,boolean,boolean,boolean,boolean,text) from public,anon;
grant execute on function public.admin_update_partner_contact(uuid,text,text,text,text,boolean,boolean,boolean,boolean,text) to authenticated;
