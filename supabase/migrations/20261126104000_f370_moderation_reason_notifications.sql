-- F3.70: carry the administrative moderation reason into owner-facing status notifications.
create or replace function public.notify_opportunity_owner_status_change()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,pg_temp
as $function$
declare
  v_reason text:=nullif(left(trim(current_setting('app.opportunity_moderation_reason',true)),500),'');
begin
  if tg_op<>'UPDATE' or new.status is not distinct from old.status
     or new.owner_id is null or new.owner_id=auth.uid() then
    return new;
  end if;

  insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
  values(new.owner_id,'OPPORTUNITY_STATUS','Estado da oportunidade actualizado',
    'A oportunidade "'||left(new.title,160)||'" passou de "'||
    coalesce(old.status::text,'—')||'" para "'||coalesce(new.status::text,'—')||'".'||
    case when v_reason is not null then E'\nJustificação: '||v_reason else '' end,
    'OPPORTUNITY',new.id);
  return new;
end;
$function$;
revoke all on function public.notify_opportunity_owner_status_change() from public,anon,authenticated;

create or replace function public.notify_listing_owner_status_change()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,pg_temp
as $function$
declare
  v_title text;
  v_reason text:=nullif(left(trim(current_setting('app.listing_moderation_reason',true)),500),'');
begin
  if new.status is not distinct from old.status or new.owner_id is null or new.owner_id=auth.uid() then
    return new;
  end if;

  v_title:=case new.status::text
    when 'PUBLISHED' then 'Oferta publicada'
    when 'PAUSED' then 'Oferta pausada'
    when 'SOLD_OUT' then 'Oferta marcada como indisponível'
    when 'ARCHIVED' then 'Oferta arquivada'
    else 'Estado da oferta actualizado'
  end;

  insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
  values(new.owner_id,'LISTING_STATUS',v_title,
    'A oferta "'||left(coalesce(new.title,'Oferta'),160)||'" passou de "'||
    coalesce(old.status::text,'—')||'" para "'||coalesce(new.status::text,'—')||'".'||
    case when v_reason is not null then E'\nJustificação: '||v_reason else '' end,
    'LISTING',new.id);
  return new;
end;
$function$;
revoke all on function public.notify_listing_owner_status_change() from public,anon,authenticated;
