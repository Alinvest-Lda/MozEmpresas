-- F3.97: allow a future, paused business promotion to be cancelled through the same audited refund path.
do $migration$
declare
  v_definition text;
  v_old text:='if v_promotion.status not in (''PENDING'',''ACTIVE'')';
  v_new text:='if v_promotion.status not in (''PENDING'',''ACTIVE'',''PAUSED'')';
begin
  select pg_get_functiondef('public.admin_cancel_business_promotion(uuid,text,text)'::regprocedure)
    into v_definition;
  if position(v_old in v_definition)=0 then
    raise exception 'F397_BUSINESS_CANCELLATION_STATUS_GUARD_NOT_FOUND';
  end if;
  v_definition:=replace(v_definition,v_old,v_new);
  if position('PAUSED' in v_definition)=0 then
    raise exception 'F397_REWRITE_INCOMPLETE';
  end if;
  execute v_definition;
end
$migration$;

revoke all on function public.admin_cancel_business_promotion(uuid,text,text) from public,anon,authenticated;
grant execute on function public.admin_cancel_business_promotion(uuid,text,text) to authenticated;
