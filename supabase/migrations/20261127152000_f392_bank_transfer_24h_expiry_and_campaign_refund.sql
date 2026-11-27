-- F3.92: enforce a 24-hour confirmation window for advertising bank transfers.
-- Pending bank-transfer advertising payment rows expire after 24h; late confirmations are rejected.
-- Unactivated, paid partner campaigns whose bank-transfer payment is expired are refund/cancel eligible.
alter table public.financial_payments
  add column if not exists expires_at timestamptz;

create index if not exists financial_payments_pending_bank_transfer_expiry_idx
  on public.financial_payments(expires_at)
  where status='PENDING' and method='BANK_TRANSFER' and expires_at is not null;

-- Mark pending bank-transfer payment intents as 24h-lived at creation/update.
create or replace function public.set_bank_transfer_payment_expiry()
returns trigger language plpgsql set search_path=pg_catalog,public,pg_temp as $$
begin
  if new.method='BANK_TRANSFER' and new.status='PENDING' then
    if new.expires_at is null then new.expires_at:=coalesce(new.created_at,now())+interval '24 hours'; end if;
  elsif new.status<>'PENDING' or new.method<>'BANK_TRANSFER' then
    new.expires_at:=null;
  end if;
  return new;
end $$;
revoke all on function public.set_bank_transfer_payment_expiry() from public,anon,authenticated;
drop trigger if exists financial_payment_bank_transfer_expiry on public.financial_payments;
create trigger financial_payment_bank_transfer_expiry
before insert or update of status,method,created_at,expires_at on public.financial_payments
for each row execute function public.set_bank_transfer_payment_expiry();

-- Existing pending transfer records get a deterministic expiry anchored at their creation time.
update public.financial_payments
set expires_at=created_at+interval '24 hours'
where status='PENDING' and method='BANK_TRANSFER' and expires_at is null;

-- Bank-transfer settlement is time-limited. Confirmation outside the 24h window
-- must not mutate settlement/document/campaign state.
create or replace function public.admin_confirm_partner_bank_transfer(p_payment_id uuid,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp
as $function$
declare
 v_payment public.financial_payments%rowtype;
 v_campaign_total numeric(14,2); v_campaign_price numeric(14,2); v_campaign_status text; v_campaign_account uuid;
 v_document_amount numeric(14,2); v_document_paid numeric(14,2); v_document_status text; v_document_account uuid;
begin
 if auth.uid() is null or not public.is_super_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 select * into v_payment from public.financial_payments where id=p_payment_id for update;
 if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
 if v_payment.method<>'BANK_TRANSFER' then raise exception 'INVALID_PAYMENT_METHOD'; end if;
 if v_payment.status<>'PENDING' then raise exception 'PAYMENT_NOT_PENDING'; end if;
 if v_payment.expires_at is null or v_payment.expires_at<=now() then raise exception 'BANK_TRANSFER_CONFIRMATION_EXPIRED'; end if;
 if length(trim(coalesce(p_notes,'')))>500 then raise exception 'INVALID_SETTLEMENT_NOTES'; end if;
 if v_payment.document_id is not null then
  select amount_mzn,status,partner_account_id into v_document_amount,v_document_status,v_document_account
  from public.financial_documents where id=v_payment.document_id for update;
  if not found then raise exception 'FINANCIAL_DOCUMENT_NOT_FOUND'; end if;
  if v_document_account is distinct from v_payment.partner_account_id then raise exception 'FINANCIAL_DOCUMENT_PARTNER_MISMATCH'; end if;
 end if;
 update public.financial_payments set status='CONFIRMED',verified_by=auth.uid(),verified_at=now(),
  confirmed_at=now(),verification_notes=nullif(trim(p_notes),'') where id=p_payment_id;
 if v_payment.document_id is not null and v_document_status<>'VOID' then
  select coalesce(sum(amount_mzn),0) into v_document_paid from public.financial_payments where document_id=v_payment.document_id and status='CONFIRMED';
  if v_document_paid>=v_document_amount and v_document_status='ISSUED' then update public.financial_documents set status='PAID' where id=v_payment.document_id; end if;
 end if;
 if v_payment.campaign_id is not null then
  select price_mzn,status,account_id into v_campaign_price,v_campaign_status,v_campaign_account
  from public.partner_ad_campaigns where id=v_payment.campaign_id for update;
  if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
  if v_campaign_account is distinct from v_payment.partner_account_id then raise exception 'CAMPAIGN_PARTNER_MISMATCH'; end if;
  select coalesce(sum(amount_mzn),0) into v_campaign_total from public.financial_payments where campaign_id=v_payment.campaign_id and status='CONFIRMED';
  if v_campaign_total>=v_campaign_price and v_campaign_status='REQUESTED' then update public.partner_ad_campaigns set status='APPROVED',updated_at=now() where id=v_payment.campaign_id; end if;
 end if;
 return jsonb_build_object('payment_id',p_payment_id,'status','CONFIRMED','campaign_id',v_payment.campaign_id,
  'campaign_paid_amount',coalesce(v_campaign_total,0),'campaign_price',v_campaign_price,
  'document_id',v_payment.document_id,'document_paid_amount',coalesce(v_document_paid,0),'document_amount',v_document_amount,
  'expires_at',v_payment.expires_at);
end;
$function$;
revoke all on function public.admin_confirm_partner_bank_transfer(uuid,text) from public,anon;
grant execute on function public.admin_confirm_partner_bank_transfer(uuid,text) to authenticated;

-- Paid, approved partner campaigns cannot remain indefinitely awaiting activation.
-- This preserves the original financial adjustment/refund function and allows a
-- cancellation only after expiry, with the bank-transfer refund reference logged.
do $migration$
declare v_definition text;
begin
 select pg_get_functiondef('public.admin_cancel_partner_ad_campaign(uuid,text,text)'::regprocedure) into v_definition;
 v_definition:=replace(v_definition,
  'if v_campaign.starts_at is not null and v_campaign.starts_at<=now()',
  'if v_campaign.payment_method_preference=''BANK_TRANSFER'' and v_campaign.status=''APPROVED'' and v_campaign.starts_at is not null and v_campaign.starts_at>now() and v_campaign.ends_at<=now()+interval ''24 hours'' then raise exception ''BANK_TRANSFER_ACTIVATION_WINDOW_NOT_EXPIRED''; end if; if v_campaign.starts_at is not null and v_campaign.starts_at<=now()');
 if position('BANK_TRANSFER_ACTIVATION_WINDOW_NOT_EXPIRED' in v_definition)=0 then raise exception 'F392_CAMPAIGN_CANCEL_GUARD_REWRITE_FAILED'; end if;
 execute v_definition;
end
$migration$;
