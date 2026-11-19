create table if not exists public.credit_wallet_adjustment_events (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  wallet_id uuid not null references public.business_credit_wallets(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  delta_credits integer not null check (delta_credits <> 0),
  reason text not null check (length(trim(reason)) between 10 and 500),
  balance_before integer not null check (balance_before >= 0),
  balance_after integer not null check (balance_after >= 0),
  transaction_id uuid references public.credit_transactions(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists credit_wallet_adjustment_events_created_idx
  on public.credit_wallet_adjustment_events (created_at desc);
create index if not exists credit_wallet_adjustment_events_wallet_idx
  on public.credit_wallet_adjustment_events (wallet_id, created_at desc);

alter table public.credit_wallet_adjustment_events enable row level security;
revoke all on table public.credit_wallet_adjustment_events from anon, authenticated;
grant select on table public.credit_wallet_adjustment_events to authenticated;
grant all on table public.credit_wallet_adjustment_events to service_role;

create policy "Super admins read credit wallet adjustments"
  on public.credit_wallet_adjustment_events
  for select to authenticated
  using (exists (
    select 1 from public.platform_members pm
    where pm.user_id = (select auth.uid())
      and pm.active = true and pm.role = 'super_admin'
  ));

create or replace function public.admin_adjust_credit_wallet(
  p_wallet_id uuid,
  p_delta_credits integer,
  p_reason text,
  p_idempotency_key uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_wallet public.business_credit_wallets;
  v_existing public.credit_wallet_adjustment_events;
  v_event public.credit_wallet_adjustment_events;
  v_before integer;
  v_after integer;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_transaction_id uuid;
begin
  if v_actor is null or not exists (
    select 1 from public.platform_members pm
    where pm.user_id = v_actor and pm.active = true and pm.role = 'super_admin'
  ) then raise exception 'FORBIDDEN'; end if;

  if p_wallet_id is null or p_idempotency_key is null or p_delta_credits is null
     or p_delta_credits = 0 or abs(p_delta_credits::bigint) > 1000000
     or v_reason is null or length(v_reason) < 10 or length(v_reason) > 500 then
    raise exception 'INVALID_ADJUSTMENT';
  end if;

  select * into v_existing
  from public.credit_wallet_adjustment_events
  where idempotency_key = p_idempotency_key;
  if found then
    if v_existing.wallet_id <> p_wallet_id or v_existing.delta_credits <> p_delta_credits
       or v_existing.reason <> v_reason then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT';
    end if;
    return jsonb_build_object('adjustment_id', v_existing.id, 'balance_after', v_existing.balance_after, 'already_processed', true);
  end if;

  select * into v_wallet
  from public.business_credit_wallets
  where id = p_wallet_id
  for update;
  if not found then raise exception 'WALLET_NOT_FOUND'; end if;

  v_before := v_wallet.balance_credits;
  v_after := v_before + p_delta_credits;
  if v_after < 0 then raise exception 'INSUFFICIENT_CREDIT_BALANCE'; end if;

  insert into public.credit_wallet_adjustment_events (
    idempotency_key, wallet_id, business_id, actor_user_id, delta_credits,
    reason, balance_before, balance_after
  ) values (
    p_idempotency_key, v_wallet.id, v_wallet.business_id, v_actor,
    p_delta_credits, v_reason, v_before, v_after
  ) returning * into v_event;

  insert into public.credit_transactions (
    wallet_id, type, credits, amount_mzn, reference_type, reference_id, description
  ) values (
    v_wallet.id, 'ADJUSTMENT', p_delta_credits, null,
    'CREDIT_WALLET_ADJUSTMENT', v_event.id,
    'Ajuste administrativo: ' || v_reason
  ) returning id into v_transaction_id;

  update public.business_credit_wallets
  set balance_credits = v_after, updated_at = now()
  where id = v_wallet.id;

  update public.credit_wallet_adjustment_events
  set transaction_id = v_transaction_id
  where id = v_event.id;

  return jsonb_build_object('adjustment_id', v_event.id, 'balance_after', v_after, 'already_processed', false);
end;
$$;

revoke all on function public.admin_adjust_credit_wallet(uuid,integer,text,uuid) from public, anon, authenticated;
grant execute on function public.admin_adjust_credit_wallet(uuid,integer,text,uuid) to authenticated;
