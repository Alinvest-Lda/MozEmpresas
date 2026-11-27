-- F3.98: notify partner members when an issued bank-transfer campaign is confirmed.
do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef('public.admin_confirm_partner_bank_transfer(uuid,text)'::regprocedure)
    into v_definition;

  v_old:=$old$
  update public.partner_ad_payment_orders set status='PAID',confirmed_at=now(),updated_at=now() where id=v_order.id;
$old$;
  v_new:=$new$
  update public.partner_ad_payment_orders set status='PAID',confirmed_at=now(),updated_at=now() where id=v_order.id;
  begin
    insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
  select members.user_id,'ADVERTISING','Transferência bancária confirmada',
    'A transferência bancária da campanha "'||left(c.title,120)||'" foi confirmada. A campanha aguarda activação dentro do período contratado.',
    'PARTNER_AD_CAMPAIGN',c.id
  from public.partner_ad_campaigns c
  join public.partner_account_members members on members.account_id=c.account_id
    where c.id=v_payment.campaign_id and members.active=true and members.user_id is not null;
  exception when others then
    raise warning 'F398 notification failed for campaign %: %',v_payment.campaign_id,sqlerrm;
  end;
$new$;

  if position(v_old in v_definition)=0 then
    raise exception 'F398_BANK_TRANSFER_NOTIFICATION_ANCHOR_NOT_FOUND';
  end if;
  v_definition:=replace(v_definition,v_old,v_new);
  if position('Transferência bancária confirmada' in v_definition)=0 then
    raise exception 'F398_REWRITE_INCOMPLETE';
  end if;
  execute v_definition;
end
$migration$;

revoke all on function public.admin_confirm_partner_bank_transfer(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_confirm_partner_bank_transfer(uuid,text) to authenticated;
