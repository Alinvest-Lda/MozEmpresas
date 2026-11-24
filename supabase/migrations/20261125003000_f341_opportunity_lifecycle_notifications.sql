
-- F3.41: notify applicants and opportunity owners about lifecycle status changes.
create or replace function public.notify_opportunity_application_status_change()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,pg_temp
as $function$
declare
  v_title text;
  v_opportunity_title text;
begin
  if tg_op<>'UPDATE' or new.status is not distinct from old.status then
    return new;
  end if;
  if new.applicant_user_id is null or new.applicant_user_id=auth.uid() then
    return new;
  end if;

  select o.title into v_opportunity_title
  from public.opportunities o where o.id=new.opportunity_id;

  v_title:=case new.status
    when 'SHORTLISTED' then 'Candidatura seleccionada para próxima fase'
    when 'ACCEPTED' then 'Candidatura aceite'
    when 'REJECTED' then 'Actualização da candidatura'
    when 'WITHDRAWN' then 'Candidatura retirada'
    else 'Estado da candidatura actualizado'
  end;

  insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
  values(new.applicant_user_id,'OPPORTUNITY_APPLICATION',v_title,
    'A sua candidatura à oportunidade "'||left(coalesce(v_opportunity_title,'Oportunidade'),160)||
    '" passou de "'||coalesce(old.status,'—')||'" para "'||coalesce(new.status,'—')||'".',
    'OPPORTUNITY_APPLICATION',new.id);
  return new;
end;
$function$;
revoke all on function public.notify_opportunity_application_status_change() from public,anon,authenticated;
drop trigger if exists opportunity_application_status_notification on public.opportunity_applications;
create trigger opportunity_application_status_notification
after update of status on public.opportunity_applications
for each row execute function public.notify_opportunity_application_status_change();

create or replace function public.notify_opportunity_owner_status_change()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,pg_temp
as $function$
begin
  if tg_op<>'UPDATE' or new.status is not distinct from old.status
     or new.owner_id is null or new.owner_id=auth.uid() then
    return new;
  end if;

  insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
  values(new.owner_id,'OPPORTUNITY_STATUS','Estado da oportunidade actualizado',
    'A oportunidade "'||left(new.title,160)||'" passou de "'||
    coalesce(old.status::text,'—')||'" para "'||coalesce(new.status::text,'—')||'".',
    'OPPORTUNITY',new.id);
  return new;
end;
$function$;
revoke all on function public.notify_opportunity_owner_status_change() from public,anon,authenticated;
drop trigger if exists opportunity_owner_status_notification on public.opportunities;
create trigger opportunity_owner_status_notification
after update of status on public.opportunities
for each row execute function public.notify_opportunity_owner_status_change();
