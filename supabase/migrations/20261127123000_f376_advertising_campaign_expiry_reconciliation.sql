-- F3.76: idempotent expiry reconciliation for paid advertising inventory.
create or replace function public.reconcile_advertising_campaign_expiry_f376()
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,pg_temp
as $$
declare
  v_now timestamptz:=clock_timestamp();
  v_business_count integer:=0;
  v_partner_count integer:=0;
begin
  perform set_config('app.advertising_admin_reason','Expiração automática: período contratado terminado.',true);
  perform set_config('app.partner_ad_campaign_reason','Expiração automática: período contratado terminado.',true);

  update public.business_promotions
  set status='EXPIRED',updated_at=v_now
  where status in ('ACTIVE','PAUSED') and ends_at<=v_now;
  get diagnostics v_business_count=row_count;

  update public.partner_ad_campaigns
  set status='ENDED',updated_at=v_now
  where status in ('ACTIVE','PAUSED') and ends_at is not null and ends_at<=v_now;
  get diagnostics v_partner_count=row_count;

  return jsonb_build_object(
    'reconciled_at',v_now,
    'business_promotions_expired',v_business_count,
    'partner_campaigns_ended',v_partner_count
  );
end;
$$;
revoke all on function public.reconcile_advertising_campaign_expiry_f376() from public,anon,authenticated;
grant execute on function public.reconcile_advertising_campaign_expiry_f376() to service_role;
