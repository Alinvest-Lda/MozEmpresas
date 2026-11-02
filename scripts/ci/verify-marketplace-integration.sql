-- Assertions run against actual policy and trigger SQL on disposable PostgreSQL.
-- User IDs: buyer A, seller owner B, seller admin B, unrelated outsider.
-- Buyer creates a commercial-intent order through the actual INSERT policy.
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
insert into public.commerce_orders(id,buyer_user_id,buyer_business_id,status)
values ('50000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001','INTERESTED');
insert into public.commerce_order_events(order_id,actor_user_id,from_status,to_status,note)
values ('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',null,'INTERESTED','buyer event');
insert into public.service_requests(service_id,requester_user_id,requester_business_id,notes)
values ('30000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001','Pedido de teste');
reset role;

-- Insert the seller line as the trusted fixture owner; the real notification trigger
-- must notify seller owner/admin, but never the buyer who initiated the request.
insert into public.commerce_order_items(order_id,listing_id,seller_business_id,title)
values ('50000000-0000-4000-8000-000000000001',
        '40000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000002','Oferta do Vendedor B');

insert into public.commerce_order_events(order_id, actor_user_id, from_status, to_status, note)
values ('50000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000002','INTERESTED','CONTACTED','seller event');

-- Seller owner may progress the order; the actual update trigger notifies buyer.
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
update public.commerce_orders set status='CONTACTED'
where id='50000000-0000-4000-8000-000000000001';

do $seller_checks$
begin
  if (select count(*) from public.commerce_order_items) <> 1 then
    raise exception 'Seller owner should see the seller order item';
  end if;
  if (select count(*) from public.commerce_order_events) <> 2 then
    raise exception 'Seller owner should see order events';
  end if;
  if (select count(*) from public.notifications where user_id=auth.uid()) <> 1 then
    raise exception 'Seller owner should receive exactly one new-interest notification';
  end if;
  if (select status from public.commerce_orders where id='50000000-0000-4000-8000-000000000001') <> 'CONTACTED' then
    raise exception 'Seller owner should be able to advance the commercial request';
  end if;
end
$seller_checks$;
reset role;

do $buyer_notification_fixture_check$
declare
  v_count integer;
begin
  select count(*) into v_count from public.notifications
  where user_id='10000000-0000-4000-8000-000000000001';
  if v_count <> 1 then
    raise exception 'Expected one buyer notification after seller update; found %', v_count;
  end if;
end
$buyer_notification_fixture_check$;

-- Buyer sees own service request and order events, but cannot read seller-only items.
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
do $buyer_checks$
begin
  if (select count(*) from public.service_requests) <> 1 then
    raise exception 'Requester should see own service request';
  end if;
  if (select count(*) from public.commerce_order_events) <> 2 then
    raise exception 'Buyer should see order events';
  end if;
  if (select count(*) from public.commerce_order_items) <> 0 then
    raise exception 'Buyer must not gain seller-only order item access from seller policy';
  end if;
  if (select count(*) from public.notifications where user_id=auth.uid()) <> 1 then
    raise exception 'Buyer should receive the seller status update notification';
  end if;
end
$buyer_checks$;
reset role;

-- Seller admin can see seller items/events; unrelated user sees neither nor service request.
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',false);
do $manager_checks$
begin
  if (select count(*) from public.commerce_order_items) <> 1 then
    raise exception 'Seller admin should see seller order items';
  end if;
  if (select count(*) from public.commerce_order_events) <> 2 then
    raise exception 'Seller admin should see order events';
  end if;
end
$manager_checks$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',false);
do $outsider_checks$
begin
  if (select count(*) from public.service_requests) <> 0 then
    raise exception 'Unrelated user must not see service requests';
  end if;
  if (select count(*) from public.commerce_order_items) <> 0 then
    raise exception 'Unrelated user must not see seller order items';
  end if;
  if (select count(*) from public.commerce_order_events) <> 0 then
    raise exception 'Unrelated user must not see order events';
  end if;
  if (select count(*) from public.notifications) <> 0 then
    raise exception 'Unrelated user must not see notifications';
  end if;
end
$outsider_checks$;

do $negative_checks$
begin
  begin
    insert into public.service_requests(service_id,requester_user_id,requester_business_id,notes)
    values ('30000000-0000-4000-8000-000000000001',
            '10000000-0000-4000-8000-000000000001',
            '20000000-0000-4000-8000-000000000001','forged requester');
    raise exception 'Unrelated user unexpectedly created a request for another user';
  exception when insufficient_privilege then null;
  end;
end
$negative_checks$;
reset role;
