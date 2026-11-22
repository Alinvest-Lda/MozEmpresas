-- F3.25g: explicit credit prices for partner ad products.
alter table public.partner_ad_products add column if not exists credit_price integer;
alter table public.partner_ad_products add constraint partner_ad_products_credit_price_check check(credit_price is null or credit_price>0) not valid;
alter table public.partner_ad_products validate constraint partner_ad_products_credit_price_check;

create or replace function public.admin_update_partner_ad_product_credit_price(p_product_id uuid,p_credit_price integer)
returns void language plpgsql security definer set search_path=public,pg_temp
as $function$
declare v_actor uuid:=auth.uid();
begin
 if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin') then raise exception 'FORBIDDEN'; end if;
 if p_credit_price is not null and p_credit_price<=0 then raise exception 'INVALID_CREDIT_PRICE'; end if;
 update public.partner_ad_products set credit_price=p_credit_price where id=p_product_id;
 if not found then raise exception 'AD_PRODUCT_NOT_FOUND'; end if;
end;
$function$;
revoke all on function public.admin_update_partner_ad_product_credit_price(uuid,integer) from public,anon,authenticated;
grant execute on function public.admin_update_partner_ad_product_credit_price(uuid,integer) to authenticated;

do $migration$
declare v_definition text;
begin
 select pg_get_functiondef('public.admin_issue_partner_ad_payment(uuid,text)'::regprocedure) into v_definition;
 v_definition:=replace(v_definition,'v_credits := ceil(v_amount)::integer;','if v_product.credit_price is null or v_product.credit_price<=0 then raise exception ''PARTNER_AD_CREDIT_PRICE_NOT_CONFIGURED''; end if; v_credits := v_product.credit_price;');
 v_definition:=replace(v_definition,'v_credits:=ceil(v_amount)::integer;','if v_product.credit_price is null or v_product.credit_price<=0 then raise exception ''PARTNER_AD_CREDIT_PRICE_NOT_CONFIGURED''; end if; v_credits := v_product.credit_price;');
 if position('v_credits := v_product.credit_price;' in v_definition)=0 then raise exception 'F325G_CREDIT_PRICE_REWRITE_FAILED'; end if;
 execute v_definition;
end
$migration$;
