-- F3.72: serialize partner opportunity and applicant status transitions at the database boundary.
create or replace function public.partner_change_opportunity_status_f372(
  p_opportunity_id uuid,
  p_new_status text
) returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,auth,pg_temp
as $$
declare
  v_actor uuid:=auth.uid();
  v_account uuid:=public.current_partner_account_id();
  v_opportunity public.opportunities%rowtype;
begin
  if v_actor is null or v_account is null
    or public.current_partner_opportunity_role() not in ('owner','manager') then
    raise exception 'PARTNER_OPPORTUNITY_FORBIDDEN' using errcode='42501';
  end if;
  if p_opportunity_id is null or p_new_status not in ('PUBLISHED','CLOSED','ARCHIVED','DRAFT') then
    raise exception 'INVALID_OPPORTUNITY_STATUS_INPUT' using errcode='22023';
  end if;

  select * into v_opportunity
  from public.opportunities
  where id=p_opportunity_id and partner_account_id=v_account
  for update;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND' using errcode='P0002'; end if;

  if not (
    (v_opportunity.status::text='DRAFT' and p_new_status='PUBLISHED')
    or (v_opportunity.status::text='PUBLISHED' and p_new_status in ('CLOSED','ARCHIVED'))
    or (v_opportunity.status::text='CLOSED' and p_new_status in ('PUBLISHED','ARCHIVED'))
    or (v_opportunity.status::text='ARCHIVED' and p_new_status='DRAFT')
  ) then
    raise exception 'INVALID_OPPORTUNITY_STATUS_TRANSITION' using errcode='23514';
  end if;

  if p_new_status='PUBLISHED' and (
    (v_opportunity.opens_at is not null and v_opportunity.opens_at>now())
    or (v_opportunity.closes_at is not null and v_opportunity.closes_at<=now())
  ) then
    raise exception 'OPPORTUNITY_OUTSIDE_PUBLICATION_WINDOW' using errcode='23514';
  end if;

  update public.opportunities
  set status=p_new_status::public.opportunity_status,updated_at=now()
  where id=p_opportunity_id;

  return jsonb_build_object('id',p_opportunity_id,'old_status',v_opportunity.status::text,'new_status',p_new_status);
end;
$$;
revoke all on function public.partner_change_opportunity_status_f372(uuid,text) from public,anon;
grant execute on function public.partner_change_opportunity_status_f372(uuid,text) to authenticated;

create or replace function public.partner_change_application_status_f372(
  p_application_id uuid,
  p_new_status text
) returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,auth,pg_temp
as $$
declare
  v_actor uuid:=auth.uid();
  v_account uuid:=public.current_partner_account_id();
  v_application public.opportunity_applications%rowtype;
begin
  if v_actor is null or v_account is null
    or public.current_partner_opportunity_role() not in ('owner','manager') then
    raise exception 'PARTNER_APPLICATION_FORBIDDEN' using errcode='42501';
  end if;
  if p_application_id is null or p_new_status not in ('UNDER_REVIEW','SHORTLISTED','ACCEPTED','REJECTED') then
    raise exception 'INVALID_APPLICATION_STATUS_INPUT' using errcode='22023';
  end if;

  select a.* into v_application
  from public.opportunity_applications a
  join public.opportunities o on o.id=a.opportunity_id
  where a.id=p_application_id and o.partner_account_id=v_account
  for update of a;
  if not found then raise exception 'APPLICATION_NOT_FOUND' using errcode='P0002'; end if;

  if not (
    (v_application.status='SUBMITTED' and p_new_status in ('UNDER_REVIEW','SHORTLISTED','ACCEPTED','REJECTED'))
    or (v_application.status='UNDER_REVIEW' and p_new_status in ('SHORTLISTED','ACCEPTED','REJECTED'))
    or (v_application.status='SHORTLISTED' and p_new_status in ('ACCEPTED','REJECTED'))
  ) then
    raise exception 'INVALID_APPLICATION_STATUS_TRANSITION' using errcode='23514';
  end if;

  update public.opportunity_applications
  set status=p_new_status,updated_at=now()
  where id=p_application_id;

  return jsonb_build_object('id',p_application_id,'old_status',v_application.status,'new_status',p_new_status);
end;
$$;
revoke all on function public.partner_change_application_status_f372(uuid,text) from public,anon;
grant execute on function public.partner_change_application_status_f372(uuid,text) to authenticated;
