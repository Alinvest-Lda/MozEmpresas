create or replace function public.partner_ad_request(
  p_product_id uuid,p_title text,p_objective text,p_starts_at timestamptz,p_ends_at timestamptz,p_targets jsonb
)
returns uuid language plpgsql security definer set search_path to public
as $function$
declare v_account uuid:=public.current_partner_account_id(); v_id uuid; v_duration integer; v_capacity integer; v_existing integer;
begin
  if auth.uid() is null or v_account is null then raise exception 'PARTNER_ACCOUNT_REQUIRED'; end if;
  if public.current_partner_opportunity_role() not in ('owner','manager') then raise exception 'FORBIDDEN'; end if;
  if nullif(trim(coalesce(p_title,'')),'') is null or length(trim(p_title))>160 then raise exception 'INVALID_CAMPAIGN_TITLE'; end if;
  if p_starts_at is null or p_ends_at is null or p_starts_at<now() or p_ends_at<=p_starts_at then raise exception 'INVALID_CAMPAIGN_DATES'; end if;
  if jsonb_typeof(coalesce(p_targets,'[]'::jsonb))<>'array' then raise exception 'INVALID_CAMPAIGN_TARGETS'; end if;
  select duration_days,capacity into v_duration,v_capacity from public.partner_ad_products where id=p_product_id and active=true;
  if v_duration is null then raise exception 'AD_PRODUCT_NOT_FOUND'; end if;
  if extract(epoch from (p_ends_at-p_starts_at))/86400>v_duration then raise exception 'CAMPAIGN_EXCEEDS_PRODUCT_DURATION'; end if;
  select count(*) into v_existing from public.partner_ad_campaigns c
  where c.product_id=p_product_id and c.status in ('REQUESTED','PENDING','UNDER_REVIEW','ACTIVE','RUNNING','PUBLISHED')
    and c.starts_at<p_ends_at and c.ends_at>p_starts_at;
  if v_existing>=greatest(v_capacity,1) then raise exception 'AD_SPACE_UNAVAILABLE'; end if;
  insert into public.partner_ad_campaigns(account_id,product_id,title,objective,starts_at,ends_at,price_mzn,surface,slot)
  select v_account,id,trim(p_title),nullif(trim(p_objective),''),p_starts_at,p_ends_at,price_mzn,surface,slot
  from public.partner_ad_products where id=p_product_id and active=true returning id into v_id;
  if v_id is null then raise exception 'AD_PRODUCT_NOT_FOUND'; end if;
  insert into public.partner_ad_targets(campaign_id,target_type,target_value)
  select v_id,x->>'type',left(trim(x->>'value'),160) from jsonb_array_elements(coalesce(p_targets,'[]'::jsonb)) x
  where x->>'type' in ('SECTOR','PROVINCE','CITY','COMPANY_SIZE','INTENT','CATEGORY') and nullif(trim(x->>'value'),'') is not null;
  return v_id;
end;
$function$;
revoke all on function public.partner_ad_request(uuid,text,text,timestamptz,timestamptz,jsonb) from anon;
grant execute on function public.partner_ad_request(uuid,text,text,timestamptz,timestamptz,jsonb) to authenticated;