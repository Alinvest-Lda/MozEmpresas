-- F3.25a: partner advertising billing foundation.
alter table public.partner_accounts
  add column if not exists business_id uuid references public.businesses(id) on delete set null;
create unique index if not exists partner_accounts_business_id_unique
  on public.partner_accounts(business_id) where business_id is not null;

alter table public.financial_documents
  add column if not exists partner_account_id uuid references public.partner_accounts(id) on delete restrict;
alter table public.financial_documents alter column business_id drop not null;
alter table public.financial_documents
  add constraint financial_documents_single_owner_check
  check ((business_id is not null)::integer + (partner_account_id is not null)::integer = 1)
  not valid;
alter table public.financial_documents
  validate constraint financial_documents_single_owner_check;

alter table public.financial_payments
  add column if not exists partner_account_id uuid references public.partner_accounts(id) on delete restrict;
alter table public.financial_payments alter column business_id drop not null;
alter table public.financial_payments
  add constraint financial_payments_single_owner_check
  check ((business_id is not null)::integer + (partner_account_id is not null)::integer = 1)
  not valid;
alter table public.financial_payments
  validate constraint financial_payments_single_owner_check;

create unique index if not exists financial_payments_provider_transaction_unique
  on public.financial_payments(provider_transaction_id)
  where provider_transaction_id is not null;
create unique index if not exists financial_payments_reference_unique
  on public.financial_payments(reference)
  where reference is not null;

create table if not exists public.partner_ad_payment_orders (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null unique references public.partner_ad_campaigns(id) on delete restrict,
  account_id uuid not null references public.partner_accounts(id) on delete restrict,
  business_id uuid references public.businesses(id) on delete restrict,
  amount_mzn numeric(14,2) not null check (amount_mzn > 0),
  currency text not null default 'MZN' check (currency = 'MZN'),
  payment_method text not null check (payment_method in ('MPESA','CREDITS')),
  credits_charged integer not null default 0 check (credits_charged >= 0),
  status text not null default 'PENDING' check (status in ('PENDING','PAID','FAILED','REFUNDED')),
  payment_reference text not null unique,
  financial_payment_id uuid references public.financial_payments(id) on delete restrict,
  financial_document_id uuid references public.financial_documents(id) on delete restrict,
  provider_transaction_id text unique,
  external_refund_reference text unique,
  created_by uuid not null references auth.users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_ad_payment_business_required_for_credits
    check (payment_method <> 'CREDITS' or business_id is not null)
);
create index if not exists partner_ad_payment_orders_account_created_idx
  on public.partner_ad_payment_orders(account_id,created_at desc);
create index if not exists partner_ad_payment_orders_status_created_idx
  on public.partner_ad_payment_orders(status,created_at desc);
alter table public.partner_ad_payment_orders enable row level security;
revoke all on public.partner_ad_payment_orders from public,anon,authenticated;
grant select on public.partner_ad_payment_orders to authenticated;
create policy "partner ad payment order owner read"
on public.partner_ad_payment_orders for select to authenticated
using (
  exists(select 1 from public.partner_account_members m
    where m.account_id=partner_ad_payment_orders.account_id
      and m.user_id=(select auth.uid()) and m.active=true)
  or exists(select 1 from public.platform_members pm
    where pm.user_id=(select auth.uid()) and pm.active=true and pm.role='super_admin')
);
