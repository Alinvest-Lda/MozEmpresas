-- F3.45: opportunity/support lifecycle closure.
drop policy if exists "personal opportunity owners insert" on public.opportunities;
create policy "personal opportunity owners insert" on public.opportunities for insert to authenticated with check(owner_id=(select auth.uid()) and partner_account_id is null);
drop policy if exists "personal opportunity owners update" on public.opportunities;
create policy "personal opportunity owners update" on public.opportunities for update to authenticated using(owner_id=(select auth.uid()) and partner_account_id is null) with check(owner_id=(select auth.uid()) and partner_account_id is null);
drop policy if exists "platform administrators manage opportunities" on public.opportunities;
create policy "platform administrators manage opportunities" on public.opportunities for all to authenticated using(exists(select 1 from public.platform_members pm where pm.user_id=(select auth.uid()) and pm.active and pm.role='super_admin')) with check(exists(select 1 from public.platform_members pm where pm.user_id=(select auth.uid()) and pm.active and pm.role='super_admin'));
revoke insert,update,delete on public.opportunities from anon; grant select on public.opportunities to anon; revoke delete on public.opportunities from authenticated; grant select,insert,update on public.opportunities to authenticated;
create table if not exists public.opportunity_events(id uuid primary key default gen_random_uuid(),opportunity_id uuid not null references public.opportunities(id) on delete cascade,actor_user_id uuid references auth.users(id) on delete set null,event_type text not null check(event_type in ('CREATED','STATUS_CHANGED','BASELINE')),old_status text,new_status text not null,created_at timestamptz not null default now());
create index if not exists opportunity_events_opportunity_created_idx on public.opportunity_events(opportunity_id,created_at desc);
alter table public.opportunity_events enable row level security; revoke all on public.opportunity_events from anon,authenticated; grant select on public.opportunity_events to authenticated; grant all on public.opportunity_events to service_role;
drop policy if exists "opportunity lifecycle history participants read" on public.opportunity_events;
create policy "opportunity lifecycle history participants read" on public.opportunity_events for select to authenticated using(exists(select 1 from public.opportunities o where o.id=opportunity_events.opportunity_id and (o.owner_id=(select auth.uid()) or (o.partner_account_id is not null and o.partner_account_id=public.current_partner_account_id() and public.current_partner_opportunity_role() is not null) or exists(select 1 from public.platform_members pm where pm.user_id=(select auth.uid()) and pm.active and pm.role='super_admin'))));
create or replace function public.capture_opportunity_lifecycle_event() returns trigger language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
 if tg_op='INSERT' then insert into public.opportunity_events(opportunity_id,actor_user_id,event_type,new_status) values(new.id,auth.uid(),'CREATED',new.status::text); return new; end if;
 if new.status is distinct from old.status then insert into public.opportunity_events(opportunity_id,actor_user_id,event_type,old_status,new_status) values(new.id,auth.uid(),'STATUS_CHANGED',old.status::text,new.status::text); end if;
 return new;
end $$;
revoke all on function public.capture_opportunity_lifecycle_event() from public,anon,authenticated;
drop trigger if exists capture_opportunity_lifecycle_event_trigger on public.opportunities;
create trigger capture_opportunity_lifecycle_event_trigger after insert or update of status on public.opportunities for each row execute function public.capture_opportunity_lifecycle_event();
insert into public.opportunity_events(opportunity_id,actor_user_id,event_type,new_status,created_at) select o.id,o.owner_id,'BASELINE',o.status::text,o.created_at from public.opportunities o where not exists(select 1 from public.opportunity_events e where e.opportunity_id=o.id);
create or replace function public.guard_opportunity_status_transition() returns trigger language plpgsql set search_path=pg_catalog,public,pg_temp as $$
begin
 if new.status is distinct from old.status and not ((old.status::text='DRAFT' and new.status::text='PUBLISHED') or (old.status::text='PUBLISHED' and new.status::text in ('CLOSED','ARCHIVED')) or (old.status::text='CLOSED' and new.status::text in ('PUBLISHED','ARCHIVED')) or (old.status::text='ARCHIVED' and new.status::text='DRAFT')) then raise exception 'INVALID_OPPORTUNITY_STATUS_TRANSITION:%->%',old.status,new.status using errcode='23514'; end if; return new;
end $$;
revoke all on function public.guard_opportunity_status_transition() from public,anon,authenticated;
drop trigger if exists guard_opportunity_status_transition_trigger on public.opportunities;
create trigger guard_opportunity_status_transition_trigger before update of status on public.opportunities for each row execute function public.guard_opportunity_status_transition();
create or replace function public.update_own_opportunity_application_submission(p_application_id uuid,p_applicant_business_id uuid,p_cover_note text) returns uuid language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_updated uuid;
begin
 if v_actor is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='42501'; end if;
 if p_cover_note is not null and length(btrim(p_cover_note))>5000 then raise exception 'COVER_NOTE_TOO_LONG' using errcode='22023'; end if;
 if p_applicant_business_id is not null and not exists(select 1 from public.businesses b where b.id=p_applicant_business_id and b.archived_at is null and (b.owner_id=v_actor or exists(select 1 from public.business_members bm where bm.business_id=b.id and bm.user_id=v_actor and bm.role in ('owner','admin','operator')))) then raise exception 'BUSINESS_MANAGEMENT_REQUIRED' using errcode='42501'; end if;
 update public.opportunity_applications a set applicant_business_id=p_applicant_business_id,cover_note=nullif(btrim(p_cover_note),''),updated_at=now() where a.id=p_application_id and a.applicant_user_id=v_actor and a.status='SUBMITTED' and exists(select 1 from public.opportunities o where o.id=a.opportunity_id and o.status='PUBLISHED' and (o.opens_at is null or o.opens_at<=now()) and (o.closes_at is null or o.closes_at>=now())) returning a.id into v_updated;
 if v_updated is null then raise exception 'APPLICATION_NOT_EDITABLE' using errcode='42501'; end if; return v_updated;
