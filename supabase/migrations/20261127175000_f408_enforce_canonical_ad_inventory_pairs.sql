-- F4.08: catalogue products must map to a real public surface/slot pair.
alter table public.ad_products
  drop constraint if exists ad_products_paid_surface_slot_pair_f408;
alter table public.ad_products
  add constraint ad_products_paid_surface_slot_pair_f408
  check (
    not active or access_type<>'PAID' or
    (placement is not null and slot is not null and (
    (placement='HOME' and slot in ('HERO','BILLBOARD','EXCLUSIVE')) or
    (placement='DIRECTORY' and slot in ('BILLBOARD','FEATURED','INFEED','CONTEXT')) or
    (placement='MARKETPLACE' and slot in ('BILLBOARD','FEATURED','EXCLUSIVE','INFEED')) or
    (placement='OPPORTUNITIES' and slot in ('BILLBOARD','FEATURED','INFEED'))
    )) not valid;

alter table public.partner_ad_products
  drop constraint if exists partner_ad_products_public_surface_slot_pair_f408;
alter table public.partner_ad_products
  add constraint partner_ad_products_public_surface_slot_pair_f408
  check (
    not active or surface='PARTNER_INTELLIGENCE' or
    (surface is not null and slot is not null and (
    (surface='HOME' and slot in ('HERO','BILLBOARD','EXCLUSIVE')) or
    (surface='DIRECTORY' and slot in ('BILLBOARD','FEATURED','INFEED','CONTEXT')) or
    (surface='MARKETPLACE' and slot in ('BILLBOARD','FEATURED','EXCLUSIVE','INFEED')) or
    (surface='OPPORTUNITIES' and slot in ('BILLBOARD','FEATURED','INFEED'))
  ) not valid;

-- Guard the two business checkout RPCs as well as the partner request RPC;
-- legacy catalogue rows remain readable but cannot be newly sold.
do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef('public.purchase_promotion_with_credits(uuid,uuid,uuid,text,timestamptz,text[],text[])'::regprocedure)
    into v_definition;
  v_old:=$old$  if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;$old$;
  v_new:=$new$  if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;
  if v_product.placement is null or v_product.slot is null or not (
    (v_product.placement='HOME' and v_product.slot in ('HERO','BILLBOARD','EXCLUSIVE')) or
    (v_product.placement='DIRECTORY' and v_product.slot in ('BILLBOARD','FEATURED','INFEED','CONTEXT')) or
    (v_product.placement='MARKETPLACE' and v_product.slot in ('BILLBOARD','FEATURED','EXCLUSIVE','INFEED')) or
    (v_product.placement='OPPORTUNITIES' and v_product.slot in ('BILLBOARD','FEATURED','INFEED'))
  ) then raise exception 'PRODUCT_NOT_DELIVERABLE'; end if;$new$;
  if position(v_old in v_definition)=0 then raise exception 'F408_CREDIT_PURCHASE_PRODUCT_GUARD_NOT_FOUND'; end if;
  v_definition:=replace(v_definition,v_old,v_new);
  execute v_definition;

  select pg_get_functiondef('public.request_promotion_with_mpesa(uuid,uuid,uuid,text,timestamptz,text[],text[])'::regprocedure)
    into v_definition;
  if position(v_old in v_definition)=0 then raise exception 'F408_MPESA_PURCHASE_PRODUCT_GUARD_NOT_FOUND'; end if;
  v_definition:=replace(v_definition,v_old,v_new);
  execute v_definition;
end
$migration$;

do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef('public.partner_ad_request(uuid,text,text,timestamptz,timestamptz,jsonb,text)'::regprocedure)
    into v_definition;

  v_old:=$old$ if v_surface is null or v_surface not in ('HOME','DIRECTORY','MARKETPLACE','OPPORTUNITIES')
   or v_slot is null or v_slot not in ('HERO','BILLBOARD','EXCLUSIVE','FEATURED','INFEED','CONTEXT') then
  raise exception 'AD_PRODUCT_NOT_DELIVERABLE';
 end if;$old$;
  v_new:=$new$ if v_surface is null or v_slot is null or not (
   (v_surface='HOME' and v_slot in ('HERO','BILLBOARD','EXCLUSIVE')) or
   (v_surface='DIRECTORY' and v_slot in ('BILLBOARD','FEATURED','INFEED','CONTEXT')) or
   (v_surface='MARKETPLACE' and v_slot in ('BILLBOARD','FEATURED','EXCLUSIVE','INFEED')) or
   (v_surface='OPPORTUNITIES' and v_slot in ('BILLBOARD','FEATURED','INFEED'))
  ) then raise exception 'AD_PRODUCT_NOT_DELIVERABLE'; end if;$new$;
  if position(v_old in v_definition)=0 then raise exception 'F408_PARTNER_REQUEST_PRODUCT_GUARD_NOT_FOUND'; end if;
  v_definition:=replace(v_definition,v_old,v_new);
  execute v_definition;

  select pg_get_functiondef('public.partner_ad_products_list()'::regprocedure)
    into v_definition;
  v_old:=$old$   and p.slot in ('HERO','BILLBOARD','EXCLUSIVE','FEATURED','INFEED','CONTEXT')$old$;
  v_new:=$new$   and (
     (p.surface='HOME' and p.slot in ('HERO','BILLBOARD','EXCLUSIVE')) or
     (p.surface='DIRECTORY' and p.slot in ('BILLBOARD','FEATURED','INFEED','CONTEXT')) or
     (p.surface='MARKETPLACE' and p.slot in ('BILLBOARD','FEATURED','EXCLUSIVE','INFEED')) or
     (p.surface='OPPORTUNITIES' and p.slot in ('BILLBOARD','FEATURED','INFEED'))
   )$new$;
  if position(v_old in v_definition)=0 then raise exception 'F408_PARTNER_CATALOGUE_SLOT_FILTER_NOT_FOUND'; end if;
  v_definition:=replace(v_definition,v_old,v_new);
  execute v_definition;
end
$migration$;

alter function public.purchase_promotion_with_credits(uuid,uuid,uuid,text,timestamptz,text[],text[])
  set search_path=pg_catalog,public,pg_temp;
alter function public.request_promotion_with_mpesa(uuid,uuid,uuid,text,timestamptz,text[],text[])
  set search_path=pg_catalog,public,pg_temp;
