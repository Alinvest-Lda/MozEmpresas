-- F3.69: serialize opportunity submissions and updates to the unique applicant/opportunity pair.
create or replace function public.submit_opportunity_application(
  p_opportunity_id uuid,
  p_applicant_business_id uuid,
  p_cover_note text
) returns jsonb
language plpgsql security definer
set search_path=pg_catalog,public,pg_temp
as $function$
declare
  v_actor uuid:=auth.uid();
  v_opportunity public.opportunities%rowtype;
  v_application public.opportunity_applications%rowtype;
  v_action text;
begin
  if v_actor is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='42501'; end if;
  if p_opportunity_id is null or (p_cover_note is not null and length(btrim(p_cover_note))>5000) then
    raise exception 'INVALID_OPPORTUNITY_SUBMISSION' using errcode='22023';
  end if;

  select * into v_opportunity from public.opportunities where id=p_opportunity_id for share;
  if not found or v_opportunity.owner_id=v_actor or v_opportunity.status::text<>'PUBLISHED'
    or (v_opportunity.opens_at is not null and v_opportunity.opens_at>now())
    or (v_opportunity.closes_at is not null and v_opportunity.closes_at<now()) then
    raise exception 'OPPORTUNITY_NOT_OPEN' using errcode='23514';
  end if;

  if p_applicant_business_id is not null and not exists(
    select 1 from public.businesses b where b.id=p_applicant_business_id and b.archived_at is null
      and (b.owner_id=v_actor or exists(
        select 1 from public.business_members bm where bm.business_id=b.id and bm.user_id=v_actor
          and bm.role in ('owner','admin','operator')
      ))
  ) then raise exception 'BUSINESS_MANAGEMENT_REQUIRED' using errcode='42501'; end if;

  select * into v_application from public.opportunity_applications
    where opportunity_id=p_opportunity_id and applicant_user_id=v_actor for update;
  if found then
    if v_application.status<>'SUBMITTED' then raise exception 'APPLICATION_NOT_EDITABLE' using errcode='23514'; end if;
    update public.opportunity_applications
      set applicant_business_id=p_applicant_business_id,
          cover_note=nullif(btrim(p_cover_note),''),
          updated_at=now()
      where id=v_application.id;
    v_action:='updated';
  else
    insert into public.opportunity_applications(
      opportunity_id,applicant_user_id,applicant_business_id,cover_note,status,submitted_at
    ) values (
      p_opportunity_id,v_actor,p_applicant_business_id,nullif(btrim(p_cover_note),''),'SUBMITTED',now()
    ) returning * into v_application;
    v_action:='submitted';
  end if;
  return jsonb_build_object('application_id',v_application.id,'action',v_action);
end;
$function$;
revoke all on function public.submit_opportunity_application(uuid,uuid,text) from public,anon;
grant execute on function public.submit_opportunity_application(uuid,uuid,text) to authenticated;
