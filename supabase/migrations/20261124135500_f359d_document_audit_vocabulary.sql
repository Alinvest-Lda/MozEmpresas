-- F3.59d: include the document vault in the existing institutional audit vocabulary.
alter table public.partner_operational_audit drop constraint if exists partner_operational_audit_entity_type_check;
alter table public.partner_operational_audit add constraint partner_operational_audit_entity_type_check
 check(entity_type in ('PARTNER_CONTRACT','SERVICE_ENGAGEMENT','REPORT_DELIVERY','PARTNER_ENTITLEMENT','AD_CAMPAIGN','DOCUMENT'));
create or replace function public.audit_partner_document_insert()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,auth,pg_temp as $$
begin
 if auth.uid() is null or not public.is_super_admin() or new.uploaded_by is distinct from auth.uid() then
  raise exception 'SUPER_ADMIN_REQUIRED' using errcode='42501';
 end if;
 insert into public.partner_operational_audit(account_id,entity_type,entity_id,action,actor_user_id,before_state,after_state,reason)
 values(new.account_id,'DOCUMENT',new.id,'CREATED',new.uploaded_by,null,
  jsonb_build_object('document_type',new.document_type,'parent_type',new.parent_type,'parent_id',new.parent_id,'title',new.title,'version_number',new.version_number,'storage_path',new.storage_path,'sha256_hash',new.sha256_hash),
  'Documento institucional carregado e versão registada');
 return new;
end $$;
revoke all on function public.audit_partner_document_insert() from public,anon,authenticated;
