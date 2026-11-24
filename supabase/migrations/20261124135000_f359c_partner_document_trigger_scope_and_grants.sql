-- F3.59c: avoid cross-table trigger record field evaluation and remove unused DML rights.
create or replace function public.guard_partner_document_references()
returns trigger
language plpgsql
security invoker
set search_path=pg_catalog,public,auth,pg_temp
as $$
begin
 if tg_table_name='partner_contracts' then
  if new.status='ACTIVE' then
   if new.signed_document_path is null or not exists(
    select 1 from public.partner_documents d where d.account_id=new.account_id and d.storage_path=new.signed_document_path
     and d.document_type='SIGNED_CONTRACT' and d.parent_type='CONTRACT' and d.parent_id=new.id
   ) then raise exception 'SIGNED_CONTRACT_DOCUMENT_NOT_REGISTERED' using errcode='23514'; end if;
  end if;
 elsif tg_table_name='partner_report_deliveries' then
  if new.storage_path is not null and not exists(
   select 1 from public.partner_documents d where d.account_id=new.account_id and d.storage_path=new.storage_path
    and d.document_type in ('REPORT','SUPPORTING','OTHER')
  ) then raise exception 'REPORT_DOCUMENT_NOT_REGISTERED' using errcode='23514'; end if;
 end if;
 return new;
end $$;
revoke all on function public.guard_partner_document_references() from public,anon,authenticated;
revoke update,delete,truncate,references,trigger on table public.partner_documents from authenticated;
grant select,insert on table public.partner_documents to authenticated;
