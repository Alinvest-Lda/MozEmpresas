-- Consolidate application-status notifications into the established event-capture trigger.
-- F3.72 already writes the status event and notifies the applicant in one transaction.
drop trigger if exists opportunity_application_status_notification on public.opportunity_applications;

create or replace function public.capture_opportunity_application_event()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'pg_temp'
as $function$
declare
  v_title text;
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.opportunity_application_events(
      application_id, actor_user_id, event_type, new_status
    ) values (
      new.id, v_actor, 'SUBMITTED', new.status
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.opportunity_application_events(
      application_id, actor_user_id, event_type, old_status, new_status
    ) values (
      new.id, v_actor, 'STATUS_CHANGED', old.status, new.status
    );

    select o.title into v_title
    from public.opportunities o
    where o.id = new.opportunity_id;

    -- Do not notify the applicant about a status change they made themselves.
    if new.applicant_user_id is not null
       and new.applicant_user_id is distinct from v_actor then
      insert into public.notifications(
        user_id, type, title, body, resource_type, resource_id
      ) values (
        new.applicant_user_id,
        'OPPORTUNITY_APPLICATION_STATUS',
        'Actualização da sua candidatura',
        'O estado da candidatura à oportunidade "' ||
          left(coalesce(v_title, 'oportunidade'), 120) ||
          '" foi alterado para ' || new.status || '.',
        'OPPORTUNITY_APPLICATION',
        new.id
      );
    end if;
  end if;
  return new;
end;
$function$;

revoke all on function public.capture_opportunity_application_event()
from public, anon, authenticated;
