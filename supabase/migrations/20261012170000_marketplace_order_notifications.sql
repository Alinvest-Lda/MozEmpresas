-- Keep the commercial request flow connected to the user's notification centre.
-- Marketplace orders are commercial-intent records; payment and fulfilment remain off-platform.

create or replace function public.notify_commerce_order_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_buyer uuid;
  v_listing_title text;
  v_business_name text;
begin
  select o.buyer_user_id, coalesce(l.title, new.title)
    into v_buyer, v_listing_title
  from public.commerce_orders o
  left join public.listings l on l.id = new.listing_id
  where o.id = new.order_id;

  select b.name into v_business_name
  from public.businesses b
  where b.id = new.seller_business_id;

  if new.seller_business_id is not null then
    insert into public.notifications(user_id, type, title, body, resource_type, resource_id)
    select recipients.user_id,
           'ORDER',
           'Novo interesse comercial',
           'Recebeu um pedido de contacto para "' || left(coalesce(v_listing_title, 'uma oferta'), 120) || '". A negociação decorre directamente entre as partes.',
           'ORDER',
           new.order_id
    from (
      select b.owner_id as user_id
      from public.businesses b
      where b.id = new.seller_business_id
      union
      select bm.user_id
      from public.business_members bm
      where bm.business_id = new.seller_business_id
        and bm.role in ('owner', 'admin', 'operator')
    ) recipients
    where recipients.user_id is not null
      and recipients.user_id is distinct from v_buyer;
  end if;

  return new;
end;
$function$;

revoke all on function public.notify_commerce_order_created() from public, anon, authenticated;
drop trigger if exists notify_commerce_order_created_trigger on public.commerce_order_items;
create trigger notify_commerce_order_created_trigger
after insert on public.commerce_order_items
for each row execute function public.notify_commerce_order_created();

create or replace function public.notify_commerce_order_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor uuid := auth.uid();
  v_title text;
  v_body text;
begin
  if old.status is not distinct from new.status
     and old.payment_status is not distinct from new.payment_status
     and old.fulfillment_status is not distinct from new.fulfillment_status then
    return new;
  end if;

  if old.status is distinct from new.status then
    v_title := 'Estado da negociação actualizado';
    v_body := 'A negociação passou para "' || lower(replace(new.status, '_', ' ')) || '".';
  elsif old.payment_status is distinct from new.payment_status then
    v_title := 'Actualização de pagamento';
    v_body := 'O estado de pagamento foi actualizado para "' || lower(replace(new.payment_status, '_', ' ')) || '". Confirme os detalhes directamente com a outra parte.';
  else
    v_title := 'Actualização da execução';
    v_body := 'O estado de execução foi actualizado para "' || lower(replace(new.fulfillment_status, '_', ' ')) || '".';
  end if;

  if v_actor is not null and v_actor = new.buyer_user_id then
    insert into public.notifications(user_id, type, title, body, resource_type, resource_id)
    select recipients.user_id, 'ORDER', v_title, v_body, 'ORDER', new.id
    from (
      select b.owner_id as user_id
      from public.commerce_order_items oi
      join public.businesses b on b.id = oi.seller_business_id
      where oi.order_id = new.id
      union
      select bm.user_id
      from public.commerce_order_items oi
      join public.business_members bm on bm.business_id = oi.seller_business_id
      where oi.order_id = new.id and bm.role in ('owner', 'admin', 'operator')
    ) recipients
    where recipients.user_id is not null
      and recipients.user_id is distinct from v_actor;
  else
    insert into public.notifications(user_id, type, title, body, resource_type, resource_id)
    values (new.buyer_user_id, 'ORDER', v_title, v_body, 'ORDER', new.id);
  end if;

  return new;
end;
$function$;

revoke all on function public.notify_commerce_order_updated() from public, anon, authenticated;
drop trigger if exists notify_commerce_order_updated_trigger on public.commerce_orders;
create trigger notify_commerce_order_updated_trigger
after update of status, payment_status, fulfillment_status on public.commerce_orders
for each row execute function public.notify_commerce_order_updated();
