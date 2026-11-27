-- F3.71: immutable audit trail for partner document download-link issuance.
create table if not exists public.partner_document_access_audit (
  id bigint generated always as identity primary key,
  account_id uuid not null references public.partner_accounts(id) on delete restrict,
  document_id uuid not null references public.partner_documents(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in ('SIGNED_URL_ISSUED')),
  expires_in_seconds integer not null check (expires_in_seconds between 1 and 600),
  created_at timestamptz not null default now()
);

create index if not exists partner_document_access_audit_account_created_idx
  on public.partner_document_access_audit(account_id, created_at desc);
create index if not exists partner_document_access_audit_document_created_idx
  on public.partner_document_access_audit(document_id, created_at desc);
create index if not exists partner_document_access_audit_actor_created_idx
  on public.partner_document_access_audit(actor_user_id, created_at desc);

alter table public.partner_document_access_audit enable row level security;
revoke all on public.partner_document_access_audit from public, anon, authenticated;
grant insert on public.partner_document_access_audit to service_role;
grant usage, select on sequence public.partner_document_access_audit_id_seq to service_role;

create or replace function public.prevent_partner_document_access_audit_mutation()
returns trigger
language plpgsql
security invoker
set search_path=pg_catalog,public,pg_temp
as $$
begin
  raise exception 'PARTNER_DOCUMENT_ACCESS_AUDIT_IMMUTABLE' using errcode='23514';
end;
$$;
revoke all on function public.prevent_partner_document_access_audit_mutation() from public, anon, authenticated, service_role;

drop trigger if exists partner_document_access_audit_immutable on public.partner_document_access_audit;
create trigger partner_document_access_audit_immutable
before update or delete on public.partner_document_access_audit
for each row execute function public.prevent_partner_document_access_audit_mutation();
