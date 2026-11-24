-- F3.59b: correct document audit permissions/version identity and enforce DB-level attachment references.
create or replace function public.audit_partner_document_insert()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,auth,pg_temp
as $$
begin
 if auth.uid() is null or not public.is_super_admin() or new.uploaded_by is distinct from auth.uid() then
  raise exception 'SUPER_ADMIN_REQUIRED' using errcode='42501';
 end if;
 insert into public.partner_operational_audit(account_id,entity_type,entity_id,action,actor_user_id,before_state,after_state,reason)
 values(new.account_id,'DOCUMENT',new.id,'DOCUMENT_UPLOADED',new.uploaded_by,null,
  jsonb_build_object('document_type',new.document_type,'parent_type',new.parent_type,'parent_id',new.parent_id,'title',new.title,'version_number',new.version_number,'storage_path',new.storage_path,'sha256_hash',new.sha256_hash),
  'Documento institucional carregado e versão registada');
 return new;
end $$;
revoke all on function public.audit_partner_document_insert() from public,anon,authenticated;

create or replace function public.guard_partner_document_insert()
returns trigger
language plpgsql
security invoker
set search_path=pg_catalog,public,auth,storage,pg_temp
as $$
declare v_account uuid; v_series text; v_previous public.partner_documents;
begin
 if not public.is_super_admin() then raise exception 'SUPER_ADMIN_REQUIRED' using errcode='42501'; end if;
 if new.uploaded_by is distinct from auth.uid() then raise exception 'DOCUMENT_ACTOR_MISMATCH' using errcode='42501'; end if;
 if new.storage_path not like new.account_id::text||'/%' then raise exception 'DOCUMENT_PATH_ACCOUNT_MISMATCH' using errcode='23514'; end if;
 if not exists(select 1 from storage.objects o where o.bucket_id='partner-documents' and o.name=new.storage_path) then raise exception 'DOCUMENT_OBJECT_NOT_FOUND' using errcode='23503'; end if;
 if new.parent_type='CONTRACT' then select account_id into v_account from public.partner_contracts where id=new.parent_id;
 elsif new.parent_type='ENGAGEMENT' then select account_id into v_account from public.partner_service_engagements where id=new.parent_id;
 elsif new.parent_type='REPORT' then select account_id into v_account from public.partner_report_deliveries where id=new.parent_id;
 elsif new.parent_type='CAMPAIGN' then select account_id into v_account from public.partner_ad_campaigns where id=new.parent_id;
 else v_account:=new.account_id;
 end if;
 if v_account is distinct from new.account_id then raise exception 'DOCUMENT_PARENT_ACCOUNT_MISMATCH' using errcode='23514'; end if;
 if new.document_type='SIGNED_CONTRACT' and new.parent_type<>'CONTRACT' then raise exception 'SIGNED_CONTRACT_REQUIRES_CONTRACT' using errcode='23514'; end if;
 v_series:=case when new.parent_type='GENERAL' then 'GENERAL' else new.parent_type||':'||new.parent_id::text end
  || ':' || lower(regexp_replace(trim(new.title),'\\s+',' ','g'));
 perform pg_advisory_xact_lock(hashtextextended(new.account_id::text||':'||new.document_type||':'||v_series,0));
 select * into v_previous from public.partner_documents where account_id=new.account_id and document_type=new.document_type and series_key=v_series order by version_number desc limit 1;
 new.series_key:=v_series;
 new.version_number:=coalesce(v_previous.version_number,0)+1;
 new.previous_version_id:=v_previous.id;
 return new;
end $$;
revoke all on function public.guard_partner_document_insert() from public,anon,authenticated;

create or replace function public.guard_partner_document_references()
returns trigger
language plpgsql
security invoker
set search_path=pg_catalog,public,auth,pg_temp
as $$
begin
 if tg_table_name='partner_contracts' and new.status='ACTIVE' then
  if new.signed_document_path is null or not exists(
   select 1 from public.partner_documents d where d.account_id=new.account_id and d.storage_path=new.signed_document_path
    and d.document_type='SIGNED_CONTRACT' and d.parent_type='CONTRACT' and d.parent_id=new.id
  ) then raise exception 'SIGNED_CONTRACT_DOCUMENT_NOT_REGISTERED' using errcode='23514'; end if;
 elsif tg_table_name='partner_report_deliveries' and new.storage_path is not null then
  if not exists(
   select 1 from public.partner_documents d where d.account_id=new.account_id and d.storage_path=new.storage_path
    and d.document_type in ('REPORT','SUPPORTING','OTHER')
  ) then raise exception 'REPORT_DOCUMENT_NOT_REGISTERED' using errcode='23514'; end if;
 end if;
 return new;
end $$;
revoke all on function public.guard_partner_document_references() from public,anon,authenticated;
drop trigger if exists partner_contract_document_reference_guard on public.partner_contracts;
create trigger partner_contract_document_reference_guard before insert or update on public.partner_contracts
for each row execute function public.guard_partner_document_references();
drop trigger if exists partner_report_document_reference_guard on public.partner_report_deliveries;
create trigger partner_report_document_reference_guard before insert or update on public.partner_report_deliveries
for each row execute function public.guard_partner_document_references();
