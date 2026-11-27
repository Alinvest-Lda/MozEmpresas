-- F4.14: status audit events remain transactional; notification delivery is best-effort.
do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef('public.capture_advertising_admin_status_event()'::regprocedure)
    into v_definition;

  v_old:=$old$      insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
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
      where recipients.user_id is not null;$old$;

  v_new:=$new$      begin
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
      exception when others then
        raise warning 'F414 business status notification failed for promotion %: %',new.id,sqlerrm;
      end;$new$;

  if position(v_old in v_definition)=0 then raise exception 'F414_BUSINESS_STATUS_NOTIFICATION_ANCHOR_NOT_FOUND'; end if;
  v_definition:=replace(v_definition,v_old,v_new);
  execute v_definition;

  select pg_get_functiondef('public.record_partner_ad_campaign_status_event()'::regprocedure)
    into v_definition;
  v_old:=$old$      insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
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
      where members.account_id=new.account_id and members.active=true and members.user_id is not null;$old$;
  v_new:=$new$      begin
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
      exception when others then
        raise warning 'F414 partner status notification failed for campaign %: %',new.id,sqlerrm;
      end;$new$;
  if position(v_old in v_definition)=0 then raise exception 'F414_PARTNER_STATUS_NOTIFICATION_ANCHOR_NOT_FOUND'; end if;
  v_definition:=replace(v_definition,v_old,v_new);
  execute v_definition;
end
$migration$;
