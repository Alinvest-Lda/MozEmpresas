-- F3.90: notify active partner-account members on campaign moderation and lifecycle changes.
create or replace function public.record_partner_ad_campaign_status_event()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,pg_temp
as $function$
declare
  v_reason text:=nullif(trim(current_setting('app.partner_ad_campaign_reason',true)),'');
  v_old_status text;
begin
  if tg_op='INSERT' then
    insert into public.partner_ad_campaign_status_events(campaign_id,account_id,old_status,new_status,event_type,actor_user_id)
    values(new.id,new.account_id,null,new.status,'CREATED',auth.uid());
    return new;
  end if;
  if old.status is distinct from new.status then
    v_old_status:=old.status::text;
    insert into public.partner_ad_campaign_status_events(campaign_id,account_id,old_status,new_status,event_type,actor_user_id,action_reason)
    values(new.id,new.account_id,old.status,new.status,'STATUS_CHANGED',auth.uid(),
      coalesce(v_reason,'Alteração legada sem justificação capturada'));

    if new.status::text in ('APPROVED','REJECTED','ACTIVE','PAUSED','ENDED') then
      insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
      select members.user_id,'ADVERTISING',
        case new.status::text
          when 'APPROVED' then 'Campanha publicitária aprovada'
          when 'REJECTED' then 'Campanha publicitária rejeitada'
          when 'ACTIVE' then 'Campanha publicitária activa'
          when 'PAUSED' then 'Campanha publicitária pausada'
          else 'Campanha publicitária terminada'
        end,
        'A campanha "'||left(new.title,120)||'" passou de "'||coalesce(v_old_status,'')||'" para "'||lower(new.status::text)||'".'||case when v_reason is null then '' else ' Motivo: '||left(v_reason,300) end,
        'PARTNER_AD_CAMPAIGN',new.id
      from public.partner_account_members members
      where members.account_id=new.account_id and members.active=true and members.user_id is not null;
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function public.record_partner_ad_campaign_status_event() from public,anon,authenticated;
