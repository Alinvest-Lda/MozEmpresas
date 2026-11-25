-- F3.67: require and preserve the reason for Partner campaign moderation.
alter table public.partner_ad_campaign_status_events add column if not exists action_reason text;

create or replace function public.record_partner_ad_campaign_status_event()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare v_reason text:=nullif(trim(current_setting('app.partner_ad_campaign_reason',true)),'');
begin
  if tg_op='INSERT' then
    insert into public.partner_ad_campaign_status_events(campaign_id,account_id,old_status,new_status,event_type,actor_user_id)
    values(new.id,new.account_id,null,new.status,'CREATED',auth.uid());
    return new;
  end if;
  if old.status is distinct from new.status then
    insert into public.partner_ad_campaign_status_events(campaign_id,account_id,old_status,new_status,event_type,actor_user_id,action_reason)
    values(new.id,new.account_id,old.status,new.status,'STATUS_CHANGED',auth.uid(),
      coalesce(v_reason,'Alteração legada sem justificação capturada'));
  end if;
  return new;
end $$;
revoke all on function public.record_partner_ad_campaign_status_event() from public,anon,authenticated;

drop function if exists public.admin_transition_partner_ad_campaign(uuid,text);
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
  elsif v_campaign.status='ACTIVE' and p_new_status='PAUSED' then
    if v_payment_status is distinct from 'PAID' then raise exception 'CAMPAIGN_PAYMENT_NOT_SETTLED' using errcode='23514'; end if;
  elsif v_campaign.status='PAUSED' and p_new_status='ACTIVE' then
    if v_payment_status is distinct from 'PAID' then raise exception 'CAMPAIGN_PAYMENT_NOT_SETTLED' using errcode='23514'; end if;
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
