-- F3.89: partner ad request flows accept only public, deliverable inventory.
create or replace function public.partner_ad_request(
 p_product_id uuid,p_title text,p_objective text,p_starts_at timestamptz,p_ends_at timestamptz,
 p_targets jsonb,p_payment_method text default 'MPESA'
) returns uuid
language plpgsql security definer
set search_path=pg_catalog,public,pg_temp
as $function$
declare
 v_account uuid:=public.current_partner_account_id();
 v_id uuid;
 v_duration integer;
 v_capacity integer;
 v_credit_price integer;
 v_existing integer;
 v_business uuid;
 v_balance integer;
 v_targets jsonb:=coalesce(p_targets,'[]'::jsonb);
 v_method text:=upper(coalesce(p_payment_method,'MPESA'));
begin
 if auth.uid() is null or v_account is null then raise exception 'PARTNER_ACCOUNT_REQUIRED'; end if;
 if public.current_partner_opportunity_role() not in ('owner','manager') then raise exception 'FORBIDDEN'; end if;
 if v_method not in ('MPESA','CREDITS') then raise exception 'INVALID_PAYMENT_METHOD'; end if;
 if nullif(trim(coalesce(p_title,'')),'') is null or length(trim(p_title))>160 then raise exception 'INVALID_CAMPAIGN_TITLE'; end if;
 if p_starts_at is null or p_ends_at is null or p_starts_at<now() or p_ends_at<=p_starts_at then raise exception 'INVALID_CAMPAIGN_DATES'; end if;
 if jsonb_typeof(v_targets)<>'array' or jsonb_array_length(v_targets)>20 then raise exception 'INVALID_CAMPAIGN_TARGETS'; end if;

 select duration_days,capacity,credit_price,surface,slot into v_duration,v_capacity,v_credit_price,v_surface,v_slot
 from public.partner_ad_products where id=p_product_id and active=true for update;
 if v_duration is null then raise exception 'AD_PRODUCT_NOT_FOUND'; end if;
 if v_surface is null or v_surface not in ('HOME','DIRECTORY','MARKETPLACE','OPPORTUNITIES')
   or v_slot is null or v_slot not in ('HERO','BILLBOARD','EXCLUSIVE','FEATURED','INFEED','CONTEXT') then
  raise exception 'AD_PRODUCT_NOT_DELIVERABLE';
 end if;
 if extract(epoch from (p_ends_at-p_starts_at))/86400>v_duration then raise exception 'CAMPAIGN_EXCEEDS_PRODUCT_DURATION'; end if;

 if v_method='CREDITS' then
  select business_id into v_business from public.partner_accounts where id=v_account and status='ACTIVE';
  if v_business is null then raise exception 'PARTNER_CREDIT_WALLET_NOT_LINKED'; end if;
  if v_credit_price is null or v_credit_price<=0 then raise exception 'PARTNER_AD_CREDIT_PRICE_NOT_CONFIGURED'; end if;
  select balance_credits into v_balance from public.business_credit_wallets where business_id=v_business;
  if v_balance is null then raise exception 'PARTNER_CREDIT_WALLET_NOT_FOUND'; end if;
  if v_balance<v_credit_price then raise exception 'INSUFFICIENT_CREDITS'; end if;
 end if;

 -- REQUESTED and APPROVED campaigns reserve capacity before activation; PAUSED
 -- campaigns retain their reservation until explicitly ended or cancelled.
 select count(*) into v_existing
 from public.partner_ad_campaigns c
 where c.product_id=p_product_id
   and c.status in ('REQUESTED','PENDING','UNDER_REVIEW','APPROVED','ACTIVE','PAUSED','RUNNING','PUBLISHED')
   and c.starts_at<p_ends_at and c.ends_at>p_starts_at;
 if v_existing>=greatest(v_capacity,1) then raise exception 'AD_SPACE_UNAVAILABLE'; end if;

 insert into public.partner_ad_campaigns(
  account_id,product_id,title,objective,starts_at,ends_at,price_mzn,surface,slot,payment_method_preference
 )
 select v_account,id,trim(p_title),nullif(trim(p_objective),''),p_starts_at,p_ends_at,price_mzn,surface,slot,v_method
 from public.partner_ad_products where id=p_product_id and active=true
 returning id into v_id;
 if v_id is null then raise exception 'AD_PRODUCT_NOT_FOUND'; end if;

 insert into public.partner_ad_targets(campaign_id,target_type,target_value)
 select v_id,x->>'type',left(trim(x->>'value'),160)
 from jsonb_array_elements(v_targets) x
 where x->>'type' in ('SECTOR','PROVINCE','CITY','COMPANY_SIZE','INTENT','CATEGORY')
   and nullif(trim(x->>'value'),'') is not null
 on conflict do nothing;
 return v_id;
end;
$function$;
revoke all on function public.partner_ad_request(uuid,text,text,timestamptz,timestamptz,jsonb,text) from public,anon,authenticated;
grant execute on function public.partner_ad_request(uuid,text,text,timestamptz,timestamptz,jsonb,text) to authenticated;

create or replace function public.partner_ad_products_list()
returns table(
  id uuid,code text,name text,description text,placement text,duration_days integer,
  price_mzn numeric,capacity integer,credit_price integer,credit_payment_available boolean
)
language sql stable security definer
set search_path=pg_catalog,public,pg_temp
as $function$
 select p.id,p.code,p.name,p.description,p.placement,p.duration_days,p.price_mzn,p.capacity,p.credit_price,
  (p.credit_price is not null and p.credit_price>0 and exists(
    select 1 from public.partner_accounts pa
    join public.business_credit_wallets w on w.business_id=pa.business_id
    where pa.id=public.current_partner_account_id() and pa.business_id is not null
      and pa.status='ACTIVE' and w.balance_credits>=p.credit_price
  )) as credit_payment_available
 from public.partner_ad_products p
 where p.active=true
   and p.surface in ('HOME','DIRECTORY','MARKETPLACE','OPPORTUNITIES')
   and p.slot in ('HERO','BILLBOARD','EXCLUSIVE','FEATURED','INFEED','CONTEXT')
 order by p.price_mzn nulls last,p.name;
$function$;
revoke all on function public.partner_ad_products_list() from public,anon;
grant execute on function public.partner_ad_products_list() to authenticated;
