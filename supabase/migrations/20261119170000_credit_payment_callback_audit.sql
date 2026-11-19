create table if not exists public.credit_payment_callback_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'MPESA' check (provider = 'MPESA'),
  provider_transaction_id text not null check (length(provider_transaction_id) between 3 and 160),
  payment_reference text not null check (length(payment_reference) between 4 and 100),
  amount_mzn numeric(14,2) not null check (amount_mzn > 0),
  currency text not null default 'MZN' check (currency = 'MZN'),
  merchant_code text not null check (length(merchant_code) between 2 and 80),
  callback_status text not null check (callback_status in ('SUCCESS','PENDING','FAILED','CANCELLED')),
  processing_status text not null default 'RECEIVED'
    check (processing_status in ('RECEIVED','PROCESSED','IGNORED','REJECTED','RETRY')),
  processing_error_code text,
  request_id uuid references public.credit_purchase_requests(id) on delete restrict,
  delivery_count integer not null default 1 check (delivery_count > 0),
  first_received_at timestamptz not null default now(),
  last_received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint credit_payment_callback_events_delivery_unique
    unique (provider, provider_transaction_id, callback_status)
);

create index if not exists credit_payment_callback_events_received_idx
  on public.credit_payment_callback_events (last_received_at desc);
create index if not exists credit_payment_callback_events_status_idx
  on public.credit_payment_callback_events (processing_status, last_received_at desc);
create index if not exists credit_payment_callback_events_reference_idx
  on public.credit_payment_callback_events (payment_reference);

alter table public.credit_payment_callback_events enable row level security;
revoke all on table public.credit_payment_callback_events from anon, authenticated;
grant select on table public.credit_payment_callback_events to authenticated;
grant all on table public.credit_payment_callback_events to service_role;

create policy "Super admins read payment callback audit"
  on public.credit_payment_callback_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.platform_members pm
      where pm.user_id = (select auth.uid())
        and pm.active = true
        and pm.role = 'super_admin'
    )
  );

comment on table public.credit_payment_callback_events is
  'Audit of authenticated normalized M-Pesa callback deliveries; stores no raw payload or signing secret.';
