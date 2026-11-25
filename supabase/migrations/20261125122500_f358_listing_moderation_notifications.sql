-- F3.58: notify listing owners only after a committed lifecycle transition.
create or replace function public.notify_listing_owner_status_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_title text;
begin
  if new.status is not distinct from old.status or new.owner_id is null or new.owner_id = auth.uid() then
    return new;
  end if;

  v_title := case new.status::text
    when 'PUBLISHED' then 'Oferta publicada'
    when 'PAUSED' then 'Oferta pausada'
    when 'SOLD_OUT' then 'Oferta marcada como indisponível'
    when 'ARCHIVED' then 'Oferta arquivada'
    else 'Estado da oferta actualizado'
  end;

  insert into public.notifications(user_id, type, title, body, resource_type, resource_id)
  values (
    new.owner_id,
    'LISTING_STATUS',
    v_title,
    'A oferta "' || left(coalesce(new.title, 'Oferta'), 160) || '" passou de "' ||
      coalesce(old.status::text, '—') || '" para "' || coalesce(new.status::text, '—') || '".',
    'LISTING',
    new.id
  );
  return new;
end;
$function$;
revoke all on function public.notify_listing_owner_status_change() from public, anon, authenticated;
drop trigger if exists listing_owner_status_notification on public.listings;
create trigger listing_owner_status_notification
after update of status on public.listings
for each row execute function public.notify_listing_owner_status_change();
