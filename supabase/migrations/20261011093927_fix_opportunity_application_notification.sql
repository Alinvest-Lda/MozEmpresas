create or replace function public.notify_opportunity_application_owner()
returns trigger language plpgsql security definer set search_path = public
as $function$
declare v_owner uuid; v_title text;
begin
  select o.owner_id,o.title into v_owner,v_title from public.opportunities o where o.id=new.opportunity_id;
  if v_owner is not null and v_owner <> new.applicant_user_id then
    insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
    values(v_owner,'OPPORTUNITY_APPLICATION','Nova resposta a uma oportunidade',
      'Foi submetida uma candidatura à oportunidade "' || left(coalesce(v_title,'oportunidade'),120) || '".',
      'OPPORTUNITY',new.opportunity_id);
  end if;
  return new;
end;
$function$;
revoke all on function public.notify_opportunity_application_owner() from public, anon, authenticated;