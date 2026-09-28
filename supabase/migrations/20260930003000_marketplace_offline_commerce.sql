-- MozEmpresas: marketplace is a discovery and commercial-intent layer.
-- The platform does not process buyer/seller payments or financial settlement.
-- Orders are retained as commercial requests/interactions for traceability only.
-- Any negotiation, invoicing, payment, delivery and execution happen outside MozEmpresas.

alter table public.commerce_orders drop constraint if exists commerce_orders_status_check;
alter table public.commerce_orders add constraint commerce_orders_status_check
  check (status in ('INTERESTED','CONTACTED','NEGOTIATING','AGREED','COMPLETED','CANCELLED'));

comment on table public.commerce_orders is
  'Commercial requests/interactions initiated through MozEmpresas. No payment processing or financial settlement occurs on the platform.';

comment on table public.commerce_transactions is
  'Legacy/future integration table. Not part of the current MozEmpresas marketplace flow; the platform does not process marketplace payments.';
