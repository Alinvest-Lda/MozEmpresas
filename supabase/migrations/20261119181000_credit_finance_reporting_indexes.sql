create index if not exists credit_transactions_wallet_created_idx
  on public.credit_transactions(wallet_id, created_at desc);
create index if not exists credit_transactions_package_idx
  on public.credit_transactions(package_id) where package_id is not null;
create index if not exists credit_payment_events_request_processed_idx
  on public.credit_payment_events(request_id, processed_at desc);
create index if not exists credit_payment_callback_events_request_idx
  on public.credit_payment_callback_events(request_id) where request_id is not null;
create index if not exists credit_purchase_requests_package_idx
  on public.credit_purchase_requests(package_id);
create index if not exists credit_purchase_requests_requester_idx
  on public.credit_purchase_requests(requester_user_id);
create index if not exists credit_wallet_adjustment_events_actor_idx
  on public.credit_wallet_adjustment_events(actor_user_id, created_at desc);
create index if not exists credit_wallet_adjustment_events_transaction_idx
  on public.credit_wallet_adjustment_events(transaction_id) where transaction_id is not null;
