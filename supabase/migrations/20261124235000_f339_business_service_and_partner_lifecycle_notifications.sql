
-- F3.39: complete lifecycle notifications for purchases, services and partner campaigns.
create or replace function public.notify_business_and_partner_lifecycle_change()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,pg_temp
as $function$
declare
  v_new jsonb:=to_jsonb(new);
  v_old jsonb:=to_jsonb(old);
  v_status text:=v_new->>'status';
  v_old_status text:=v_old->>'status';
  v_recipient uuid;
  v_account uuid;
  v_title text;
  v_body text;
  v_resource text;
  v_entity uuid:=(v_new->>'id')::uuid;
  v_label text;
begin
  if tg_op<>'UPDATE' or v_status is not distinct from v_old_status then
    return new;
  end if;

  v_label:=case tg_table_name
    when 'credit_purchase_requests' then 'pedido de compra de créditos'
    when 'platform_service_orders' then 'ordem de serviço'
    when 'service_requests' then 'pedido de serviço'
    when 'partner_ad_campaigns' then 'campanha publicitária'
    when 'partner_ad_payment_orders' then 'cobrança de campanha'
    else 'operação'
  end;

  if tg_table_name in ('partner_ad_campaigns','partner_ad_payment_orders') then
    v_account:=nullif(v_new->>'account_id','')::uuid;
    v_resource:=case when tg_table_name='partner_ad_campaigns' then 'PARTNER_AD_CAMPAIGN' else 'PARTNER_AD_PAYMENT_ORDER' end;
    select m.user_id into v_recipient
    from public.partner_account_members m
    join public.partner_accounts a on a.id=m.account_id
    join public.profiles p on p.id=m.user_id
    where m.account_id=v_account and m.active=true
      and a.status='ACTIVE' and a.portal_enabled=true
      and p.account_status='ACTIVE' and p.user_type='parceiro'
    limit 1;
  else
    v_recipient:=nullif(v_new->>'requester_user_id','')::uuid;
    v_resource:=case tg_table_name
      when 'credit_purchase_requests' then 'CREDIT_PURCHASE_REQUEST'
      when 'platform_service_orders' then 'PLATFORM_SERVICE_ORDER'
      else 'SERVICE_REQUEST'
    end;
  end if;

  if v_recipient is null or v_recipient is not distinct from auth.uid() then
    return new;
  end if;

  v_title:=case v_status
    when 'PAID' then 'Pagamento confirmado'
    when 'COMPLETED' then 'Serviço concluído'
    when 'FAILED' then 'Operação não concluída'
    when 'REJECTED' then 'Pedido não aprovado'
    when 'CANCELLED' then 'Operação cancelada'
    when 'PROCESSING' then 'Pedido em processamento'
    when 'APPROVED' then 'Pedido aprovado'
    when 'ACTIVE' then 'Campanha activada'
    when 'PAUSED' then 'Campanha pausada'
    when 'ENDED' then 'Campanha terminada'
    when 'REFUNDED' then 'Pagamento reembolsado'
    else 'Actualização de pedido'
  end;

  v_body:='O estado do seu '||v_label||' foi actualizado de "'||
    coalesce(v_old_status,'—')||'" para "'||coalesce(v_status,'—')||'".';

  insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
  values(v_recipient,'BUSINESS_LIFECYCLE',v_title,v_body,v_resource,v_entity);

  return new;
end;
$function$;
revoke all on function public.notify_business_and_partner_lifecycle_change() from public,anon,authenticated;

drop trigger if exists credit_purchase_status_notification on public.credit_purchase_requests;
create trigger credit_purchase_status_notification
after update of status on public.credit_purchase_requests
for each row execute function public.notify_business_and_partner_lifecycle_change();

drop trigger if exists platform_service_order_status_notification on public.platform_service_orders;
create trigger platform_service_order_status_notification
after update of status on public.platform_service_orders
for each row execute function public.notify_business_and_partner_lifecycle_change();

drop trigger if exists service_request_status_notification on public.service_requests;
create trigger service_request_status_notification
after update of status on public.service_requests
for each row execute function public.notify_business_and_partner_lifecycle_change();

drop trigger if exists partner_ad_campaign_status_notification on public.partner_ad_campaigns;
create trigger partner_ad_campaign_status_notification
after update of status on public.partner_ad_campaigns
for each row execute function public.notify_business_and_partner_lifecycle_change();

drop trigger if exists partner_ad_payment_order_status_notification on public.partner_ad_payment_orders;
create trigger partner_ad_payment_order_status_notification
after update of status on public.partner_ad_payment_orders
for each row execute function public.notify_business_and_partner_lifecycle_change();
