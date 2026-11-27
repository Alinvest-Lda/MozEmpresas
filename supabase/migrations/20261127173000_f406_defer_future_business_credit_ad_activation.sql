-- F4.06: credit-backed business campaigns must not enter ACTIVE before their contracted start.
do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef('public.purchase_promotion_with_credits(uuid,uuid,uuid,text,timestamptz,text[],text[])'::regprocedure)
    into v_definition;

  v_old:=$old$v_product.placement,'ACTIVE',p_starts_at,v_end,v_price,'MZN',$old$;
  v_new:=$new$v_product.placement,case when p_starts_at<=now() then 'ACTIVE' else 'PENDING' end,p_starts_at,v_end,v_price,'MZN',$new$;

  if position(v_old in v_definition)=0 then
    raise exception 'F406_BUSINESS_CREDIT_ACTIVATION_ANCHOR_NOT_FOUND';
  end if;
  v_definition:=replace(v_definition,v_old,v_new);
  if position('case when p_starts_at<=now() then ''ACTIVE'' else ''PENDING'' end' in v_definition)=0 then
    raise exception 'F406_REWRITE_INCOMPLETE';
  end if;
  execute v_definition;
end
$migration$;

alter function public.purchase_promotion_with_credits(uuid,uuid,uuid,text,timestamptz,text[],text[])
  set search_path = pg_catalog, public, pg_temp;

revoke all on function public.purchase_promotion_with_credits(uuid,uuid,uuid,text,timestamptz,text[],text[]) from public,anon;
grant execute on function public.purchase_promotion_with_credits(uuid,uuid,uuid,text,timestamptz,text[],text[]) to authenticated;
