-- F3.16: exhaustive financial reconciliation and orphaned payment-document detection.
create or replace function public.admin_financial_operations_overview()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_result jsonb;
begin
  if v_actor is null or not exists (
    select 1 from public.platform_members pm
    where pm.user_id = v_actor and pm.active = true and pm.role = 'super_admin'
  ) then
    raise exception 'FORBIDDEN';
  end if;

  with
  payment_groups as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'status', status, 'method', method, 'count', n, 'amount_mzn', amount_mzn
    ) order by status, method), '[]'::jsonb) items
    from (
      select status, method, count(*)::bigint n,
        coalesce(sum(amount_mzn),0)::numeric amount_mzn
      from public.financial_payments group by status, method
    ) q
  ),
  document_groups as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'status', status, 'type', document_type, 'count', n, 'amount_mzn', amount_mzn
    ) order by status, document_type), '[]'::jsonb) items
    from (
      select status, document_type, count(*)::bigint n,
        coalesce(sum(amount_mzn),0)::numeric amount_mzn
      from public.financial_documents group by status, document_type
    ) q
  ),
  credit_groups as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'status', status, 'count', n, 'amount_mzn', amount_mzn, 'credits', credits
    ) order by status), '[]'::jsonb) items
    from (
      select status, count(*)::bigint n,
        coalesce(sum(amount_mzn),0)::numeric amount_mzn,
        coalesce(sum(credits),0)::bigint credits
      from public.credit_purchase_requests group by status
    ) q
  ),
  promotion_groups as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'status', status, 'payment_method', payment_method, 'count', n,
      'budget_mzn', budget_mzn, 'credits_charged', credits_charged
    ) order by status, payment_method), '[]'::jsonb) items
    from (
      select status, coalesce(payment_method,'UNSPECIFIED') payment_method,
        count(*)::bigint n,
        coalesce(sum(coalesce(price_mzn,budget,0)),0)::numeric budget_mzn,
        coalesce(sum(credits_charged),0)::bigint credits_charged
      from public.business_promotions group by status, payment_method
    ) q
  ),
  wallet_totals as (
    select count(*)::bigint wallet_count,
      coalesce(sum(w.balance_credits),0)::bigint wallet_balance,
      coalesce(sum(l.ledger_balance),0)::bigint ledger_balance,
      count(*) filter (where w.balance_credits::bigint <> l.ledger_balance)::bigint mismatch_count
    from public.business_credit_wallets w
    join lateral (
      select coalesce(sum(t.credits),0)::bigint ledger_balance
      from public.credit_transactions t where t.wallet_id = w.id
    ) l on true
  ),
  payment_document_issues as (
    select count(*)::bigint issue_count
    from public.financial_payments p
    left join public.financial_documents d on d.id = p.document_id
    where (p.document_id is not null and d.id is null)
       or (d.id is not null and p.status = 'CONFIRMED' and d.status not in ('PAID','VOID'))
       or (d.id is not null and p.status = 'PENDING' and d.status = 'PAID')
       or (d.id is not null and p.status = 'REFUNDED' and d.status = 'PAID')
  ),
  paid_credit_without_ledger as (
    select count(*)::bigint issue_count
    from public.credit_purchase_requests r
    where r.status = 'PAID'
      and not exists (
        select 1 from public.credit_transactions t
        where t.reference_type = 'CREDIT_PURCHASE_REQUEST'
          and t.reference_id = r.id
          and t.type = 'PURCHASE'
          and t.credits = r.credits
      )
  ),
  service_reconciliation as (
    select count(*)::bigint checked_count,
      count(*) filter (where issue_code is not null)::bigint issue_count
    from (
      select o.id,
        case
          when o.payment_method = 'MPESA' and p.id is null then 'MISSING_PAYMENT'
          when o.payment_method = 'MPESA' and p.id is not null and p.amount_mzn <> o.amount_mzn then 'AMOUNT_MISMATCH'
          when o.payment_method = 'MPESA' and p.id is not null and p.currency <> o.currency then 'CURRENCY_MISMATCH'
          when o.payment_method = 'MPESA' and o.status in ('PAID','PROCESSING','COMPLETED')
            and p.status is distinct from 'CONFIRMED' then 'ORDER_PAID_PAYMENT_NOT_CONFIRMED'
          when o.payment_method = 'MPESA' and o.status in ('PENDING_PAYMENT','FAILED','CANCELLED')
            and p.status = 'CONFIRMED' then 'PAYMENT_ORDER_STATE_MISMATCH'
          when o.payment_method = 'MPESA' and p.status = 'CONFIRMED'
            and (p.provider_transaction_id is null or p.confirmed_at is null) then 'MISSING_PROVIDER_CONFIRMATION'
          else null
        end issue_code
      from public.platform_service_orders o
      left join public.financial_payments p
        on p.reference = coalesce(o.mpesa_reference,'SERVICE:'||o.id::text)
       and p.method = 'MPESA'
    ) all_orders
  ),
  callback_review as (
    select count(*)::bigint review_count
    from public.credit_payment_callback_events
    where processing_status in ('REJECTED','RETRY')
  ),
  cancellation_totals as (
    select count(*)::bigint cancellation_count,
      coalesce(sum(credits_refunded),0)::bigint credits_refunded
    from public.business_promotion_cancellations
  )
  select jsonb_build_object(
    'generated_at', now(),
    'payments', (select items from payment_groups),
    'documents', (select items from document_groups),
    'credit_purchases', (select items from credit_groups),
    'promotions', (select items from promotion_groups),
    'wallets', (select to_jsonb(w) from wallet_totals w),
    'reconciliation', jsonb_build_object(
      'wallet_balance_mismatches', (select mismatch_count from wallet_totals),
      'payment_document_mismatches', (select issue_count from payment_document_issues),
      'paid_credit_purchases_missing_ledger', (select issue_count from paid_credit_without_ledger),
      'service_orders_checked', (select checked_count from service_reconciliation),
      'service_payment_issues', (select issue_count from service_reconciliation),
      'callbacks_needing_review', (select review_count from callback_review)
    ),
    'promotion_cancellations', (select to_jsonb(c) from cancellation_totals c)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_financial_operations_overview() from public, anon;
grant execute on function public.admin_financial_operations_overview() to authenticated, service_role;
