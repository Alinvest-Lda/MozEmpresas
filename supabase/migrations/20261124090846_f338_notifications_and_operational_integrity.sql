-- F3.38: notification delivery reliability and cross-module operational integrity.

revoke all on table public.notifications from anon;
revoke delete, truncate, references, trigger on table public.notifications from authenticated;
grant select, insert, update on table public.notifications to authenticated;
grant all on table public.notifications to service_role;

create index if not exists notifications_user_created_id_idx
  on public.notifications(user_id, created_at desc, id desc);
drop index if exists public.notifications_user_id_idx;

create unique index if not exists notifications_saved_search_resource_uidx
  on public.notifications(user_id, resource_type, resource_id)
  where type = 'SAVED_SEARCH_MATCH' and resource_id is not null;

create or replace function public.notify_saved_search_matches()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $function$
declare
  v_entity_type text; v_title text; v_description text; v_location text;
  v_status text; v_type text; v_category_id text; v_is_new boolean := false;
  s record; v_q text; v_location_filter text;
begin
  if tg_table_name = 'businesses' then
    v_entity_type := 'businesses'; v_title := new.name; v_description := coalesce(new.description, '');
    v_location := coalesce(new.location, ''); v_category_id := new.category_id::text;
    v_is_new := new.is_public and new.archived_at is null and (tg_op = 'INSERT' or old.is_public is distinct from true);
  elsif tg_table_name = 'listings' then
    v_entity_type := 'marketplace'; v_title := new.title;
    v_description := coalesce(new.description, '') || ' ' || coalesce((select b.name from public.businesses b where b.id=new.business_id), '');
    v_location := coalesce(new.location, ''); v_status := new.status::text; v_type := new.type::text;
    v_is_new := v_status = 'PUBLISHED' and (tg_op = 'INSERT' or old.status::text is distinct from 'PUBLISHED');
  elsif tg_table_name = 'opportunities' then
    v_entity_type := 'opportunities'; v_title := new.title;
    v_description := concat_ws(' ',coalesce(new.description,''),coalesce(new.organization,''),coalesce(new.location,''));
    v_location := coalesce(new.location, ''); v_status := new.status::text; v_type := new.type::text;
    v_is_new := v_status = 'PUBLISHED' and (tg_op = 'INSERT' or old.status::text is distinct from 'PUBLISHED');
  end if;
  if not coalesce(v_is_new, false) then return new; end if;
  for s in select id,user_id,title,filters from public.user_saved_searches where entity_type=v_entity_type and alert_enabled=true loop
    v_q := nullif(trim(coalesce(s.filters->>'q','')), '');
    v_location_filter := nullif(trim(coalesce(s.filters->>'location','')), '');
    if (v_q is null or (coalesce(v_title,'') || ' ' || coalesce(v_description,'') ilike '%' || v_q || '%'))
      and (v_location_filter is null or coalesce(v_location,'') ilike '%' || v_location_filter || '%')
      and (v_entity_type <> 'marketplace' or coalesce(s.filters->>'type','') in ('','all') or s.filters->>'type'=v_type)
      and (v_entity_type <> 'opportunities' or coalesce(s.filters->>'type','')='' or s.filters->>'type'=v_type)
      and (v_entity_type <> 'businesses' or coalesce(s.filters->>'category','')='' or v_category_id=s.filters->>'category')
    then
      insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
      values(s.user_id,'SAVED_SEARCH_MATCH','Nova correspondência: ' || left(coalesce(v_title,'conteúdo'),120),
        'Uma nova publicação corresponde à pesquisa guardada "' || left(s.title,120) || '".',
        case when v_entity_type='businesses' then 'BUSINESS' when v_entity_type='marketplace' then 'LISTING' else 'OPPORTUNITY' end,new.id)
      on conflict (user_id,resource_type,resource_id)
      where type='SAVED_SEARCH_MATCH' and resource_id is not null
      do nothing;
    end if;
  end loop;
  return new;
end;
$function$;
revoke all on function public.notify_saved_search_matches() from public, anon, authenticated;

create or replace function public.notify_support_message_recipient()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $function$
declare
  v_ticket_user uuid; v_assigned_to uuid; v_subject text; v_assignee_active boolean := false;
begin
  select t.user_id,t.assigned_to,t.subject into v_ticket_user,v_assigned_to,v_subject
  from public.support_tickets t where t.id=new.ticket_id;
  if v_ticket_user is null then return new; end if;

  if new.sender_role='BACKOFFICE' then
    if v_ticket_user is distinct from new.sender_user_id then
      insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
      values(v_ticket_user,'SUPPORT','Nova resposta do backoffice',
        'O backoffice respondeu ao atendimento "' || left(coalesce(v_subject,'Suporte'),120) || '". ' || left(new.body,180),
        'SUPPORT_TICKET',new.ticket_id);
    end if;
  elsif new.sender_role='USER' then
    if v_assigned_to is not null then
      select exists(select 1 from public.platform_members pm
        where pm.user_id=v_assigned_to and pm.active=true and pm.role='super_admin') into v_assignee_active;
    end if;
    if v_assignee_active and v_assigned_to is distinct from new.sender_user_id then
      insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
      values(v_assigned_to,'SUPPORT','Nova mensagem num atendimento atribuído',
        'O utilizador respondeu ao atendimento "' || left(coalesce(v_subject,'Suporte'),120) || '". ' || left(new.body,180),
        'SUPPORT_TICKET',new.ticket_id);
    else
      insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
      select pm.user_id,'SUPPORT','Novo atendimento ou resposta por tratar',
        'Existe uma nova mensagem no atendimento "' || left(coalesce(v_subject,'Suporte'),120) || '". ' || left(new.body,180),
        'SUPPORT_TICKET',new.ticket_id
      from public.platform_members pm
      where pm.active=true and pm.role='super_admin'
        and pm.user_id is distinct from new.sender_user_id
        and pm.user_id is distinct from v_ticket_user;
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function public.notify_support_message_recipient() from public, anon, authenticated;
drop trigger if exists notify_support_message_recipient_trigger on public.support_messages;
create trigger notify_support_message_recipient_trigger
after insert on public.support_messages for each row
execute function public.notify_support_message_recipient();

drop policy if exists "support ticket events visible to owner and super admin" on public.support_ticket_events;
drop policy if exists "application events visible to applicant owner and partner" on public.opportunity_application_events;
drop policy if exists "opportunity application events participant read" on public.opportunity_application_events;
create policy "opportunity application events participant read"
on public.opportunity_application_events for select to authenticated using (
  exists (
    select 1 from public.opportunity_applications a
    join public.opportunities o on o.id=a.opportunity_id
    where a.id=opportunity_application_events.application_id
      and (
        a.applicant_user_id=(select auth.uid())
        or o.owner_id=(select auth.uid())
        or (o.partner_account_id is not null and o.partner_account_id=(select public.current_partner_account_id()))
        or exists(select 1 from public.platform_members pm where pm.user_id=(select auth.uid()) and pm.active=true and pm.role='super_admin')
      )
  )
);

revoke insert,update,delete,truncate,references,trigger
on public.support_ticket_events,public.opportunity_application_events
from anon,authenticated,service_role;
grant select on public.support_ticket_events,public.opportunity_application_events to authenticated,service_role;
