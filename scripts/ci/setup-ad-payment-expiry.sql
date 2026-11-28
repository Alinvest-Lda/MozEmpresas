-- Isolated fixtures for the real F392/F412 migrations.
do $$
begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $$;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create or replace function public.is_super_admin() returns boolean language sql stable as $ select auth.uid() is not null $;

create table public.partner_ad_campaigns(
 id uuid primary key, title text not null default 'CI campaign', account_id uuid not null,
 price_mzn numeric(14,2) not null default 1000, status text not null default 'REQUESTED',
 starts_at timestamptz, ends_at timestamptz, updated_at timestamptz default now()
);
create table public.business_promotions(
 id uuid primary key default gen_random_uuid(), status text not null, ends_at timestamptz,
 payment_method text, credits_charged numeric(14,2), paid_at timestamptz,
 starts_at timestamptz, updated_at timestamptz default now()
);
create table public.advertising_requests(
 id uuid primary key, status text, created_at timestamptz default now(), payment_method text,
 payment_reference text, paid_amount_mzn numeric(14,2), paid_at timestamptz,
 verified_by uuid, updated_at timestamptz default now(), bank_transfer_expires_at timestamptz
);
create table public.credit_purchase_requests(
 id uuid primary key, business_id uuid, package_id uuid, status text, payment_method text,
 created_at timestamptz default now(), credits numeric(14,2), amount_mzn numeric(14,2), updated_at timestamptz default now()
);
create table public.credit_purchase_decision_events(
 request_id uuid, actor_user_id uuid, previous_status text, new_status text, notes text
);
create table public.financial_documents(
 id uuid primary key, amount_mzn numeric(14,2) not null, status text not null,
 partner_account_id uuid not null
);
create table public.financial_payments(
 id uuid primary key, business_id uuid, partner_account_id uuid, user_id uuid, campaign_id uuid,
 amount_mzn numeric(14,2) not null, currency text not null default 'MZN',
 method text not null, status text not null, reference text, document_id uuid,
 confirmed_at timestamptz, created_at timestamptz not null default now(),
 expires_at timestamptz, verified_by uuid, verified_at timestamptz, verification_notes text
);
create table public.partner_ad_payment_orders(
 id uuid primary key, campaign_id uuid not null, payment_method text not null, status text not null,
 financial_payment_id uuid, amount_mzn numeric(14,2) not null, financial_document_id uuid,
 account_id uuid not null, business_id uuid, credits_charged numeric(14,2) default 0,
 confirmed_at timestamptz, updated_at timestamptz default now(),
 external_refund_reference text, provider_transaction_id text, payment_reference text
);
create table public.partner_account_members(account_id uuid,user_id uuid,active boolean default true);
create table public.notifications(
 id uuid primary key default gen_random_uuid(), user_id uuid, type text, title text, body text,
 resource_type text, resource_id uuid
);
create table public.platform_members(user_id uuid,active boolean,role text);
create table public.business_credit_wallets(id uuid primary key default gen_random_uuid(),business_id uuid unique,balance_credits numeric(14,2),updated_at timestamptz);
create table public.credit_transactions(wallet_id uuid,package_id uuid,type text,credits numeric(14,2),amount_mzn numeric(14,2),reference_type text,reference_id uuid,description text);
create table public.partner_ad_payment_adjustments(
 id uuid primary key default gen_random_uuid(),order_id uuid,campaign_id uuid,account_id uuid,
 adjustment_type text,amount_mzn numeric(14,2),credits numeric(14,2),external_refund_reference text,
 reason text,actor_user_id uuid
);


create table public.advertising_admin_events(
 id uuid primary key default gen_random_uuid(), entity_type text, entity_id uuid, actor_user_id uuid,
 old_status text, new_status text, action_reason text, created_at timestamptz default now()
);

-- Minimal base RPC with the exact pre-F405 anchors and production-compatible VOID return type.
drop function if exists public.admin_update_advertising_status(text,uuid,text,text,text,text,numeric);
create function public.admin_update_advertising_status(
 p_entity_type text,p_entity_id uuid,p_new_status text,p_reason text,
 p_payment_method text,p_payment_reference text,p_paid_amount_mzn numeric
) returns void language plpgsql security definer set search_path=public,pg_temp as $function$
declare
 v_old_status text;
 v_reason text:=coalesce(p_reason,'');
begin
 select status into v_old_status from public.advertising_requests where id=p_entity_id for update;
 if p_payment_method='BANK_TRANSFER' and exists(select 1 from public.advertising_requests ar where ar.id=p_entity_id and ar.created_at+interval '24 hours'<=now()) then raise exception 'BANK_TRANSFER_CONFIRMATION_EXPIRED' using errcode='23514'; end if;
 if not (case v_old_status when 'AWAITING_PAYMENT' then p_new_status in ('PAID','REJECTED','CANCELLED') else false end) then
   raise exception 'INVALID_TRANSITION' using errcode='23514';
 end if;
 update public.advertising_requests set status=p_new_status,updated_at=now() where id=p_entity_id;
end;
$function$;
