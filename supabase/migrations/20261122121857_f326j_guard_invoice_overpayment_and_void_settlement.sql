
create or replace function public.admin_confirm_partner_bank_transfer(p_payment_id uuid,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare
 v_payment public.financial_payments%rowtype;
 v_campaign_total numeric(14,2); v_campaign_price numeric(14,2); v_campaign_status text; v_campaign_account uuid;
 v_document_amount numeric(14,2); v_document_paid numeric(14,2); v_document_status text; v_document_account uuid;
begin
 if auth.uid() is null or not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
 select * into v_payment from public.financial_payments where id=p_payment_id for update;
 if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
 if v_payment.method<>'BANK_TRANSFER' then raise exception 'INVALID_PAYMENT_METHOD'; end if;
 if v_payment.status<>'PENDING' then raise exception 'PAYMENT_NOT_PENDING'; end if;
 if v_payment.document_id is not null then
  select amount_mzn,status,partner_account_id into v_document_amount,v_document_status,v_document_account
  from public.financial_documents where id=v_payment.document_id for update;
  if not found then raise exception 'FINANCIAL_DOCUMENT_NOT_FOUND'; end if;
  if v_document_account is distinct from v_payment.partner_account_id then raise exception 'FINANCIAL_DOCUMENT_PARTNER_MISMATCH'; end if;
  if v_document_status<>'ISSUED' then raise exception 'FINANCIAL_DOCUMENT_NOT_PAYABLE'; end if;
 end if;
 update public.financial_payments set status='CONFIRMED',verified_by=auth.uid(),verified_at=now(),
  confirmed_at=now(),verification_notes=nullif(trim(p_notes),'') where id=p_payment_id;
 if v_payment.document_id is not null then
  select coalesce(sum(amount_mzn),0) into v_document_paid from public.financial_payments where document_id=v_payment.document_id and status='CONFIRMED';
  if v_document_paid>v_document_amount then raise exception 'FINANCIAL_DOCUMENT_OVERPAID'; end if;
  if v_document_paid=v_document_amount then update public.financial_documents set status='PAID' where id=v_payment.document_id; end if;
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
  'document_id',v_payment.document_id,'document_paid_amount',coalesce(v_document_paid,0),'document_amount',v_document_amount);
end;
$$;
revoke all on function public.admin_confirm_partner_bank_transfer(uuid,text) from public,anon;
grant execute on function public.admin_confirm_partner_bank_transfer(uuid,text) to authenticated;
