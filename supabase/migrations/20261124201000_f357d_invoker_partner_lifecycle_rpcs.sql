-- F3.57d: keep lifecycle RPCs invoker-scoped under existing Super Admin RLS policies.
grant select,update on public.partner_accounts to authenticated;
grant select,update on public.partner_contacts to authenticated;

create or replace function public.admin_update_partner_account(
 p_account_id uuid,p_name text,p_legal_name text,p_tax_id text,p_billing_address text,p_billing_city text,
 p_contact_email text,p_contact_phone text,p_operating_model text,p_status text,p_portal_enabled boolean,
 p_description text,p_internal_notes text,p_reason text
) returns jsonb language plpgsql security invoker set search_path=pg_catalog,public,auth,pg_temp as $$
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
end $$;
revoke all on function public.admin_update_partner_account(uuid,text,text,text,text,text,text,text,text,text,boolean,text,text,text) from public,anon;
grant execute on function public.admin_update_partner_account(uuid,text,text,text,text,text,text,text,text,text,boolean,text,text,text) to authenticated;

create or replace function public.admin_update_partner_contact(
 p_contact_id uuid,p_full_name text,p_role_title text,p_email text,p_phone text,p_is_primary boolean,
 p_is_billing_contact boolean,p_receives_reports boolean,p_active boolean,p_reason text
) returns jsonb language plpgsql security invoker set search_path=pg_catalog,public,auth,pg_temp as $$
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
end $$;
revoke all on function public.admin_update_partner_contact(uuid,text,text,text,text,boolean,boolean,boolean,boolean,text) from public,anon;
grant execute on function public.admin_update_partner_contact(uuid,text,text,text,text,boolean,boolean,boolean,boolean,text) to authenticated;
