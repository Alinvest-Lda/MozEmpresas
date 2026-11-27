-- F3.91: make settled partner campaigns awaiting activation operable from the admin queue.
-- Activation is permitted only after settlement and inside the contracted delivery window.
create or replace function public.admin_transition_partner_ad_campaign(p_campaign_id uuid,p_new_status text,p_reason text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare
  v_actor uuid:=auth.uid();
  v_campaign public.partner_ad_campaigns%rowtype;
  v_payment_status text;
  v_reason text:=trim(coalesce(p_reason,''));
begin
  if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if p_campaign_id is null or p_new_status not in ('APPROVED','REJECTED','ACTIVE','PAUSED','ENDED')
    or length(v_reason)<8 or length(v_reason)>500 then
    raise exception 'INVALID_PARTNER_CAMPAIGN_STATUS';
  end if;
  select * into v_campaign from public.partner_ad_campaigns where id=p_campaign_id for update;
  if not found then raise exception 'CAMPAIGN_NOT_FOUND' using errcode='P0002'; end if;
  select o.status into v_payment_status from public.partner_ad_payment_orders o where o.campaign_id=v_campaign.id order by o.created_at desc limit 1;

  if v_campaign.status='REQUESTED' and p_new_status in ('APPROVED','REJECTED') then
    if p_new_status='REJECTED' and v_payment_status in ('PENDING','PAID') then raise exception 'CAMPAIGN_PAYMENT_STILL_PENDING' using errcode='23514'; end if;
  elsif v_campaign.status='APPROVED' and p_new_status='REJECTED' then
    if v_payment_status in ('PENDING','PAID') then raise exception 'CAMPAIGN_PAYMENT_STILL_PENDING' using errcode='23514'; end if;
  elsif v_campaign.status='APPROVED' and p_new_status='ACTIVE' then
    if v_payment_status is distinct from 'PAID' then raise exception 'CAMPAIGN_PAYMENT_NOT_SETTLED' using errcode='23514'; end if;
    if v_campaign.starts_at is null or v_campaign.starts_at>now() then raise exception 'CAMPAIGN_START_DATE_NOT_REACHED' using errcode='23514'; end if;
    if v_campaign.ends_at is null or v_campaign.ends_at<=now() then raise exception 'ADVERTISING_CAMPAIGN_WINDOW_CLOSED' using errcode='23514'; end if;
  elsif v_campaign.status='ACTIVE' and p_new_status='PAUSED' then
    if v_payment_status is distinct from 'PAID' then raise exception 'CAMPAIGN_PAYMENT_NOT_SETTLED' using errcode='23514'; end if;
  elsif v_campaign.status='PAUSED' and p_new_status='ACTIVE' then
    if v_payment_status is distinct from 'PAID' then raise exception 'CAMPAIGN_PAYMENT_NOT_SETTLED' using errcode='23514'; end if;
    if v_campaign.starts_at is null or v_campaign.starts_at>now() then raise exception 'CAMPAIGN_START_DATE_NOT_REACHED' using errcode='23514'; end if;
    if v_campaign.ends_at is null or v_campaign.ends_at<=now() then raise exception 'ADVERTISING_CAMPAIGN_WINDOW_CLOSED' using errcode='23514'; end if;
  elsif v_campaign.status in ('ACTIVE','PAUSED') and p_new_status='ENDED' then
    if v_payment_status is distinct from 'PAID' then raise exception 'CAMPAIGN_PAYMENT_NOT_SETTLED' using errcode='23514'; end if;
    if v_campaign.ends_at is null or v_campaign.ends_at>now() then raise exception 'CAMPAIGN_END_DATE_NOT_REACHED' using errcode='23514'; end if;
  else
    raise exception 'ADMIN_PARTNER_CAMPAIGN_STATUS_TRANSITION_INVALID' using errcode='23514';
  end if;
  perform set_config('app.partner_ad_campaign_reason',v_reason,true);
  update public.partner_ad_campaigns set status=p_new_status,updated_at=now() where id=v_campaign.id;
  return jsonb_build_object('campaign_id',v_campaign.id,'old_status',v_campaign.status,'new_status',p_new_status);
end $$;
revoke all on function public.admin_transition_partner_ad_campaign(uuid,text,text) from public,anon;
grant execute on function public.admin_transition_partner_ad_campaign(uuid,text,text) to authenticated;
