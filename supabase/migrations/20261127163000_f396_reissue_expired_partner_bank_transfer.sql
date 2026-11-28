-- F3.96: an expired partner bank-transfer intent must release the campaign for a new 24h attempt.
do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef('public.admin_issue_partner_ad_payment(uuid,text,numeric)'::regprocedure)
    into v_definition;

  v_pattern text:='select\\s+\\*\\s+into\\s+v_order\\s+from\\s+public\\.partner_ad_payment_orders\\s+where\\s+campaign_id=p_campaign_id\\s+for\\s+update\\s*;\\s*if\\s+found\\s+and\\s+v_order\\.status\\s+not\\s+in\\s*\\(\\s*''FAILED''\\s*\\)\\s+then\\s+raise\\s+exception\\s+''CAMPAIGN_PAYMENT_ALREADY_ISSUED''\\s*;\\s*end\\s+if\\s*;';
  v_new text;
begin
  select pg_get_functiondef('public.admin_issue_partner_ad_payment(uuid,text,numeric)'::regprocedure)
    into v_definition;

  v_new:=$new$
  select * into v_order from public.partner_ad_payment_orders where campaign_id=p_campaign_id for update;
  if found and v_order.status not in ('FAILED') then
    if v_order.payment_method='BANK_TRANSFER' and v_order.status='PENDING'
      and exists(select 1 from public.financial_payments fp
        where fp.id=v_order.financial_payment_id and fp.status='PENDING'
          and fp.expires_at is not null and fp.expires_at<=now()) then
      update public.financial_payments set status='FAILED'
        where id=v_order.financial_payment_id and status='PENDING';
      update public.financial_documents set status='VOID'
        where id=v_order.financial_document_id and status='ISSUED';
      update public.partner_ad_payment_orders set status='FAILED',updated_at=now()
        where id=v_order.id and status='PENDING';
    else
      raise exception 'CAMPAIGN_PAYMENT_ALREADY_ISSUED';
    end if;
  end if;
$new$;

  if v_definition !~ v_pattern then
    raise exception 'F396_PAYMENT_REISSUE_GUARD_NOT_FOUND';
  end if;
  v_definition:=regexp_replace(v_definition,v_pattern,replace(v_new,'''',''''''));
  if position('fp.expires_at<=now()' in v_definition)=0 then
    raise exception 'F396_REWRITE_INCOMPLETE';
  end if;
  execute v_definition;

  if position(v_old in v_definition)=0 then
    raise exception 'F396_PAYMENT_REISSUE_GUARD_NOT_FOUND';
  end if;
  v_definition:=replace(v_definition,v_old,v_new);
  if position('F396' in v_definition)>0 then
    raise exception 'F396_UNEXPECTED_REWRITE_MARKER';
  end if;
  if position('fp.expires_at<=now()' in v_definition)=0 then
    raise exception 'F396_REWRITE_INCOMPLETE';
  end if;
  execute v_definition;
end
$migration$;

revoke all on function public.admin_issue_partner_ad_payment(uuid,text,numeric) from public,anon,authenticated;
grant execute on function public.admin_issue_partner_ad_payment(uuid,text,numeric) to authenticated;
