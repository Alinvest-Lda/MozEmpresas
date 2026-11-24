-- F3.60: notify assigned institutional backoffice staff on work and campaign changes.
create or replace function public.notify_partner_backoffice_assignment()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,auth,pg_temp
as $$
declare
 v_new jsonb:=to_jsonb(new);
 v_old jsonb:=case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end;
 v_account uuid:=(v_new->>'account_id')::uuid;
 v_entity uuid:=(v_new->>'id')::uuid;
 v_operations uuid:=nullif(v_new->>'assigned_operations_user_id','')::uuid;
 v_commercial uuid:=case when tg_table_name='partner_service_engagements' then nullif(v_new->>'assigned_commercial_user_id','')::uuid else null end;
 v_old_operations uuid:=nullif(v_old->>'assigned_operations_user_id','')::uuid;
 v_old_commercial uuid:=case when tg_table_name='partner_service_engagements' then nullif(v_old->>'assigned_commercial_user_id','')::uuid else null end;
 v_status text:=v_new->>'status';
 v_old_status text:=v_old->>'status';
 v_title text:=coalesce(v_new->>'title','Operação institucional');
 v_partner text;
 v_recipient uuid;
 v_actor uuid:=auth.uid();
 v_status_changed boolean:=tg_op='INSERT' or v_status is distinct from v_old_status;
 v_assignment_changed boolean:=tg_op='INSERT' or v_operations is distinct from v_old_operations or v_commercial is distinct from v_old_commercial;
 v_resource_type text:=case when tg_table_name='partner_ad_campaigns' then 'PARTNER_AD_CAMPAIGN' else 'PARTNER_SERVICE_ENGAGEMENT' end;
begin
 if v_actor is not null and not public.is_super_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if not v_status_changed and not v_assignment_changed then return new; end if;
 select name into v_partner from public.partner_accounts where id=v_account;
 for v_recipient in
  select distinct recipient_id
  from unnest(array[v_operations,v_commercial]) as recipients(recipient_id)
  where recipient_id is not null
    and recipient_id is distinct from v_actor
    and exists(select 1 from public.platform_members pm join public.profiles pr on pr.id=pm.user_id
      where pm.user_id=recipient_id and pm.active=true)
 loop
  insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
  values(
   v_recipient,
   'PARTNER_OPERATIONS',
   case when v_status_changed then 'Actualização de operação institucional' else 'Nova responsabilidade institucional' end,
   case when v_status_changed
     then 'A operação "'||left(v_title,120)||'" da entidade "'||left(coalesce(v_partner,'Parceiro'),120)||'" passou para "'||coalesce(v_status,'—')||'".'
     else 'Foi-lhe atribuída responsabilidade na operação "'||left(v_title,120)||'" da entidade "'||left(coalesce(v_partner,'Parceiro'),120)||'". Estado actual: "'||coalesce(v_status,'—')||'".'
   end,
   v_resource_type,v_entity
  );
 end loop;
 return new;
end $$;
revoke all on function public.notify_partner_backoffice_assignment() from public,anon,authenticated;
drop trigger if exists partner_engagement_assignment_notifications on public.partner_service_engagements;
create trigger partner_engagement_assignment_notifications
after insert or update of status,assigned_commercial_user_id,assigned_operations_user_id
on public.partner_service_engagements
for each row execute function public.notify_partner_backoffice_assignment();
drop trigger if exists partner_campaign_assignment_notifications on public.partner_ad_campaigns;
create trigger partner_campaign_assignment_notifications
after insert or update of status,assigned_operations_user_id
on public.partner_ad_campaigns
for each row execute function public.notify_partner_backoffice_assignment();

create index if not exists partner_ad_campaign_status_events_account_created_idx
on public.partner_ad_campaign_status_events(account_id,created_at desc);
