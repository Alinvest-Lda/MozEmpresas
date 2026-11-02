-- Exercise the RPCs as authenticated users; inspect persisted results as the fixture owner.
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);

do $direct_calls$
declare
  result jsonb;
begin
  result := public.request_promotion_with_mpesa(
    '20000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000002',
    'Campanha de teste',
    now() + interval '1 day',
    array['Maputo'],
    array['Tecnologia']
  );

  begin
    perform public.request_promotion_with_mpesa(
      '20000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000001',
      null,'Second campaign',now() + interval '1 day','{}','{}'
    );
    raise exception 'Capacity limit was bypassed';
  exception when raise_exception then
    if sqlerrm <> 'NO_AVAILABILITY' then raise; end if;
  end;

  begin
    perform public.request_promotion_with_mpesa(
      '20000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000001',
      'Foreign listing',now() + interval '2 days','{}','{}'
    );
    raise exception 'Foreign business listing was accepted';
  exception when raise_exception then
    if sqlerrm <> 'LISTING_NOT_AVAILABLE' then raise; end if;
  end;
end
$direct_calls$;
reset role;

do $direct_assertions$
declare
  v_promotion_id uuid;
begin
  select id into v_promotion_id from public.business_promotions where title='Campanha de teste';
  if v_promotion_id is null then raise exception 'Direct/M-Pesa promotion was not persisted'; end if;
  if not exists (
    select 1 from public.business_promotions
    where id=v_promotion_id and payment_method='DIRECT' and status='PENDING'
      and price_mzn=600 and audience_mode='TARGETED'
  ) then raise exception 'Direct/M-Pesa request did not persist with expected price and state'; end if;
  if (select count(*) from public.business_promotion_targets where promotion_id=v_promotion_id) <> 2 then
    raise exception 'Direct/M-Pesa targeting values were not persisted atomically';
  end if;
end
$direct_assertions$;

set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
do $credit_call$
declare
  result jsonb;
begin
  result := public.purchase_promotion_with_credits(
    '20000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000002',
    'Campanha com créditos',
    now() + interval '2 days',
    array['Matola'],
    array[]::text[]
  );
end
$credit_call$;
reset role;

do $credit_assertions$
declare
  v_promotion_id uuid;
  v_balance integer;
begin
  select id into v_promotion_id from public.business_promotions where title='Campanha com créditos';
  if v_promotion_id is null then raise exception 'Credit-backed promotion was not persisted'; end if;
  select balance_credits into v_balance from public.business_credit_wallets
  where business_id='20000000-0000-4000-8000-000000000001';
  if v_balance <> 145 then raise exception 'Credit wallet debit or targeting factor is incorrect'; end if;
  if not exists (select 1 from public.credit_transactions where reference_id=v_promotion_id and credits=-55) then
    raise exception 'Credit transaction was not written';
  end if;
  if not exists (select 1 from public.business_promotions where id=v_promotion_id and payment_method='CREDITS' and status='ACTIVE') then
    raise exception 'Credit-backed promotion was not activated';
  end if;
end
$credit_assertions$;


set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',false);
do $unauthorized$
begin
  begin
    perform public.request_promotion_with_mpesa(
      '20000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000001',
      null,'Unauthorized campaign',now() + interval '3 days','{}','{}'
    );
    raise exception 'Unrelated user was allowed to reserve business advertising';
  exception when raise_exception then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;
end
$unauthorized$;
reset role;

do $security$
declare
  definition text;
begin
  select pg_get_functiondef('public.request_promotion_with_mpesa(uuid,uuid,uuid,text,timestamp with time zone,text[],text[])'::regprocedure)
  into definition;
  if position('FOR UPDATE' in upper(definition))=0 then
    raise exception 'Direct/M-Pesa inventory reservation is not serialized';
  end if;
  select pg_get_functiondef('public.purchase_promotion_with_credits(uuid,uuid,uuid,text,timestamp with time zone,text[],text[])'::regprocedure)
  into definition;
  if position('FOR UPDATE' in upper(definition))=0 then
    raise exception 'Credit inventory reservation is not serialized';
  end if;
end
$security$;
