-- F4.13: business M-Pesa settlement must not depend on notification delivery.
do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef('public.admin_confirm_business_promotion_mpesa_payment(uuid,text,numeric,text)'::regprocedure)
    into v_definition;

  v_old:=$old$
  insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
  select recipients.user_id,'ADVERTISING','Pagamento de publicidade confirmado',
    'O pagamento M-Pesa da campanha "'||left(v_promotion.title,120)||'" foi confirmado. A campanha aguarda activação administrativa.',
    'BUSINESS_PROMOTION',v_promotion.id
  from (
    select b.owner_id as user_id from public.businesses b where b.id=v_promotion.business_id
    union
    select bm.user_id from public.business_members bm
    where bm.business_id=v_promotion.business_id and bm.role in ('owner','admin','operator')
  ) recipients
  where recipients.user_id is not null;
$old$;

  v_new:=$new$
  begin
    insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
    select recipients.user_id,'ADVERTISING','Pagamento de publicidade confirmado',
      'O pagamento M-Pesa da campanha "'||left(v_promotion.title,120)||'" foi confirmado. A campanha aguarda activação administrativa.',
      'BUSINESS_PROMOTION',v_promotion.id
    from (
      select b.owner_id as user_id from public.businesses b where b.id=v_promotion.business_id
      union
      select bm.user_id from public.business_members bm
      where bm.business_id=v_promotion.business_id and bm.role in ('owner','admin','operator')
    ) recipients
    where recipients.user_id is not null;
  exception when others then
    raise warning 'F413 business payment notification failed for promotion %: %',v_promotion.id,sqlerrm;
  end;
$new$;

  if position(v_old in v_definition)=0 then
    raise exception 'F413_BUSINESS_PAYMENT_NOTIFICATION_ANCHOR_NOT_FOUND';
  end if;
  v_definition:=replace(v_definition,v_old,v_new);
  if position('F413 business payment notification failed' in v_definition)=0 then
    raise exception 'F413_REWRITE_INCOMPLETE';
  end if;
  execute v_definition;
end
$migration$;

revoke all on function public.admin_confirm_business_promotion_mpesa_payment(uuid,text,numeric,text) from public,anon,authenticated;
grant execute on function public.admin_confirm_business_promotion_mpesa_payment(uuid,text,numeric,text) to authenticated;
