-- F4.03: notify partner members when an M-Pesa campaign payment settles, including future-start campaigns.
do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef('public.confirm_mpesa_partner_ad_payment(text,text,numeric,text)'::regprocedure)
    into v_definition;

  v_old:=$old$
  update public.partner_ad_payment_orders set status='PAID',provider_transaction_id=p_provider_transaction_id,confirmed_at=now(),updated_at=now() where id=v_order.id;
$old$;
  v_new:=$new$
  update public.partner_ad_payment_orders set status='PAID',provider_transaction_id=p_provider_transaction_id,confirmed_at=now(),updated_at=now() where id=v_order.id;
  begin
    insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
  select members.user_id,'ADVERTISING','Pagamento M-Pesa confirmado',
    'O pagamento M-Pesa da campanha "'||left(c.title,120)||'" foi confirmado. A campanha respeita o período contratado e aguarda activação quando aplicável.',
    'PARTNER_AD_CAMPAIGN',c.id
  from public.partner_ad_campaigns c
  join public.partner_account_members members on members.account_id=c.account_id
    where c.id=v_order.campaign_id and members.active=true and members.user_id is not null;
  exception when others then
    raise warning 'F403 notification failed for campaign %: %',v_order.campaign_id,sqlerrm;
  end;
$new$;

  if position(v_old in v_definition)=0 then
    raise exception 'F403_MPESA_NOTIFICATION_ANCHOR_NOT_FOUND';
  end if;
  v_definition:=replace(v_definition,v_old,v_new);
  if position('Pagamento M-Pesa confirmado' in v_definition)=0 then
    raise exception 'F403_REWRITE_INCOMPLETE';
  end if;
  execute v_definition;
end
$migration$;

revoke all on function public.confirm_mpesa_partner_ad_payment(text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.confirm_mpesa_partner_ad_payment(text,text,numeric,text) to service_role;
