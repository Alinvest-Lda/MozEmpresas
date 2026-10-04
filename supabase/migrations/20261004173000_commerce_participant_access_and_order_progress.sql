-- FASE 6: commerce participant access and order progress
alter table public.commerce_orders
  add column if not exists payment_status text not null default 'NOT_REQUIRED',
  add column if not exists payment_reference text,
  add column if not exists paid_at timestamptz,
  add column if not exists fulfillment_status text not null default 'NOT_STARTED',
  add column if not exists service_started_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table public.commerce_orders drop constraint if exists commerce_orders_payment_status_check;
alter table public.commerce_orders add constraint commerce_orders_payment_status_check
  check (payment_status in ('NOT_REQUIRED','PENDING','PROOF_SUBMITTED','PAID','FAILED','REFUNDED'));

alter table public.commerce_orders drop constraint if exists commerce_orders_fulfillment_status_check;
alter table public.commerce_orders add constraint commerce_orders_fulfillment_status_check
  check (fulfillment_status in ('NOT_STARTED','IN_PROGRESS','DELIVERED','COMPLETED','CANCELLED'));

drop policy if exists "buyer interests owner read" on public.business_buyer_interests;
drop policy if exists "buyer interests owner insert" on public.business_buyer_interests;
drop policy if exists "buyer interests owner delete" on public.business_buyer_interests;

create policy "buyer interests managers read" on public.business_buyer_interests for select to authenticated using (
  exists (select 1 from public.businesses b where b.id = business_buyer_interests.business_id
    and (b.owner_id = (select auth.uid()) or exists (select 1 from public.business_members bm
      where bm.business_id=b.id and bm.user_id=(select auth.uid()) and bm.role in ('owner','admin','operator'))))
);
create policy "buyer interests managers insert" on public.business_buyer_interests for insert to authenticated with check (
  exists (select 1 from public.businesses b where b.id = business_buyer_interests.business_id
    and (b.owner_id = (select auth.uid()) or exists (select 1 from public.business_members bm
      where bm.business_id=b.id and bm.user_id=(select auth.uid()) and bm.role in ('owner','admin','operator'))))
);
create policy "buyer interests managers delete" on public.business_buyer_interests for delete to authenticated using (
  exists (select 1 from public.businesses b where b.id = business_buyer_interests.business_id
    and (b.owner_id = (select auth.uid()) or exists (select 1 from public.business_members bm
      where bm.business_id=b.id and bm.user_id=(select auth.uid()) and bm.role in ('owner','admin','operator'))))
);

drop policy if exists "commerce_orders_buyer_insert" on public.commerce_orders;
create policy "commerce_orders_buyer_insert" on public.commerce_orders for insert to authenticated with check (
  buyer_user_id=(select auth.uid()) and (
    buyer_business_id is null or exists (select 1 from public.businesses b where b.id=commerce_orders.buyer_business_id
      and (b.owner_id=(select auth.uid()) or exists (select 1 from public.business_members bm
        where bm.business_id=b.id and bm.user_id=(select auth.uid()) and bm.role in ('owner','admin','operator'))))
  )
);

drop policy if exists "order events participants insert" on public.commerce_order_events;
create policy "order events participants insert" on public.commerce_order_events for insert to authenticated with check (
  actor_user_id=(select auth.uid()) and exists (select 1 from public.commerce_orders o where o.id=commerce_order_events.order_id
    and (o.buyer_user_id=(select auth.uid()) or exists (select 1 from public.commerce_order_items oi
      join public.businesses b on b.id=oi.seller_business_id where oi.order_id=o.id
      and (b.owner_id=(select auth.uid()) or exists (select 1 from public.business_members bm
        where bm.business_id=b.id and bm.user_id=(select auth.uid()) and bm.role in ('owner','admin','operator'))))))
);