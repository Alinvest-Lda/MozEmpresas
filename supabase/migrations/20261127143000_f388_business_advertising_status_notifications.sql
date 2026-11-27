-- F3.88: notify business advertisers from the canonical campaign status event trigger.
create or replace function public.capture_advertising_admin_status_event()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,pg_temp
as $function$
declare
  v_reason text:=nullif(trim(current_setting('app.advertising_admin_reason',true)),'');
begin
  if new.status is distinct from old.status then
    insert into public.advertising_admin_events(
      entity_type,entity_id,actor_user_id,old_status,new_status,action_reason
    ) values (
      case tg_table_name when 'business_promotions' then 'BUSINESS_PROMOTION' else 'ADVERTISING_REQUEST' end,
      new.id,auth.uid(),old.status::text,new.status::text,
      coalesce(v_reason,'Alteração operacional legada sem justificação capturada')
    );

    if tg_table_name='business_promotions' and new.status::text in ('ACTIVE','PAUSED','EXPIRED','CANCELLED') then
      insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
      select recipients.user_id,'ADVERTISING',
        case new.status::text
          when 'ACTIVE' then 'Campanha publicitária activada'
          when 'PAUSED' then 'Campanha publicitária pausada'
          when 'EXPIRED' then 'Campanha publicitária expirada'
          else 'Campanha publicitária cancelada'
        end,
        'A campanha "'||left(new.title,120)||'" passou para o estado "'||lower(new.status::text)||'".',
        'BUSINESS_PROMOTION',new.id
      from (
        select b.owner_id as user_id from public.businesses b where b.id=new.business_id
        union
        select bm.user_id from public.business_members bm
        where bm.business_id=new.business_id and bm.role in ('owner','admin','operator')
      ) recipients
      where recipients.user_id is not null;
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function public.capture_advertising_admin_status_event() from public,anon,authenticated;
