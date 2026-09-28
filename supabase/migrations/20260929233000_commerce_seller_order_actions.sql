create policy "commerce orders sellers can update" on public.commerce_orders for update to authenticated using (
  exists (
    select 1 from public.commerce_order_items oi
    join public.businesses b on b.id=oi.seller_business_id
    where oi.order_id=commerce_orders.id
      and (b.owner_id=(select auth.uid()) or exists(
        select 1 from public.business_members bm
        where bm.business_id=b.id and bm.user_id=(select auth.uid()) and bm.role in ('owner','admin','operator')
      ))
  )
) with check (status in ('PENDING','AWAITING_PAYMENT','PAID','PROCESSING','COMPLETED','CANCELLED','REFUNDED'));
