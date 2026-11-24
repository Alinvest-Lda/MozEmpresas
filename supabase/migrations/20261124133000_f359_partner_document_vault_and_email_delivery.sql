-- F3.59: private institutional document vault, immutable versions and delivery-ready email.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('partner-documents','partner-documents',false,10485760,array[
 'application/pdf',
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'image/jpeg','image/png','image/webp'
])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.partner_documents(
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references public.partner_accounts(id) on delete restrict,
 document_type text not null check(document_type in ('SIGNED_CONTRACT','REPORT','SUPPORTING','OTHER')),
 parent_type text not null check(parent_type in ('GENERAL','CONTRACT','ENGAGEMENT','REPORT','CAMPAIGN')),
 parent_id uuid,
 series_key text not null,
 title text not null check(length(trim(title)) between 2 and 180),
 original_filename text not null check(length(original_filename) between 1 and 180),
 storage_path text not null unique,
 mime_type text not null,
 size_bytes bigint not null check(size_bytes between 1 and 10485760),
 sha256_hash text not null check(sha256_hash ~ '^[a-f0-9]{64}$'),
 version_number integer not null check(version_number>0),
 previous_version_id uuid references public.partner_documents(id) on delete restrict,
 notes text,
 uploaded_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 constraint partner_documents_parent_shape check((parent_type='GENERAL' and parent_id is null) or (parent_type<>'GENERAL' and parent_id is not null)),
 constraint partner_documents_version_unique unique(account_id,document_type,series_key,version_number)
);
create index if not exists partner_documents_account_created_idx on public.partner_documents(account_id,created_at desc);
create index if not exists partner_documents_parent_idx on public.partner_documents(parent_type,parent_id,created_at desc);
alter table public.partner_documents enable row level security;
revoke all on public.partner_documents from public,anon;
grant select,insert on public.partner_documents to authenticated;
drop policy if exists partner_documents_super_admin_read on public.partner_documents;
create policy partner_documents_super_admin_read on public.partner_documents for select to authenticated using((select public.is_super_admin()));
drop policy if exists partner_documents_super_admin_insert on public.partner_documents;
create policy partner_documents_super_admin_insert on public.partner_documents for insert to authenticated with check((select public.is_super_admin()) and uploaded_by=(select auth.uid()));

create or replace function public.guard_partner_document_insert()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public,auth,storage,pg_temp as $$
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
 v_series:=case when new.parent_type='GENERAL' then 'GENERAL' else new.parent_type||':'||new.parent_id::text end;
 perform pg_advisory_xact_lock(hashtextextended(new.account_id::text||':'||new.document_type||':'||v_series,0));
 select * into v_previous from public.partner_documents where account_id=new.account_id and document_type=new.document_type and series_key=v_series order by version_number desc limit 1;
 new.series_key:=v_series;
 new.version_number:=coalesce(v_previous.version_number,0)+1;
 new.previous_version_id:=v_previous.id;
 return new;
end $$;
revoke all on function public.guard_partner_document_insert() from public,anon,authenticated;
drop trigger if exists partner_documents_version_guard on public.partner_documents;
create trigger partner_documents_version_guard before insert on public.partner_documents for each row execute function public.guard_partner_document_insert();

create or replace function public.audit_partner_document_insert()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public,auth,pg_temp as $$
begin
 insert into public.partner_operational_audit(account_id,entity_type,entity_id,action,actor_user_id,before_state,after_state,reason)
 values(new.account_id,'DOCUMENT',new.id,'DOCUMENT_UPLOADED',new.uploaded_by,null,
  jsonb_build_object('document_type',new.document_type,'parent_type',new.parent_type,'parent_id',new.parent_id,'title',new.title,'version_number',new.version_number,'storage_path',new.storage_path,'sha256_hash',new.sha256_hash),
  'Documento institucional carregado e versão registada');
 return new;
end $$;
revoke all on function public.audit_partner_document_insert() from public,anon,authenticated;
drop trigger if exists partner_documents_audit_insert on public.partner_documents;
create trigger partner_documents_audit_insert after insert on public.partner_documents for each row execute function public.audit_partner_document_insert();

create or replace function public.prevent_partner_document_mutation()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public,pg_temp as $$
begin raise exception 'PARTNER_DOCUMENT_VERSION_IMMUTABLE' using errcode='23514'; end $$;
revoke all on function public.prevent_partner_document_mutation() from public,anon,authenticated;
drop trigger if exists partner_documents_immutable on public.partner_documents;
create trigger partner_documents_immutable before update or delete on public.partner_documents for each row execute function public.prevent_partner_document_mutation();

drop policy if exists partner_documents_storage_super_admin_read on storage.objects;
create policy partner_documents_storage_super_admin_read on storage.objects for select to authenticated
 using(bucket_id='partner-documents' and (select public.is_super_admin()));
drop policy if exists partner_documents_storage_super_admin_upload on storage.objects;
create policy partner_documents_storage_super_admin_upload on storage.objects for insert to authenticated
 with check(bucket_id='partner-documents' and (select public.is_super_admin()) and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$');
drop policy if exists partner_documents_storage_orphan_cleanup on storage.objects;
create policy partner_documents_storage_orphan_cleanup on storage.objects for delete to authenticated
 using(bucket_id='partner-documents' and (select public.is_super_admin()) and not exists(select 1 from public.partner_documents d where d.storage_path=storage.objects.name));