end $$;
revoke all on function public.update_own_opportunity_application_submission(uuid,uuid,text) from public,anon; grant execute on function public.update_own_opportunity_application_submission(uuid,uuid,text) to authenticated;
create or replace function public.guard_opportunity_application_status_transition() returns trigger language plpgsql set search_path=pg_catalog,public,pg_temp as $$
begin
 if new.status is distinct from old.status and not ((old.status='DRAFT' and new.status in ('SUBMITTED','WITHDRAWN')) or (old.status='SUBMITTED' and new.status in ('UNDER_REVIEW','SHORTLISTED','ACCEPTED','REJECTED','WITHDRAWN')) or (old.status='UNDER_REVIEW' and new.status in ('SHORTLISTED','ACCEPTED','REJECTED')) or (old.status='SHORTLISTED' and new.status in ('ACCEPTED','REJECTED'))) then raise exception 'INVALID_APPLICATION_STATUS_TRANSITION:%->%',old.status,new.status using errcode='23514'; end if; return new;
end $$;
revoke all on function public.guard_opportunity_application_status_transition() from public,anon,authenticated;
drop trigger if exists guard_opportunity_application_status_transition_trigger on public.opportunity_applications;
create trigger guard_opportunity_application_status_transition_trigger before update of status on public.opportunity_applications for each row execute function public.guard_opportunity_application_status_transition();
alter table public.opportunity_application_events drop constraint if exists opportunity_application_events_event_type_check;
alter table public.opportunity_application_events add constraint opportunity_application_events_event_type_check check(event_type in ('SUBMITTED','STATUS_CHANGED','BASELINE'));
insert into public.opportunity_application_events(application_id,actor_user_id,event_type,old_status,previous_status,new_status,created_at) select a.id,a.applicant_user_id,case when a.status='SUBMITTED' then 'SUBMITTED' else 'BASELINE' end,null,null,a.status,coalesce(a.submitted_at,a.created_at) from public.opportunity_applications a where not exists(select 1 from public.opportunity_application_events e where e.application_id=a.id);
insert into public.support_ticket_events(ticket_id,actor_user_id,event_type,new_status,new_priority,new_assigned_to,created_at) select t.id,t.user_id,'CREATED',t.status,t.priority,t.assigned_to,t.created_at from public.support_tickets t where not exists(select 1 from public.support_ticket_events e where e.ticket_id=t.id);
revoke update,delete on public.support_messages from anon,authenticated;
drop policy if exists "support tickets owner insert" on public.support_tickets;
create policy "support tickets owner insert" on public.support_tickets for insert to authenticated with check(user_id=(select auth.uid()) and (business_id is null or exists(select 1 from public.businesses b where b.id=support_tickets.business_id and b.archived_at is null and (b.owner_id=(select auth.uid()) or exists(select 1 from public.business_members bm where bm.business_id=b.id and bm.user_id=(select auth.uid()) and bm.role in ('owner','admin','operator'))))));
create or replace function public.create_support_ticket_with_message(p_area text,p_subject text,p_business_id uuid,p_body text) returns uuid language plpgsql security invoker set search_path=pg_catalog,public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_ticket uuid;
begin
 if v_actor is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='42501'; end if;
 if p_area not in ('Técnico','Comercial','Conta e acessos','Pagamentos e créditos','Publicidade','Serviços MozEmpresas') or length(btrim(coalesce(p_subject,''))) not between 3 and 180 or length(btrim(coalesce(p_body,''))) not between 10 and 5000 then raise exception 'INVALID_SUPPORT_TICKET_INPUT' using errcode='22023'; end if;
 insert into public.support_tickets(user_id,business_id,area,subject,status,priority) values(v_actor,p_business_id,btrim(p_area),'OPEN','NORMAL') returning id into v_ticket;
 insert into public.support_messages(ticket_id,sender_user_id,sender_role,body) values(v_ticket,v_actor,'USER',btrim(p_body)); return v_ticket;
end $$;
revoke all on function public.create_support_ticket_with_message(text,text,uuid,text) from public,anon; grant execute on function public.create_support_ticket_with_message(text,text,uuid,text) to authenticated;
create or replace function public.guard_support_ticket_status_transition() returns trigger language plpgsql set search_path=pg_catalog,public,pg_temp as $$
begin
 if new.status is distinct from old.status then
  if not ((old.status='OPEN' and new.status in ('IN_PROGRESS','WAITING_USER','RESOLVED','CLOSED')) or (old.status='IN_PROGRESS' and new.status in ('WAITING_USER','RESOLVED','CLOSED')) or (old.status='WAITING_USER' and new.status in ('IN_PROGRESS','RESOLVED','CLOSED')) or (old.status='RESOLVED' and new.status in ('OPEN','CLOSED'))) then raise exception 'INVALID_SUPPORT_TICKET_STATUS_TRANSITION:%->%',old.status,new.status using errcode='23514'; end if;
  if new.status='CLOSED' then new.closed_at:=coalesce(new.closed_at,now()); else new.closed_at:=null; end if;
 end if; return new;
end $$;
revoke all on function public.guard_support_ticket_status_transition() from public,anon,authenticated;
drop trigger if exists guard_support_ticket_status_transition_trigger on public.support_tickets;
create trigger guard_support_ticket_status_transition_trigger before update of status on public.support_tickets for each row execute function public.guard_support_ticket_status_transition();
