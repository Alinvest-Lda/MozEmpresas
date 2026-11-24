-- M-Pesa Sandbox checkout: private payer MSISDN and provider request correlation.
alter table public.profiles
  add column if not exists mpesa_msisdn text;

alter table public.profiles
  drop constraint if exists profiles_mpesa_msisdn_format_check;

alter table public.profiles
  add constraint profiles_mpesa_msisdn_format_check
  check (mpesa_msisdn is null or mpesa_msisdn ~ '^2588[2-9][0-9]{7}$');

comment on column public.profiles.mpesa_msisdn is
  'Private payer MSISDN in Mozambique international format; never expose in public profile views.';

alter table public.financial_payments
  add column if not exists mpesa_customer_msisdn text,
  add column if not exists mpesa_third_party_reference text,
  add column if not exists mpesa_conversation_id text,
  add column if not exists mpesa_response_code text,
  add column if not exists mpesa_response_desc text,
  add column if not exists mpesa_requested_at timestamptz;

create unique index if not exists financial_payments_mpesa_third_party_reference_uidx
  on public.financial_payments (mpesa_third_party_reference)
  where mpesa_third_party_reference is not null;

create unique index if not exists financial_payments_mpesa_conversation_id_uidx
  on public.financial_payments (mpesa_conversation_id)
  where mpesa_conversation_id is not null;

comment on column public.financial_payments.mpesa_customer_msisdn is
  'Payer MSISDN used for the M-Pesa request; access follows financial_payments RLS.';
comment on column public.financial_payments.mpesa_third_party_reference is
  'Unique reference sent to Vodacom as input_ThirdPartyReference.';
comment on column public.financial_payments.mpesa_conversation_id is
  'Vodacom output_ConversationID used for transaction-status reconciliation.';
