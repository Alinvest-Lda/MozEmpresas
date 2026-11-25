-- F3.62: reason-required atomic listing moderation with immutable reasoned history.
alter table public.listing_moderation_events
  add column if not exists action_reason text;

create or replace function public.capture_listing_moderation_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
begin
  if new.status is distinct from old.status then
    insert into public.listing_moderation_events(
      listing_id, actor_user_id, old_status, new_status, action_reason
    ) values (
      new.id, auth.uid(), old.status, new.status,
      nullif(trim(current_setting('app.listing_moderation_reason', true)), '')
    );
  end if;
  return new;
end;
$function$;

create or replace function public.admin_set_listing_status(
  p_listing_id uuid, p_new_status public.listing_status, p_reason text
) returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare v_listing public.listings; v_allowed boolean := false;
begin
  if auth.uid() is null or not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if p_listing_id is null or p_new_status is null or length(trim(coalesce(p_reason,''))) < 8 or length(trim(p_reason)) > 500 then
    raise exception 'INVALID_LISTING_MODERATION';
  end if;
  select * into v_listing from public.listings where id=p_listing_id for update;
  if not found then raise exception 'LISTING_NOT_FOUND'; end if;
  v_allowed := case v_listing.status::text
    when 'DRAFT' then p_new_status::text in ('PUBLISHED','ARCHIVED')
    when 'PUBLISHED' then p_new_status::text in ('PAUSED','SOLD_OUT','ARCHIVED')
    when 'PAUSED' then p_new_status::text in ('PUBLISHED','SOLD_OUT','ARCHIVED')
    when 'SOLD_OUT' then p_new_status::text in ('PUBLISHED','ARCHIVED')
    when 'ARCHIVED' then false
    else false
  end;
  if not v_allowed then raise exception 'INVALID_LISTING_STATUS_TRANSITION'; end if;
  perform set_config('app.listing_moderation_reason',trim(p_reason),true);
  update public.listings set status=p_new_status,updated_at=now() where id=p_listing_id;
end;
$function$;
revoke all on function public.admin_set_listing_status(uuid,public.listing_status,text) from public,anon;
grant execute on function public.admin_set_listing_status(uuid,public.listing_status,text) to authenticated;
