-- F3.74: make marketplace status transitions and audit events atomic.
create or replace function public.transition_commerce_order(
  p_order_id uuid,
  p_new_status text,
  p_note text default null
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  v_actor uuid := auth.uid();
  v_order public.commerce_orders%rowtype;
  v_is_buyer boolean;
  v_is_seller boolean;
  v_note text := nullif(left(trim(coalesce(p_note, '')), 1000), '');
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_order_id is null or p_new_status not in
    ('CONTACTED','NEGOTIATING','AGREED','COMPLETED','CANCELLED') then
    raise exception 'INVALID_TRANSITION';
  end if;

  select * into v_order
  from public.commerce_orders
  where id = p_order_id
  for update;

  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  v_is_buyer := v_order.buyer_user_id = v_actor;
  v_is_seller := exists (
    select 1
    from public.commerce_order_items oi
    join public.businesses b on b.id = oi.seller_business_id
    where oi.order_id = p_order_id
      and (
        b.owner_id = v_actor
        or exists (
          select 1 from public.business_members bm
          where bm.business_id = b.id
            and bm.user_id = v_actor
            and bm.role in ('owner','admin','operator')
        )
      )
  );

  if not v_is_buyer and not v_is_seller then raise exception 'ORDER_FORBIDDEN'; end if;
  if v_order.status = p_new_status then
    return jsonb_build_object('order_id', p_order_id, 'status', p_new_status, 'already_processed', true);
  end if;

  if p_new_status = 'CANCELLED' then
    if not (v_order.status in ('INTERESTED','CONTACTED','NEGOTIATING') and v_is_buyer)
       and not (v_order.status in ('INTERESTED','CONTACTED','NEGOTIATING','AGREED') and v_is_seller) then
      raise exception 'INVALID_TRANSITION';
    end if;
  elsif not v_is_seller
     or not (
       (v_order.status = 'INTERESTED' and p_new_status = 'CONTACTED')
       or (v_order.status = 'CONTACTED' and p_new_status = 'NEGOTIATING')
       or (v_order.status = 'NEGOTIATING' and p_new_status = 'AGREED')
       or (v_order.status = 'AGREED' and p_new_status = 'COMPLETED')
     ) then
    raise exception 'INVALID_TRANSITION';
  end if;

  update public.commerce_orders
  set status = p_new_status, updated_at = now()
  where id = p_order_id;

  insert into public.commerce_order_events (
    order_id, actor_user_id, event_type, from_status, to_status, note, metadata
  ) values (
    p_order_id, v_actor, 'STATUS_CHANGED', v_order.status, p_new_status,
    coalesce(v_note, case when p_new_status = 'CANCELLED'
      then 'Pedido comercial cancelado.' else 'Estado do pedido actualizado.' end),
    jsonb_build_object('actor_type', case when v_is_buyer then 'BUYER' else 'SELLER' end)
  );

  return jsonb_build_object(
    'order_id', p_order_id, 'from_status', v_order.status,
    'status', p_new_status, 'already_processed', false
  );
end;
$function$;

revoke all on function public.transition_commerce_order(uuid, text, text) from public, anon;
grant execute on function public.transition_commerce_order(uuid, text, text) to authenticated;
