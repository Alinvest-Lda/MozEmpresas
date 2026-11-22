-- F3.25h: allow Super Admin to set a negotiated MZN price for custom partner inventory.
do $migration$
declare v_definition text;
begin
 select pg_get_functiondef('public.admin_issue_partner_ad_payment(uuid,text)'::regprocedure) into v_definition;
 v_definition:=replace(v_definition,'public.admin_issue_partner_ad_payment(p_campaign_id uuid, p_payment_method text)','public.admin_issue_partner_ad_payment(p_campaign_id uuid, p_payment_method text, p_price_mzn numeric DEFAULT NULL)');
 v_definition:=replace(v_definition,'v_amount := coalesce(v_campaign.price_mzn,v_product.price_mzn);','if p_price_mzn is not null and p_price_mzn<=0 then raise exception ''INVALID_CAMPAIGN_PRICE''; end if; v_amount := coalesce(p_price_mzn,v_campaign.price_mzn,v_product.price_mzn);');
 v_definition:=replace(v_definition,'if v_amount is null or v_amount<=0 then raise exception ''CAMPAIGN_PRICE_NOT_CONFIGURED''; end if;','if v_amount is null or v_amount<=0 then raise exception ''CAMPAIGN_PRICE_NOT_CONFIGURED''; end if; update public.partner_ad_campaigns set price_mzn=v_amount,updated_at=now() where id=p_campaign_id;');
 if position('p_price_mzn numeric DEFAULT NULL' in v_definition)=0 or position('coalesce(p_price_mzn,v_campaign.price_mzn,v_product.price_mzn)' in v_definition)=0 then raise exception 'F325H_PRICE_OVERRIDE_REWRITE_FAILED'; end if;
 execute v_definition;
end
$migration$;
revoke all on function public.admin_issue_partner_ad_payment(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_issue_partner_ad_payment(uuid,text,numeric) to authenticated;
