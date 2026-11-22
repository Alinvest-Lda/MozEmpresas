-- F3.25m: expose partner product credit prices and eligibility without exposing wallet data.
drop function if exists public.partner_ad_products_list();
create function public.partner_ad_products_list()
returns table(id uuid,code text,name text,description text,placement text,duration_days integer,price_mzn numeric,capacity integer,credit_price integer,credit_payment_available boolean)
language sql stable security definer set search_path=public,pg_temp
as $function$
 select p.id,p.code,p.name,p.description,p.placement,p.duration_days,p.price_mzn,p.capacity,p.credit_price,
  (p.credit_price is not null and p.credit_price>0 and exists(
    select 1 from public.partner_accounts pa
    join public.business_credit_wallets w on w.business_id=pa.business_id
    where pa.id=public.current_partner_account_id() and pa.business_id is not null
      and pa.status='ACTIVE' and w.balance_credits>=p.credit_price
  )) as credit_payment_available
 from public.partner_ad_products p where p.active=true
 order by p.price_mzn nulls last,p.name;
$function$;
revoke all on function public.partner_ad_products_list() from public,anon;
grant execute on function public.partner_ad_products_list() to authenticated;
