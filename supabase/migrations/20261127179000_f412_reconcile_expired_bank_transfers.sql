-- F4.12: expire pending bank transfers, void their issued documents and release partner payment orders.
create or replace function public.reconcile_bank_transfer_payment_expiry_f412()
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,pg_temp
as $function$
declare
  v_now timestamptz:=clock_timestamp();
  v_payment_count integer:=0;
  v_order_count integer:=0;
  v_document_count integer:=0;
  v_notification_count integer:=0;
begin
  with expired as (
    update public.financial_payments
    set status='FAILED'
    where method='BANK_TRANSFER' and status='PENDING'
      and expires_at is not null and expires_at<=v_now
    returning id,document_id
  ),
  expired_orders as (
    update public.partner_ad_payment_orders o
    set status='FAILED',updated_at=v_now
    where o.status='PENDING' and o.financial_payment_id in (select id from expired)
    returning o.campaign_id
  ),
  voided_documents as (
    update public.financial_documents d
    set status='VOID'
    where d.status='ISSUED' and d.id in (select document_id from expired where document_id is not null)
    returning d.id
  )
  select
    (select count(*) from expired),
    (select count(*) from expired_orders),
    (select count(*) from voided_documents)
  into v_payment_count,v_order_count,v_document_count;

  begin
    insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
    select members.user_id,'ADVERTISING','Prazo de transferência bancária expirado',
      'O prazo de 24 horas para confirmar a transferência da campanha "'||left(c.title,120)||'" terminou. A equipa responsável pode emitir uma nova cobrança.',
      'PARTNER_AD_CAMPAIGN',c.id
    from public.partner_ad_payment_orders o
    join public.partner_ad_campaigns c on c.id=o.campaign_id
    join public.partner_account_members members on members.account_id=c.account_id
    where o.status='FAILED' and o.payment_method='BANK_TRANSFER' and o.updated_at=v_now
      and members.active=true and members.user_id is not null;
    get diagnostics v_notification_count=row_count;
  exception when others then
    v_notification_count:=0;
    raise warning 'F412 partner expiry notification failed: %',sqlerrm;
  end;

  return jsonb_build_object(
    'reconciled_at',v_now,
    'payments_expired',v_payment_count,
    'partner_orders_expired',v_order_count,
    'documents_voided',v_document_count,
    'notifications_created',v_notification_count
  );
end;
$function$;

revoke all on function public.reconcile_bank_transfer_payment_expiry_f412() from public,anon,authenticated;
grant execute on function public.reconcile_bank_transfer_payment_expiry_f412() to service_role;

create or replace function public.reconcile_advertising_and_bank_transfer_expiry_f412()
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,pg_temp
as $function$
declare
  v_ads jsonb;
  v_bank_transfers jsonb;
begin
  v_ads:=public.reconcile_advertising_campaign_expiry_f376();
  v_bank_transfers:=public.reconcile_bank_transfer_payment_expiry_f412();
  return jsonb_build_object('advertising',v_ads,'bank_transfers',v_bank_transfers);
end;
$function$;

revoke all on function public.reconcile_advertising_and_bank_transfer_expiry_f412() from public,anon,authenticated;
grant execute on function public.reconcile_advertising_and_bank_transfer_expiry_f412() to service_role;

-- Replace the previous advertising-only job with the unified lifecycle/payment reconciler.
do $schedule$
begin
  if to_regclass('cron.job') is not null then
    execute 'select cron.unschedule(jobid) from cron.job where jobname = ''mozempresas-advertising-expiry''';
    execute $job$
      select cron.schedule(
        'mozempresas-advertising-expiry',
        '*/15 * * * *',
        'select public.reconcile_advertising_and_bank_transfer_expiry_f412();'
      )
    $job$;
  else
    raise notice 'cron.job is unavailable; configure an external advertising and bank-transfer expiry scheduler.';
  end if;
end;
$schedule$;
