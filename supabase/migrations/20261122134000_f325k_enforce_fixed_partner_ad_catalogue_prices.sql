-- F3.25k: negotiated price overrides are valid only for custom-priced partner inventory.
do $migration$
declare v_definition text;
begin
 select pg_get_functiondef('public.admin_issue_partner_ad_payment(uuid,text,numeric)'::regprocedure) into v_definition;
 v_definition:=replace(v_definition,'v_amount := coalesce(p_price_mzn,v_campaign.price_mzn,v_product.price_mzn);','if p_price_mzn is not null and v_product.price_mzn is not null and p_price_mzn<>v_product.price_mzn then raise exception ''FIXED_PRODUCT_PRICE_CANNOT_BE_OVERRIDDEN''; end if; v_amount := coalesce(p_price_mzn,v_campaign.price_mzn,v_product.price_mzn);');
 if position('FIXED_PRODUCT_PRICE_CANNOT_BE_OVERRIDDEN' in v_definition)=0 then raise exception 'F325K_PRICE_GUARD_REWRITE_FAILED'; end if;
 execute v_definition;
end
$migration$;
