-- Atomic Super Admin decisions for credit purchase requests.
create table if not exists public.credit_purchase_decision_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.credit_purchase_requests(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  previous_status text not null,
  new_status text not null check (new_status in ('PAID', 'REJECTED')),
  notes text,
  created_at timestamptz not null default now(),
  constraint credit_purchase_decision_events_request_id_key unique (request_id)
);
alter table public.credit_purchase_decision_events enable row level security;
revoke all on public.credit_purchase_decision_events from anon, authenticated;
grant select, insert on public.credit_purchase_decision_events to service_role;

create unique index if not exists credit_transactions_credit_purchase_once_uidx
  on public.credit_transactions (reference_type, reference_id)
  where reference_type = 'CREDIT_PURCHASE_REQUEST' and type = 'PURCHASE';

create or replace function public.admin_decide_credit_purchase(
  p_request_id uuid, p_decision text, p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_request public.credit_purchase_requests;
  v_wallet public.business_credit_wallets;
  v_new_status text;
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from public.platform_members pm
    where pm.user_id = v_actor and pm.active = true and pm.role = 'super_admin'
  ) then raise exception 'FORBIDDEN'; end if;
  if p_request_id is null or p_decision is null or p_decision not in ('APPROVE', 'REJECT') then
    raise exception 'INVALID_DECISION';
  end if;
  if length(coalesce(v_notes, '')) > 2000 then raise exception 'NOTES_TOO_LONG'; end if;

  select * into v_request from public.credit_purchase_requests where id = p_request_id for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  v_new_status := case when p_decision = 'APPROVE' then 'PAID' else 'REJECTED' end;

  if v_request.status = v_new_status then
    return jsonb_build_object('request_id', p_request_id, 'status', v_new_status, 'already_processed', true);
  end if;
  if v_request.status not in ('REQUESTED', 'PAYMENT_PENDING') then
    raise exception 'REQUEST_ALREADY_FINAL';
  end if;

  if p_decision = 'REJECT' then
    update public.credit_purchase_requests set status = 'REJECTED', updated_at = now() where id = p_request_id;
    insert into public.credit_purchase_decision_events
      (request_id, actor_user_id, previous_status, new_status, notes)
    values (p_request_id, v_actor, v_request.status, 'REJECTED', v_notes);
    return jsonb_build_object('request_id', p_request_id, 'status', 'REJECTED', 'already_processed', false);
  end if;

  insert into public.business_credit_wallets (business_id, balance_credits)
  values (v_request.business_id, 0) on conflict (business_id) do nothing;
  select * into v_wallet from public.business_credit_wallets where business_id = v_request.business_id for update;
  if not found then raise exception 'WALLET_UNAVAILABLE'; end if;

  update public.business_credit_wallets
    set balance_credits = balance_credits + v_request.credits, updated_at = now()
    where id = v_wallet.id;
  insert into public.credit_transactions
    (wallet_id, package_id, type, credits, amount_mzn, reference_type, reference_id, description)
  values
    (v_wallet.id, v_request.package_id, 'PURCHASE', v_request.credits, v_request.amount_mzn,
     'CREDIT_PURCHASE_REQUEST', p_request_id, 'Compra de créditos aprovada · pedido ' || p_request_id::text);
  update public.credit_purchase_requests set status = 'PAID', updated_at = now() where id = p_request_id;
  insert into public.credit_purchase_decision_events
    (request_id, actor_user_id, previous_status, new_status, notes)
  values (p_request_id, v_actor, v_request.status, 'PAID', v_notes);

  return jsonb_build_object('request_id', p_request_id, 'status', 'PAID',
    'credits_added', v_request.credits, 'already_processed', false);
end;
$$;
revoke all on function public.admin_decide_credit_purchase(uuid, text, text) from public, anon;
grant execute on function public.admin_decide_credit_purchase(uuid, text, text) to authenticated;
